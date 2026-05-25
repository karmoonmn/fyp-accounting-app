package com.example.Accounting.repo;

import com.example.Accounting.model.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepo extends JpaRepository<Payment, Long> {
    Optional<Payment> findByIdAndCompanyId(Long id, Long companyId);
    List<Payment> findAllByCompanyIdOrderByTxnDateDesc(Long companyId);
}
