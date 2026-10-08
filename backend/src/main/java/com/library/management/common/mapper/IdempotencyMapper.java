package com.library.management.common.mapper;

import java.util.Map;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface IdempotencyMapper {
    Map<String,Object> find(@Param("actorId") long actorId,@Param("method") String method,@Param("path") String path,@Param("key") String key);
    int deleteExpired(@Param("actorId") long actorId,@Param("method") String method,@Param("path") String path,@Param("key") String key);
    int insert(@Param("actorId") long actorId,@Param("method") String method,@Param("path") String path,@Param("key") String key,@Param("hash") String hash,@Param("responseCode") int responseCode,@Param("responseJson") String responseJson,@Param("expiresAt") java.sql.Timestamp expiresAt);
}
