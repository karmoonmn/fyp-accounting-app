package com.example.Accounting.controller;

import com.example.Accounting.dto.BillReq;
import com.example.Accounting.model.Bill;
import com.example.Accounting.service.BillService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/bill")
@RequiredArgsConstructor
public class BillController {

    private final BillService billService;

    @PostMapping
    public ResponseEntity<Bill> createBill(
            @RequestHeader("X-Company-Id") Long companyId,
            @RequestBody BillReq req) {
        return ResponseEntity.ok(billService.createBill(req, companyId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Bill> updateBill(
            @PathVariable Long id,
            @RequestHeader("X-Company-Id") Long companyId,
            @RequestBody BillReq req) {
        return ResponseEntity.ok(billService.updateBill(id, req, companyId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Bill> getBill(
            @PathVariable Long id,
            @RequestHeader("X-Company-Id") Long companyId) {
        return ResponseEntity.ok(billService.getBillById(id, companyId));
    }

    @GetMapping
    public ResponseEntity<List<Bill>> getAllBills(
            @RequestHeader("X-Company-Id") Long companyId) {
        return ResponseEntity.ok(billService.getAllBills(companyId));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBill(
            @PathVariable Long id,
            @RequestHeader("X-Company-Id") Long companyId) {
        billService.deleteBill(id, companyId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/payment")
    public ResponseEntity<Void> receivePayment(
            @RequestHeader("X-Company-Id") Long companyId,
            @RequestBody com.example.Accounting.request.PaymentReq req) {
        billService.recordBillPayments(req, companyId);
        return ResponseEntity.ok().build();
    }
}
