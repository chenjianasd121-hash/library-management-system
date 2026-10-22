package com.library.management.common;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.library.management.common.mapper.IdempotencyMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Map;
import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.UUID;
import java.util.function.Supplier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class IdempotencyService {
    private final IdempotencyMapper mapper;
    private final ObjectMapper json;
    public IdempotencyService(IdempotencyMapper mapper,ObjectMapper json) { this.mapper=mapper;this.json=json; }
    @SuppressWarnings("unchecked")
    @Transactional(isolation=Isolation.READ_COMMITTED)
    public <T> T execute(long actor,String method,String path,String key,Object body,int responseCode,Runnable prepare,Supplier<T> action) {
        if(key==null || key.isBlank()) { prepare.run();return action.get(); }
        try { UUID.fromString(key); } catch(IllegalArgumentException ex) { throw ApiException.bad("VALIDATION_ERROR","Idempotency-Key 必须为 UUID"); }
        String hash=hash(body);
        Timestamp expiresAt=Timestamp.from(Instant.now().plusSeconds(86400));
        // Replay precedes resource lookup, so changed payloads retain the original conflict contract.
        Map<String,Object> old=mapper.find(actor,method,path,key);
        if(completed(old)) return replay(old,hash,body);
        prepare.run();
        // The unique scope row serializes same-key requests until the owning transaction commits.
        mapper.claim(actor,method,path,key,hash,expiresAt);
        old=mapper.find(actor,method,path,key);
        if(completed(old)) return replay(old,hash,body);
        T result=action.get();
        try { mapper.complete(actor,method,path,key,hash,responseCode,json.writeValueAsString(result),expiresAt); }
        catch(JsonProcessingException ex) { throw new IllegalStateException("response serialization failed",ex); }
        return result;
    }
    private boolean completed(Map<String,Object> old) {
        if(old==null) return false;
        Object expiry=old.getOrDefault("expires_at",old.get("expiresAt"));
        Object code=old.getOrDefault("response_code",old.get("responseCode"));
        return code instanceof Number n && n.intValue()>0 && expiry instanceof Timestamp t && t.toInstant().isAfter(Instant.now());
    }
    @SuppressWarnings("unchecked")
    private <T> T replay(Map<String,Object> old,String hash,Object body) {
        String oldHash=String.valueOf(old.getOrDefault("request_hash",old.get("requestHash")));
        boolean matches=hash.equals(oldHash);
        // Old flow payloads have at most two fields. Accept either legacy map order during their TTL.
        if(!matches && body instanceof Map<?,?> map && map.size()<=2) {
            var entries=new ArrayList<>(map.entrySet());Collections.reverse(entries);
            Map<Object,Object> reversed=new LinkedHashMap<>();entries.forEach(entry -> reversed.put(entry.getKey(),entry.getValue()));
            matches=legacyHash(body).equals(oldHash) || legacyHash(reversed).equals(oldHash);
        }
        if(!matches) throw ApiException.conflict("IDEMPOTENCY_CONFLICT","相同幂等键对应不同请求内容");
        try { return (T)json.readValue(String.valueOf(old.getOrDefault("response_json",old.get("responseJson"))),Object.class); }
        catch(JsonProcessingException ex) { throw new IllegalStateException("stored response invalid",ex); }
    }
    private String hash(Object body) {
        return digest(body,true);
    }
    private String legacyHash(Object body) { return digest(body,false); }
    private String digest(Object body,boolean canonical) {
        try { var writer=canonical?json.writer().with(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS):json.writer();byte[] bytes=writer.writeValueAsBytes(body==null?Map.of():body);return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); }
        catch(JsonProcessingException|NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
}
