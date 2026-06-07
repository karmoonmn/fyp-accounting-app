package com.example.Accounting.service;

import com.example.Accounting.constant.ErrorCode;
import com.example.Accounting.dto.BillReq;
import com.example.Accounting.exception.AccountNotFoundException;
import com.example.Accounting.exception.AccountingException;
import com.example.Accounting.model.*;
import com.example.Accounting.repo.*;
import com.example.Accounting.request.AccountReq;
import com.example.Accounting.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BillServiceImpl implements BillService {

    private final BillRepo billRepo;
    private final SupplierRepo supplierRepo;
    private final AccountRepo accountRepo;
    private final JournalEntryService journalEntryService;
    private final JournalEntryRepo journalEntryRepo;
    private final JournalEntryLineRepo journalEntryLineRepo;
    private final CompanyRepo companyRepo;
    private final AccountService accountService;
    private final PaymentRepo paymentRepo;
    private final PaymentAllocationRepo paymentAllocationRepo;

    @Override
    @Transactional
    public Bill createBill(BillReq req, Long companyId) {
        Company company = companyRepo.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Company not found"));

        Bill bill = new Bill();
        bill.setDocNumber(req.getDocNumber());
        bill.setTxnDate(req.getTxnDate());
        bill.setDueDate(req.getDueDate());
                bill.setStatus(TransactionStatus.UNPAID);
        bill.setCompany(company);

        if (req.getSupplierId() != null) {
            Supplier supplier = supplierRepo.findByIdAndCompanyId(req.getSupplierId(), companyId)
                    .orElseThrow(() -> new RuntimeException("Supplier not found"));
            bill.setSupplier(supplier);
        }

        List<Line> lines = new ArrayList<>();
        BigDecimal totalAmt = BigDecimal.ZERO;

        if (req.getLines() != null) {
            for (var lineReq : req.getLines()) {
                BigDecimal amount = lineReq.getAmount();
                if (amount == null) {
                    if (lineReq.getQuantity() != null && lineReq.getUnitPrice() != null) {
                        amount = lineReq.getQuantity().multiply(lineReq.getUnitPrice());
                    } else {
                        amount = BigDecimal.ZERO;
                    }
                }
                totalAmt = totalAmt.add(amount);

                Account account = null;
                if (lineReq.getAccountId() != null) {
                    account = accountRepo.findByIdAndCompanyId(lineReq.getAccountId(), companyId)
                            .orElseThrow(() -> new RuntimeException("Account not found for line"));
                    if (account.getAccountType() == AccountType.REVENUE) {
                        throw new RuntimeException("Revenue accounts cannot be used on Bills.");
                    }
                } else {
                    throw new RuntimeException("Account is required for Bill lines");
                }

                Line line = Line.builder()
                        .lineNum(lineReq.getLineNum())
                        .amount(amount)
                        .quantity(lineReq.getQuantity())
                        .unitPrice(lineReq.getUnitPrice())
                        .description(lineReq.getDescription())
                        .account(account)
                        .transaction(bill)
                        .build();
                lines.add(line);
            }
        }
        bill.setLines(lines);
        bill.setTotalAmt(totalAmt);
        bill.setBalance(totalAmt);

        billRepo.save(bill);

        // Journal Entry creation
        Account apAccount = accountRepo.findByNameAndCompanyId("Accounts Payable", companyId)
                .orElseGet(() -> {
                    try {
                        return accountService.createAccount(new AccountReq(null, "Accounts Payable", AccountType.LIABILITY, null));
                    } catch (AccountNotFoundException e) {
                        throw new RuntimeException(e);
                    }
                });

        List<JournalLine> jeLines = new ArrayList<>();
        
        // Debit lines (Expenses/Assets based on bill lines)
        int lineNumber = 1;
        for (Line billLine : bill.getLines()) {
            JournalLine debitLine = journalEntryService.createJournalLine(billLine.getAccount(), true, billLine.getAmount(), lineNumber++, null);
            jeLines.add(debitLine);
        }

        // Credit line (Accounts Payable)
        JournalLine creditLine = journalEntryService.createJournalLine(apAccount, false, totalAmt, lineNumber, null);
        jeLines.add(creditLine);

        JournalEntry journalEntry = JournalEntry.builder()
                .company(company)
                .lines(jeLines)
                .docNumber("JE-BILL-" + req.getDocNumber())
                .txnDate(req.getTxnDate())
                .totalDebit(totalAmt)
                .totalCredit(totalAmt)
                .build();

        journalEntryService.saveJournalEntry(journalEntry);
        
        for (JournalLine jl : jeLines) {
            jl.setJournalEntry(journalEntry);
        }
        journalEntryLineRepo.saveAll(jeLines);

        billRepo.save(bill);

        return bill;
    }

    @Override
    @Transactional
    public Bill updateBill(Long id, BillReq req, Long companyId) {
        // Since editing a bill can complicate payments and journal entries,
        // we'll allow basic update but normally you'd want to revert the old JE and create a new one.
        // For simplicity in this implementation, we will delete the old JE, update the bill, and recreate the JE.
        
        Bill bill = billRepo.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() -> new RuntimeException("Bill not found"));

        if (bill.getPayments() != null && !bill.getPayments().isEmpty()) {
            throw new RuntimeException("Cannot update a bill that has payments allocated to it.");
        }

        Optional<JournalEntry> jeOpt = journalEntryRepo.findByDocNumberAndCompanyId("JE-BILL-" + bill.getDocNumber(), companyId);
        if (jeOpt.isPresent()) {
            journalEntryRepo.delete(jeOpt.get());
        }

        bill.setDocNumber(req.getDocNumber());
        bill.setTxnDate(req.getTxnDate());
        bill.setDueDate(req.getDueDate());

        if (req.getSupplierId() != null) {
            Supplier supplier = supplierRepo.findByIdAndCompanyId(req.getSupplierId(), companyId)
                    .orElseThrow(() -> new RuntimeException("Supplier not found"));
            bill.setSupplier(supplier);
        } else {
            bill.setSupplier(null);
        }

        bill.getLines().clear();
        BigDecimal totalAmt = BigDecimal.ZERO;

        if (req.getLines() != null) {
            for (var lineReq : req.getLines()) {
                BigDecimal amount = lineReq.getAmount();
                if (amount == null) {
                    if (lineReq.getQuantity() != null && lineReq.getUnitPrice() != null) {
                        amount = lineReq.getQuantity().multiply(lineReq.getUnitPrice());
                    } else {
                        amount = BigDecimal.ZERO;
                    }
                }
                totalAmt = totalAmt.add(amount);

                Account account = accountRepo.findByIdAndCompanyId(lineReq.getAccountId(), companyId)
                        .orElseThrow(() -> new RuntimeException("Account not found for line"));
                if (account.getAccountType() == AccountType.REVENUE) {
                    throw new RuntimeException("Revenue accounts cannot be used on Bills.");
                }

                Line line = Line.builder()
                        .lineNum(lineReq.getLineNum())
                        .amount(amount)
                        .quantity(lineReq.getQuantity())
                        .unitPrice(lineReq.getUnitPrice())
                        .description(lineReq.getDescription())
                        .account(account)
                        .transaction(bill)
                        .build();
                bill.getLines().add(line);
            }
        }

        bill.setTotalAmt(totalAmt);
        bill.setBalance(totalAmt);

        // Create new Journal Entry
        Account apAccount = accountRepo.findByNameAndCompanyId("Accounts Payable", companyId)
                .orElseThrow(() -> new RuntimeException("Accounts Payable not found"));

        List<JournalLine> jeLines = new ArrayList<>();
        int lineNumber = 1;
        for (Line billLine : bill.getLines()) {
            JournalLine debitLine = journalEntryService.createJournalLine(billLine.getAccount(), true, billLine.getAmount(), lineNumber++, null);
            jeLines.add(debitLine);
        }

        JournalLine creditLine = journalEntryService.createJournalLine(apAccount, false, totalAmt, lineNumber, null);
        jeLines.add(creditLine);

        JournalEntry journalEntry = JournalEntry.builder()
                .company(bill.getCompany())
                .lines(jeLines)
                .docNumber("JE-BILL-" + req.getDocNumber())
                .txnDate(req.getTxnDate())
                .totalDebit(totalAmt)
                .totalCredit(totalAmt)
                .build();

        journalEntryService.saveJournalEntry(journalEntry);
        for (JournalLine jl : jeLines) {
            jl.setJournalEntry(journalEntry);
        }
        journalEntryLineRepo.saveAll(jeLines);
        
        return billRepo.save(bill);
    }

    @Override
    public Bill getBillById(Long id, Long companyId) {
        return billRepo.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() -> new RuntimeException("Bill not found"));
    }

    @Override
    public List<Bill> getAllBills(Long companyId) {
        List<Bill> bills = billRepo.findAllByCompanyId(companyId);
        java.time.LocalDate today = java.time.LocalDate.now();
        for (Bill bill : bills) {
            // Dynamically mark as OVERDUE if past due date and not fully paid
            if (bill.getDueDate() != null
                    && bill.getDueDate().isBefore(today)
                    && bill.getStatus() != TransactionStatus.PAID
                    && bill.getBalance() != null
                    && bill.getBalance().compareTo(BigDecimal.ZERO) > 0) {
                bill.setStatus(TransactionStatus.OVERDUE);
                billRepo.save(bill);
            }
        }
        return bills;
    }

    @Override
    @Transactional
    public void deleteBill(Long id, Long companyId) {
        Bill bill = billRepo.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() -> new RuntimeException("Bill not found"));
                
        if (bill.getPayments() != null && !bill.getPayments().isEmpty()) {
            throw new RuntimeException("Cannot delete a bill that has payments allocated to it.");
        }

        Optional<JournalEntry> jeOpt = journalEntryRepo.findByDocNumberAndCompanyId("JE-BILL-" + bill.getDocNumber(), companyId);
        if (jeOpt.isPresent()) {
            journalEntryRepo.delete(jeOpt.get());
        }

        billRepo.delete(bill);
    }

    @Override
    @Transactional
    public void recordBillPayments(com.example.Accounting.request.PaymentReq req, Long companyId) {
        Company company = companyRepo.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Company not found"));

        BigDecimal totalPaymentAmount = BigDecimal.ZERO;

        for (com.example.Accounting.request.PaymentReq.InvoicePaymentItem item : req.getPayments()) {
            if (item.getBillId() == null || item.getAmount() == null || item.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            Bill bill = billRepo.findByIdAndCompanyId(item.getBillId(), companyId)
                    .orElseThrow(() -> new RuntimeException("Bill not found"));

            BigDecimal currentBalance = bill.getBalance() != null ? bill.getBalance() : bill.getTotalAmt();
            BigDecimal newBalance = currentBalance.subtract(item.getAmount());
            if (newBalance.compareTo(BigDecimal.ZERO) < 0) {
                throw new RuntimeException("Payment amount cannot exceed the remaining bill balance.");
            }

            bill.setBalance(newBalance);

            BigDecimal totalAmt = bill.getTotalAmt() != null ? bill.getTotalAmt() : BigDecimal.ZERO;
            if (newBalance.compareTo(BigDecimal.ZERO) == 0 && totalAmt.compareTo(BigDecimal.ZERO) > 0) {
                bill.setStatus(TransactionStatus.PAID);
            } else {
                bill.setStatus(TransactionStatus.PARTIALLY_PAID);
            }

            billRepo.save(bill);
            totalPaymentAmount = totalPaymentAmount.add(item.getAmount());
        }

        if (totalPaymentAmount.compareTo(BigDecimal.ZERO) > 0) {
            Payment payment = Payment.builder()
                    .company(company)
                    .docNumber(req.getRefNo())
                    .txnDate(req.getPaymentDate())
                    .depositTo(req.getDepositTo() != null ? req.getDepositTo() : "Bank")
                    .paymentType("BILL_PAYMENT")
                    .totalAmount(totalPaymentAmount)
                    .build();
            payment = paymentRepo.save(payment);

            List<PaymentAllocation> allocations = new ArrayList<>();
            for (com.example.Accounting.request.PaymentReq.InvoicePaymentItem item : req.getPayments()) {
                if (item.getBillId() == null || item.getAmount() == null || item.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
                    continue;
                }
                Bill bill = billRepo.findByIdAndCompanyId(item.getBillId(), companyId).orElseThrow();
                PaymentAllocation allocation = PaymentAllocation.builder()
                        .payment(payment)
                        .bill(bill)
                        .amount(item.getAmount())
                        .build();
                allocations.add(allocation);
            }
            paymentAllocationRepo.saveAll(allocations);
            
            // Create Journal Entry for Bill Payment
            Account apAccount = accountRepo.findByNameAndCompanyId("Accounts Payable", companyId)
                    .orElseThrow(() -> new RuntimeException("Accounts Payable account not found"));
            
            String bankName = req.getDepositTo() != null ? req.getDepositTo() : "Bank";
            Account bankAccount = accountRepo.findByNameAndCompanyId(bankName, companyId)
                    .orElseGet(() -> {
                        try {
                            return accountService.createAccount(new AccountReq(null, bankName, AccountType.ASSET, null));
                        } catch (Exception e) {
                            throw new RuntimeException("Could not create Bank account", e);
                        }
                    });

            // Bill payment: Debit AP, Credit Bank
            JournalLine debitLine = journalEntryService.createJournalLine(apAccount, true, totalPaymentAmount, 1, "Bill payment");
            JournalLine creditLine = journalEntryService.createJournalLine(bankAccount, false, totalPaymentAmount, 2, "Bill payment");

            JournalEntry journalEntry = JournalEntry.builder()
                    .company(company)
                    .lines(List.of(debitLine, creditLine))
                    .docNumber("JE-PAY-" + req.getRefNo())
                    .txnDate(req.getPaymentDate())
                    .totalDebit(totalPaymentAmount)
                    .totalCredit(totalPaymentAmount)
                    .build();

            journalEntryService.saveJournalEntry(journalEntry);
            debitLine.setJournalEntry(journalEntry);
            creditLine.setJournalEntry(journalEntry);
            journalEntryLineRepo.saveAll(List.of(debitLine, creditLine));
        }
    }
}
