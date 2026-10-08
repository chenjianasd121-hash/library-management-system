package com.library.management.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.library.management.auth.UserPrincipal;
import com.library.management.common.Rows;
import com.library.management.user.service.UserService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.Map;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class AccountGateFilter extends OncePerRequestFilter {
    private final UserService users;
    private final ObjectMapper json;
    public AccountGateFilter(UserService users,ObjectMapper json) { this.users=users; this.json=json; }
    @Override protected void doFilterInternal(HttpServletRequest request,HttpServletResponse response,FilterChain chain) throws ServletException,IOException {
        Object principal=SecurityContextHolder.getContext().getAuthentication()==null ? null : SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String path=request.getRequestURI().startsWith("/api/v1") ? request.getRequestURI().substring("/api/v1".length()) : "";
        boolean publicAuth=path.equals("/auth/csrf") || path.equals("/auth/login") || path.equals("/auth/register");
        if(principal instanceof UserPrincipal user && request.getRequestURI().startsWith("/api/v1/") && !publicAuth) {
            String portalRole=request.getHeader("X-Portal-Role");
            if(portalRole!=null && !portalRole.equals(user.role())) {
                SecurityConfig.write(json,response,403,"PORTAL_ROLE_MISMATCH","请使用对应身份的入口"); return;
            }
            Map<String,Object> current;
            try { current=users.raw(user.id()); }
            catch(Exception ex) { current=null; }
            if(current==null || !"ACTIVE".equals(current.get("status"))) {
                SecurityContextHolder.clearContext(); if(request.getSession(false)!=null) request.getSession(false).invalidate();
                SecurityConfig.write(json,response,403,"ACCOUNT_DISABLED","账号已停用"); return;
            }
            if(((Number)current.get("sessionVersion")).longValue()!=user.sessionVersion()) {
                SecurityContextHolder.clearContext(); if(request.getSession(false)!=null) request.getSession(false).invalidate();
                SecurityConfig.write(json,response,401,"AUTH_REQUIRED","会话已失效，请重新登录"); return;
            }
            if(Boolean.TRUE.equals(current.get("mustChangePassword")) && !path.equals("/auth/me") && !path.equals("/auth/csrf") && !path.equals("/auth/logout") && !path.equals("/me/change-password")) {
                SecurityConfig.write(json,response,403,"PASSWORD_CHANGE_REQUIRED","请先修改密码"); return;
            }
        }
        chain.doFilter(request,response);
    }
}
