package com.example.Accounting.mapper;


import com.example.Accounting.model.Invoice;
import com.example.Accounting.model.Line;
import com.example.Accounting.request.InvoiceReq;

import java.math.BigDecimal;
import java.util.List;

public class InvoiceMapper {
    public static Invoice toEntity(InvoiceReq req) {
        List<Line> lines = req.getLines().stream().map(lineReq -> {
            BigDecimal amount = lineReq.getQuantity().multiply(lineReq.getUnitPrice());

            return Line.builder()
                    .lineNum(lineReq.getLineNum())
                    .amount(amount)
                    .quantity(lineReq.getQuantity())
                    .unitPrice(lineReq.getUnitPrice())
                    .description(lineReq.getDescription())
                    .build();
        }).toList();

        BigDecimal total = lines.stream().map(Line::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);

        Invoice invoice = Invoice.builder()
                .docNumber(req.getDocNumber())
                .txnDate(req.getTxnDate())
                .totalAmt(total)
                .balance(total)
                .shipAddr(req.getShipAddr())
                .shipDate(req.getShipDate())
                .dueDate(req.getDueDate())
                .lines(lines)
                .build();

        lines.forEach(line -> {
            line.setTransaction(invoice);
        });

        return invoice;
    }

}
