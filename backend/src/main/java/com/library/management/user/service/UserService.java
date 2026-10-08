package com.library.management.user.service;

import com.library.management.audit.service.AuditService;
import com.library.management.auth.UserPrincipal;
import com.library.management.common.ApiException;
import com.library.management.common.Paging;
import com.library.management.common.Rows;
import com.library.management.user.mapper.UserMapper;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserService implements UserDetailsService {
    private final UserMapper mapper;
    private final PasswordEncoder encoder;
    private final AuditService audit;
    public UserService(UserMapper mapper, PasswordEncoder encoder, AuditService audit) { this.mapper=mapper; this.encoder=encoder; this.audit=audit; }
    @Override public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        Map<String,Object> row=mapper.byUsername(username);
        if(row==null) throw new UsernameNotFoundException("invalid credentials");
        return UserPrincipal.from(row);
    }
    public Map<String,Object> raw(long id) { return Rows.row(mapper.byId(id)); }
    public Map<String,Object> lock(long id) { return Rows.row(mapper.lockById(id)); }
    public Map<String,Object> publicUser(long id) { return sanitized(raw(id)); }
    private Map<String,Object> sanitized(Map<String,Object> row) {
        Map<String,Object> out=new LinkedHashMap<>();
        for(String k:new String[]{"id","username","displayName","phone","role","status","mustChangePassword"}) out.put(k,row.get(k));
        return out;
    }
    private void validateCredentials(String username,String password,String displayName) {
        if(username==null || !username.trim().matches("[A-Za-z0-9_]{4,32}")) throw ApiException.bad("VALIDATION_ERROR","用户名格式不正确");
        if(password==null || password.length()<8 || password.length()>64) throw ApiException.bad("VALIDATION_ERROR","密码需为 8–64 位");
        if(displayName==null || displayName.trim().length()<2 || displayName.trim().length()>40) throw ApiException.bad("VALIDATION_ERROR","显示名需为 2–40 字");
    }
    @Transactional public long register(String username,String password,String displayName,String phone) {
        return createInternal(null,username,password,displayName,phone,"READER",false);
    }
    @Transactional public Map<String,Object> createStaff(long actorId,String username,String password,String displayName,String role) {
        if(!"ADMIN".equals(role) && !"LIBRARIAN".equals(role)) throw ApiException.bad("VALIDATION_ERROR","仅可创建员工账号");
        long id=createInternal(actorId,username,password,displayName,null,role,true);
        return publicUser(id);
    }
    private long createInternal(Long actorId,String username,String password,String displayName,String phone,String role,boolean mustChange) {
        validateCredentials(username,password,displayName);
        username=username.trim();
        if(mapper.byUsername(username)!=null) throw ApiException.conflict("USERNAME_TAKEN","用户名已被使用");
        Map<String,Object> row=new LinkedHashMap<>();
        row.put("username",username); row.put("passwordHash",encoder.encode(password)); row.put("displayName",displayName.trim());
        row.put("phone",phone); row.put("role",role); row.put("status","ACTIVE"); row.put("mustChangePassword",mustChange);
        mapper.insert(row); long id=((Number)row.get("id")).longValue();
        audit.record(actorId,"USER_CREATED","USER",id); return id;
    }
    @Transactional public Map<String,Object> profile(long id,String displayName,String phone) {
        if(displayName==null || displayName.trim().length()<2 || displayName.trim().length()>40) throw ApiException.bad("VALIDATION_ERROR","显示名需为 2–40 字");
        mapper.updateProfile(id,displayName.trim(),phone); return publicUser(id);
    }
    @Transactional public Map<String,Object> changePassword(long id,String oldPassword,String newPassword) {
        Map<String,Object> row=lock(id);
        if(!encoder.matches(oldPassword,(String)row.get("passwordHash"))) throw ApiException.rule("PASSWORD_INCORRECT","当前密码不正确");
        if(newPassword==null || newPassword.length()<8 || newPassword.length()>64) throw ApiException.bad("VALIDATION_ERROR","新密码需为 8–64 位");
        mapper.changePassword(id,encoder.encode(newPassword)); audit.record(id,"PASSWORD_CHANGED","USER",id);
        return raw(id);
    }
    public Map<String,Object> list(String role,String status,String keyword,Paging paging) {
        return Paging.of(mapper.list(role,status,keyword,paging.offset(),paging.size()).stream().map(r -> sanitized(Rows.row(r))).toList(),paging,mapper.count(role,status,keyword));
    }
    @Transactional public Map<String,Object> update(long actorId,long id,String displayName,String phone,String status) {
        if("DISABLED".equals(status)) mapper.lockActiveAdminIds();
        Map<String,Object> old=lock(id);
        if(status!=null && !status.equals("ACTIVE") && !status.equals("DISABLED")) throw ApiException.bad("VALIDATION_ERROR","账号状态不合法");
        if("DISABLED".equals(status) && !"DISABLED".equals(old.get("status"))) {
            if(actorId==id) throw ApiException.conflict("STATE_CONFLICT","不能禁用当前账号");
            if("ADMIN".equals(old.get("role")) && mapper.countActiveAdmins()<=1) throw ApiException.conflict("STATE_CONFLICT","不能禁用最后一位管理员");
        }
        if(displayName!=null && (displayName.trim().length()<2 || displayName.trim().length()>40)) throw ApiException.bad("VALIDATION_ERROR","显示名不合法");
        mapper.updateUser(id,displayName,phone,status); audit.record(actorId,"USER_UPDATED","USER",id); return publicUser(id);
    }
    @Transactional public Map<String,Object> resetPassword(long actorId,long id,String newPassword) {
        lock(id);
        if(newPassword==null || newPassword.length()<8 || newPassword.length()>64) throw ApiException.bad("VALIDATION_ERROR","密码需为 8–64 位");
        mapper.resetPassword(id,encoder.encode(newPassword)); audit.record(actorId,"PASSWORD_RESET","USER",id);
        return Map.of("mustChangePassword",true);
    }
    public Map<String,Object> readerLookup(String username) {
        Map<String,Object> row=mapper.readerLookup(username,LocalDate.now(Rows.SHANGHAI).toString());
        return Rows.row(row);
    }
    public boolean hasOverdue(long id) { return mapper.overdueCount(id,LocalDate.now(Rows.SHANGHAI).toString())>0; }
}
