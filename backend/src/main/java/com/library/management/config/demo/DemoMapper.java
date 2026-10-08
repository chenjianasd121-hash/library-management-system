package com.library.management.config.demo;

import java.time.LocalDate;
import java.util.Map;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface DemoMapper {
    int userCount();
    int user(Map<String,Object> row);
    int category(Map<String,Object> row);
    int book(Map<String,Object> row);
    int copy(Map<String,Object> row);
    int loan(@Param("bookId") long bookId,@Param("copyId") long copyId,@Param("readerId") long readerId,@Param("handlerId") long handlerId,@Param("dueDate") LocalDate dueDate,@Param("status") String status,@Param("daysAgo") int daysAgo);
    int reservation(@Param("bookId") long bookId,@Param("readerId") long readerId,@Param("copyId") Long copyId,@Param("status") String status,@Param("deadline") LocalDate deadline);
    int notice(@Param("publisherId") long publisherId);
}
