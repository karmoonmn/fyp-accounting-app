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
    public List<Invoice> listInvoices() {
        return invoiceService.listInvoicesForCurrentCompany();
    }

    @PostMapping
    public ResponseEntity<Invoice> addInvoice(@RequestBody InvoiceReq req) throws AccountNotFoundException {
        Invoice invoice = invoiceService.createInvoice(req);
        return new ResponseEntity<>(invoice, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Invoice> getInvoiceById(@PathVariable long id) {
        Invoice invoice = invoiceService.getInvoiceById(id);
        return new ResponseEntity<>(invoice, HttpStatus.OK);
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
