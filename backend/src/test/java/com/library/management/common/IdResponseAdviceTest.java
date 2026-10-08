package com.library.management.common;

import static org.assertj.core.api.Assertions.assertThat;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class IdResponseAdviceTest {
    @Test void stringifiesOnlyIdsAndPreservesNumericMetrics() {
        IdResponseAdvice advice=new IdResponseAdvice();
        ApiResponse<?> input=ApiResponse.ok(Map.of("items",List.of(Map.of("id",123L,"bookId",456L,"borrowCount",7L)),"total",1L));
        ApiResponse<?> output=(ApiResponse<?>)advice.beforeBodyWrite(input,null,null,null,null,null);
        Map<?,?> data=(Map<?,?>)output.data();
        Map<?,?> first=(Map<?,?>)((List<?>)data.get("items")).get(0);
        assertThat(first.get("id")).isEqualTo("123");
        assertThat(first.get("bookId")).isEqualTo("456");
        assertThat(first.get("borrowCount")).isEqualTo(7L);
        assertThat(data.get("total")).isEqualTo(1L);
    }
}
