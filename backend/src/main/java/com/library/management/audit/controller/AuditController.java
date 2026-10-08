package com.library.management.audit.controller;

import com.library.management.audit.service.AuditService;
import com.library.management.auth.Access;
import com.library.management.common.ApiResponse;
import com.library.management.common.Paging;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController @RequestMapping("/api/v1/audit-logs")
public class AuditController {
    private final AuditService service;
    public AuditController(AuditService service) { this.service=service; }
    @GetMapping public ApiResponse<Map<String,Object>> list(@RequestParam(required=false) String action,@RequestParam(required=false) Long actorId,
      @RequestParam(required=false) String from,@RequestParam(required=false) String to,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int size) {
        Access.admin(); return ApiResponse.ok(service.list(action,actorId,from,to,new Paging(page,size)));
    }
}
