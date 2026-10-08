package com.library.management.inventory.service;

import com.library.management.catalog.service.CatalogService;
import com.library.management.common.Rows;
import com.library.management.reservation.service.ReservationService;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class InventoryWorkflowService {
    private final InventoryService inventory;
    private final CatalogService catalog;
    private final ReservationService reservations;
    public InventoryWorkflowService(InventoryService inventory,CatalogService catalog,ReservationService reservations) {this.inventory=inventory;this.catalog=catalog;this.reservations=reservations;}
    @Transactional public Map<String,Object> update(long id,String shelfLocation,String targetStatus,int version,long actor) {
        Map<String,Object> observed=inventory.byId(id);
        long bookId=((Number)observed.get("bookId")).longValue();catalog.lockBook(bookId);
        Map<String,Object> result=inventory.update(id,shelfLocation,targetStatus,version,actor);
        if("MAINTENANCE".equals(observed.get("status")) && "AVAILABLE".equals(result.get("status"))) reservations.expireAndAllocate(bookId);
        return inventory.byId(id);
    }
}
