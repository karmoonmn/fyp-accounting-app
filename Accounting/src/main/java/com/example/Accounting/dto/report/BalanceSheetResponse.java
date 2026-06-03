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
public class BalanceSheetResponse {
    private String asOfDate;
    
    private List<BalanceSheetNodeDto> assets;
    private BigDecimal totalAssets;
    
    private List<BalanceSheetNodeDto> liabilities;
    private BigDecimal totalLiabilities;
    
    private List<BalanceSheetNodeDto> equity;
    private BigDecimal totalEquity;
}
