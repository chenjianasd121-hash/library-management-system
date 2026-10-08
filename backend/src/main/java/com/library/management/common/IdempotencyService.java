package com.library.management.common;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.library.management.common.mapper.IdempotencyMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.stereotype.Service;

@Service
public class IdempotencyService {
    private final IdempotencyMapper mapper;
    private final ObjectMapper json;
    public IdempotencyService(IdempotencyMapper mapper,ObjectMapper json) { this.mapper=mapper;this.json=json; }
    @SuppressWarnings("unchecked")
    public <T> T execute(long actor,String method,String path,String key,Object body,int responseCode,Supplier<T> action) {
        if(key==null || key.isBlank()) return action.get();
        try { UUID.fromString(key); } catch(IllegalArgumentException ex) { throw ApiException.bad("VALIDATION_ERROR","Idempotency-Key 必须为 UUID"); }
        String hash=hash(body);
        Map<String,Object> old=mapper.find(actor,method,path,key);
        if(old!=null) {
            Object expiry=old.getOrDefault("expires_at",old.get("expiresAt"));
            if(expiry instanceof Timestamp t && t.toInstant().isAfter(Instant.now())) {
                String oldHash=String.valueOf(old.getOrDefault("request_hash",old.get("requestHash")));
                if(!hash.equals(oldHash)) throw ApiException.conflict("IDEMPOTENCY_CONFLICT","相同幂等键对应不同请求内容");
                try { return (T)json.readValue(String.valueOf(old.getOrDefault("response_json",old.get("responseJson"))),Object.class); }
                catch(JsonProcessingException ex) { throw new IllegalStateException("stored response invalid",ex); }
            }
            mapper.deleteExpired(actor,method,path,key);
        }
        T result=action.get();
        try { mapper.insert(actor,method,path,key,hash,responseCode,json.writeValueAsString(result),Timestamp.from(Instant.now().plusSeconds(86400))); }
        catch(JsonProcessingException ex) { throw new IllegalStateException("response serialization failed",ex); }
        return result;
    }
    private String hash(Object body) {
        try { byte[] bytes=json.writeValueAsBytes(body==null?Map.of():body);return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); }
        catch(JsonProcessingException|NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
}
