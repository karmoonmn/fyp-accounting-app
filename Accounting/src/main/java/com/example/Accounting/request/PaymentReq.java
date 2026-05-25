package com.example.Accounting.request;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
public class PaymentReq {
    private String refNo;
    private LocalDate paymentDate;
    private String depositTo;
    private List<InvoicePaymentItem> payments;

    @Data
    public static class InvoicePaymentItem {
        private Long invoiceId;
        private Long billId;
        private BigDecimal amount;
    }
}
