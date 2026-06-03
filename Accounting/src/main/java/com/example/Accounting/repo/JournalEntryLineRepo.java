package com.example.Accounting.repo;

import com.example.Accounting.model.JournalLine;
import org.springframework.data.jpa.repository.JpaRepository;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface JournalEntryLineRepo extends JpaRepository<JournalLine, Long> {
    List<JournalLine> findByAccount_IdOrderByJournalEntry_TxnDateAsc(Long accountId);

    @Query("SELECT jl.account, SUM(COALESCE(jl.debit, 0)), SUM(COALESCE(jl.credit, 0)) " +
           "FROM JournalLine jl JOIN jl.journalEntry je " +
           "WHERE je.company.id = :companyId AND je.txnDate <= :endDate " +
           "GROUP BY jl.account")
    List<Object[]> getAccountBalancesUpToDate(@Param("companyId") Long companyId, @Param("endDate") LocalDate endDate);

    @Query("SELECT jl.account, SUM(COALESCE(jl.debit, 0)), SUM(COALESCE(jl.credit, 0)) " +
           "FROM JournalLine jl JOIN jl.journalEntry je " +
           "WHERE je.company.id = :companyId AND je.txnDate BETWEEN :startDate AND :endDate " +
           "GROUP BY jl.account")
    List<Object[]> getAccountBalancesForPeriod(@Param("companyId") Long companyId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);

    @Query("SELECT je.txnDate, jl.account, SUM(COALESCE(jl.debit, 0)), SUM(COALESCE(jl.credit, 0)) " +
           "FROM JournalLine jl JOIN jl.journalEntry je " +
           "WHERE je.company.id = :companyId AND je.txnDate BETWEEN :startDate AND :endDate " +
           "GROUP BY je.txnDate, jl.account " +
           "ORDER BY je.txnDate ASC")
    List<Object[]> getDailyAccountBalancesForPeriod(@Param("companyId") Long companyId, @Param("startDate") LocalDate startDate, @Param("endDate") LocalDate endDate);
}
