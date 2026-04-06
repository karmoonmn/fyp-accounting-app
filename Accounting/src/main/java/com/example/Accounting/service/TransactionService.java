package com.example.Accounting.service;

import com.example.Accounting.model.Transaction;
import com.example.Accounting.repo.TransactionRepo;
import com.example.Accounting.request.TransactionFilter;
import com.example.Accounting.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepo transactionRepo;

    public Page<Transaction> filter(TransactionFilter filter, int page, int size) {
        Sort sort = Sort.by("txnDate").descending();

        log.info("filter service");

        if (filter.getSortBy() != null) {
            Sort.Direction direction = "desc".equalsIgnoreCase(filter.getSortDirection()) ?
                    Sort.Direction.DESC : Sort.Direction.ASC;

            switch (filter.getSortBy()) {
                case "txnDate" :
                    sort = Sort.by(direction, "txnDate");
                    break;

                case "docNumber" :
                    sort = Sort.by(direction, "docNumber");
                    break;
            }
        }

        Pageable pageable = PageRequest.of(page, size, sort);

        Long companyId = SecurityUtils.requireCompanyId();
        return transactionRepo.findAll(TransactionSpecification.filter(filter, companyId), pageable);
    }
}
