package com.example.Accounting.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class LedgerLineDto {
    private String id;
    private String date;
    private String refNo;
    private String refType;
    private String payee;
    private String memo;
    private BigDecimal deposit;
    private BigDecimal payment;
    private BigDecimal balance;
}
