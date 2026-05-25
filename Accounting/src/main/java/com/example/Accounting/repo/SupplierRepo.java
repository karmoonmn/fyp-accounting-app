package com.example.Accounting.repo;

import com.example.Accounting.model.Supplier;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SupplierRepo extends JpaRepository<Supplier, Long> {
    List<Supplier> findAllByCompanyId(Long companyId);
    Optional<Supplier> findByIdAndCompanyId(Long id, Long companyId);
}
