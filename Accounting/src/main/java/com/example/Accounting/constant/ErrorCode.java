package com.example.Accounting.constant;

import lombok.Getter;

@Getter
public enum ErrorCode {

    //    Invoice
    INVOICE_NOT_FOUND("INV_404", "Invoice not found"),
    INVALID_PAYMENT_AMOUNT("PAY_400", "Invalid payment amount"),
    
    //    Document
    DOC_NUMBER_EXISTS("DOC_400", "doc number exist for bill or invoice"),

    //  account
    ACCOUNT_NOT_FOUND("ACC_404", "Account not found");

    private final String code;
    private final String message;

    ErrorCode(String code, String message) {
        this.code = code;
        this.message = message;
    }
}
