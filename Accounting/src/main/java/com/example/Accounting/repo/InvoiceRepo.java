package com.example.Accounting.repo;

import com.example.Accounting.model.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepo extends JpaRepository<Invoice, Long> {

    Optional<Invoice> findByIdAndCompanyId(Long id, Long companyId);

    List<Invoice> findAllByCompanyIdOrderByTxnDateDesc(Long companyId);
}
