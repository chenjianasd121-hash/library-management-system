package com.library.management.notice.service;

import com.library.management.audit.service.AuditService;
import com.library.management.common.ApiException;
import com.library.management.common.Paging;
import com.library.management.common.Rows;
import com.library.management.notice.mapper.NoticeMapper;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class NoticeService {
    private final NoticeMapper mapper;
    private final AuditService audit;
    public NoticeService(NoticeMapper mapper,AuditService audit) { this.mapper=mapper;this.audit=audit; }
    public Map<String,Object> byId(long id,boolean staff) {
        Map<String,Object> row=Rows.row(mapper.byId(id));
        if(!staff && !"PUBLISHED".equals(row.get("status"))) throw ApiException.notFound();
        return row;
    }
    public Map<String,Object> list(String status,Paging paging) { return Paging.of(Rows.rows(mapper.list(status,paging.offset(),paging.size())),paging,mapper.count(status)); }
    private void validate(String title,String content) {
        if(title==null || title.isBlank() || title.length()>120 || content==null || content.isBlank() || content.length()>10000) throw ApiException.bad("VALIDATION_ERROR","公告标题或内容不合法");
    }
    @Transactional public Map<String,Object> save(Long id,String title,String content,long actor) {
        validate(title,content);
        if(id==null) {Map<String,Object> row=new LinkedHashMap<>();row.put("title",title.trim());row.put("content",content);mapper.insert(row);id=((Number)row.get("id")).longValue();audit.record(actor,"NOTICE_CREATED","NOTICE",id);}
        else {byId(id,true);if(mapper.update(id,title.trim(),content)!=1) throw ApiException.conflict("STATE_CONFLICT","已发布公告不能编辑");audit.record(actor,"NOTICE_UPDATED","NOTICE",id);}
        return byId(id,true);
    }
    @Transactional public Map<String,Object> action(long id,String action,long actor) {
        byId(id,true);
        int changed=action.equals("publish")?mapper.publish(id,actor):mapper.withdraw(id);
        if(changed!=1) throw ApiException.conflict("STATE_CONFLICT","公告状态不能这样转换");
        audit.record(actor,action.equals("publish")?"NOTICE_PUBLISHED":"NOTICE_WITHDRAWN","NOTICE",id);
        return byId(id,true);
    }
}
