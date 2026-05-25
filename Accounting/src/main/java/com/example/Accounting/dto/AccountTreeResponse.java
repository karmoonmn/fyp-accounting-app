package com.example.Accounting.dto;

import com.example.Accounting.model.AccountType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AccountTreeResponse {
    private Long id;
    private String accountCode;
    private String name;
    private AccountType accountType;
    private Boolean isActive;
    private BigDecimal balance;
    private List<AccountTreeResponse> children;
}
