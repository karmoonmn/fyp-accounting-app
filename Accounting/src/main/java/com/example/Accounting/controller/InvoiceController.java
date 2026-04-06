package com.example.Accounting.controller;

import com.example.Accounting.model.Invoice;
import com.example.Accounting.request.InvoiceReq;
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
    public ResponseEntity<Invoice> addInvoice(@RequestBody InvoiceReq req) {
        Invoice invoice = invoiceService.createInvoice(req);
        return new ResponseEntity<>(invoice, HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Invoice> getInvoiceById(@PathVariable long id) {
        Invoice invoice = invoiceService.getInvoiceById(id);
        return new ResponseEntity<>(invoice, HttpStatus.OK);
    }


}
