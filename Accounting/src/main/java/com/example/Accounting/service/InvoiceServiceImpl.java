package com.example.Accounting.service;

import com.example.Accounting.constant.ErrorCode;
import com.example.Accounting.exception.AccountNotFoundException;
import com.example.Accounting.exception.AccountingException;
import com.example.Accounting.mapper.InvoiceMapper;
import com.example.Accounting.model.*;
import com.example.Accounting.repo.*;
import com.example.Accounting.request.AccountReq;
import com.example.Accounting.request.InvoiceReq;
import com.example.Accounting.request.PaymentReq;
import com.example.Accounting.security.SecurityUtils;
import lombok.AllArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.math.BigDecimal;
import java.util.Optional;


@Slf4j
@Service
@AllArgsConstructor
public class InvoiceServiceImpl implements InvoiceService {

    private final InvoiceRepo invoiceRepo;
    private final CustomerRepo customerRepo;
    private final AccountRepo accountRepo;
    private final JournalEntryService journalEntryService;
    private final JournalEntryRepo journalEntryRepo;
    private final JournalEntryLineRepo journalEntryLineRepo;
    private final CompanyRepo companyRepo;
    private final AccountService accountService;
    private final PaymentRepo paymentRepo;
    private final PaymentAllocationRepo paymentAllocationRepo;

    @Override
    public Invoice createInvoice(InvoiceReq req) throws AccountNotFoundException {
        Long companyId = SecurityUtils.requireCompanyId();
        Company company = companyRepo.getReferenceById(companyId);

        Invoice invoice = InvoiceMapper.toEntity(req);
        invoice.setCompany(company);

        if (req.getCustomerId() != null) {
            Customer customer = customerRepo.findById(req.getCustomerId()).orElseThrow();
            invoice.setCustomer(customer);
        }

        invoiceRepo.save(invoice);
        var total = invoice.getTotalAmt();

        Account arAccount = accountRepo
                .findByNameAndCompanyId("Accounts Receivable", companyId)
                .orElseGet(() -> accountService.createAccount(new AccountReq(null, "Accounts Receivable", AccountType.ASSET, null)));
        Account salesAccount = accountRepo
                .findByNameAndCompanyId("Sales", companyId)
                .orElseGet(() -> accountService.createAccount(new AccountReq(null, "Sales", AccountType.REVENUE, null)));

        //create journal lines (match invoice line totals, not a separate req field)
        JournalLine debitLine = journalEntryService.createJournalLine(arAccount, true, total, 1, null);
        JournalLine creditLine = journalEntryService.createJournalLine(salesAccount, false, total, 2, null);

        //create journal entry
        JournalEntry journalEntry = JournalEntry.builder()
                .company(company)
                .lines(Arrays.asList(debitLine, creditLine))
                .docNumber("JE-" + req.getDocNumber())
                .txnDate(req.getTxnDate())
                .totalDebit(total)
                .totalCredit(total)
                .build();

        journalEntryService.saveJournalEntry(journalEntry);

        debitLine.setJournalEntry(journalEntry);
        creditLine.setJournalEntry(journalEntry);
        journalEntryLineRepo.saveAll(Arrays.asList(debitLine, creditLine));

        return invoice;
    }

