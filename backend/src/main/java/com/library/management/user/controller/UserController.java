package com.library.management.user.controller;

import com.library.management.auth.Access;
import com.library.management.common.ApiResponse;
import com.library.management.common.Paging;
import com.library.management.user.service.UserService;
import com.library.management.user.service.UserWorkflowService;
import java.util.Map;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1")
public class UserController {
    private final UserService service;
    private final UserWorkflowService workflow;
    public UserController(UserService service,UserWorkflowService workflow) { this.service=service;this.workflow=workflow; }
    public record CreateUser(@Pattern(regexp="[A-Za-z0-9_]{4,32}") String username,@Size(min=8,max=64) String initialPassword,@Size(min=2,max=40) String displayName,String role) {}
    public record UpdateUser(String displayName,String phone,String status) {}
    public record ResetPassword(String newPassword) {}
    @GetMapping("/users") public ApiResponse<Map<String,Object>> users(@RequestParam(required=false) String role,@RequestParam(required=false) String status,@RequestParam(required=false) String keyword,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int size) {
        Access.admin(); return ApiResponse.ok(service.list(role,status,keyword,new Paging(page,size)));
    }
    @GetMapping("/users/{id}") public ApiResponse<Map<String,Object>> user(@PathVariable long id) { Access.admin(); return ApiResponse.ok(service.publicUser(id)); }
    @PostMapping("/users") public ResponseEntity<?> create(@Valid @RequestBody CreateUser request) {
        long actor=Access.admin().id(); return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(service.createStaff(actor,request.username(),request.initialPassword(),request.displayName(),request.role())));
    }
    @PatchMapping("/users/{id}") public ApiResponse<Map<String,Object>> update(@PathVariable long id,@RequestBody UpdateUser request) {
        return ApiResponse.ok(workflow.update(Access.admin().id(),id,request.displayName(),request.phone(),request.status()));
    }
    @PostMapping("/users/{id}/reset-password") public ApiResponse<Map<String,Object>> reset(@PathVariable long id,@RequestBody ResetPassword request) {
        return ApiResponse.ok(service.resetPassword(Access.admin().id(),id,request.newPassword()));
    }
    @GetMapping("/readers/lookup") public ApiResponse<Map<String,Object>> reader(@RequestParam String username) {
        Access.staff(); return ApiResponse.ok(service.readerLookup(username));
    }
}
