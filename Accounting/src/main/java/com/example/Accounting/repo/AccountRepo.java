package com.example.Accounting.repo;

import com.example.Accounting.model.Account;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AccountRepo extends JpaRepository<Account, Long> {

    Optional<Account> findByNameAndCompanyId(String name, Long companyId);
    Optional<Account> findByIdAndCompanyId(Long id, Long companyId);
    
    java.util.List<Account> findAllByCompanyId(Long companyId);
    
    Page<Account> findAllByCompanyId(Long companyId, Pageable pageable);

    boolean existsByAccountCodeAndCompanyId(String accountCode, Long companyId);

    @Query("SELECT a FROM Account a WHERE a.company.id = :companyId AND a.parent IS NULL")
    java.util.List<Account> findRootAccountsByCompanyId(@Param("companyId") Long companyId);

    @Query("SELECT a FROM Account a WHERE a.company.id = :companyId AND " +
           "(LOWER(a.name) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(a.accountCode) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Account> searchAccounts(@Param("companyId") Long companyId, @Param("query") String query, Pageable pageable);
}
