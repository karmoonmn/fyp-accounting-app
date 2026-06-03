package com.example.Accounting.service;

import com.example.Accounting.model.Account;
import com.example.Accounting.model.JournalEntry;
import com.example.Accounting.model.JournalLine;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface JournalEntryService {
    JournalEntry saveJournalEntry(JournalEntry journalEntry);

    JournalLine createJournalLine(Account account, boolean isDebit, BigDecimal amount, int lineNum, String description);
}
