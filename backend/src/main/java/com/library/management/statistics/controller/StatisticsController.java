package com.library.management.statistics.controller;

import com.library.management.auth.Access;
import com.library.management.common.ApiResponse;
import com.library.management.statistics.service.StatisticsService;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1/stats")
public class StatisticsController {
    private final StatisticsService service;
    public StatisticsController(StatisticsService service) { this.service=service; }
    @GetMapping("/overview") public ApiResponse<Map<String,Object>> overview() {Access.staff();return ApiResponse.ok(service.overview());}
    @GetMapping("/loans-trend") public ApiResponse<List<Map<String,Object>>> trend(@RequestParam(defaultValue="30") int days) {Access.staff();return ApiResponse.ok(service.trend(days));}
    @GetMapping("/top-books") public ApiResponse<List<Map<String,Object>>> top(@RequestParam(defaultValue="30") int days,@RequestParam(defaultValue="10") int limit) {Access.staff();return ApiResponse.ok(service.topBooks(days,limit));}
}
