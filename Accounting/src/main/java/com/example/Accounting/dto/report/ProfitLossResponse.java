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
public class ProfitLossResponse {
    private String period;
    private List<AccountBalanceDto> revenueAccounts;
    private BigDecimal totalRevenue;
    private List<AccountBalanceDto> expenseAccounts;
    private BigDecimal totalExpenses;
    private BigDecimal netProfit;
}
