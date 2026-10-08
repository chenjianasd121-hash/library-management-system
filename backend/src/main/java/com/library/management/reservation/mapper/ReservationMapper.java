package com.library.management.reservation.mapper;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface ReservationMapper {
    Map<String,Object> byId(@Param("id") long id);
    Map<String,Object> lockById(@Param("id") long id);
    int insert(Map<String,Object> row);
    int countActiveReader(@Param("readerId") long readerId);
    int countActiveBook(@Param("bookId") long bookId);
    int countWaiting(@Param("bookId") long bookId);
    int hasActiveReaderBook(@Param("readerId") long readerId,@Param("bookId") long bookId);
    int hasActiveLoan(@Param("readerId") long readerId,@Param("bookId") long bookId);
    Map<String,Object> firstWaiting(@Param("bookId") long bookId);
    Map<String,Object> readyForCopy(@Param("copyId") long copyId);
    List<Map<String,Object>> expiredForBook(@Param("bookId") long bookId,@Param("today") String today);
    List<Long> expiredBookIds(@Param("today") String today);
    int markReady(@Param("id") long id,@Param("copyId") long copyId,@Param("deadline") String deadline);
    int close(@Param("id") long id,@Param("from") String from,@Param("to") String to);
    int fulfill(@Param("id") long id);
    List<Map<String,Object>> list(@Param("readerId") Long readerId,@Param("status") String status,@Param("bookId") Long bookId,@Param("readerKeyword") String readerKeyword,@Param("offset") int offset,@Param("size") int size);
    long count(@Param("readerId") Long readerId,@Param("status") String status,@Param("bookId") Long bookId,@Param("readerKeyword") String readerKeyword);
    List<Long> activeIdsForReader(@Param("readerId") long readerId);
    List<Long> activeIdsForBook(@Param("bookId") long bookId);
}
