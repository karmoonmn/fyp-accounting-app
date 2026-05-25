package com.example.Accounting.repo;

import com.example.Accounting.model.JournalLine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface JournalEntryLineRepo extends JpaRepository<JournalLine, Long> {
    List<JournalLine> findByAccount_IdOrderByJournalEntry_TxnDateAsc(Long accountId);
}
