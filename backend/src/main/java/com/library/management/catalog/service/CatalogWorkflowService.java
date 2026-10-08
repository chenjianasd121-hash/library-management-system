package com.library.management.catalog.service;

import com.library.management.reservation.service.ReservationService;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CatalogWorkflowService {
    private final CatalogService catalog;
    private final ReservationService reservations;
    public CatalogWorkflowService(CatalogService catalog,ReservationService reservations) {this.catalog=catalog;this.reservations=reservations;}
    @Transactional public Map<String,Object> saveBook(Long id,Map<String,Object> input,long actor) {
        Map<String,Object> saved=catalog.saveBook(id,input,actor);
        if(id!=null && Boolean.FALSE.equals(input.get("enabled"))) reservations.cancelAllForBook(id,actor);
        return saved;
    }
}
