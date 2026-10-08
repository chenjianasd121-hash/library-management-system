package com.library.management.audit.service;

import com.library.management.audit.mapper.AuditMapper;
import com.library.management.common.Paging;
import com.library.management.common.Rows;
import java.util.Map;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;

@Service
public class AuditService {
    private final AuditMapper mapper;
    public AuditService(AuditMapper mapper) { this.mapper=mapper; }
    public void record(Long actorId, String action, String entityType, long entityId) {
        mapper.insert(actorId,action,entityType,entityId,null,null,MDC.get("traceId"));
    }
    public Map<String,Object> list(String action, Long actorId, String from, String to, Paging paging) {
        return Paging.of(Rows.rows(mapper.list(action,actorId,from,to,paging.offset(),paging.size())),paging,mapper.count(action,actorId,from,to));
    }
}
