package com.library.management.catalog.controller;

import com.library.management.auth.Access;
import com.library.management.catalog.service.CatalogService;
import com.library.management.catalog.service.CatalogWorkflowService;
import com.library.management.common.ApiException;
import com.library.management.common.ApiResponse;
import com.library.management.common.Paging;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1")
public class CatalogController {
    private final CatalogService service;
    private final CatalogWorkflowService workflow;
    public CatalogController(CatalogService service,CatalogWorkflowService workflow) { this.service=service;this.workflow=workflow; }
    public record CategoryInput(@NotBlank String name,@Pattern(regexp="[A-Za-z0-9_-]{2,32}") String code,Boolean enabled,Integer sortOrder) {}
    public record BookInput(String isbn,@NotBlank @Size(max=200) String title,@NotBlank @Size(max=120) String author,
        String publisher,String publishedOn,@Size(max=5000) String description,@NotNull Long categoryId,
        String keywords,String coverPath,@NotNull Boolean enabled) {
        Map<String,Object> toMap() {
            Map<String,Object> out=new LinkedHashMap<>();out.put("isbn",isbn);out.put("title",title);out.put("author",author);
            out.put("publisher",publisher);out.put("publishedOn",publishedOn);out.put("description",description);
            out.put("categoryId",categoryId);out.put("keywords",keywords);out.put("coverPath",coverPath);out.put("enabled",enabled);
            return out;
        }
    }
    @GetMapping("/categories") public ApiResponse<List<Map<String,Object>>> categories(@RequestParam(required=false) Boolean enabled) {
        if(!Access.isStaff() && Boolean.FALSE.equals(enabled)) throw ApiException.forbidden("FORBIDDEN","无权限查看停用分类");
        return ApiResponse.ok(service.categories(Access.isStaff()?enabled:Boolean.TRUE));
    }
    @PostMapping("/categories") public ResponseEntity<?> createCategory(@Valid @RequestBody CategoryInput body) {
        return ResponseEntity.status(201).body(ApiResponse.ok(service.saveCategory(null,body.name(),body.code(),body.enabled(),body.sortOrder(),Access.staff().id())));
    }
    @PatchMapping("/categories/{id}") public ApiResponse<Map<String,Object>> updateCategory(@PathVariable long id,@Valid @RequestBody CategoryInput body) {
        return ApiResponse.ok(service.saveCategory(id,body.name(),body.code(),body.enabled(),body.sortOrder(),Access.staff().id()));
    }
    @GetMapping("/books") public ApiResponse<Map<String,Object>> books(@RequestParam(required=false) String keyword,@RequestParam(required=false) Long categoryId,@RequestParam(required=false) Boolean availableOnly,@RequestParam(required=false) Boolean enabled,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int size) {
        if(!Access.isStaff() && Boolean.FALSE.equals(enabled)) throw ApiException.forbidden("FORBIDDEN","无权限查看下架书目");
        return ApiResponse.ok(service.books(keyword,categoryId,availableOnly,Access.isStaff()?enabled:Boolean.TRUE,new Paging(page,size)));
    }
    @GetMapping("/books/{id}") public ApiResponse<Map<String,Object>> book(@PathVariable long id) { return ApiResponse.ok(service.book(id,Access.isStaff())); }
    @PostMapping("/books") public ResponseEntity<?> createBook(@Valid @RequestBody BookInput body) {
        return ResponseEntity.status(201).body(ApiResponse.ok(workflow.saveBook(null,body.toMap(),Access.staff().id())));
    }
    @PatchMapping("/books/{id}") public ApiResponse<Map<String,Object>> updateBook(@PathVariable long id,@Valid @RequestBody BookInput body) {
        return ApiResponse.ok(workflow.saveBook(id,body.toMap(),Access.staff().id()));
    }
}
