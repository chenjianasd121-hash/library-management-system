package com.library.management.circulation.service;

import com.library.management.audit.service.AuditService;
import com.library.management.catalog.service.CatalogService;
import com.library.management.circulation.mapper.LoanMapper;
import com.library.management.common.ApiException;
import com.library.management.common.IdempotencyService;
import com.library.management.common.Paging;
import com.library.management.common.Rows;
import com.library.management.inventory.service.InventoryService;
import com.library.management.reservation.service.ReservationService;
import com.library.management.user.service.UserService;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;

@Service
public class LoanService {
    private final LoanMapper mapper;
    private final UserService users;
    private final CatalogService catalog;
    private final InventoryService inventory;
    private final ReservationService reservations;
    private final AuditService audit;
    private final IdempotencyService idempotency;
    public LoanService(LoanMapper mapper,UserService users,CatalogService catalog,InventoryService inventory,ReservationService reservations,AuditService audit,IdempotencyService idempotency) {
        this.mapper=mapper;this.users=users;this.catalog=catalog;this.inventory=inventory;this.reservations=reservations;this.audit=audit;this.idempotency=idempotency;
    }
    private LocalDate today() { return LocalDate.now(Rows.SHANGHAI); }
    public Map<String,Object> byId(long id) { return Rows.row(mapper.byId(id)); }
    @Transactional(isolation=Isolation.READ_COMMITTED) public Map<String,Object> checkout(long actor,long readerId,String barcode,String key) {
        // Lock the reader before creating the idempotency row (which has a user foreign key).
        return idempotency.execute(actor,"POST","/api/v1/loans",key,Map.of("readerId",readerId,"copyBarcode",barcode),201,() -> users.lock(readerId),() -> checkoutInternal(actor,readerId,barcode));
    }
    private Map<String,Object> checkoutInternal(long actor,long readerId,String barcode) {
        Map<String,Object> reader=users.lock(readerId);
        if(!"READER".equals(reader.get("role")) || !"ACTIVE".equals(reader.get("status"))) throw ApiException.rule("ACCOUNT_DISABLED","读者账号不可用");
        if(users.hasOverdue(readerId)) throw ApiException.rule("OVERDUE_BLOCKED","读者存在逾期借阅");
        if(mapper.activeCount(readerId)>=5) throw ApiException.rule("BORROW_LIMIT_REACHED","有效借阅已达到 5 条");
        Map<String,Object> observed=inventory.byBarcode(barcode);
        long bookId=((Number)observed.get("bookId")).longValue(),copyId=Rows.id(observed);
        Map<String,Object> book=catalog.lockBook(bookId);
        if(!Rows.bool(book.get("enabled"))) throw ApiException.rule("STATE_CONFLICT","书目已下架");
        reservations.expireAndAllocate(bookId);
        Map<String,Object> copy=inventory.lock(copyId);
        if(mapper.activeBookCount(readerId,bookId)>0) throw ApiException.rule("ACTIVE_LOAN_EXISTS","读者正在借阅该书目");
        String status=(String)copy.get("status");
        if("READY".equals(status)) {
            Map<String,Object> hold=reservations.readyForCopy(copyId);
            if(hold==null || ((Number)hold.get("readerId")).longValue()!=readerId) throw ApiException.conflict("COPY_NOT_AVAILABLE","该副本已预留给其他读者");
            if(LocalDate.parse(String.valueOf(hold.get("pickupDeadline"))).isBefore(today())) throw ApiException.conflict("HOLD_EXPIRED","待取预约已过期");
            inventory.changeStatus(copyId,"READY","BORROWED");reservations.fulfill(Rows.id(hold));
        } else if("AVAILABLE".equals(status)) {
            if(reservations.hasWaiting(bookId)) throw ApiException.conflict("COPY_NOT_AVAILABLE","须优先履约预约队列");
            inventory.changeStatus(copyId,"AVAILABLE","BORROWED");
        } else throw ApiException.conflict("COPY_NOT_AVAILABLE","副本当前不可借");
        Map<String,Object> loan=new LinkedHashMap<>();loan.put("bookId",bookId);loan.put("copyId",copyId);loan.put("readerId",readerId);
        loan.put("dueDate",today().plusDays(30));loan.put("handledBy",actor);mapper.insert(loan);
        long id=((Number)loan.get("id")).longValue();audit.record(actor,"LOAN_CHECKED_OUT","LOAN",id);return dto(byId(id));
    }
    @Transactional(isolation=Isolation.READ_COMMITTED) public Map<String,Object> returnLoan(long actor,long id,String barcode,String key) {
        return idempotency.execute(actor,"POST","/api/v1/loans/"+id+"/return",key,Map.of("copyBarcode",barcode),200,() -> users.lock(((Number)byId(id).get("readerId")).longValue()),() -> returnInternal(actor,id,barcode));
    }
    private Map<String,Object> returnInternal(long actor,long id,String barcode) {
        Map<String,Object> observed=byId(id);
        long readerId=((Number)observed.get("readerId")).longValue(),bookId=((Number)observed.get("bookId")).longValue(),copyId=((Number)observed.get("copyId")).longValue();
        users.lock(readerId);catalog.lockBook(bookId);reservations.expireAndAllocate(bookId);
        Map<String,Object> loan=Rows.row(mapper.lockById(id));inventory.lock(copyId);
        if(!"ACTIVE".equals(loan.get("status"))) throw ApiException.conflict("LOAN_ALREADY_CLOSED","借阅已归还");
        if(!barcode.equals(loan.get("copyBarcode"))) throw ApiException.bad("VALIDATION_ERROR","副本条码与借阅记录不符");
        if(mapper.close(id)!=1) throw ApiException.conflict("LOAN_ALREADY_CLOSED","借阅已归还");
        inventory.changeStatus(copyId,"BORROWED","AVAILABLE");reservations.allocate(bookId);
        audit.record(actor,"LOAN_RETURNED","LOAN",id);
        Map<String,Object> out=dto(byId(id));out.put("copyStatus",inventory.byId(copyId).get("status"));return out;
    }
    @Transactional(isolation=Isolation.READ_COMMITTED) public Map<String,Object> renew(long actor,long id,String key) {
        return idempotency.execute(actor,"POST","/api/v1/loans/"+id+"/renew",key,Map.of(),200,() -> users.lock(actor),() -> renewInternal(actor,id));
    }
    private Map<String,Object> renewInternal(long actor,long id) {
        Map<String,Object> observed=byId(id);
        if(((Number)observed.get("readerId")).longValue()!=actor) throw ApiException.notFound();
        users.lock(actor);long bookId=((Number)observed.get("bookId")).longValue();catalog.lockBook(bookId);reservations.expireAndAllocate(bookId);
        Map<String,Object> loan=Rows.row(mapper.lockById(id));
        if(!"ACTIVE".equals(loan.get("status")) || ((Number)loan.get("renewalCount")).intValue()!=0 || LocalDate.parse(String.valueOf(loan.get("dueDate"))).isBefore(today()) || users.hasOverdue(actor) || reservations.hasActiveForBook(bookId))
            throw ApiException.rule("RENEWAL_NOT_ALLOWED","该借阅当前不可续借");
        LocalDate newDue=LocalDate.parse(String.valueOf(loan.get("dueDate"))).plusDays(15);
        if(mapper.renew(id,newDue)!=1) throw ApiException.conflict("STATE_CONFLICT","借阅状态已变化");
        audit.record(actor,"LOAN_RENEWED","LOAN",id);return Map.of("dueDate",newDue.toString(),"renewalCount",1);
    }
    public Map<String,Object> list(Long readerId,String readerKeyword,String barcode,String status,Boolean overdue,Paging paging) {
        LocalDate today=today();List<Map<String,Object>> items=new ArrayList<>();
        mapper.list(readerId,readerKeyword,barcode,status,overdue,today,paging.offset(),paging.size()).forEach(r -> items.add(dto(Rows.row(r))));
        return Paging.of(items,paging,mapper.count(readerId,readerKeyword,barcode,status,overdue,today));
    }
    private Map<String,Object> dto(Map<String,Object> loan) {
        Map<String,Object> out=new LinkedHashMap<>();
        for(String key:new String[]{"id","bookId","copyId","readerId","readerName","bookTitle","copyBarcode","borrowedAt","dueDate","returnedAt","renewalCount","status"}) out.put(key,loan.get(key));
        LocalDate due=LocalDate.parse(String.valueOf(loan.get("dueDate")));
        long overdue="ACTIVE".equals(loan.get("status")) ? Math.max(0,ChronoUnit.DAYS.between(due,today())) : 0;
        out.put("overdueDays",overdue);
        boolean canRenew="ACTIVE".equals(loan.get("status")) && overdue==0 && ((Number)loan.get("renewalCount")).intValue()==0 && !reservations.hasActiveForBook(((Number)loan.get("bookId")).longValue());
        Map<String,Object> allowed=new LinkedHashMap<>();allowed.put("canRenew",canRenew);allowed.put("reasonCode",canRenew?null:"RENEWAL_NOT_ALLOWED");out.put("allowedActions",allowed);
        return out;
    }
}
