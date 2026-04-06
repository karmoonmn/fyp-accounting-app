package com.example.Accounting.repo;

import com.example.Accounting.model.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AccountRepo extends JpaRepository<Account, Long> {

    Account findAccountByName(String name);
}
