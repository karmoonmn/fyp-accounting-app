package com.example.Accounting.dto.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExpenseAnalysisResponse {
    private String year;
    private BigDecimal totalExpenses;
    private List<AccountBalanceDto> expenseByCategory; // sums by account
    private List<Map<String, Object>> monthlyTrends; // array of { "month": "Jan", "Travel": 500, "Meals": 200 } for charts
}
