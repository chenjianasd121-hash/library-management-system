package com.library.management.reservation.controller;

import com.library.management.auth.Access;
import com.library.management.auth.UserPrincipal;
import com.library.management.common.ApiResponse;
import com.library.management.common.Paging;
import com.library.management.reservation.service.ReservationService;
import java.util.Map;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1")
public class ReservationController {
    private final ReservationService service;
    public ReservationController(ReservationService service) { this.service=service; }
    public record Create(@NotNull Long bookId) {}
    public record Cancel(String reason) {}
    @PostMapping("/reservations") public ResponseEntity<?> create(@Valid @RequestBody Create body,@RequestHeader(value="Idempotency-Key",required=false) String key) {
        if(body.bookId()==null) throw com.library.management.common.ApiException.bad("VALIDATION_ERROR","bookId 必填");
        return ResponseEntity.status(201).body(ApiResponse.ok(service.create(Access.reader().id(),body.bookId(),key)));
    }
    @PostMapping("/reservations/{id}/cancel") public ApiResponse<Map<String,Object>> cancel(@PathVariable long id,@RequestBody(required=false) Cancel body,@RequestHeader(value="Idempotency-Key",required=false) String key) {
        UserPrincipal actor=Access.user();boolean staff=Access.isStaff();
        return ApiResponse.ok(service.cancel(actor.id(),staff,id,body==null?null:body.reason(),key));
    }
    @GetMapping("/me/reservations") public ApiResponse<Map<String,Object>> mine(@RequestParam(required=false) String status,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int size) {
        return ApiResponse.ok(service.list(Access.reader().id(),status,null,null,new Paging(page,size)));
    }
    @GetMapping("/reservations") public ApiResponse<Map<String,Object>> all(@RequestParam(required=false) String status,@RequestParam(required=false) Long bookId,@RequestParam(required=false) String readerKeyword,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int size) {
        Access.staff();return ApiResponse.ok(service.list(null,status,bookId,readerKeyword,new Paging(page,size)));
    }
}
