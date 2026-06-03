package com.example.Accounting.repo;

import com.example.Accounting.model.Invoice;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InvoiceRepo extends JpaRepository<Invoice, Long> {

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"customer", "lines"})
    Optional<Invoice> findByIdAndCompanyId(Long id, Long companyId);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"customer"})
    List<Invoice> findAllByCompanyIdOrderByTxnDateDesc(Long companyId);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"customer"})
    List<Invoice> findAllByCompanyIdAndCustomer_Id(Long companyId, Long customerId);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"customer"})
    @org.springframework.data.jpa.repository.Query("SELECT i FROM Invoice i WHERE i.company.id = :companyId AND i.status != 'PAID' AND i.balance > 0")
    List<Invoice> findUnpaidInvoicesByCompanyId(@org.springframework.data.repository.query.Param("companyId") Long companyId);
}
