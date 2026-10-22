package com.library.management.common.mapper;

import java.util.Map;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface IdempotencyMapper {
    Map<String,Object> find(@Param("actorId") long actorId,@Param("method") String method,@Param("path") String path,@Param("key") String key);
    int claim(@Param("actorId") long actorId,@Param("method") String method,@Param("path") String path,@Param("key") String key,@Param("hash") String hash,@Param("expiresAt") java.sql.Timestamp expiresAt);
    int complete(@Param("actorId") long actorId,@Param("method") String method,@Param("path") String path,@Param("key") String key,@Param("hash") String hash,@Param("responseCode") int responseCode,@Param("responseJson") String responseJson,@Param("expiresAt") java.sql.Timestamp expiresAt);
}
