package com.example.Accounting.dto.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgingBucketDto {
    private String name; // e.g., "Current", "1-30 Days", "31-60 Days"
    private BigDecimal amount;
    private List<AgingItemDto> items;
}
