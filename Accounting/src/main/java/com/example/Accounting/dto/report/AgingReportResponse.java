package com.example.Accounting.dto.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AgingReportResponse {
    private String reportType; // AR or AP
    private LocalDate asOfDate;
    private List<AgingBucketDto> buckets;
    private BigDecimal totalAmount;
    private BigDecimal glBalance; // to prove they match!
}
