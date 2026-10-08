package com.library.management.inventory.controller;

import com.library.management.auth.Access;
import com.library.management.common.ApiResponse;
import com.library.management.inventory.service.CoverService;
import java.util.Map;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController @RequestMapping("/api/v1/media/covers")
public class CoverController {
    private final CoverService service;
    public CoverController(CoverService service) { this.service=service; }
    @PostMapping public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file) {
        Access.staff();return ResponseEntity.status(201).body(ApiResponse.ok(service.upload(file)));
    }
    @GetMapping("/{opaqueName}") public ResponseEntity<Resource> read(@PathVariable String opaqueName) { return service.read(opaqueName); }
}
