package com.library.management.reservation.service;

import com.library.management.audit.service.AuditService;
import com.library.management.catalog.service.CatalogService;
import com.library.management.common.ApiException;
import com.library.management.common.IdempotencyService;
import com.library.management.common.Paging;
import com.library.management.common.Rows;
import com.library.management.inventory.service.InventoryService;
import com.library.management.reservation.mapper.ReservationMapper;
import com.library.management.user.service.UserService;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;

@Service
public class ReservationService {
    private final ReservationMapper mapper;
    private final UserService users;
    private final CatalogService catalog;
    private final InventoryService inventory;
    private final AuditService audit;
    private final IdempotencyService idempotency;
    public ReservationService(ReservationMapper mapper,UserService users,CatalogService catalog,InventoryService inventory,AuditService audit,IdempotencyService idempotency) {
        this.mapper=mapper;this.users=users;this.catalog=catalog;this.inventory=inventory;this.audit=audit;this.idempotency=idempotency;
    }
    public Map<String,Object> byId(long id) { return Rows.row(mapper.byId(id)); }
    public Map<String,Object> readyForCopy(long copyId) { Map<String,Object> r=mapper.readyForCopy(copyId);return r==null?null:Rows.row(r); }
    public boolean hasWaiting(long bookId) { return mapper.countWaiting(bookId)>0; }
    public boolean hasActiveForBook(long bookId) { return mapper.countActiveBook(bookId)>0; }
    @Transactional(isolation=Isolation.READ_COMMITTED) public Map<String,Object> create(long readerId,long bookId,String key) {
        return idempotency.execute(readerId,"POST","/api/v1/reservations",key,Map.of("bookId",bookId),201,() -> users.lock(readerId),() -> createInternal(readerId,bookId));
    }
    private Map<String,Object> createInternal(long readerId,long bookId) {
        Map<String,Object> user=users.lock(readerId);
        if(!"READER".equals(user.get("role")) || !"ACTIVE".equals(user.get("status"))) throw ApiException.forbidden("ACCOUNT_DISABLED","读者账号不可用");
        if(users.hasOverdue(readerId)) throw ApiException.rule("OVERDUE_BLOCKED","存在逾期借阅，暂不能预约");
        if(mapper.countActiveReader(readerId)>=3) throw ApiException.rule("RESERVATION_LIMIT_REACHED","有效预约已达到 3 条");
        Map<String,Object> book=catalog.lockBook(bookId);
        if(!Rows.bool(book.get("enabled"))) throw ApiException.rule("STATE_CONFLICT","书目已下架");
        expireAndAllocate(bookId);
        if(mapper.hasActiveReaderBook(readerId,bookId)>0) throw ApiException.conflict("ACTIVE_RESERVATION_EXISTS","已有该书目有效预约");
        if(mapper.hasActiveLoan(readerId,bookId)>0) throw ApiException.rule("ACTIVE_LOAN_EXISTS","正在借阅该书目");
        Map<String,Object> row=new LinkedHashMap<>();row.put("readerId",readerId);row.put("bookId",bookId);mapper.insert(row);
        long id=((Number)row.get("id")).longValue();audit.record(readerId,"RESERVATION_CREATED","RESERVATION",id);
        allocate(bookId);
        return dto(byId(id));
    }
    @Transactional(isolation=Isolation.READ_COMMITTED) public Map<String,Object> cancel(long actorId,boolean staff,long id,String reason,String key) {
        return idempotency.execute(actorId,"POST","/api/v1/reservations/"+id+"/cancel",key,Map.of("reason",reason==null?"":reason),200,() -> {
            long readerId=((Number)byId(id).get("readerId")).longValue();
            if(!staff && actorId!=readerId) throw ApiException.notFound();users.lock(readerId);
        },() -> cancelInternal(actorId,staff,id,reason));
    }
    private Map<String,Object> cancelInternal(long actorId,boolean staff,long id,String reason) {
        Map<String,Object> initial=byId(id);
        long readerId=((Number)initial.get("readerId")).longValue();long bookId=((Number)initial.get("bookId")).longValue();
        if(!staff && actorId!=readerId) throw ApiException.notFound();
        if(staff && (reason==null || reason.isBlank())) throw ApiException.bad("VALIDATION_ERROR","员工取消须填写原因");
        users.lock(readerId);catalog.lockBook(bookId);expireAndAllocate(bookId);
        Map<String,Object> current=Rows.row(mapper.lockById(id));
        String status=(String)current.get("status");
        if(status.equals("EXPIRED")) throw ApiException.conflict("HOLD_EXPIRED","待取预约已过期");
        if(!status.equals("WAITING") && !status.equals("READY")) throw ApiException.conflict("STATE_CONFLICT","预约已结束");
        if(mapper.close(id,status,"CANCELLED")!=1) throw ApiException.conflict("STATE_CONFLICT","预约状态已变化");
        String copyStatus=null;
        if(status.equals("READY")) {
            long copyId=((Number)current.get("copyId")).longValue(); inventory.changeStatus(copyId,"READY","AVAILABLE");
            allocate(bookId);copyStatus=(String)inventory.byId(copyId).get("status");
        }
        audit.record(actorId,"RESERVATION_CANCELLED","RESERVATION",id);
        Map<String,Object> out=dto(byId(id));out.put("copyStatus",copyStatus);return out;
    }
    public void fulfill(long reservationId) {
        if(mapper.fulfill(reservationId)!=1) throw ApiException.conflict("HOLD_EXPIRED","预约不再可取");
        audit.record(null,"RESERVATION_FULFILLED","RESERVATION",reservationId);
    }
    public void expireAndAllocate(long bookId) {
        String today=LocalDate.now(Rows.SHANGHAI).toString();
        for(Map<String,Object> raw:mapper.expiredForBook(bookId,today)) {
            Map<String,Object> row=Rows.row(raw);long id=Rows.id(row),copyId=((Number)row.get("copyId")).longValue();
            if(mapper.close(id,"READY","EXPIRED")==1) {
                inventory.changeStatus(copyId,"READY","AVAILABLE"); audit.record(null,"RESERVATION_EXPIRED","RESERVATION",id);
            }
        }
        allocate(bookId);
    }
    public void allocate(long bookId) {
        if(!Rows.bool(catalog.lockBook(bookId).get("enabled"))) return;
        while(true) {
            Map<String,Object> waitingRaw=mapper.firstWaiting(bookId);
            if(waitingRaw==null) return;
            Map<String,Object> copy=inventory.firstAvailable(bookId);
            if(copy==null) return;
            Map<String,Object> waiting=Rows.row(waitingRaw);
            long id=Rows.id(waiting),copyId=Rows.id(copy);
            inventory.changeStatus(copyId,"AVAILABLE","READY");
            String deadline=LocalDate.now(Rows.SHANGHAI).plusDays(3).toString();
            if(mapper.markReady(id,copyId,deadline)!=1) throw ApiException.conflict("STATE_CONFLICT","预约分配冲突");
            audit.record(null,"RESERVATION_ALLOCATED","RESERVATION",id);
        }
    }
    @Transactional public void expireBook(long bookId) { catalog.lockBook(bookId);expireAndAllocate(bookId); }
    public List<Long> expiredBookIds() { return mapper.expiredBookIds(LocalDate.now(Rows.SHANGHAI).toString()); }
    @Transactional public void cancelAllForReader(long readerId,long actorId) {
        for(Long id:mapper.activeIdsForReader(readerId)) cancelInternal(actorId,true,id,"账号停用");
    }
    @Transactional public void cancelAllForBook(long bookId,long actorId) {
        for(Long id:mapper.activeIdsForBook(bookId)) {
            Map<String,Object> row=byId(id);String status=(String)row.get("status");
            if(mapper.close(id,status,"CANCELLED")==1) {
                if(status.equals("READY")) inventory.changeStatus(((Number)row.get("copyId")).longValue(),"READY","AVAILABLE");
                audit.record(actorId,"RESERVATION_CANCELLED","RESERVATION",id);
            }
        }
    }
    public Map<String,Object> list(Long readerId,String status,Long bookId,String readerKeyword,Paging paging) {
        List<Map<String,Object>> items=new ArrayList<>();
        mapper.list(readerId,status,bookId,readerKeyword,paging.offset(),paging.size()).forEach(r -> items.add(dto(Rows.row(r))));
        return Paging.of(items,paging,mapper.count(readerId,status,bookId,readerKeyword));
    }
    private Map<String,Object> dto(Map<String,Object> row) {
        Map<String,Object> out=new LinkedHashMap<>();
        for(String key:new String[]{"id","bookId","readerId","readerName","bookTitle","status","requestedAt","readyAt","queuePosition","copyId","copyBarcode","shelfLocation","pickupDeadline"}) out.put(key,row.get(key));
        boolean canCancel="WAITING".equals(row.get("status")) || "READY".equals(row.get("status"));
        out.put("allowedActions",Map.of("canCancel",canCancel));return out;
    }
}
