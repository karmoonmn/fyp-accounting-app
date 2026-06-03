package com.example.Accounting.dto.report;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ForecastResponse {
    private List<Map<String, Object>> historicalData; // { "month": "Jan", "revenue": 10000, "expenses": 8000 }
    private List<Map<String, Object>> forecastData;   // { "month": "Apr", "revenue": 11000, "expenses": 8500 }
    private List<Map<String, Object>> projectedIncomeByCategory;
    private List<Map<String, Object>> projectedExpenseByCategory;
}
