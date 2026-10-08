package com.library.management.inventory.service;

import com.library.management.audit.service.AuditService;
import com.library.management.catalog.service.CatalogService;
import com.library.management.common.ApiException;
import com.library.management.common.Paging;
import com.library.management.common.Rows;
import com.library.management.inventory.mapper.InventoryMapper;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InventoryService {
    private final InventoryMapper mapper;
    private final CatalogService catalog;
    private final AuditService audit;
    public InventoryService(InventoryMapper mapper,CatalogService catalog,AuditService audit) { this.mapper=mapper;this.catalog=catalog;this.audit=audit; }
    public Map<String,Object> byId(long id) { return Rows.row(mapper.byId(id)); }
    public Map<String,Object> byBarcode(String barcode) { return Rows.row(mapper.byBarcode(barcode)); }
    public Map<String,Object> lock(long id) { return Rows.row(mapper.lockById(id)); }
    public Map<String,Object> firstAvailable(long bookId) { Map<String,Object> r=mapper.firstAvailable(bookId);return r==null?null:Rows.row(r); }
    public Map<String,Object> activeLoan(long copyId) { Map<String,Object> r=mapper.activeLoan(copyId);return r==null?null:Rows.row(r); }
    public Map<String,Object> readyReservation(long copyId) { Map<String,Object> r=mapper.readyReservation(copyId);return r==null?null:Rows.row(r); }
    public Map<String,Object> list(long bookId,String status,Paging paging) {
        catalog.book(bookId,true);return Paging.of(Rows.rows(mapper.list(bookId,status,paging.offset(),paging.size())),paging,mapper.count(bookId,status));
    }
    @Transactional public List<Map<String,Object>> add(long bookId,List<String> barcodes,String shelfLocation,long actor) {
        catalog.lockBook(bookId);
        if(barcodes==null || barcodes.isEmpty() || barcodes.size()>50) throw ApiException.bad("VALIDATION_ERROR","一次须添加 1–50 册");
        if(shelfLocation==null || shelfLocation.isBlank() || shelfLocation.length()>120) throw ApiException.bad("VALIDATION_ERROR","架位不合法");
        List<Map<String,Object>> out=new ArrayList<>();
        for(String barcode:barcodes) {
            if(barcode==null || !barcode.matches("[A-Za-z0-9_-]{4,32}")) throw ApiException.bad("VALIDATION_ERROR","条码不合法");
            Map<String,Object> row=new LinkedHashMap<>();row.put("bookId",bookId);row.put("barcode",barcode);row.put("shelfLocation",shelfLocation);
            mapper.insert(row);long id=((Number)row.get("id")).longValue(); audit.record(actor,"COPY_CREATED","COPY",id);out.add(copyDto(byId(id)));
        }
        return out;
    }
    @Transactional public Map<String,Object> update(long id,String shelfLocation,String targetStatus,int version,long actor) {
        Map<String,Object> old=byId(id);
        String current=(String)old.get("status");
        if(targetStatus==null) targetStatus=current;
        if(!targetStatus.equals(current)) {
            boolean legal=(current.equals("AVAILABLE") && (targetStatus.equals("MAINTENANCE") || targetStatus.equals("RETIRED")))
              || (current.equals("MAINTENANCE") && (targetStatus.equals("AVAILABLE") || targetStatus.equals("RETIRED")));
            if(!legal) throw ApiException.conflict("STATE_CONFLICT","副本状态不能这样转换");
        }
        if(shelfLocation!=null && (shelfLocation.isBlank() || shelfLocation.length()>120)) throw ApiException.bad("VALIDATION_ERROR","架位不合法");
        if(mapper.updateManual(id,version,current,targetStatus,shelfLocation)!=1) throw ApiException.conflict("STATE_CONFLICT","副本已被其他操作修改，请刷新");
        audit.record(actor,"COPY_UPDATED","COPY",id);return copyDto(byId(id));
    }
    public void changeStatus(long id,String from,String to) {
        if(mapper.changeStatus(id,from,to)!=1) throw ApiException.conflict("COPY_NOT_AVAILABLE","副本状态已变化");
    }
    public Map<String,Object> lookup(String barcode) {
        Map<String,Object> copy=byBarcode(barcode);
        Map<String,Object> result=new LinkedHashMap<>();result.put("copy",copy);result.put("readyForReaderId",null);result.put("activeLoan",null);
        if("READY".equals(copy.get("status"))) { Map<String,Object> hold=readyReservation(Rows.id(copy));if(hold!=null) result.put("readyForReaderId",hold.get("readerId")); }
        if("BORROWED".equals(copy.get("status"))) result.put("activeLoan",activeLoan(Rows.id(copy)));
        return result;
    }
    private Map<String,Object> copyDto(Map<String,Object> copy) { Map<String,Object> out=new LinkedHashMap<>();for(String key:new String[]{"id","barcode","shelfLocation","status","version"}) out.put(key,copy.get(key));return out; }
}
