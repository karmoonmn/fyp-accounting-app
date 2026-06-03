package com.example.Accounting.dto.report;

import com.example.Accounting.model.AccountType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BalanceSheetNodeDto {
    private Long accountId;
    private String accountName;
    private String accountCode;
    private AccountType accountType;
    private BigDecimal balance;
    private List<BalanceSheetNodeDto> children;
}
