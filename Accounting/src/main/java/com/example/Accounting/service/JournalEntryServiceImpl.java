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

    private final JournalEntryRepo journalEntryRepo;
    private final JournalEntryLineRepo journalEntryLineRepo;

    public JournalEntry saveJournalEntry(JournalEntry journalEntry) {
        if (journalEntry.getLines() == null || journalEntry.getLines().isEmpty()) {
            throw new IllegalArgumentException("Journal Entry must have lines");
        }

        BigDecimal totalDebit = BigDecimal.ZERO;
        BigDecimal totalCredit = BigDecimal.ZERO;

        for (JournalLine line : journalEntry.getLines()) {
            if (line.getDebit() != null) {
                totalDebit = totalDebit.add(line.getDebit());
            }
            if (line.getCredit() != null) {
                totalCredit = totalCredit.add(line.getCredit());
            }
        }

        if (totalDebit.compareTo(totalCredit) != 0) {
            throw new IllegalArgumentException(String.format("Double entry violation: Debits (%.2f) do not equal Credits (%.2f)", totalDebit, totalCredit));
        }

        journalEntry.setTotalDebit(totalDebit);
        journalEntry.setTotalCredit(totalCredit);

        return journalEntryRepo.save(journalEntry);
    }

    public JournalLine createJournalLine(Account account, boolean isDebit, BigDecimal amount, int lineNum, String description) {
        if (account.getChildren() != null && !account.getChildren().isEmpty()) {
            throw new IllegalArgumentException("Cannot post journal entries directly to a parent account. Must use a leaf account.");
        }

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
