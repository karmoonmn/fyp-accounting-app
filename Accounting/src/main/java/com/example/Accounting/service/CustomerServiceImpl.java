package com.example.Accounting.service;

import com.example.Accounting.dto.CustomerReq;
import com.example.Accounting.model.Company;
import com.example.Accounting.model.Customer;
import com.example.Accounting.repo.CompanyRepo;
import com.example.Accounting.repo.CustomerRepo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomerServiceImpl implements CustomerService {

    private final CustomerRepo customerRepo;
    private final CompanyRepo companyRepo;

    @Override
    public Customer createCustomer(CustomerReq req, Long companyId) {
        Company company = companyRepo.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Company not found"));
        
        Customer customer = new Customer();
        customer.setName(req.getName());
        customer.setEmail(req.getEmail());
        customer.setPhoneNum(req.getPhoneNum());
        customer.setAddr(req.getAddr());
        customer.setCompany(company);
        
        return customerRepo.save(customer);
    }

    @Override
    public Customer updateCustomer(Long id, CustomerReq req, Long companyId) {
        Customer customer = getCustomerById(id, companyId);
        
        customer.setName(req.getName());
        customer.setEmail(req.getEmail());
        customer.setPhoneNum(req.getPhoneNum());
        customer.setAddr(req.getAddr());
        
        return customerRepo.save(customer);
    }

    @Override
    public Customer getCustomerById(Long id, Long companyId) {
        return customerRepo.findByIdAndCompanyId(id, companyId)
                .orElseThrow(() -> new RuntimeException("Customer not found"));
    }

    @Override
    public List<Customer> getAllCustomers(Long companyId) {
        return customerRepo.findAllByCompanyId(companyId);
    }

    @Override
    public void deleteCustomer(Long id, Long companyId) {
        Customer customer = getCustomerById(id, companyId);
        customerRepo.delete(customer);
    }
}
