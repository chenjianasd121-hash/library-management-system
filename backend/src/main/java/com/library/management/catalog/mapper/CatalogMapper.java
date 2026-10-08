package com.library.management.catalog.mapper;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface CatalogMapper {
    List<Map<String,Object>> categories(@Param("enabled") Boolean enabled);
    Map<String,Object> category(@Param("id") long id);
    int insertCategory(Map<String,Object> row);
    int updateCategory(@Param("id") long id,@Param("name") String name,@Param("code") String code,@Param("enabled") Boolean enabled,@Param("sortOrder") Integer sortOrder);
    Map<String,Object> book(@Param("id") long id);
    Map<String,Object> lockBook(@Param("id") long id);
    List<Map<String,Object>> books(@Param("keyword") String keyword,@Param("categoryId") Long categoryId,@Param("enabled") Boolean enabled,@Param("availableOnly") Boolean availableOnly,@Param("offset") int offset,@Param("size") int size);
    long countBooks(@Param("keyword") String keyword,@Param("categoryId") Long categoryId,@Param("enabled") Boolean enabled,@Param("availableOnly") Boolean availableOnly);
    int insertBook(Map<String,Object> row);
    int updateBook(Map<String,Object> row);
}
