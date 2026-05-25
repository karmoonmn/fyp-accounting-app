package com.example.Accounting.service;

import com.example.Accounting.dto.SupplierReq;
import com.example.Accounting.model.Supplier;

import java.util.List;

public interface SupplierService {
    Supplier createSupplier(SupplierReq req, Long companyId);
    Supplier updateSupplier(Long id, SupplierReq req, Long companyId);
    Supplier getSupplierById(Long id, Long companyId);
    List<Supplier> getAllSuppliers(Long companyId);
    void deleteSupplier(Long id, Long companyId);
}
