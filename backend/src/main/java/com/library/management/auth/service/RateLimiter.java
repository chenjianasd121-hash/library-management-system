package com.library.management.auth.service;

import com.library.management.common.ApiException;
import java.time.Instant;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class RateLimiter {
    private record Counter(long window, int count) {}
    private final ConcurrentHashMap<String,Counter> counters=new ConcurrentHashMap<>();
    public void check(String key,int maxPerMinute) {
        long window=Instant.now().getEpochSecond()/60;
        Counter result=counters.compute(key,(k,v) -> v==null || v.window()!=window ? new Counter(window,1) : new Counter(window,v.count()+1));
        if(result.count()>maxPerMinute) throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,"RATE_LIMITED","请求过于频繁，请稍后重试");
        if(counters.size()>10000) counters.entrySet().removeIf(e -> e.getValue().window()<window-2);
    }
}
