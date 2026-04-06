package com.example.Accounting.service;

import com.example.Accounting.constant.ErrorCode;
import com.example.Accounting.exception.AccountingException;
import com.example.Accounting.mapper.InvoiceMapper;
import com.example.Accounting.model.*;
import com.example.Accounting.repo.*;
import com.example.Accounting.request.InvoiceReq;
import com.example.Accounting.security.SecurityUtils;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;


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

    @Override
    public Invoice createInvoice(InvoiceReq req) {
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

        //get accounts
        //todo : handle account not found
        Account arAccount = accountRepo.findAccountByName("Accounts Receivable");
        Account salesAccount = accountRepo.findAccountByName("Sales");

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

        journalEntryRepo.save(journalEntry);

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
        return List.of();
    }

    @Override
    public Invoice updateInvoice(Long id, InvoiceReq invoiceReq) {

        return null;
    }

    @Override
    public void deleteInvoice(Long id) {
        Long companyId = SecurityUtils.requireCompanyId();
    }
}
