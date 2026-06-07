package com.example.Accounting.service;

import com.example.Accounting.exception.AccountNotFoundException;
import com.example.Accounting.mapper.AccountMapper;
import com.example.Accounting.model.Account;
import com.example.Accounting.model.AccountType;
import com.example.Accounting.repo.AccountRepo;
import com.example.Accounting.repo.JournalEntryLineRepo;
import com.example.Accounting.request.AccountReq;
import com.example.Accounting.security.SecurityUtils;
import com.example.Accounting.dto.AccountResponse;
import com.example.Accounting.dto.AccountTreeResponse;
import com.example.Accounting.dto.LedgerLineDto;
import com.example.Accounting.model.Company;
import com.example.Accounting.model.JournalLine;
import com.example.Accounting.model.Payment;
import com.example.Accounting.repo.CompanyRepo;
import com.example.Accounting.repo.PaymentRepo;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class AccountServiceImpl implements AccountService {

    private final AccountRepo accountRepo;
    private final AccountMapper accountMapper;
    private final JournalEntryLineRepo journalEntryLineRepo;
    private final CompanyRepo companyRepo;
    private final PaymentRepo paymentRepo;

    @Override
    public List<LedgerLineDto> getBankLedger() {
        Long companyId = SecurityUtils.requireCompanyId();
        
        Account bankAccount = accountRepo.findByNameAndCompanyId("Bank", companyId)
                .orElseThrow(() -> new RuntimeException("Bank account not found"));

        List<JournalLine> lines = journalEntryLineRepo.findByAccount_IdOrderByJournalEntry_TxnDateAsc(bankAccount.getId());
        
        List<Payment> allPayments = paymentRepo.findAllByCompanyIdOrderByTxnDateDesc(companyId);
        Map<String, Payment> paymentMap = allPayments.stream()
                .collect(Collectors.toMap(Payment::getDocNumber, p -> p, (p1, p2) -> p1));

        List<LedgerLineDto> dtoList = new ArrayList<>();
        BigDecimal balance = BigDecimal.ZERO;

        for (JournalLine line : lines) {
            BigDecimal debit = line.getDebit() != null ? line.getDebit() : BigDecimal.ZERO;
            BigDecimal credit = line.getCredit() != null ? line.getCredit() : BigDecimal.ZERO;

            balance = balance.add(debit).subtract(credit);

            LedgerLineDto dto = LedgerLineDto.builder()
                    .id(String.valueOf(line.getId()))
                    .date(line.getJournalEntry() != null && line.getJournalEntry().getTxnDate() != null ? line.getJournalEntry().getTxnDate().toString() : "")
                    .refNo(line.getJournalEntry() != null ? line.getJournalEntry().getDocNumber() : "")
                    .refType("Journal")
                    .payee(line.getDescription() != null ? line.getDescription() : "Transaction")
                    .memo(line.getDescription() != null ? line.getDescription() : "")
                    .deposit(debit.compareTo(BigDecimal.ZERO) > 0 ? debit : null)
                    .payment(credit.compareTo(BigDecimal.ZERO) > 0 ? credit : null)
                    .balance(balance)
                    .build();
                    
            if (line.getJournalEntry() != null && line.getJournalEntry().getDocNumber() != null) {
                String docNumber = line.getJournalEntry().getDocNumber();
                if (docNumber.startsWith("JE-PAY-")) {
                    String paymentDocNumber = docNumber.substring(7);
                    Payment payment = paymentMap.get(paymentDocNumber);
                    if (payment != null) {
                        dto.setPaymentId(payment.getId());
                        dto.setPaymentDocType("BILL_PAYMENT".equals(payment.getPaymentType()) ? "Bill" : "Invoice");
                        dto.setRefType("BILL_PAYMENT".equals(payment.getPaymentType()) ? "Bill Payment" : "Invoice Receipt");
                    }
                }
            }

            dtoList.add(dto);
        }

        return dtoList;
    }

    private AccountResponse mapToResponse(Account account) {
        return AccountResponse.builder()
                .id(account.getId())
                .accountCode(account.getAccountCode())
                .name(account.getName())
                .accountType(account.getAccountType())
                .isActive(account.getIsActive())
                .parentId(account.getParent() != null ? account.getParent().getId() : null)
                .parentName(account.getParent() != null ? account.getParent().getName() : null)
                .createdAt(account.getCreatedAt())
                .updatedAt(account.getUpdatedAt())
                .build();
    }

    @Override
    public Account createAccount(AccountReq req) throws AccountNotFoundException {
        Long companyId = SecurityUtils.requireCompanyId();
        Company company = companyRepo.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Company not found"));
                
        Account account = accountMapper.toEntity(req);
        account.setCompany(company);

        if (req.getParentId() != null) {
            Account parent = accountRepo.findById(req.getParentId())
                    .orElseThrow(() -> new AccountNotFoundException("Account with id " + req.getParentId() + " not found"));
            account.setParent(parent);
            if (account.getAccountType() != parent.getAccountType()) {
                throw new IllegalArgumentException("Child account must have same type as parent");
            }
        }
        
        String code = req.getAccountCode();
        if (code != null && !code.isBlank()) {
            if (accountRepo.existsByAccountCodeAndCompanyId(code, companyId)) {
                throw new IllegalArgumentException("Account code already exists");
            }
            if (!validateAccountCodePrefix(code, account.getAccountType())) {
                throw new IllegalArgumentException("Account code does not match account type category");
            }
            account.setAccountCode(code);
        } else {
            account.setAccountCode(generateAccountCode(req.getAccountType(), companyId));
        }
        
        accountRepo.save(account);
        return account;
    }
    
    private boolean validateAccountCodePrefix(String code, AccountType type) {
        String prefix = switch (type) {
            case ASSET -> "1";
            case LIABILITY -> "2";
            case EQUITY -> "3";
            case REVENUE -> "4";
            case EXPENSE -> "5";
        };
        return code.startsWith(prefix);
    }

    @Override
    public AccountResponse updateAccount(Long id, AccountReq req) {
        Long companyId = SecurityUtils.requireCompanyId();
        Account account = accountRepo.findById(id).orElseThrow(() -> new RuntimeException("Account not found"));
        if (!account.getCompany().getId().equals(companyId)) {
            throw new RuntimeException("Unauthorized");
        }

        if (!account.getName().equals(req.getName())) {
            String oldName = account.getName();
            if (oldName.equalsIgnoreCase("Bank") || oldName.equalsIgnoreCase("Sales") || 
                oldName.equalsIgnoreCase("Accounts Receivable") || oldName.equalsIgnoreCase("Accounts Payable")) {
                throw new IllegalArgumentException("Cannot rename system default accounts");
            }
            account.setName(req.getName());
        }
        
        if (req.getAccountType() != null) {
            account.setAccountType(req.getAccountType());
        }

        if (req.getParentId() != null) {
            Account parent = accountRepo.findById(req.getParentId())
                    .orElseThrow(() -> new RuntimeException("Parent not found"));
            account.setParent(parent);
        } else {
            account.setParent(null);
        }
        
        accountRepo.save(account);
        return mapToResponse(account);
    }

    @Override
    public void deleteAccount(Long id) {
        Long companyId = SecurityUtils.requireCompanyId();
        Account account = accountRepo.findById(id).orElseThrow(() -> new RuntimeException("Account not found"));
        if (!account.getCompany().getId().equals(companyId)) {
            throw new RuntimeException("Unauthorized");
        }
        
        if (!account.getChildren().isEmpty()) {
            throw new IllegalArgumentException("Cannot delete account with children");
        }
        
        if (!journalEntryLineRepo.findByAccount_IdOrderByJournalEntry_TxnDateAsc(id).isEmpty()) {
            throw new IllegalArgumentException("Cannot delete account referenced in journal entries");
        }
        
        // System defaults simple check
        if (account.getName().equalsIgnoreCase("Bank") || account.getName().equalsIgnoreCase("Sales") || account.getName().equalsIgnoreCase("Accounts Receivable")) {
            throw new IllegalArgumentException("Cannot delete system default accounts");
        }
        
        account.setIsActive(false);
        accountRepo.save(account);
    }

    @Override
    public AccountResponse getAccountById(Long id) {
        Long companyId = SecurityUtils.requireCompanyId();
        Account account = accountRepo.findById(id).orElseThrow(() -> new RuntimeException("Account not found"));
        if (!account.getCompany().getId().equals(companyId)) {
            throw new RuntimeException("Unauthorized");
        }
        return mapToResponse(account);
    }

    @Override
    public Page<AccountResponse> getAllAccounts(Pageable pageable) {
        Long companyId = SecurityUtils.requireCompanyId();
        return accountRepo.findAllByCompanyId(companyId, pageable).map(this::mapToResponse);
    }

    @Override
    public Page<AccountResponse> searchAccounts(String query, Pageable pageable) {
        Long companyId = SecurityUtils.requireCompanyId();
        return accountRepo.searchAccounts(companyId, query, pageable).map(this::mapToResponse);
    }

    @Override
    public List<AccountTreeResponse> getAccountTree() {
        Long companyId = SecurityUtils.requireCompanyId();
        
        // Bulk fetch all balances to prevent N+1 queries
        List<Object[]> balanceData = journalEntryLineRepo.getAllAccountBalancesByCompanyId(companyId);
        java.util.Map<Long, BigDecimal> balanceMap = new java.util.HashMap<>();
        for (Object[] row : balanceData) {
            Long accId = (Long) row[0];
            BigDecimal debit = (BigDecimal) row[1];
            BigDecimal credit = (BigDecimal) row[2];
            balanceMap.put(accId, debit.subtract(credit)); // We will adjust sign by AccountType
        }

        List<Account> roots = accountRepo.findRootAccountsByCompanyId(companyId);
        return roots.stream().map(acc -> mapToTreeResponse(acc, balanceMap)).toList();
    }

    private AccountTreeResponse mapToTreeResponse(Account account, java.util.Map<Long, BigDecimal> balanceMap) {
        AccountTreeResponse response = new AccountTreeResponse();
        response.setId(account.getId());
        response.setAccountCode(account.getAccountCode());
        response.setName(account.getName());
        response.setAccountType(account.getAccountType());
        response.setIsActive(account.getIsActive());
        
        List<AccountTreeResponse> children = account.getChildren().stream()
                .map(child -> mapToTreeResponse(child, balanceMap)).toList();
        response.setChildren(children);
        
        BigDecimal netDebit = balanceMap.getOrDefault(account.getId(), BigDecimal.ZERO);
        BigDecimal balance;
        
        if (account.getAccountType() == AccountType.ASSET || account.getAccountType() == AccountType.EXPENSE) {
            balance = netDebit;
        } else {
            balance = netDebit.negate();
        }
        
        for (AccountTreeResponse child : children) {
            balance = balance.add(child.getBalance() != null ? child.getBalance() : BigDecimal.ZERO);
        }
        response.setBalance(balance);
        
        return response;
    }

    private String generateAccountCode(AccountType type, Long companyId) {
        String prefix = switch (type) {
            case ASSET -> "1";
            case LIABILITY -> "2";
            case EQUITY -> "3";
            case REVENUE -> "4";
            case EXPENSE -> "5";
        };

        List<Account> accounts = accountRepo.findAllByCompanyId(companyId).stream()
                .filter(a -> a.getAccountCode().startsWith(prefix)).toList();

        int nextId = accounts.size() + 1;

        return prefix + String.format("%03d", nextId);
    }
}
