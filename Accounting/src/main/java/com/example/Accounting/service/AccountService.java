package com.example.Accounting.service;

import com.example.Accounting.exception.AccountNotFoundException;
import com.example.Accounting.request.AccountReq;

public interface AccountService {
    void createAccount(AccountReq req) throws AccountNotFoundException;
}
