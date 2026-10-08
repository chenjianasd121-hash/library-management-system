package com.library.management.common;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log=LoggerFactory.getLogger(GlobalExceptionHandler.class);
    @ExceptionHandler(ApiException.class)
    ResponseEntity<?> api(ApiException ex) { return ResponseEntity.status(ex.status()).body(ApiResponse.error(ex.code(), ex.getMessage(), List.of())); }
    @ExceptionHandler({MethodArgumentNotValidException.class, BindException.class})
    ResponseEntity<?> validation(BindException ex) {
        var details = ex.getBindingResult().getFieldErrors().stream()
            .map(e -> new ApiResponse.FieldError(e.getField(), e.getDefaultMessage())).toList();
        return ResponseEntity.badRequest().body(ApiResponse.error("VALIDATION_ERROR", "参数不合法", details));
    }
    @ExceptionHandler({HttpMessageNotReadableException.class, MissingServletRequestParameterException.class, MethodArgumentTypeMismatchException.class, IllegalArgumentException.class})
    ResponseEntity<?> malformed(Exception ex) { return ResponseEntity.badRequest().body(ApiResponse.error("VALIDATION_ERROR", "参数不合法", List.of())); }
    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<?> uploadTooLarge(MaxUploadSizeExceededException ex) {
        return ResponseEntity.badRequest().body(ApiResponse.error("VALIDATION_ERROR", "封面大小须在 2 MiB 以内", List.of()));
    }
    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<?> duplicate(DataIntegrityViolationException ex) {
        String cause=String.valueOf(ex.getMostSpecificCause().getMessage());
        String code=cause.contains("uq_books_isbn")?"ISBN_EXISTS":cause.contains("uq_copies_barcode")?"BARCODE_EXISTS":cause.contains("uq_users_username")?"USERNAME_TAKEN":"STATE_CONFLICT";
        String message=switch(code) {case "ISBN_EXISTS" -> "ISBN 已存在";case "BARCODE_EXISTS" -> "条码已存在";case "USERNAME_TAKEN" -> "用户名已被使用";default -> "数据冲突，请刷新后重试";};
        return ResponseEntity.status(409).body(ApiResponse.error(code,message,List.of()));
    }
    @ExceptionHandler(Exception.class)
    ResponseEntity<?> unexpected(Exception ex) { log.error("Unhandled request failure",ex); return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error("INTERNAL_ERROR", "服务暂时不可用，请稍后重试", List.of())); }
}
