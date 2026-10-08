package com.library.management.audit.mapper;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface AuditMapper {
    int insert(@Param("actorId") Long actorId, @Param("action") String action, @Param("entityType") String entityType,
               @Param("entityId") long entityId, @Param("beforeJson") String beforeJson, @Param("afterJson") String afterJson,
               @Param("traceId") String traceId);
    List<Map<String,Object>> list(@Param("action") String action, @Param("actorId") Long actorId,
          @Param("from") String from, @Param("to") String to, @Param("offset") int offset, @Param("size") int size);
    long count(@Param("action") String action, @Param("actorId") Long actorId, @Param("from") String from, @Param("to") String to);
}
