package com.library.management.notice.mapper;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface NoticeMapper {
    Map<String,Object> byId(@Param("id") long id);
    List<Map<String,Object>> list(@Param("status") String status,@Param("offset") int offset,@Param("size") int size);
    long count(@Param("status") String status);
    int insert(Map<String,Object> row);
    int update(@Param("id") long id,@Param("title") String title,@Param("content") String content);
    int publish(@Param("id") long id,@Param("actor") long actor);
    int withdraw(@Param("id") long id);
}
