package com.library.management.common;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

@ControllerAdvice
public class IdResponseAdvice implements ResponseBodyAdvice<Object> {
    @Override public boolean supports(MethodParameter returnType,Class<? extends HttpMessageConverter<?>> converterType) { return true; }
    @Override public Object beforeBodyWrite(Object body,MethodParameter returnType,MediaType selectedContentType,
        Class<? extends HttpMessageConverter<?>> selectedConverterType,ServerHttpRequest request,ServerHttpResponse response) {
        if(body instanceof ApiResponse<?> r) return new ApiResponse<>(r.code(),r.message(),normalize(r.data()),r.details(),r.traceId());
        return body;
    }
    private Object normalize(Object value) {
        if(value instanceof Map<?,?> map) {
            Map<String,Object> out=new LinkedHashMap<>();
            map.forEach((key,v) -> {
                String name=String.valueOf(key);
                if(v instanceof Number && (name.equals("id") || name.endsWith("Id"))) out.put(name,v.toString());
                else out.put(name,normalize(v));
            });
            return out;
        }
        if(value instanceof List<?> list) {
            List<Object> out=new ArrayList<>();list.forEach(v -> out.add(normalize(v)));return out;
        }
        return value;
    }
}
