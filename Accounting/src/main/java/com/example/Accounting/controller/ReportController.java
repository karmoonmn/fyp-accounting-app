package com.example.Accounting.controller;

import com.example.Accounting.dto.report.*;
import com.example.Accounting.service.ReportService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportService reportService;

    @GetMapping("/profit-loss")
    public ResponseEntity<ProfitLossResponse> getProfitAndLoss(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return ResponseEntity.ok(reportService.getProfitAndLoss(startDate, endDate));
    }

    @GetMapping("/balance-sheet")
    public ResponseEntity<BalanceSheetResponse> getBalanceSheet(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate asOfDate) {
        if (asOfDate == null) {
            asOfDate = LocalDate.now();
        }
        return ResponseEntity.ok(reportService.getBalanceSheet(asOfDate));
    }

    @GetMapping("/ar-aging")
    public ResponseEntity<AgingReportResponse> getArAgingReport() {
        return ResponseEntity.ok(reportService.getArAgingReport());
    }

    @GetMapping("/ap-aging")
    public ResponseEntity<AgingReportResponse> getApAgingReport() {
        return ResponseEntity.ok(reportService.getApAgingReport());
    }

    @GetMapping("/expense-analysis")
    public ResponseEntity<ExpenseAnalysisResponse> getExpenseAnalysis(
            @RequestParam(required = false) Integer year) {
        if (year == null) {
            year = LocalDate.now().getYear();
        }
        return ResponseEntity.ok(reportService.getExpenseAnalysis(year));
    }

    @GetMapping("/forecast")
    public ResponseEntity<ForecastResponse> getForecast(
            @RequestParam(defaultValue = "6") int monthsAhead) {
        return ResponseEntity.ok(reportService.getForecast(monthsAhead));
    }
}