    @Override
    public Invoice getInvoiceById(Long id) {
        Long companyId = SecurityUtils.requireCompanyId();
        return invoiceRepo.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() -> new AccountingException(ErrorCode.INVOICE_NOT_FOUND));
    }

    @Override
    public List<Invoice> listInvoicesForCurrentCompany() {
        return invoiceRepo.findAllByCompanyIdOrderByTxnDateDesc(SecurityUtils.requireCompanyId());
    }

    @Override
    public List<Invoice> getInvoicesByCustomerId(Long customerId) {
        Long companyId = SecurityUtils.requireCompanyId();
        return invoiceRepo.findAllByCompanyIdAndCustomer_Id(companyId, customerId);
    }

    @Override
    public Invoice updateInvoice(Long id, InvoiceReq req) {
        Long companyId = SecurityUtils.requireCompanyId();
        Invoice invoice = invoiceRepo.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() -> new AccountingException(ErrorCode.INVOICE_NOT_FOUND));

        String oldDocNumber = invoice.getDocNumber();

        invoice.setDocNumber(req.getDocNumber());
        invoice.setTxnDate(req.getTxnDate());
        invoice.setShipAddr(req.getShipAddr());
        invoice.setShipDate(req.getShipDate());
        invoice.setDueDate(req.getDueDate());

        if (req.getCustomerId() != null) {
            Customer customer = customerRepo.findById(req.getCustomerId()).orElseThrow();
            invoice.setCustomer(customer);
        } else {
            invoice.setCustomer(null);
        }

        invoice.getLines().clear();
        if (req.getLines() != null) {
            List<Line> newLines = req.getLines().stream().map(lineReq -> {
                BigDecimal amount = lineReq.getQuantity().multiply(lineReq.getUnitPrice());
                return Line.builder()
                        .lineNum(lineReq.getLineNum())
                        .amount(amount)
                        .quantity(lineReq.getQuantity())
                        .unitPrice(lineReq.getUnitPrice())
                        .description(lineReq.getDescription())
                        .transaction(invoice)
                        .build();
            }).toList();
            invoice.getLines().addAll(newLines);
        }

        BigDecimal total = invoice.getLines().stream()
                .map(Line::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal amountPaid = BigDecimal.ZERO;
        if (invoice.getTotalAmt() != null) {
            if (invoice.getBalance() != null) {
                amountPaid = invoice.getTotalAmt().subtract(invoice.getBalance());
            } else {
                amountPaid = invoice.getTotalAmt();
            }
        }
        
        BigDecimal newBalance = total.subtract(amountPaid);
        if (newBalance.compareTo(BigDecimal.ZERO) < 0) {
            throw new AccountingException(ErrorCode.INVALID_PAYMENT_AMOUNT, "Invoice total cannot be less than the amount already paid.");
        }

        invoice.setTotalAmt(total);
        invoice.setBalance(newBalance);

        if (newBalance.compareTo(BigDecimal.ZERO) == 0 && total.compareTo(BigDecimal.ZERO) > 0) {
            invoice.setStatus(TransactionStatus.PAID);
        } else if (newBalance.compareTo(total) < 0 && newBalance.compareTo(BigDecimal.ZERO) > 0) {
            invoice.setStatus(TransactionStatus.PARTIALLY_PAID);
        } else {
            invoice.setStatus(TransactionStatus.UNPAID);
        }

        invoiceRepo.save(invoice);

        // Sync journal entry
        Optional<JournalEntry> jeOpt = journalEntryRepo.findByDocNumberAndCompanyId("JE-" + oldDocNumber, companyId);
        if (jeOpt.isPresent()) {
            journalEntryRepo.delete(jeOpt.get());
        }

        Account arAccount = accountRepo.findByNameAndCompanyId("Accounts Receivable", companyId)
                .orElseThrow(() -> new AccountingException(ErrorCode.ACCOUNT_NOT_FOUND, "Accounts Receivable account not found"));

        Account salesAccount = accountRepo.findByNameAndCompanyId("Sales", companyId)
                .orElseThrow(() -> new AccountingException(ErrorCode.ACCOUNT_NOT_FOUND, "Sales account not found"));

        JournalLine debitLine = journalEntryService.createJournalLine(arAccount, true, total, 1, null);
        JournalLine creditLine = journalEntryService.createJournalLine(salesAccount, false, total, 2, null);

        JournalEntry journalEntry = JournalEntry.builder()
                .company(invoice.getCompany())
                .lines(Arrays.asList(debitLine, creditLine))
                .docNumber("JE-" + req.getDocNumber())
                .txnDate(req.getTxnDate())
                .totalDebit(total)
                .totalCredit(total)
                .build();

        journalEntryService.saveJournalEntry(journalEntry);

        debitLine.setJournalEntry(journalEntry);
        creditLine.setJournalEntry(journalEntry);
        journalEntryLineRepo.saveAll(Arrays.asList(debitLine, creditLine));

        return invoice;
    }

    @Override
    public void deleteInvoice(Long id) {
        Long companyId = SecurityUtils.requireCompanyId();
        Invoice invoice = invoiceRepo.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() -> new AccountingException(ErrorCode.INVOICE_NOT_FOUND));

        if (invoice.getStatus() == TransactionStatus.PARTIALLY_PAID || invoice.getStatus() == TransactionStatus.PAID) {
            throw new AccountingException(ErrorCode.INVALID_PAYMENT_AMOUNT, "Cannot delete an invoice that has payments allocated to it.");
        }

        String docNumber = invoice.getDocNumber();

        invoiceRepo.delete(invoice);

        Optional<JournalEntry> jeOpt = journalEntryRepo.findByDocNumberAndCompanyId("JE-" + docNumber, companyId);
        jeOpt.ifPresent(journalEntry -> {
            journalEntryRepo.delete(journalEntry);
        });
    }

    @Override
    @org.springframework.transaction.annotation.Transactional
    public void recordPayments(PaymentReq req) {
        Long companyId = SecurityUtils.requireCompanyId();
        Company company = companyRepo.getReferenceById(companyId);

        BigDecimal totalPaymentAmount = BigDecimal.ZERO;

        for (PaymentReq.InvoicePaymentItem item : req.getPayments()) {
            if (item.getInvoiceId() == null || item.getAmount() == null || item.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            Invoice invoice = invoiceRepo.findByIdAndCompanyId(item.getInvoiceId(), companyId)
                    .orElseThrow(() -> new AccountingException(ErrorCode.INVOICE_NOT_FOUND));

            BigDecimal currentBalance = invoice.getBalance() != null ? invoice.getBalance() : invoice.getTotalAmt();
            BigDecimal newBalance = currentBalance.subtract(item.getAmount());
            if (newBalance.compareTo(BigDecimal.ZERO) < 0) {
                throw new AccountingException(ErrorCode.INVALID_PAYMENT_AMOUNT, "Payment amount cannot exceed the remaining invoice balance.");
            }

            invoice.setBalance(newBalance);

            BigDecimal totalAmt = invoice.getTotalAmt() != null ? invoice.getTotalAmt() : BigDecimal.ZERO;
            if (newBalance.compareTo(BigDecimal.ZERO) == 0 && totalAmt.compareTo(BigDecimal.ZERO) > 0) {
                invoice.setStatus(TransactionStatus.PAID);
            } else {
                invoice.setStatus(TransactionStatus.PARTIALLY_PAID);
            }

            invoiceRepo.save(invoice);
            totalPaymentAmount = totalPaymentAmount.add(item.getAmount());
        }

        if (totalPaymentAmount.compareTo(BigDecimal.ZERO) > 0) {
            Payment payment = Payment.builder()
                    .company(company)
                    .docNumber(req.getRefNo())
                    .txnDate(req.getPaymentDate())
                    .depositTo(req.getDepositTo() != null ? req.getDepositTo() : "Bank")
                    .paymentType("INVOICE_RECEIPT")
                    .totalAmount(totalPaymentAmount)
                    .build();
            paymentRepo.save(payment);

            for (PaymentReq.InvoicePaymentItem item : req.getPayments()) {
                if (item.getInvoiceId() == null || item.getAmount() == null || item.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
                    continue;
                }
                Invoice invoice = invoiceRepo.findByIdAndCompanyId(item.getInvoiceId(), companyId).orElse(null);
                if (invoice != null) {
                    PaymentAllocation allocation = PaymentAllocation.builder()
                            .payment(payment)
                            .invoice(invoice)
                            .amount(item.getAmount())
                            .build();
                    paymentAllocationRepo.save(allocation);
                }
            }
            Account arAccount = accountRepo
                    .findByNameAndCompanyId("Accounts Receivable", companyId)
                    .orElseGet(() -> {
                        try {
                            return accountService.createAccount(new AccountReq(null, "Accounts Receivable", AccountType.ASSET, null));
                        } catch (Exception e) {
                            throw new RuntimeException("Could not create Accounts Receivable account", e);
                        }
                    });
            
            String depositToName = req.getDepositTo() != null ? req.getDepositTo() : "Bank";
            Account depositAccount = accountRepo
                    .findByNameAndCompanyId(depositToName, companyId)
                    .orElseGet(() -> {
                        try {
                            return accountService.createAccount(new AccountReq(null, depositToName, AccountType.ASSET, null));
                        } catch (Exception e) {
                            throw new RuntimeException("Could not create deposit account", e);
                        }
                    });

            JournalLine debitLine = journalEntryService.createJournalLine(depositAccount, true, totalPaymentAmount, 1, "Payment received");
            JournalLine creditLine = journalEntryService.createJournalLine(arAccount, false, totalPaymentAmount, 2, "Payment received");

            JournalEntry journalEntry = JournalEntry.builder()
                    .company(company)
                    .lines(Arrays.asList(debitLine, creditLine))
                    .docNumber("JE-PAY-" + req.getRefNo())
                    .txnDate(req.getPaymentDate())
                    .totalDebit(totalPaymentAmount)
                    .totalCredit(totalPaymentAmount)
                    .build();

            journalEntryService.saveJournalEntry(journalEntry);

            debitLine.setJournalEntry(journalEntry);
            creditLine.setJournalEntry(journalEntry);
            journalEntryLineRepo.saveAll(Arrays.asList(debitLine, creditLine));
        }
    }
}
