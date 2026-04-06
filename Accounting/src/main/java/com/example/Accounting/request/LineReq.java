package com.example.Accounting.request;

import lombok.Data;

import java.math.BigDecimal;

@Data
public class LineReq {
    private int lineNum;
    private String description;
    private BigDecimal quantity;
    private BigDecimal unitPrice;
    private BigDecimal amount;
}
