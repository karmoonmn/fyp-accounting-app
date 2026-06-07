package com.example.Accounting.service;

import com.example.Accounting.constant.ErrorCode;
import com.example.Accounting.exception.AccountingException;
import com.example.Accounting.model.*;
import com.example.Accounting.repo.*;
import com.example.Accounting.request.AccountReq;
import com.example.Accounting.request.PaymentReq;
import com.example.Accounting.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentServiceImpl implements PaymentService {

    private final PaymentRepo paymentRepo;
    private final PaymentAllocationRepo paymentAllocationRepo;
    private final InvoiceRepo invoiceRepo;
    private final JournalEntryRepo journalEntryRepo;
    private final JournalEntryLineRepo journalEntryLineRepo;
    private final CompanyRepo companyRepo;
    private final AccountRepo accountRepo;
    private final AccountService accountService;
    private final JournalEntryService journalEntryService;
    private final BillRepo billRepo;

    @Override
    public List<Payment> listPaymentsForCurrentCompany() {
        Long companyId = SecurityUtils.requireCompanyId();
        // Assume we need a method in PaymentRepo to find by company Id
        return paymentRepo.findAllByCompanyIdOrderByTxnDateDesc(companyId);
    }

    @Override
    public Payment getPaymentById(Long id) {
        Long companyId = SecurityUtils.requireCompanyId();
        return paymentRepo.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() -> new AccountingException(ErrorCode.INVOICE_NOT_FOUND)); // TODO custom error
    }

    @Override
    @Transactional
    public Payment updatePayment(Long id, PaymentReq req) {
        Long companyId = SecurityUtils.requireCompanyId();
        Company company = companyRepo.getReferenceById(companyId);

        Payment payment = paymentRepo.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() -> new AccountingException(ErrorCode.INVOICE_NOT_FOUND));

        String oldDocNumber = payment.getDocNumber();

        // 1. Revert Old Allocations
        List<PaymentAllocation> oldAllocations = payment.getAllocations();
        if (oldAllocations != null) {
            for (PaymentAllocation allocation : oldAllocations) {
                if (allocation.getInvoice() != null) {
                    Invoice inv = allocation.getInvoice();
                    BigDecimal currentBalance = inv.getBalance() != null ? inv.getBalance() : inv.getTotalAmt();
                    inv.setBalance(currentBalance.add(allocation.getAmount()));
                    
                    if (inv.getBalance().compareTo(inv.getTotalAmt()) >= 0) {
                        inv.setBalance(inv.getTotalAmt());
                        inv.setStatus(TransactionStatus.UNPAID);
                    } else if (inv.getBalance().compareTo(BigDecimal.ZERO) > 0) {
                        inv.setStatus(TransactionStatus.PARTIALLY_PAID);
                    }
                    invoiceRepo.save(inv);
                } else if (allocation.getBill() != null) {
                    Bill bill = allocation.getBill();
                    BigDecimal currentBalance = bill.getBalance() != null ? bill.getBalance() : bill.getTotalAmt();
                    bill.setBalance(currentBalance.add(allocation.getAmount()));
                    
                    if (bill.getBalance().compareTo(bill.getTotalAmt()) >= 0) {
                        bill.setBalance(bill.getTotalAmt());
                        bill.setStatus(TransactionStatus.UNPAID);
                    } else if (bill.getBalance().compareTo(BigDecimal.ZERO) > 0) {
                        bill.setStatus(TransactionStatus.PARTIALLY_PAID);
                    }
                    billRepo.save(bill);
                }
            }
            paymentAllocationRepo.deleteAll(oldAllocations);
            payment.getAllocations().clear();
        }

        // 2. Apply New Allocations
        BigDecimal totalPaymentAmount = BigDecimal.ZERO;
        for (PaymentReq.InvoicePaymentItem item : req.getPayments()) {
            if ((item.getInvoiceId() == null && item.getBillId() == null) || item.getAmount() == null || item.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }

            PaymentAllocation.PaymentAllocationBuilder allocBuilder = PaymentAllocation.builder()
                    .payment(payment)
                    .amount(item.getAmount());

            if (item.getInvoiceId() != null) {
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
                allocBuilder.invoice(invoice);
            } else if (item.getBillId() != null) {
                Bill bill = billRepo.findByIdAndCompanyId(item.getBillId(), companyId)
                        .orElseThrow(() -> new AccountingException(ErrorCode.INVOICE_NOT_FOUND)); // TODO custom error
                        
                BigDecimal currentBalance = bill.getBalance() != null ? bill.getBalance() : bill.getTotalAmt();
                BigDecimal newBalance = currentBalance.subtract(item.getAmount());
                if (newBalance.compareTo(BigDecimal.ZERO) < 0) {
                    throw new AccountingException(ErrorCode.INVALID_PAYMENT_AMOUNT, "Payment amount cannot exceed the remaining bill balance.");
                }

                bill.setBalance(newBalance);

                BigDecimal totalAmt = bill.getTotalAmt() != null ? bill.getTotalAmt() : BigDecimal.ZERO;
                if (newBalance.compareTo(BigDecimal.ZERO) == 0 && totalAmt.compareTo(BigDecimal.ZERO) > 0) {
                    bill.setStatus(TransactionStatus.PAID);
                } else {
                    bill.setStatus(TransactionStatus.PARTIALLY_PAID);
                }

                billRepo.save(bill);
                allocBuilder.bill(bill);
            }

            totalPaymentAmount = totalPaymentAmount.add(item.getAmount());

            PaymentAllocation allocation = allocBuilder.build();
            paymentAllocationRepo.save(allocation);
            payment.getAllocations().add(allocation);
        }

        // 3. Update Payment record
        payment.setDocNumber(req.getRefNo());
        payment.setTxnDate(req.getPaymentDate());
        payment.setDepositTo(req.getDepositTo() != null ? req.getDepositTo() : "Bank");
        payment.setTotalAmount(totalPaymentAmount);
        paymentRepo.save(payment);

        // 4. Update Journal Entry
        Optional<JournalEntry> jeOpt = journalEntryRepo.findByDocNumberAndCompanyId("JE-PAY-" + oldDocNumber, companyId);
        if (jeOpt.isPresent()) {
            if (totalPaymentAmount.compareTo(BigDecimal.ZERO) == 0) {
                // If total became 0, delete journal entry
                journalEntryRepo.delete(jeOpt.get());
            } else {
                JournalEntry journalEntry = jeOpt.get();
                journalEntry.setDocNumber("JE-PAY-" + req.getRefNo());
                journalEntry.setTxnDate(req.getPaymentDate());
                journalEntry.setTotalDebit(totalPaymentAmount);
                journalEntry.setTotalCredit(totalPaymentAmount);

                String depositToName = payment.getDepositTo();
                Account depositAccount = accountRepo.findByNameAndCompanyId(depositToName, companyId)
                    .orElseGet(() -> {
                        try {
                            return accountService.createAccount(new AccountReq(null, depositToName, AccountType.ASSET, null));
                        } catch (Exception e) {
                            throw new RuntimeException("Could not create deposit account", e);
                        }
                    });

                List<JournalLine> lines = journalEntry.getLines();
                for (JournalLine jl : lines) {
                    if ("BILL_PAYMENT".equals(payment.getPaymentType())) {
                        if (jl.getCredit() != null && jl.getCredit().compareTo(BigDecimal.ZERO) > 0) {
                            jl.setCredit(totalPaymentAmount);
                            jl.setAccount(depositAccount);
                        } else if (jl.getDebit() != null && jl.getDebit().compareTo(BigDecimal.ZERO) > 0) {
                            jl.setDebit(totalPaymentAmount);
                        }
                    } else {
                        if (jl.getDebit() != null && jl.getDebit().compareTo(BigDecimal.ZERO) > 0) {
                            jl.setDebit(totalPaymentAmount);
                            jl.setAccount(depositAccount); // Update deposit account if changed
                        } else if (jl.getCredit() != null && jl.getCredit().compareTo(BigDecimal.ZERO) > 0) {
                            jl.setCredit(totalPaymentAmount);
                        }
                    }
                    journalEntryLineRepo.save(jl);
                }
                journalEntryService.saveJournalEntry(journalEntry);
            }
        } else if (totalPaymentAmount.compareTo(BigDecimal.ZERO) > 0) {
            // Recreate journal entry if it was missing
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

            JournalLine debitLine;
            JournalLine creditLine;

            if ("BILL_PAYMENT".equals(payment.getPaymentType())) {
                Account apAccount = accountRepo
                        .findByNameAndCompanyId("Accounts Payable", companyId)
                        .orElseThrow(() -> new RuntimeException("Accounts Payable account not found"));

                debitLine = journalEntryService.createJournalLine(apAccount, true, totalPaymentAmount, 1, "Payment made");
                creditLine = journalEntryService.createJournalLine(depositAccount, false, totalPaymentAmount, 2, "Payment made");
            } else {
                Account arAccount = accountRepo
                        .findByNameAndCompanyId("Accounts Receivable", companyId)
                        .orElseGet(() -> {
                            try {
                                return accountService.createAccount(new AccountReq(null, "Accounts Receivable", AccountType.ASSET, null));
                            } catch (Exception e) {
                                throw new RuntimeException("Could not create Accounts Receivable account", e);
                            }
                        });

                debitLine = journalEntryService.createJournalLine(depositAccount, true, totalPaymentAmount, 1, "Payment received");
                creditLine = journalEntryService.createJournalLine(arAccount, false, totalPaymentAmount, 2, "Payment received");
            }

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

        return payment;
    }

    @Override
    @Transactional
    public void deletePayment(Long id) {
        Long companyId = SecurityUtils.requireCompanyId();
        Payment payment = paymentRepo.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() -> new AccountingException(ErrorCode.INVOICE_NOT_FOUND));

        // Revert allocations
        List<PaymentAllocation> oldAllocations = payment.getAllocations();
        if (oldAllocations != null) {
            for (PaymentAllocation allocation : oldAllocations) {
                if (allocation.getInvoice() != null) {
                    Invoice inv = allocation.getInvoice();
                    BigDecimal currentBalance = inv.getBalance() != null ? inv.getBalance() : inv.getTotalAmt();
                    inv.setBalance(currentBalance.add(allocation.getAmount()));
                    
                    if (inv.getBalance().compareTo(inv.getTotalAmt()) >= 0) {
                        inv.setBalance(inv.getTotalAmt());
                        inv.setStatus(TransactionStatus.UNPAID);
                    } else if (inv.getBalance().compareTo(BigDecimal.ZERO) > 0) {
                        inv.setStatus(TransactionStatus.PARTIALLY_PAID);
                    }
                    invoiceRepo.save(inv);
                } else if (allocation.getBill() != null) {
                    Bill bill = allocation.getBill();
                    BigDecimal currentBalance = bill.getBalance() != null ? bill.getBalance() : bill.getTotalAmt();
                    bill.setBalance(currentBalance.add(allocation.getAmount()));
                    
                    if (bill.getBalance().compareTo(bill.getTotalAmt()) >= 0) {
                        bill.setBalance(bill.getTotalAmt());
                        bill.setStatus(TransactionStatus.UNPAID);
                    } else if (bill.getBalance().compareTo(BigDecimal.ZERO) > 0) {
                        bill.setStatus(TransactionStatus.PARTIALLY_PAID);
                    }
                    billRepo.save(bill);
                }
            }
            paymentAllocationRepo.deleteAll(oldAllocations);
        }

        // Delete JE
        Optional<JournalEntry> jeOpt = journalEntryRepo.findByDocNumberAndCompanyId("JE-PAY-" + payment.getDocNumber(), companyId);
        jeOpt.ifPresent(journalEntryRepo::delete);

        // Delete Payment
        paymentRepo.delete(payment);
    }
}
