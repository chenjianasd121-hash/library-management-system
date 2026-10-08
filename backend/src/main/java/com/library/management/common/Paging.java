package com.library.management.common;

import java.util.List;
import java.util.Map;

public record Paging(int page, int size) {
    public Paging { if (page < 1 || size < 1 || size > 100) throw ApiException.bad("VALIDATION_ERROR", "分页参数不合法"); }
    public int offset() { return (page-1)*size; }
    public static <T> Map<String,Object> of(List<T> items, Paging paging, long total) {
        return Map.of("items", items, "page", paging.page, "size", paging.size, "total", total);
    }
}
