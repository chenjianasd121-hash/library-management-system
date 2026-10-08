package com.library.management.statistics.mapper;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface StatisticsMapper {
    Map<String,Object> overview(@Param("today") String today);
    List<Map<String,Object>> trend(@Param("from") java.sql.Timestamp from);
    List<Map<String,Object>> topBooks(@Param("from") java.sql.Timestamp from,@Param("limit") int limit);
}
