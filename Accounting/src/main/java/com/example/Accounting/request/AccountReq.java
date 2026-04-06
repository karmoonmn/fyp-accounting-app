package com.example.Accounting.request;

import com.example.Accounting.model.AccountType;
import lombok.Data;

@Data
public class AccountReq {
    private String name;
    private AccountType accountType;
    private Long parentId;
}
