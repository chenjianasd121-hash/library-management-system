package com.library.management.user.mapper;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface UserMapper {
    Map<String,Object> byUsername(@Param("username") String username);
    Map<String,Object> byId(@Param("id") long id);
    Map<String,Object> lockById(@Param("id") long id);
    int insert(Map<String,Object> user);
    int updateProfile(@Param("id") long id, @Param("displayName") String displayName, @Param("phone") String phone);
    int changePassword(@Param("id") long id, @Param("hash") String hash);
    int resetPassword(@Param("id") long id, @Param("hash") String hash);
    int updateUser(@Param("id") long id, @Param("displayName") String displayName, @Param("phone") String phone, @Param("status") String status);
    int countActiveAdmins();
    List<Long> lockActiveAdminIds();
    List<Map<String,Object>> list(@Param("role") String role, @Param("status") String status, @Param("keyword") String keyword, @Param("offset") int offset, @Param("size") int size);
    long count(@Param("role") String role, @Param("status") String status, @Param("keyword") String keyword);
    Map<String,Object> readerLookup(@Param("username") String username, @Param("today") String today);
    int overdueCount(@Param("id") long id,@Param("today") String today);
}
