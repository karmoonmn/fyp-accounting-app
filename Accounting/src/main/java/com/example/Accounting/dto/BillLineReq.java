package com.example.Accounting.dto;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class BillLineReq {
    private Long id;
    private int lineNum;
    private String description;
    private BigDecimal quantity;
    private BigDecimal unitPrice;
    private BigDecimal amount;
    private Long accountId;
}
