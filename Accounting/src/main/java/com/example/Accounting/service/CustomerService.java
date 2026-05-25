package com.example.Accounting.service;

import com.example.Accounting.dto.CustomerReq;
import com.example.Accounting.model.Customer;

import java.util.List;

public interface CustomerService {
    Customer createCustomer(CustomerReq req, Long companyId);
    Customer updateCustomer(Long id, CustomerReq req, Long companyId);
    Customer getCustomerById(Long id, Long companyId);
    List<Customer> getAllCustomers(Long companyId);
    void deleteCustomer(Long id, Long companyId);
}
