package com.example.Accounting.controller;

import com.example.Accounting.dto.CustomerReq;
import com.example.Accounting.model.Customer;
import com.example.Accounting.service.CustomerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/customer")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @PostMapping
    public ResponseEntity<Customer> createCustomer(
            @RequestBody CustomerReq req,
            @RequestHeader("X-Company-Id") Long companyId) {
        Customer created = customerService.createCustomer(req, companyId);
        return new ResponseEntity<>(created, HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Customer> updateCustomer(
            @PathVariable Long id,
            @RequestBody CustomerReq req,
            @RequestHeader("X-Company-Id") Long companyId) {
        Customer updated = customerService.updateCustomer(id, req, companyId);
        return ResponseEntity.ok(updated);
    }

    @GetMapping
    public ResponseEntity<List<Customer>> getAllCustomers(
            @RequestHeader("X-Company-Id") Long companyId) {
        List<Customer> customers = customerService.getAllCustomers(companyId);
        return ResponseEntity.ok(customers);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Customer> getCustomerById(
            @PathVariable Long id,
            @RequestHeader("X-Company-Id") Long companyId) {
        Customer customer = customerService.getCustomerById(id, companyId);
        return ResponseEntity.ok(customer);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCustomer(
            @PathVariable Long id,
            @RequestHeader("X-Company-Id") Long companyId) {
        customerService.deleteCustomer(id, companyId);
        return ResponseEntity.noContent().build();
    }
}
