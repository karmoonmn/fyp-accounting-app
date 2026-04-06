package com.example.Accounting.controller;

import com.example.Accounting.model.Transaction;
import com.example.Accounting.request.TransactionFilter;
import com.example.Accounting.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/transaction")
@RequiredArgsConstructor
public class TransactionController {

    private final TransactionService transactionService;

    /**
         {
         "docNumber": "INV",
         "personId": 1,
         "status": "PAID",
         "sortBy": "txnDate",
         "sortDirection": "desc"
         }
     *  POST /api/transactions/filter?page=0&size=5
     * @param filter
     * @param page
     * @param size
     * @return
     */
    @PostMapping("/filter")
    public Page<Transaction> filterTransactions(
            @RequestBody TransactionFilter filter,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return transactionService.filter(filter, page, size);
    }


}
