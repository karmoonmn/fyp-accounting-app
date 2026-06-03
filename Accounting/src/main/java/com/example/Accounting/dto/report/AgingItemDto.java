package com.example.Accounting.dto.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgingItemDto {
    private String docNumber;
    private String name; // customer or supplier name
    private LocalDate dueDate;
    private BigDecimal amount;
}
