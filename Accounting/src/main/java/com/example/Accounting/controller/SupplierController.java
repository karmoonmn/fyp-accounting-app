package com.example.Accounting.controller;

import com.example.Accounting.dto.SupplierReq;
import com.example.Accounting.model.Supplier;
import com.example.Accounting.service.SupplierService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/supplier")
@RequiredArgsConstructor
public class SupplierController {

    private final SupplierService supplierService;

    @PostMapping
    public ResponseEntity<Supplier> createSupplier(
            @RequestHeader("X-Company-Id") Long companyId,
            @RequestBody SupplierReq req) {
        return ResponseEntity.ok(supplierService.createSupplier(req, companyId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Supplier> updateSupplier(
            @PathVariable Long id,
            @RequestHeader("X-Company-Id") Long companyId,
            @RequestBody SupplierReq req) {
        return ResponseEntity.ok(supplierService.updateSupplier(id, req, companyId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Supplier> getSupplier(
            @PathVariable Long id,
            @RequestHeader("X-Company-Id") Long companyId) {
        return ResponseEntity.ok(supplierService.getSupplierById(id, companyId));
    }

    @GetMapping
    public ResponseEntity<List<Supplier>> getAllSuppliers(
            @RequestHeader("X-Company-Id") Long companyId) {
        return ResponseEntity.ok(supplierService.getAllSuppliers(companyId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSupplier(
            @PathVariable Long id,
            @RequestHeader("X-Company-Id") Long companyId) {
        supplierService.deleteSupplier(id, companyId);
        return ResponseEntity.ok().build();
    }
}
