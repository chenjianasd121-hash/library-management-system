package com.library.management.common;

import java.util.List;
import org.slf4j.MDC;

public record ApiResponse<T>(String code, String message, T data, List<FieldError> details, String traceId) {
    public record FieldError(String field, String message) {}
    public static <T> ApiResponse<T> ok(T data) { return new ApiResponse<>("OK", "成功", data, null, MDC.get("traceId")); }
    public static ApiResponse<Void> error(String code, String message, List<FieldError> details) {
        return new ApiResponse<>(code, message, null, details, MDC.get("traceId"));
    }
}
