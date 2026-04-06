package com.example.Accounting.service;

import com.example.Accounting.model.Account;
import com.example.Accounting.model.JournalEntry;
import com.example.Accounting.model.JournalLine;
import com.example.Accounting.repo.JournalEntryLineRepo;
import com.example.Accounting.repo.JournalEntryRepo;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
@AllArgsConstructor
public class JournalEntryServiceImpl implements JournalEntryService {

//    private final JournalEntryRepo journalEntryRepo;
    private final JournalEntryLineRepo journalEntryLineRepo;

//    public void saveJournalEntry(JournalEntry journalEntry) {
//        //    private List<JournalEntryLine> lines;
//        //
//        //    private BigDecimal totalDebit;
//        //    private BigDecimal totalCredit;
//        //private int lineNum;
//        //    private String description;
//        //    private BigDecimal debit = BigDecimal.ZERO;
//        //    private BigDecimal credit = BigDecimal.ZERO;
//        //
//        //    @ManyToOne
//        //    @JoinColumn(name = "account_id")
//        //    private Account account;
//        //
//        //    @ManyToOne
//        //    @JoinColumn(name = "journal_entry_id")
//        //    private JournalEntry journalEntry;
//
//        //req : lines [{linenum, description, debit, credit, accountid
//    }

    public JournalLine createJournalLine(Account account, boolean isDebit, BigDecimal amount, int lineNum, String description) {
        JournalLine journalLine = JournalLine.builder()
                .lineNum(lineNum)
                .account(account)
                .description(description)
                .build();

        if (isDebit) {
            journalLine.setDebit(amount);
        } else {
            journalLine.setCredit(amount);
        }
        return journalEntryLineRepo.save(journalLine);
    }
}
