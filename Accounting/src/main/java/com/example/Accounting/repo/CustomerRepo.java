package com.example.Accounting.repo;


import com.example.Accounting.model.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CustomerRepo extends JpaRepository<Customer, Long> {
    Optional<Customer> findByIdAndCompanyId(Long id, Long companyId);
    List<Customer> findAllByCompanyId(Long companyId);
}
