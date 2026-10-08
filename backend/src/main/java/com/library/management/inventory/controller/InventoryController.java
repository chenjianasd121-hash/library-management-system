package com.library.management.inventory.controller;

import com.library.management.auth.Access;
import com.library.management.common.ApiResponse;
import com.library.management.common.Paging;
import com.library.management.inventory.service.InventoryService;
import com.library.management.inventory.service.InventoryWorkflowService;
import java.util.List;
import java.util.Map;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1")
public class InventoryController {
    private final InventoryService service;
    private final InventoryWorkflowService workflow;
    public InventoryController(InventoryService service,InventoryWorkflowService workflow) { this.service=service;this.workflow=workflow; }
    public record AddCopies(@Size(min=1,max=50) List<String> barcodes,@NotBlank String shelfLocation) {}
    public record UpdateCopy(String shelfLocation,String targetStatus,Integer version) {}
    @GetMapping("/books/{id}/copies") public ApiResponse<Map<String,Object>> copies(@PathVariable long id,@RequestParam(required=false) String status,@RequestParam(defaultValue="1") int page,@RequestParam(defaultValue="20") int size) {
        Access.staff();return ApiResponse.ok(service.list(id,status,new Paging(page,size)));
    }
    @PostMapping("/books/{id}/copies") public ResponseEntity<?> add(@PathVariable long id,@Valid @RequestBody AddCopies body) {
        return ResponseEntity.status(201).body(ApiResponse.ok(service.add(id,body.barcodes(),body.shelfLocation(),Access.staff().id())));
    }
    @GetMapping("/copies/lookup") public ApiResponse<Map<String,Object>> lookup(@RequestParam String barcode) {
        Access.staff();return ApiResponse.ok(service.lookup(barcode));
    }
    @PatchMapping("/copies/{id}") public ApiResponse<Map<String,Object>> update(@PathVariable long id,@RequestBody UpdateCopy body) {
        Access.staff();if(body.version()==null) throw com.library.management.common.ApiException.bad("VALIDATION_ERROR","version 必填");
        return ApiResponse.ok(workflow.update(id,body.shelfLocation(),body.targetStatus(),body.version(),Access.staff().id()));
    }
}
