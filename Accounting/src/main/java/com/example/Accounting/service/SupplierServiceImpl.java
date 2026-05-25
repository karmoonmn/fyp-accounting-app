package com.example.Accounting.service;

import com.example.Accounting.dto.SupplierReq;
import com.example.Accounting.model.Company;
import com.example.Accounting.model.Supplier;
import com.example.Accounting.repo.CompanyRepo;
import com.example.Accounting.repo.SupplierRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SupplierServiceImpl implements SupplierService {

    private final SupplierRepo supplierRepo;
    private final CompanyRepo companyRepo;

    @Override
    public Supplier createSupplier(SupplierReq req, Long companyId) {
        Company company = companyRepo.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Company not found"));
                
        Supplier supplier = new Supplier();
        supplier.setName(req.getName());
        supplier.setEmail(req.getEmail());
        supplier.setPhoneNum(req.getPhone());
        supplier.setAddr(req.getAddr());
        supplier.setCompany(company);
        
        return supplierRepo.save(supplier);
    }

    @Override
    public Supplier updateSupplier(Long id, SupplierReq req, Long companyId) {
        Supplier supplier = supplierRepo.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() -> new RuntimeException("Supplier not found"));
                
        supplier.setName(req.getName());
        supplier.setEmail(req.getEmail());
        supplier.setPhoneNum(req.getPhone());
        supplier.setAddr(req.getAddr());
        
        return supplierRepo.save(supplier);
    }

    @Override
    public Supplier getSupplierById(Long id, Long companyId) {
        return supplierRepo.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() -> new RuntimeException("Supplier not found"));
    }

    @Override
    public List<Supplier> getAllSuppliers(Long companyId) {
        return supplierRepo.findAllByCompanyId(companyId);
    }

    @Override
    public void deleteSupplier(Long id, Long companyId) {
        Supplier supplier = supplierRepo.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() -> new RuntimeException("Supplier not found"));
        supplierRepo.delete(supplier);
    }
}
