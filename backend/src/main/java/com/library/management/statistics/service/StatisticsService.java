package com.library.management.statistics.service;

import com.library.management.common.ApiException;
import com.library.management.common.Rows;
import com.library.management.statistics.mapper.StatisticsMapper;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class StatisticsService {
    private final StatisticsMapper mapper;
    public StatisticsService(StatisticsMapper mapper) { this.mapper=mapper; }
    public Map<String,Object> overview() {
        Map<String,Object> out=Rows.row(mapper.overview(LocalDate.now(Rows.SHANGHAI).toString()));
        out.put("generatedAt",Rows.convert(Instant.now()));return out;
    }
    public List<Map<String,Object>> trend(int days) {
        if(days<1 || days>365) throw ApiException.bad("VALIDATION_ERROR","days 须为 1–365");
        LocalDate start=LocalDate.now(Rows.SHANGHAI).minusDays(days-1);
        java.sql.Timestamp from=java.sql.Timestamp.from(start.atStartOfDay(Rows.SHANGHAI).toInstant());
        Map<String,Map<String,Object>> byDate=new LinkedHashMap<>();
        for(Map<String,Object> raw:mapper.trend(from)) {Map<String,Object> row=Rows.row(raw);byDate.put(String.valueOf(row.get("date")),row);}
        List<Map<String,Object>> result=new ArrayList<>();
        for(int i=0;i<days;i++) {String date=start.plusDays(i).toString();Map<String,Object> row=byDate.get(date);result.add(Map.of("date",date,"borrowedCount",row==null?0:row.get("borrowedCount"),"returnedCount",row==null?0:row.get("returnedCount")));}
        return result;
    }
    public List<Map<String,Object>> topBooks(int days,int limit) {
        if(days<1 || days>365 || limit<1 || limit>100) throw ApiException.bad("VALIDATION_ERROR","统计参数不合法");
        java.sql.Timestamp from=java.sql.Timestamp.from(LocalDate.now(Rows.SHANGHAI).minusDays(days-1).atStartOfDay(Rows.SHANGHAI).toInstant());
        return Rows.rows(mapper.topBooks(from,limit));
    }
}
