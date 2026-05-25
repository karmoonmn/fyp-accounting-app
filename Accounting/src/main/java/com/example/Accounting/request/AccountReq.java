package com.example.Accounting.request;

import com.example.Accounting.model.AccountType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AccountReq {
    private String accountCode;
    private String name;
    private AccountType accountType;
    private Long parentId;
}
