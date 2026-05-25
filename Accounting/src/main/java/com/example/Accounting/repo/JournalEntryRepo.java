package com.example.Accounting.repo;

import com.example.Accounting.model.JournalEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface JournalEntryRepo extends JpaRepository<JournalEntry, Long> {

    Optional<JournalEntry> findByDocNumberAndCompanyId(String docNumber, Long companyId);
}
