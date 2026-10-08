package com.library.management.inventory.mapper;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface InventoryMapper {
    Map<String,Object> byId(@Param("id") long id);
    Map<String,Object> byBarcode(@Param("barcode") String barcode);
    Map<String,Object> lockById(@Param("id") long id);
    List<Map<String,Object>> list(@Param("bookId") long bookId,@Param("status") String status,@Param("offset") int offset,@Param("size") int size);
    long count(@Param("bookId") long bookId,@Param("status") String status);
    int insert(Map<String,Object> row);
    int updateManual(@Param("id") long id,@Param("version") int version,@Param("current") String current,@Param("target") String target,@Param("shelfLocation") String shelfLocation);
    int changeStatus(@Param("id") long id,@Param("from") String from,@Param("to") String to);
    Map<String,Object> firstAvailable(@Param("bookId") long bookId);
    Map<String,Object> activeLoan(@Param("copyId") long copyId);
    Map<String,Object> readyReservation(@Param("copyId") long copyId);
}
