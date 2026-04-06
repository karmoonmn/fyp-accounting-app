package com.example.Accounting.constant;

import lombok.Getter;

@Getter
public enum ErrorCode {

    //    Invoice
    INVOICE_NOT_FOUND("INV_404", "Invoice not found");

    private final String code;
    private final String message;

    ErrorCode(String code, String message) {
        this.code = code;
        this.message = message;
    }
}
