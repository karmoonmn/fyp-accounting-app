package com.example.Accounting.dto;

import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
public class BillReq {
    private String docNumber;
    private LocalDate txnDate;
    private Long supplierId;
    private LocalDate dueDate;
    private List<BillLineReq> lines;
}
