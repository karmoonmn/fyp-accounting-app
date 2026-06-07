package com.example.Accounting.repo;

import com.example.Accounting.model.Bill;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BillRepo extends JpaRepository<Bill, Long> {
    @org.springframework.data.jpa.repository.Query("SELECT b FROM Bill b LEFT JOIN FETCH b.supplier WHERE b.company.id = :companyId ORDER BY b.txnDate DESC")
    List<Bill> findAllByCompanyId(@org.springframework.data.repository.query.Param("companyId") Long companyId);
    Optional<Bill> findByIdAndCompanyId(Long id, Long companyId);

    @org.springframework.data.jpa.repository.Query("SELECT b FROM Bill b WHERE b.company.id = :companyId AND b.status != com.example.Accounting.model.TransactionStatus.PAID AND b.balance > 0")
    List<Bill> findUnpaidBillsByCompanyId(@org.springframework.data.repository.query.Param("companyId") Long companyId);
}
