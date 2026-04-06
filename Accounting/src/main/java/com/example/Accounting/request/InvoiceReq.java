package com.example.Accounting.request;

import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class InvoiceReq {

    private String docNumber;
    private LocalDate txnDate;
    private BigDecimal totalAmt;
    private String shipAddr;
    private LocalDate shipDate;
    private LocalDate dueDate;
    private List<LineReq> lines;
    private Long customerId;
}

