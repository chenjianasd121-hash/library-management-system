package com.library.management.common;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class Rows {
    public static final ZoneId SHANGHAI = ZoneId.of("Asia/Shanghai");
    private Rows() {}
    public static ApiRecord row(Map<String,Object> source) {
        if (source == null) throw ApiException.notFound();
        ApiRecord out = new ApiRecord();
        source.forEach((key, value) -> out.put(camel(key), convert(value)));
        return out;
    }
    public static List<Map<String,Object>> rows(List<Map<String,Object>> source) {
        List<Map<String,Object>> out = new ArrayList<>();
        source.forEach(r -> out.add(row(r)));
        return out;
    }
    public static Object convert(Object value) {
        if (value instanceof Timestamp t) return DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(t.toInstant().atZone(SHANGHAI));
        if (value instanceof Date d) return d.toLocalDate().toString();
        if (value instanceof Instant i) return DateTimeFormatter.ISO_OFFSET_DATE_TIME.format(i.atZone(SHANGHAI));
        if (value instanceof LocalDate d) return d.toString();
        return value;
    }
    public static String camel(String key) {
        StringBuilder out = new StringBuilder(); boolean upper = false;
        for (char c : key.toCharArray()) { if (c == '_') upper = true; else { out.append(upper ? Character.toUpperCase(c) : c); upper = false; } }
        return out.toString();
    }
    public static long id(Map<String,Object> row) { return ((Number)row.get("id")).longValue(); }
    public static int number(Object n) { return ((Number)n).intValue(); }
    public static boolean bool(Object n) { return n instanceof Boolean b ? b : ((Number)n).intValue()!=0; }
}
