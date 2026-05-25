package com.example.Accounting.controller;

import com.example.Accounting.dto.LedgerLineDto;
import com.example.Accounting.service.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/account")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @GetMapping("/bank/ledger")
    public ResponseEntity<List<LedgerLineDto>> getBankLedger(
            @RequestHeader("X-Company-Id") Long companyId) {
        // companyId is used within SecurityUtils in the service
        List<LedgerLineDto> ledger = accountService.getBankLedger();
        return ResponseEntity.ok(ledger);
    }

    @PostMapping
    public ResponseEntity<com.example.Accounting.dto.AccountResponse> createAccount(
            @RequestHeader("X-Company-Id") Long companyId,
            @RequestBody com.example.Accounting.request.AccountReq req) throws com.example.Accounting.exception.AccountNotFoundException {
        com.example.Accounting.model.Account acc = accountService.createAccount(req);
        return ResponseEntity.ok(accountService.getAccountById(acc.getId()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<com.example.Accounting.dto.AccountResponse> updateAccount(
            @RequestHeader("X-Company-Id") Long companyId,
            @PathVariable Long id,
            @RequestBody com.example.Accounting.request.AccountReq req) {
        return ResponseEntity.ok(accountService.updateAccount(id, req));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAccount(
            @RequestHeader("X-Company-Id") Long companyId,
            @PathVariable Long id) {
        accountService.deleteAccount(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping
    public ResponseEntity<org.springframework.data.domain.Page<com.example.Accounting.dto.AccountResponse>> getAllAccounts(
            @RequestHeader("X-Company-Id") Long companyId,
            org.springframework.data.domain.Pageable pageable) {
        return ResponseEntity.ok(accountService.getAllAccounts(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<com.example.Accounting.dto.AccountResponse> getAccountById(
            @RequestHeader("X-Company-Id") Long companyId,
            @PathVariable Long id) {
        return ResponseEntity.ok(accountService.getAccountById(id));
    }

    @GetMapping("/tree")
    public ResponseEntity<List<com.example.Accounting.dto.AccountTreeResponse>> getAccountTree(
            @RequestHeader("X-Company-Id") Long companyId) {
        return ResponseEntity.ok(accountService.getAccountTree());
    }

    @GetMapping("/search")
    public ResponseEntity<org.springframework.data.domain.Page<com.example.Accounting.dto.AccountResponse>> searchAccounts(
            @RequestHeader("X-Company-Id") Long companyId,
            @RequestParam("q") String query,
            org.springframework.data.domain.Pageable pageable) {
        return ResponseEntity.ok(accountService.searchAccounts(query, pageable));
    }
}
