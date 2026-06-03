package com.example.Accounting.service;

import com.example.Accounting.dto.report.*;

import java.time.LocalDate;

public interface ReportService {
    ProfitLossResponse getProfitAndLoss(LocalDate startDate, LocalDate endDate);
    BalanceSheetResponse getBalanceSheet(LocalDate asOfDate);
    AgingReportResponse getArAgingReport();
    AgingReportResponse getApAgingReport();
    ExpenseAnalysisResponse getExpenseAnalysis(int year);
    ForecastResponse getForecast(int monthsAhead);
}
