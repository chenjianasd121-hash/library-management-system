package com.library.management.circulation.mapper;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface LoanMapper {
    Map<String,Object> byId(@Param("id") long id);
    Map<String,Object> lockById(@Param("id") long id);
    int insert(Map<String,Object> row);
    int activeCount(@Param("readerId") long readerId);
    int activeBookCount(@Param("readerId") long readerId,@Param("bookId") long bookId);
    int close(@Param("id") long id);
    int renew(@Param("id") long id,@Param("dueDate") LocalDate dueDate);
    List<Map<String,Object>> list(@Param("readerId") Long readerId,@Param("readerKeyword") String readerKeyword,@Param("barcode") String barcode,@Param("status") String status,@Param("overdue") Boolean overdue,@Param("today") LocalDate today,@Param("offset") int offset,@Param("size") int size);
    long count(@Param("readerId") Long readerId,@Param("readerKeyword") String readerKeyword,@Param("barcode") String barcode,@Param("status") String status,@Param("overdue") Boolean overdue,@Param("today") LocalDate today);
}
