package com.library.management.auth;

import com.library.management.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;

public final class Access {
    private Access() {}
    public static UserPrincipal user() {
        Object p = SecurityContextHolder.getContext().getAuthentication() == null ? null : SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (p instanceof UserPrincipal u) return u;
        throw new ApiException(HttpStatus.UNAUTHORIZED, "AUTH_REQUIRED", "请先登录");
    }
    public static UserPrincipal staff() { UserPrincipal u=user(); if (!u.role().equals("ADMIN") && !u.role().equals("LIBRARIAN")) throw ApiException.forbidden("FORBIDDEN", "无权限"); return u; }
    public static UserPrincipal admin() { UserPrincipal u=user(); if (!u.role().equals("ADMIN")) throw ApiException.forbidden("FORBIDDEN", "无权限"); return u; }
    public static UserPrincipal reader() { UserPrincipal u=user(); if (!u.role().equals("READER")) throw ApiException.forbidden("FORBIDDEN", "无权限"); return u; }
    public static boolean isStaff() {
        Object p = SecurityContextHolder.getContext().getAuthentication()==null ? null : SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        return p instanceof UserPrincipal u && (u.role().equals("ADMIN") || u.role().equals("LIBRARIAN"));
    }
}
