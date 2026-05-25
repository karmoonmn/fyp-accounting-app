package com.example.Accounting.service;

import com.example.Accounting.constant.TransConstant;
import com.example.Accounting.model.Bill;
import com.example.Accounting.model.Invoice;
import com.example.Accounting.model.Payment;
import com.example.Accounting.model.Transaction;
import com.example.Accounting.request.TransactionFilter;
import jakarta.persistence.criteria.Expression;
import org.springframework.data.jpa.domain.Specification;

import java.util.ArrayList;
import java.util.List;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.JoinType;
import jakarta.persistence.criteria.Join;

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
                    case TransConstant.PAYMENT -> predicates.add(cb.equal(root.type(), Payment.class));
                }
            }

            if (filter.getTxnDate() != null) {
                predicates.add(cb.equal(
                        root.get("txnDate"),
                        filter.getTxnDate()
                ));
            }

            if (filter.getDocNumber() != null && !filter.getDocNumber().trim().isEmpty()) {
                String searchStr = filter.getDocNumber().trim().toLowerCase();
                String keyword = "%" + searchStr + "%";

                Predicate docNumMatch = cb.like(cb.lower(root.get("docNumber")), keyword);

                // Use LEFT JOIN to avoid filtering out transactions that don't have a customer or supplier
                Join<Transaction, ?> customerJoin = cb.treat(root, Invoice.class).join("customer", JoinType.LEFT);
                Predicate invoicePersonMatch = cb.like(cb.lower(customerJoin.get("name")), keyword);

                Join<Transaction, ?> supplierJoin = cb.treat(root, Bill.class).join("supplier", JoinType.LEFT);
                Predicate billPersonMatch = cb.like(cb.lower(supplierJoin.get("name")), keyword);

                Predicate paymentMatch = cb.or(
                        cb.like(cb.lower(cb.treat(root, Payment.class).get("depositTo")), keyword),
                        cb.like(cb.lower(cb.treat(root, Payment.class).get("paymentType")), keyword)
                );

                Predicate amountMatch = null;
                try {
                    java.math.BigDecimal searchAmt = new java.math.BigDecimal(searchStr);
                    Predicate invoiceAmt = cb.equal(cb.treat(root, Invoice.class).get("totalAmt"), searchAmt);
                    Predicate billAmt = cb.equal(cb.treat(root, Bill.class).get("totalAmt"), searchAmt);
                    Predicate paymentAmt = cb.equal(cb.treat(root, Payment.class).get("totalAmount"), searchAmt);
                    amountMatch = cb.or(invoiceAmt, billAmt, paymentAmt);
                } catch (NumberFormatException e) {
                    // Ignore if not a valid number
                }

                if (amountMatch != null) {
                    predicates.add(cb.or(docNumMatch, invoicePersonMatch, billPersonMatch, paymentMatch, amountMatch));
                } else {
                    predicates.add(cb.or(docNumMatch, invoicePersonMatch, billPersonMatch, paymentMatch));
                }
            }

            if (filter.getStatus() != null) {
                Predicate invoiceStatus = cb.equal(cb.treat(root, Invoice.class).get("status"), filter.getStatus());
                Predicate billStatus = cb.equal(cb.treat(root, Bill.class).get("status"), filter.getStatus());
                predicates.add(cb.or(invoiceStatus, billStatus));
            }

            if (filter.getPersonId() != null) {
                Join<Transaction, ?> custJoin = cb.treat(root, Invoice.class).join("customer", JoinType.LEFT);
                Predicate invoiceMatch = cb.equal(custJoin.get("id"), filter.getPersonId());
                
                Join<Transaction, ?> suppJoin = cb.treat(root, Bill.class).join("supplier", JoinType.LEFT);
                Predicate billMatch = cb.equal(suppJoin.get("id"), filter.getPersonId());
                
                predicates.add(cb.or(invoiceMatch, billMatch));
            }

            if ("person".equalsIgnoreCase(filter.getSortBy())) {
                Join<Transaction, ?> custJoin = cb.treat(root, Invoice.class).join("customer", JoinType.LEFT);
                Join<Transaction, ?> suppJoin = cb.treat(root, Bill.class).join("supplier", JoinType.LEFT);
                
                Expression<Object> personName = cb.selectCase()
                        .when(cb.equal(root.type(), Invoice.class), custJoin.get("name"))
                        .when(cb.equal(root.type(), Bill.class), suppJoin.get("name"))
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
