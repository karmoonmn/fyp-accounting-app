package com.example.Accounting.repo;

import com.example.Accounting.model.PaymentAllocation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentAllocationRepo extends JpaRepository<PaymentAllocation, Long> {
    List<PaymentAllocation> findByInvoiceId(Long invoiceId);
}
