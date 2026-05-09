package com.example.Accounting.service;

import com.example.Accounting.exception.AccountNotFoundException;
import com.example.Accounting.mapper.AccountMapper;
import com.example.Accounting.model.Account;
import com.example.Accounting.model.AccountType;
import com.example.Accounting.repo.AccountRepo;
import com.example.Accounting.request.AccountReq;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@AllArgsConstructor
public class AccountServiceImpl implements AccountService {

    private final AccountRepo accountRepo;
    private final AccountMapper accountMapper;

    @Override
    public Account createAccount(AccountReq req) throws AccountNotFoundException {
        Account account = accountMapper.toEntity(req);

        if (req.getParentId() != null) {
            Account parent = accountRepo.findById(req.getParentId())
                    .orElseThrow(() -> new AccountNotFoundException("Account with id " + req.getParentId() + " not found"));
            account.setParent(parent);
        }
        account.setAccountCode(generateAccountCode(req.getAccountType()));
        accountRepo.save(account);
        return account;
    }

    private String generateAccountCode(AccountType type) {
        String prefix = switch (type) {
            case ASSET -> "1";
            case LIABILITY -> "2";
            case EQUITY -> "3";
            case REVENUE -> "4";
            case EXPENSE -> "5";
        };

        List<Account> accounts = accountRepo.findAll().stream()
                .filter(a -> a.getAccountCode().startsWith(prefix)).toList();

        int nextId = accounts.size() + 1;

        return prefix + String.format("%03d", nextId);
    }
}
