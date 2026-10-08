package com.library.management.user.service;

import com.library.management.reservation.service.ReservationService;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserWorkflowService {
    private final UserService users;
    private final ReservationService reservations;
    public UserWorkflowService(UserService users,ReservationService reservations) {this.users=users;this.reservations=reservations;}
    @Transactional public Map<String,Object> update(long actor,long id,String displayName,String phone,String status) {
        Map<String,Object> updated=users.update(actor,id,displayName,phone,status);
        if("DISABLED".equals(status)) reservations.cancelAllForReader(id,actor);
        return updated;
    }
}
