package com.example.Accounting.exception;

import com.example.Accounting.constant.ErrorCode;
import lombok.Getter;

@Getter
public class AccountingException extends RuntimeException {

    private final ErrorCode errorCode;

    public AccountingException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
    }

    public AccountingException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}
