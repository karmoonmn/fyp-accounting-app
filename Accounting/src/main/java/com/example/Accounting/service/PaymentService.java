package com.example.Accounting.service;

import com.example.Accounting.model.Payment;
import com.example.Accounting.request.PaymentReq;
import java.util.List;

public interface PaymentService {
    List<Payment> listPaymentsForCurrentCompany();
    Payment getPaymentById(Long id);
    Payment updatePayment(Long id, PaymentReq req);
    void deletePayment(Long id);
}
