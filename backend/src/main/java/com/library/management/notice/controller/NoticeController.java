package com.library.management.notice.controller;

import com.library.management.auth.Access;
import com.library.management.common.ApiException;
import com.library.management.common.ApiResponse;
import com.library.management.common.Paging;
import com.library.management.notice.service.NoticeService;
import java.util.Map;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/notices")
public class NoticeController {
    private final NoticeService service;
    public NoticeController(NoticeService service) { this.service=service; }
    public record Input(@NotBlank @Size(max=120) String title,@NotBlank @Size(max=10000) String content) {}
    @GetMapping public ApiResponse<Map<String,Object>> list(@RequestParam(required=false) String status,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int size) {
        if(!Access.isStaff() && status!=null && !status.equals("PUBLISHED")) throw ApiException.forbidden("FORBIDDEN","无权限查看草稿公告");
        return ApiResponse.ok(service.list(Access.isStaff()?status:"PUBLISHED",new Paging(page,size)));
    }
    @GetMapping("/{id}") public ApiResponse<Map<String,Object>> one(@PathVariable long id) { return ApiResponse.ok(service.byId(id,Access.isStaff())); }
    @PostMapping public ResponseEntity<?> create(@Valid @RequestBody Input body) {return ResponseEntity.status(201).body(ApiResponse.ok(service.save(null,body.title(),body.content(),Access.staff().id())));}
    @PatchMapping("/{id}") public ApiResponse<Map<String,Object>> update(@PathVariable long id,@Valid @RequestBody Input body) {return ApiResponse.ok(service.save(id,body.title(),body.content(),Access.staff().id()));}
    @PostMapping("/{id}/publish") public ApiResponse<Map<String,Object>> publish(@PathVariable long id) {return ApiResponse.ok(service.action(id,"publish",Access.staff().id()));}
    @PostMapping("/{id}/withdraw") public ApiResponse<Map<String,Object>> withdraw(@PathVariable long id) {return ApiResponse.ok(service.action(id,"withdraw",Access.staff().id()));}
}
