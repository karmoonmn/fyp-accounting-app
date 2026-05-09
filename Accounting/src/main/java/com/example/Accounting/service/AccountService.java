package com.example.Accounting.service;

import com.example.Accounting.exception.AccountNotFoundException;
import com.example.Accounting.model.Account;
import com.example.Accounting.request.AccountReq;

public interface AccountService {
    Account createAccount(AccountReq req) throws AccountNotFoundException;
}
