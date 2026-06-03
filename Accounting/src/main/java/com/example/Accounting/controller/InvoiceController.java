package com.example.Accounting.controller;

import com.example.Accounting.exception.AccountNotFoundException;
import com.example.Accounting.model.Invoice;
import com.example.Accounting.request.InvoiceReq;
import com.example.Accounting.request.PaymentReq;
import com.example.Accounting.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
@RequestMapping("/invoice")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;

    @GetMapping
    public List<java.util.Map<String, Object>> listInvoices() {
        return invoiceService.listInvoicesForCurrentCompany().stream().map(inv -> {
            java.util.Map<String, Object> map = new java.util.HashMap<>();
            map.put("id", inv.getId());
            map.put("txnDate", inv.getTxnDate());
            map.put("docNumber", inv.getDocNumber());
            map.put("shipAddr", inv.getShipAddr());
            map.put("totalAmt", inv.getTotalAmt());
            map.put("balance", inv.getBalance());
            map.put("dueDate", inv.getDueDate());
            map.put("status", inv.getStatus());
            if (inv.getCustomer() != null) {
                map.put("customer", java.util.Map.of(
                        "id", inv.getCustomer().getId(),
                        "name", inv.getCustomer().getName()
                ));
            }
            return map;
        }).toList();
    }

    @PostMapping
    public ResponseEntity<Invoice> addInvoice(@RequestBody InvoiceReq req) throws AccountNotFoundException {
        Invoice invoice = invoiceService.createInvoice(req);
        return new ResponseEntity<>(invoice, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<java.util.Map<String, Object>> getInvoiceById(@PathVariable long id) {
        Invoice invoice = invoiceService.getInvoiceById(id);
        
        java.util.Map<String, Object> map = new java.util.HashMap<>();
        map.put("id", invoice.getId());
        map.put("docNumber", invoice.getDocNumber());
        map.put("txnDate", invoice.getTxnDate());
        if (invoice.getCustomer() != null) {
            map.put("customer", java.util.Map.of("id", invoice.getCustomer().getId(), "name", invoice.getCustomer().getName()));
        }
        map.put("shipAddr", invoice.getShipAddr());
        map.put("shipDate", invoice.getShipDate());
        map.put("dueDate", invoice.getDueDate());
        map.put("balance", invoice.getBalance());
        map.put("totalAmt", invoice.getTotalAmt());
        map.put("status", invoice.getStatus());
        
        if (invoice.getLines() != null) {
            map.put("lines", invoice.getLines().stream().map(l -> {
                java.util.Map<String, Object> lMap = new java.util.HashMap<>();
                lMap.put("lineNum", l.getLineNum());
                lMap.put("description", l.getDescription());
                lMap.put("quantity", l.getQuantity());
                lMap.put("unitPrice", l.getUnitPrice());
                return lMap;
            }).toList());
        }
        
        if (invoice.getPayments() != null) {
            map.put("payments", invoice.getPayments().stream().map(p -> {
                java.util.Map<String, Object> pMap = new java.util.HashMap<>();
                pMap.put("id", p.getId());
                pMap.put("amount", p.getAmount());
                if (p.getPayment() != null) {
                    java.util.Map<String, Object> payMap = new java.util.HashMap<>();
                    payMap.put("id", p.getPayment().getId());
                    payMap.put("txnDate", p.getPayment().getTxnDate());
                    payMap.put("docNumber", p.getPayment().getDocNumber());
                    payMap.put("depositTo", p.getPayment().getDepositTo());
                    pMap.put("payment", payMap);
                }
                return pMap;
            }).toList());
        }
        
        return new ResponseEntity<>(map, HttpStatus.OK);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Invoice> updateInvoice(@PathVariable long id, @RequestBody InvoiceReq req) {
        Invoice invoice = invoiceService.updateInvoice(id, req);
        return new ResponseEntity<>(invoice, HttpStatus.OK);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteInvoice(@PathVariable long id) {
        invoiceService.deleteInvoice(id);
        return new ResponseEntity<>(HttpStatus.NO_CONTENT);
    }

    @PostMapping("/payment")
    public ResponseEntity<Void> recordPayments(@RequestBody PaymentReq req) {
        invoiceService.recordPayments(req);
        return new ResponseEntity<>(HttpStatus.OK);
    }
}
