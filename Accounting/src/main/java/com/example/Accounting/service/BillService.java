package com.example.Accounting.service;

import com.example.Accounting.dto.BillReq;
import com.example.Accounting.model.Bill;

import java.util.List;

public interface BillService {
    Bill createBill(BillReq req, Long companyId);
    Bill updateBill(Long id, BillReq req, Long companyId);
    Bill getBillById(Long id, Long companyId);
    List<Bill> getAllBills(Long companyId);
    void deleteBill(Long id, Long companyId);
    void recordBillPayments(com.example.Accounting.request.PaymentReq req, Long companyId);
}
