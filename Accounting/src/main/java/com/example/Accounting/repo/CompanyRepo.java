package com.example.Accounting.repo;

import com.example.Accounting.model.Company;
import com.example.Accounting.model.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CompanyRepo extends JpaRepository<Company, Long> {
}
