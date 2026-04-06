package com.example.Accounting.repo;

import com.example.Accounting.model.JournalLine;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JournalEntryLineRepo extends JpaRepository<JournalLine, Long> {
}
