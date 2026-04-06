package com.example.Accounting.request;

import com.example.Accounting.model.TransactionStatus;
import lombok.Data;

import java.time.LocalDate;

@Data
public class TransactionFilter {
    private LocalDate txnDate;
    private String docNumber;
    private Long personId;
    private TransactionStatus status;
    private String sortBy; //person, txnDate
    private String sortDirection; //asc, desc
}
