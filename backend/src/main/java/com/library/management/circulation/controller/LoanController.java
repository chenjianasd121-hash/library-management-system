package com.library.management.circulation.controller;

import com.library.management.auth.Access;
import com.library.management.circulation.service.LoanService;
import com.library.management.common.ApiException;
import com.library.management.common.ApiResponse;
import com.library.management.common.Paging;
import java.util.Map;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1")
public class LoanController {
    private final LoanService service;
    public LoanController(LoanService service) { this.service=service; }
    public record Checkout(@NotNull Long readerId,@NotBlank String copyBarcode) {}
    public record Return(@NotBlank String copyBarcode) {}
    @PostMapping("/loans") public ResponseEntity<?> checkout(@Valid @RequestBody Checkout body,@RequestHeader(value="Idempotency-Key",required=false) String key) {
        long actor=Access.staff().id();if(body.readerId()==null || body.copyBarcode()==null) throw ApiException.bad("VALIDATION_ERROR","读者和副本条码必填");
        return ResponseEntity.status(201).body(ApiResponse.ok(service.checkout(actor,body.readerId(),body.copyBarcode(),key)));
    }
    @PostMapping("/loans/{id}/return") public ApiResponse<Map<String,Object>> returnLoan(@PathVariable long id,@Valid @RequestBody Return body,@RequestHeader(value="Idempotency-Key",required=false) String key) {
        long actor=Access.staff().id();if(body.copyBarcode()==null) throw ApiException.bad("VALIDATION_ERROR","副本条码必填");
        return ApiResponse.ok(service.returnLoan(actor,id,body.copyBarcode(),key));
    }
    @PostMapping("/loans/{id}/renew") public ApiResponse<Map<String,Object>> renew(@PathVariable long id,@RequestHeader(value="Idempotency-Key",required=false) String key) {
        return ApiResponse.ok(service.renew(Access.reader().id(),id,key));
    }
    @GetMapping("/loans") public ApiResponse<Map<String,Object>> all(@RequestParam(required=false) String readerKeyword,@RequestParam(required=false) String barcode,@RequestParam(required=false) String status,@RequestParam(required=false) Boolean overdue,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int size) {
        Access.staff();return ApiResponse.ok(service.list(null,readerKeyword,barcode,status,overdue,new Paging(page,size)));
    }
    @GetMapping("/me/loans") public ApiResponse<Map<String,Object>> mine(@RequestParam(required=false) String status,@RequestParam(required=false) Boolean overdue,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int size) {
        return ApiResponse.ok(service.list(Access.reader().id(),null,null,status,overdue,new Paging(page,size)));
    }
}
