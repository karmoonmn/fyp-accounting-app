package com.example.Accounting.model;

import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentAllocation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id")
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"allocations", "company", "journalEntry"})
    private Payment payment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id")
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"payments", "lines", "company", "customer", "journalEntry"})
    private Invoice invoice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bill_id")
    @com.fasterxml.jackson.annotation.JsonIgnoreProperties({"payments", "lines", "company", "vendor", "journalEntry"})
    private Bill bill;

    private BigDecimal amount;
}
