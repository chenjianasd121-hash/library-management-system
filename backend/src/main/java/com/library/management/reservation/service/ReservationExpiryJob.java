package com.library.management.reservation.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class ReservationExpiryJob {
    private final ReservationService reservations;
    public ReservationExpiryJob(ReservationService reservations) { this.reservations=reservations; }
    @Scheduled(cron="0 5 0 * * *",zone="Asia/Shanghai")
    public void expire() { for(Long bookId:reservations.expiredBookIds()) reservations.expireBook(bookId); }
}
