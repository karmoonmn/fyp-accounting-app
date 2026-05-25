package com.example.Accounting.service;

import com.example.Accounting.exception.AccountNotFoundException;
import com.example.Accounting.model.Account;
import com.example.Accounting.request.AccountReq;
import com.example.Accounting.dto.LedgerLineDto;
import com.example.Accounting.dto.AccountResponse;
import com.example.Accounting.dto.AccountTreeResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface AccountService {
    Account createAccount(AccountReq req) throws AccountNotFoundException;
    AccountResponse updateAccount(Long id, AccountReq req);
    void deleteAccount(Long id);
    AccountResponse getAccountById(Long id);
    Page<AccountResponse> getAllAccounts(Pageable pageable);
    Page<AccountResponse> searchAccounts(String query, Pageable pageable);
    List<AccountTreeResponse> getAccountTree();
    
    List<LedgerLineDto> getBankLedger();
}
