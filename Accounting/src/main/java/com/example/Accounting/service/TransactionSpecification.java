package com.example.Accounting.service;

import com.example.Accounting.constant.TransConstant;
import com.example.Accounting.model.Bill;
import com.example.Accounting.model.Invoice;
import com.example.Accounting.model.Transaction;
import com.example.Accounting.request.TransactionFilter;
import jakarta.persistence.criteria.Expression;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import jakarta.persistence.criteria.Predicate;

public class TransactionSpecification {

    public static Specification<Transaction> filter(TransactionFilter filter, Long companyId) {
        return (root, query, cb) -> {
            query.distinct(true);

            List<Predicate> predicates = new ArrayList<>();

            predicates.add(cb.equal(root.get("company").get("id"), companyId));

            if (filter.getType() != null) {
                switch (filter.getType()) {
                    case TransConstant.INVOICE -> predicates.add(cb.equal(root.type(), Invoice.class));
                    case TransConstant.BILL -> predicates.add(cb.equal(root.type(), Bill.class));
//                    case TransConstant.PAYMENT -> predicates.add(cb.equal(root.type(), Payment.class));
                }
            }
            if (TransConstant.INVOICE.equalsIgnoreCase(filter.getType())) {
                predicates.add(cb.equal(root.type(), Invoice.class));
            }

            if (filter.getTxnDate() != null) {
                predicates.add(cb.equal(
                        root.get("txnDate"),
                        filter.getTxnDate()
                ));
            }

            if (filter.getDocNumber() != null && !filter.getDocNumber().isEmpty()) {
                predicates.add(cb.like(
                        cb.lower(root.get("docNumber")),
                        "%" + filter.getDocNumber().toLowerCase() + "%"
                ));
            }

            if (filter.getStatus() != null) {
                predicates.add(cb.equal(
                        root.get("status"),
                        filter.getStatus()
                ));
            }

            if (filter.getPersonId() != null) {
                Predicate invoiceMatch = cb.and(
                        cb.equal(root.type(), Invoice.class),
                        cb.equal(root.get("customer").get("id"), filter.getPersonId())
                );

                Predicate billMatch = cb.and(
                        cb.equal(root.type(), Bill.class),
                        cb.equal(root.get("supplier").get("id"), filter.getPersonId())
                );
                predicates.add(cb.or(invoiceMatch, billMatch));
            }

            if ("person".equalsIgnoreCase(filter.getSortBy())) {
                Expression<Object> personName = cb.selectCase()
                        .when(cb.equal(root.type(), Invoice.class), root.get("customer").get("name"))
                        .when(cb.equal(root.type(), Bill.class), root.get("supplier").get("name"))
                        .otherwise("");

                if ("desc".equalsIgnoreCase(filter.getSortDirection())) {
                    query.orderBy(cb.desc(personName));
                } else {
                    query.orderBy(cb.asc(personName));
                }
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }
}
