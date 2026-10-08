package com.library.management.auth.controller;

import com.library.management.auth.Access;
import com.library.management.auth.service.AuthService;
import com.library.management.common.ApiResponse;
import com.library.management.user.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1")
public class AuthController {
    private final AuthService auth;
    private final UserService users;
    public AuthController(AuthService auth,UserService users) { this.auth=auth; this.users=users; }
    public record Register(@Pattern(regexp="[A-Za-z0-9_]{4,32}") String username,@Size(min=8,max=64) String password,@Size(min=2,max=40) String displayName,String phone) {}
    public record Login(@NotBlank String username,@NotBlank String password,
        @NotBlank @Pattern(regexp="ADMIN|LIBRARIAN|READER") String portalRole) {}
    public record Profile(@Size(min=2,max=40) String displayName,String phone) {}
    public record ChangePassword(@NotBlank String oldPassword,@Size(min=8,max=64) String newPassword) {}
    @GetMapping("/auth/csrf") public ApiResponse<Map<String,String>> csrf(CsrfToken token) { return ApiResponse.ok(Map.of("csrfToken",token.getToken())); }
    @PostMapping("/auth/register") public ResponseEntity<?> register(@Valid @RequestBody Register body,HttpServletRequest request) {
        return ResponseEntity.status(201).body(ApiResponse.ok(Map.of("userId",auth.register(body.username(),body.password(),body.displayName(),body.phone(),request))));
    }
    @PostMapping("/auth/login") public ApiResponse<Map<String,Object>> login(@Valid @RequestBody Login body,HttpServletRequest request,HttpServletResponse response) {
        return ApiResponse.ok(auth.login(body.username(),body.password(),body.portalRole(),request,response));
    }
    @PostMapping("/auth/logout") public ApiResponse<Void> logout(HttpServletRequest request) {
        SecurityContextHolder.clearContext(); if(request.getSession(false)!=null) request.getSession(false).invalidate(); return ApiResponse.ok(null);
    }
    @GetMapping("/auth/me") public ApiResponse<Map<String,Object>> me() { return ApiResponse.ok(users.publicUser(Access.user().id())); }
    @PatchMapping("/me/profile") public ApiResponse<Map<String,Object>> profile(@Valid @RequestBody Profile body) {
        return ApiResponse.ok(users.profile(Access.user().id(),body.displayName(),body.phone()));
    }
    @PostMapping("/me/change-password") public ApiResponse<Void> changePassword(@Valid @RequestBody ChangePassword body,HttpServletRequest request,HttpServletResponse response) {
        Map<String,Object> updated=users.changePassword(Access.user().id(),body.oldPassword(),body.newPassword());
        auth.refreshCurrentPrincipal(updated,request,response); return ApiResponse.ok(null);
    }
    @GetMapping("/policy") public ApiResponse<Map<String,Object>> policy() {
        return ApiResponse.ok(Map.of("maxActiveLoans",5,"loanDays",30,"renewalDays",15,"maxRenewals",1,"maxActiveReservations",3,"pickupDays",3,"timeZone","Asia/Shanghai"));
    }
}
