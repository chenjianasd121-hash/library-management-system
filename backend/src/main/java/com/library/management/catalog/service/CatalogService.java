package com.library.management.catalog.service;

import com.library.management.audit.service.AuditService;
import com.library.management.catalog.mapper.CatalogMapper;
import com.library.management.common.ApiException;
import com.library.management.common.Paging;
import com.library.management.common.Rows;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CatalogService {
    private final CatalogMapper mapper;
    private final AuditService audit;
    public CatalogService(CatalogMapper mapper,AuditService audit) { this.mapper=mapper; this.audit=audit; }
    public List<Map<String,Object>> categories(Boolean enabled) { return Rows.rows(mapper.categories(enabled)); }
    public Map<String,Object> category(long id) { return Rows.row(mapper.category(id)); }
    @Transactional public Map<String,Object> saveCategory(Long id,String name,String code,Boolean enabled,Integer sortOrder,long actor) {
        if(name==null || name.isBlank() || name.length()>80 || code==null || !code.matches("[A-Za-z0-9_-]{2,32}")) throw ApiException.bad("VALIDATION_ERROR","分类名称或编码不合法");
        if(id==null) { Map<String,Object> row=new LinkedHashMap<>(); row.put("name",name.trim());row.put("code",code.trim());row.put("enabled",enabled==null?true:enabled);row.put("sortOrder",sortOrder==null?0:sortOrder);mapper.insertCategory(row);id=((Number)row.get("id")).longValue(); }
        else { category(id); mapper.updateCategory(id,name.trim(),code.trim(),enabled,sortOrder); }
        audit.record(actor,"CATEGORY_SAVED","CATEGORY",id); return category(id);
    }
    public Map<String,Object> book(long id,boolean staff) {
        Map<String,Object> row=Rows.row(mapper.book(id));
        if(!staff && !Rows.bool(row.get("enabled"))) throw ApiException.notFound();
        return row;
    }
    public Map<String,Object> lockBook(long id) { return Rows.row(mapper.lockBook(id)); }
    public Map<String,Object> books(String keyword,Long categoryId,Boolean availableOnly,Boolean enabled,Paging paging) {
        if(keyword!=null && keyword.length()>100) throw ApiException.bad("VALIDATION_ERROR","关键词过长");
        return Paging.of(Rows.rows(mapper.books(keyword,categoryId,enabled,availableOnly,paging.offset(),paging.size())),paging,mapper.countBooks(keyword,categoryId,enabled,availableOnly));
    }
    @Transactional public Map<String,Object> saveBook(Long id,Map<String,Object> input,long actor) {
        String title=(String)input.get("title"),author=(String)input.get("author"),isbn=(String)input.get("isbn");
        if(title==null || title.isBlank() || title.length()>200 || author==null || author.isBlank() || author.length()>120) throw ApiException.bad("VALIDATION_ERROR","书名或作者不合法");
        if(isbn!=null && !isbn.isBlank()) { isbn=isbn.replace("-","").replace(" ",""); if(!validIsbn13(isbn)) throw ApiException.bad("VALIDATION_ERROR","ISBN-13 不合法"); }
        else isbn=null;
        long categoryId=Long.parseLong(String.valueOf(input.get("categoryId")));
        if(!Rows.bool(category(categoryId).get("enabled"))) throw ApiException.rule("STATE_CONFLICT","分类已停用");
        Object publishedOn=input.get("publishedOn");
        if(publishedOn!=null && LocalDate.parse(publishedOn.toString()).isAfter(LocalDate.now(Rows.SHANGHAI))) throw ApiException.bad("VALIDATION_ERROR","出版日期不能晚于今天");
        if(input.get("description") instanceof String d && d.length()>5000) throw ApiException.bad("VALIDATION_ERROR","简介过长");
        Map<String,Object> row=new LinkedHashMap<>(input); row.put("isbn",isbn); row.put("title",title.trim());row.put("author",author.trim());row.put("categoryId",categoryId);
        row.putIfAbsent("publisher",null);row.putIfAbsent("publishedOn",null);row.putIfAbsent("description",null);row.putIfAbsent("coverPath",null);row.putIfAbsent("keywords",null);row.putIfAbsent("enabled",true);
        if(id==null) { mapper.insertBook(row); id=((Number)row.get("id")).longValue(); }
        else { lockBook(id);row.put("id",id);mapper.updateBook(row); }
        audit.record(actor,"BOOK_SAVED","BOOK",id);return book(id,true);
    }
    private static boolean validIsbn13(String isbn) {
        if(!isbn.matches("[0-9]{13}")) return false;
        int sum=0;for(int i=0;i<13;i++) sum+=(isbn.charAt(i)-'0')*(i%2==0?1:3);return sum%10==0;
    }
}
