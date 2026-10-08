package com.library.management.auth;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import com.library.management.common.Rows;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public record UserPrincipal(long id, String username, String password, String role, String status,
                            boolean mustChangePassword, long sessionVersion) implements UserDetails {
    public static UserPrincipal from(Map<String,Object> row) {
        row = Rows.row(row);
        return new UserPrincipal(((Number)row.get("id")).longValue(), (String)row.get("username"),
            (String)row.get("passwordHash"), (String)row.get("role"), (String)row.get("status"),
            (Boolean)row.get("mustChangePassword"), ((Number)row.get("sessionVersion")).longValue());
    }
    @Override public Collection<? extends GrantedAuthority> getAuthorities() { return List.of(new SimpleGrantedAuthority("ROLE_"+role)); }
    @Override public String getPassword() { return password; }
    @Override public String getUsername() { return username; }
    @Override public boolean isEnabled() { return "ACTIVE".equals(status); }
}
