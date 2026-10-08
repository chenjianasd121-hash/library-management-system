package com.library.management.auth.service;

import com.library.management.auth.UserPrincipal;
import com.library.management.user.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Map;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import com.library.management.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final AuthenticationManager manager;
    private final HttpSessionSecurityContextRepository repository;
    private final UserService users;
    private final RateLimiter limiter;
    public AuthService(AuthenticationManager manager,HttpSessionSecurityContextRepository repository,UserService users,RateLimiter limiter) {
        this.manager=manager; this.repository=repository; this.users=users; this.limiter=limiter;
    }
    public Map<String,Object> login(String username,String password,String portalRole,HttpServletRequest request,HttpServletResponse response) {
        limiter.check("login:"+request.getRemoteAddr()+":"+username,10);
        Authentication auth;
        try { auth=manager.authenticate(new UsernamePasswordAuthenticationToken(username,password)); }
        catch(AuthenticationException ex) { throw new ApiException(HttpStatus.UNAUTHORIZED,"INVALID_CREDENTIALS","用户名或密码错误"); }
        UserPrincipal principal=(UserPrincipal)auth.getPrincipal();
        if(!principal.role().equals(portalRole))
            throw new ApiException(HttpStatus.UNAUTHORIZED,"INVALID_CREDENTIALS","用户名或密码错误");
        request.getSession(true); request.changeSessionId();
        SecurityContext context=SecurityContextHolder.createEmptyContext(); context.setAuthentication(auth);
        SecurityContextHolder.setContext(context); repository.saveContext(context,request,response);
        return Map.of("user",users.publicUser(principal.id()));
    }
    public long register(String username,String password,String displayName,String phone,HttpServletRequest request) {
        limiter.check("register:"+request.getRemoteAddr(),5);
        return users.register(username,password,displayName,phone);
    }
    public void refreshCurrentPrincipal(Map<String,Object> updated,HttpServletRequest request,HttpServletResponse response) {
        UserPrincipal fresh=UserPrincipal.from(updated);
        Authentication auth=new UsernamePasswordAuthenticationToken(fresh,null,fresh.getAuthorities());
        SecurityContext context=SecurityContextHolder.createEmptyContext(); context.setAuthentication(auth);
        SecurityContextHolder.setContext(context); repository.saveContext(context,request,response);
    }
}
