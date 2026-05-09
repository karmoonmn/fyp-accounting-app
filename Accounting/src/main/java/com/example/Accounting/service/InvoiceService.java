package com.example.Accounting.service;

import com.example.Accounting.exception.AccountNotFoundException;
import com.example.Accounting.model.Invoice;
import com.example.Accounting.request.InvoiceReq;

import java.util.List;

public interface InvoiceService {

    Invoice createInvoice(InvoiceReq invoiceReq) throws AccountNotFoundException;

//    Invoice getInvoiceById(Long id);

//    List<Invoice> listInvoicesForCurrentCompany();

//    List<Invoice> getInvoicesByCustomerId(Long customerId);

    Invoice updateInvoice(Long id, InvoiceReq invoiceReq);

    void deleteInvoice(Long id);
}
