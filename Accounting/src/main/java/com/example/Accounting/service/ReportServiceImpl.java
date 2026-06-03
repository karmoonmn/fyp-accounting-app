package com.example.Accounting.service;

import com.example.Accounting.dto.report.*;
import com.example.Accounting.model.*;
import com.example.Accounting.repo.*;
import com.example.Accounting.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;
import org.apache.commons.math3.stat.regression.SimpleRegression;

@Service
@RequiredArgsConstructor
public class ReportServiceImpl implements ReportService {

    private final JournalEntryLineRepo journalEntryLineRepo;
    private final AccountRepo accountRepo;
    private final InvoiceRepo invoiceRepo;
    private final BillRepo billRepo;

    private final ForecastMlClient forecastMlClient;

    @Override
    public ProfitLossResponse getProfitAndLoss(LocalDate startDate, LocalDate endDate) {
        System.out.println("Entering getProfitAndLoss for dates: " + startDate + " to " + endDate);
        Long companyId = SecurityUtils.requireCompanyId();
        System.out.println("Company ID: " + companyId);

        System.out.println("Calling DB for balances...");
        List<Object[]> balances = journalEntryLineRepo.getAccountBalancesForPeriod(companyId, startDate, endDate);
        System.out.println("DB returned " + balances.size() + " rows");

        List<AccountBalanceDto> revenueAccounts = new ArrayList<>();
        List<AccountBalanceDto> expenseAccounts = new ArrayList<>();
        BigDecimal totalRevenue = BigDecimal.ZERO;
        BigDecimal totalExpenses = BigDecimal.ZERO;

        for (Object[] row : balances) {
            Account account = (Account) row[0];
            BigDecimal debit = (BigDecimal) row[1];
            BigDecimal credit = (BigDecimal) row[2];

            if (account.getAccountType() == AccountType.REVENUE) {
                // Revenue increases with Credit
                BigDecimal netBalance = credit.subtract(debit);
                revenueAccounts.add(new AccountBalanceDto(account.getId(), account.getName(), account.getAccountCode(), account.getAccountType(), netBalance));
                totalRevenue = totalRevenue.add(netBalance);
            } else if (account.getAccountType() == AccountType.EXPENSE) {
                // Expense increases with Debit
                BigDecimal netBalance = debit.subtract(credit);
                expenseAccounts.add(new AccountBalanceDto(account.getId(), account.getName(), account.getAccountCode(), account.getAccountType(), netBalance));
                totalExpenses = totalExpenses.add(netBalance);
            }
        }

        return ProfitLossResponse.builder()
                .period(startDate.toString() + " to " + endDate.toString())
                .revenueAccounts(revenueAccounts)
                .totalRevenue(totalRevenue)
                .expenseAccounts(expenseAccounts)
                .totalExpenses(totalExpenses)
                .netProfit(totalRevenue.subtract(totalExpenses))
                .build();
    }

    @Override
    public BalanceSheetResponse getBalanceSheet(LocalDate asOfDate) {
        Long companyId = SecurityUtils.requireCompanyId();

        // 1. Fetch all balances up to date
        List<Object[]> balancesData = journalEntryLineRepo.getAccountBalancesUpToDate(companyId, asOfDate);
        Map<Long, BigDecimal> leafBalances = new HashMap<>();

        for (Object[] row : balancesData) {
            Account account = (Account) row[0];
            BigDecimal debit = (BigDecimal) row[1];
            BigDecimal credit = (BigDecimal) row[2];

            BigDecimal netBalance;
            if (account.getAccountType() == AccountType.ASSET || account.getAccountType() == AccountType.EXPENSE) {
                netBalance = debit.subtract(credit);
            } else {
                netBalance = credit.subtract(debit);
            }
            leafBalances.put(account.getId(), netBalance);
        }

        // 2. Fetch Account Tree
        List<Account> rootAccounts = accountRepo.findRootAccountsByCompanyId(companyId);

        List<BalanceSheetNodeDto> assets = new ArrayList<>();
        List<BalanceSheetNodeDto> liabilities = new ArrayList<>();
        List<BalanceSheetNodeDto> equity = new ArrayList<>();

        for (Account root : rootAccounts) {
            BalanceSheetNodeDto node = buildBalanceSheetTree(root, leafBalances);
            if (root.getAccountType() == AccountType.ASSET) {
                assets.add(node);
            } else if (root.getAccountType() == AccountType.LIABILITY) {
                liabilities.add(node);
            } else if (root.getAccountType() == AccountType.EQUITY) {
                equity.add(node);
            }
        }

        // Add Net Income to Equity
        BigDecimal netIncome = calculateRetainedEarnings(companyId, asOfDate, leafBalances);
        BalanceSheetNodeDto retainedEarningsNode = BalanceSheetNodeDto.builder()
                .accountId(-1L)
                .accountName("Retained Earnings (Net Income)")
                .accountCode("3999")
                .accountType(AccountType.EQUITY)
                .balance(netIncome)
                .children(new ArrayList<>())
                .build();
        equity.add(retainedEarningsNode);

        BigDecimal totalAssets = assets.stream().map(n -> n.getBalance() != null ? n.getBalance() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalLiabilities = liabilities.stream().map(n -> n.getBalance() != null ? n.getBalance() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalEquity = equity.stream().map(n -> n.getBalance() != null ? n.getBalance() : BigDecimal.ZERO).reduce(BigDecimal.ZERO, BigDecimal::add);

        return BalanceSheetResponse.builder()
                .asOfDate(asOfDate.toString())
                .assets(assets)
                .totalAssets(totalAssets)
                .liabilities(liabilities)
                .totalLiabilities(totalLiabilities)
                .equity(equity)
                .totalEquity(totalEquity)
                .build();
    }

    private BigDecimal calculateRetainedEarnings(Long companyId, LocalDate asOfDate, Map<Long, BigDecimal> leafBalances) {
        BigDecimal retainedEarnings = BigDecimal.ZERO;
        List<Account> accounts = accountRepo.findAllByCompanyId(companyId);
        
        for (Account account : accounts) {
            BigDecimal balance = leafBalances.getOrDefault(account.getId(), BigDecimal.ZERO);
            if (account.getAccountType() == AccountType.REVENUE) {
                retainedEarnings = retainedEarnings.add(balance);
            } else if (account.getAccountType() == AccountType.EXPENSE) {
                retainedEarnings = retainedEarnings.subtract(balance);
            }
        }
        return retainedEarnings;
    }

    private BalanceSheetNodeDto buildBalanceSheetTree(Account account, Map<Long, BigDecimal> leafBalances) {
        BalanceSheetNodeDto node = BalanceSheetNodeDto.builder()
                .accountId(account.getId())
                .accountName(account.getName())
                .accountCode(account.getAccountCode())
                .accountType(account.getAccountType())
                .children(new ArrayList<>())
                .build();

        BigDecimal balance = leafBalances.getOrDefault(account.getId(), BigDecimal.ZERO);

        for (Account child : account.getChildren()) {
            BalanceSheetNodeDto childNode = buildBalanceSheetTree(child, leafBalances);
            node.getChildren().add(childNode);
            balance = balance.add(childNode.getBalance() != null ? childNode.getBalance() : BigDecimal.ZERO);
        }

        node.setBalance(balance);
        return node;
    }

    @Override
    public AgingReportResponse getArAgingReport() {
        Long companyId = SecurityUtils.requireCompanyId();
        List<Invoice> unpaidInvoices = invoiceRepo.findUnpaidInvoicesByCompanyId(companyId);
        
        return buildAgingReport(unpaidInvoices, null, "Accounts Receivable", companyId);
    }

    @Override
    public AgingReportResponse getApAgingReport() {
        Long companyId = SecurityUtils.requireCompanyId();
        List<Bill> unpaidBills = billRepo.findUnpaidBillsByCompanyId(companyId);
        
        return buildAgingReport(null, unpaidBills, "Accounts Payable", companyId);
    }

    private AgingReportResponse buildAgingReport(List<Invoice> invoices, List<Bill> bills, String reportType, Long companyId) {
        LocalDate today = LocalDate.now();

        AgingBucketDto current = new AgingBucketDto("Current", BigDecimal.ZERO, new ArrayList<>());
        AgingBucketDto days1to30 = new AgingBucketDto("1-30 Days", BigDecimal.ZERO, new ArrayList<>());
        AgingBucketDto days31to60 = new AgingBucketDto("31-60 Days", BigDecimal.ZERO, new ArrayList<>());
        AgingBucketDto days61to90 = new AgingBucketDto("61-90 Days", BigDecimal.ZERO, new ArrayList<>());
        AgingBucketDto days90Plus = new AgingBucketDto("90+ Days", BigDecimal.ZERO, new ArrayList<>());

        BigDecimal totalAmount = BigDecimal.ZERO;

        if (invoices != null) {
            for (Invoice inv : invoices) {
                long daysOverdue = ChronoUnit.DAYS.between(inv.getDueDate() != null ? inv.getDueDate() : inv.getTxnDate(), today);
                AgingItemDto item = new AgingItemDto(inv.getDocNumber(), inv.getCustomer().getName(), inv.getDueDate(), inv.getBalance());
                totalAmount = totalAmount.add(inv.getBalance());
                bucketItem(daysOverdue, item, current, days1to30, days31to60, days61to90, days90Plus);
            }
        }

        if (bills != null) {
            for (Bill bill : bills) {
                long daysOverdue = ChronoUnit.DAYS.between(bill.getDueDate() != null ? bill.getDueDate() : bill.getTxnDate(), today);
                AgingItemDto item = new AgingItemDto(bill.getDocNumber(), bill.getSupplier().getName(), bill.getDueDate(), bill.getBalance());
                totalAmount = totalAmount.add(bill.getBalance());
                bucketItem(daysOverdue, item, current, days1to30, days31to60, days61to90, days90Plus);
            }
        }

        // Verify GL Match
        Account glAccount = accountRepo.findByNameAndCompanyId(reportType, companyId).orElse(null);
        BigDecimal glBalance = BigDecimal.ZERO;
        if (glAccount != null) {
            List<Object[]> balancesData = journalEntryLineRepo.getAccountBalancesUpToDate(companyId, today);
            for (Object[] row : balancesData) {
                Account account = (Account) row[0];
                if (account.getId().equals(glAccount.getId())) {
                    BigDecimal debit = (BigDecimal) row[1];
                    BigDecimal credit = (BigDecimal) row[2];
                    if (glAccount.getAccountType() == AccountType.ASSET) {
                        glBalance = debit.subtract(credit);
                    } else {
                        glBalance = credit.subtract(debit);
                    }
                }
            }
        }

        return AgingReportResponse.builder()
                .reportType(reportType)
                .asOfDate(today)
                .buckets(Arrays.asList(current, days1to30, days31to60, days61to90, days90Plus))
                .totalAmount(totalAmount)
                .glBalance(glBalance)
                .build();
    }

    private void bucketItem(long daysOverdue, AgingItemDto item, AgingBucketDto current, AgingBucketDto d1_30, AgingBucketDto d31_60, AgingBucketDto d61_90, AgingBucketDto d90plus) {
        if (daysOverdue <= 0) {
            current.getItems().add(item);
            current.setAmount(current.getAmount().add(item.getAmount()));
        } else if (daysOverdue <= 30) {
            d1_30.getItems().add(item);
            d1_30.setAmount(d1_30.getAmount().add(item.getAmount()));
        } else if (daysOverdue <= 60) {
            d31_60.getItems().add(item);
            d31_60.setAmount(d31_60.getAmount().add(item.getAmount()));
        } else if (daysOverdue <= 90) {
            d61_90.getItems().add(item);
            d61_90.setAmount(d61_90.getAmount().add(item.getAmount()));
        } else {
            d90plus.getItems().add(item);
            d90plus.setAmount(d90plus.getAmount().add(item.getAmount()));
        }
    }

    @Override
    public ExpenseAnalysisResponse getExpenseAnalysis(int year) {
        Long companyId = SecurityUtils.requireCompanyId();
        LocalDate startDate = LocalDate.of(year, 1, 1);
        LocalDate endDate = LocalDate.of(year, 12, 31);

        List<Object[]> balancesData = journalEntryLineRepo.getDailyAccountBalancesForPeriod(companyId, startDate, endDate);

        BigDecimal totalExpenses = BigDecimal.ZERO;
        Map<Long, AccountBalanceDto> expenseByCategory = new HashMap<>();
        Map<Integer, Map<String, Object>> monthlyTrends = new HashMap<>();

        for (int i = 1; i <= 12; i++) {
            Map<String, Object> monthMap = new HashMap<>();
            monthMap.put("month", LocalDate.of(year, i, 1).format(DateTimeFormatter.ofPattern("MMM")));
            monthlyTrends.put(i, monthMap);
        }

        for (Object[] row : balancesData) {
            LocalDate txnDate = (LocalDate) row[0];
            Account account = (Account) row[1];
            BigDecimal debit = (BigDecimal) row[2];
            BigDecimal credit = (BigDecimal) row[3];

            if (account.getAccountType() == AccountType.EXPENSE) {
                BigDecimal amount = debit.subtract(credit);
                totalExpenses = totalExpenses.add(amount);

                // Category aggregate
                AccountBalanceDto dto = expenseByCategory.computeIfAbsent(account.getId(),
                        k -> new AccountBalanceDto(account.getId(), account.getName(), account.getAccountCode(), account.getAccountType(), BigDecimal.ZERO));
                dto.setBalance(dto.getBalance().add(amount));

                // Monthly aggregate
                int month = txnDate.getMonthValue();
                Map<String, Object> monthMap = monthlyTrends.get(month);
                BigDecimal existing = (BigDecimal) monthMap.getOrDefault(account.getName(), BigDecimal.ZERO);
                monthMap.put(account.getName(), existing.add(amount));
            }
        }

        List<Map<String, Object>> trendsList = new ArrayList<>();
        for (int i = 1; i <= 12; i++) {
            trendsList.add(monthlyTrends.get(i));
        }

        return ExpenseAnalysisResponse.builder()
                .year(String.valueOf(year))
                .totalExpenses(totalExpenses)
                .expenseByCategory(new ArrayList<>(expenseByCategory.values()))
                .monthlyTrends(trendsList)
                .build();
    }

    @Override
    public ForecastResponse getForecast(int monthsAhead) {
        Long companyId = SecurityUtils.requireCompanyId();
        LocalDate today = LocalDate.now();
        LocalDate sixMonthsAgo = today.minusMonths(6).withDayOfMonth(1);
        
        // Use exact monthsAhead requested by user
        int mlMonths = monthsAhead > 0 ? monthsAhead : 3;

        List<Object[]> balancesData = journalEntryLineRepo.getDailyAccountBalancesForPeriod(companyId, sixMonthsAgo, today);

        // Group by month
        Map<String, BigDecimal> historicalRevenue = new LinkedHashMap<>();
        Map<String, BigDecimal> historicalExpense = new LinkedHashMap<>();
        
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM yyyy");

        for (int i = 6; i >= 0; i--) {
            LocalDate m = today.minusMonths(i);
            String monthKey = m.format(formatter);
            historicalRevenue.put(monthKey, BigDecimal.ZERO);
            historicalExpense.put(monthKey, BigDecimal.ZERO);
        }

        for (Object[] row : balancesData) {
            LocalDate txnDate = (LocalDate) row[0];
            Account account = (Account) row[1];
            BigDecimal debit = (BigDecimal) row[2];
            BigDecimal credit = (BigDecimal) row[3];

            String monthKey = txnDate.format(formatter);
            if (!historicalRevenue.containsKey(monthKey)) continue;

            if (account.getAccountType() == AccountType.REVENUE) {
                BigDecimal amount = credit.subtract(debit);
                historicalRevenue.put(monthKey, historicalRevenue.get(monthKey).add(amount));
            } else if (account.getAccountType() == AccountType.EXPENSE) {
                BigDecimal amount = debit.subtract(credit);
                historicalExpense.put(monthKey, historicalExpense.get(monthKey).add(amount));
            }
        }

        List<Map<String, Object>> historicalDataList = new ArrayList<>();
        List<Map<String, Object>> revHistory = new ArrayList<>();
        List<Map<String, Object>> expHistory = new ArrayList<>();
        
        for (String key : historicalRevenue.keySet()) {
            Map<String, Object> map = new HashMap<>();
            map.put("month", key);
            
            BigDecimal rev = historicalRevenue.get(key);
            BigDecimal exp = historicalExpense.get(key);
            
            map.put("revenue", rev);
            map.put("expenses", exp);
            historicalDataList.add(map);

            // Format for ML Python API
            Map<String, Object> rMap = new HashMap<>();
            rMap.put("month", key);
            rMap.put("amount", rev.doubleValue());
            revHistory.add(rMap);
            
            Map<String, Object> eMap = new HashMap<>();
            eMap.put("month", key);
            eMap.put("amount", exp.doubleValue());
            expHistory.add(eMap);
        }

        List<Map<String, Object>> forecastDataList = new ArrayList<>();
        
        // 1. Fetch Revenue ML Predictions
        ForecastMlClient.MlPredictRequest revReq = new ForecastMlClient.MlPredictRequest();
        revReq.setCompanyId(String.valueOf(companyId));
        revReq.setForecastType("revenue");
        revReq.setMonthsAhead(mlMonths);
        revReq.setHistoricalData(revHistory);
        
        ForecastMlClient.MlPredictResponse revRes = forecastMlClient.predict(revReq);
        
        // 2. Fetch Expense ML Predictions
        ForecastMlClient.MlPredictRequest expReq = new ForecastMlClient.MlPredictRequest();
        expReq.setCompanyId(String.valueOf(companyId));
        expReq.setForecastType("expense");
        expReq.setMonthsAhead(mlMonths);
        expReq.setHistoricalData(expHistory);
        
        ForecastMlClient.MlPredictResponse expRes = forecastMlClient.predict(expReq);

        // Combine ML results
        if (revRes != null && revRes.getPredictions() != null && expRes != null && expRes.getPredictions() != null) {
            for (int i = 0; i < mlMonths; i++) {
                if (i < revRes.getPredictions().size() && i < expRes.getPredictions().size()) {
                    Map<String, Object> fMap = new HashMap<>();
                    fMap.put("month", revRes.getPredictions().get(i).getMonth());
                    fMap.put("revenue", revRes.getPredictions().get(i).getPredictedAmount());
                    fMap.put("expenses", expRes.getPredictions().get(i).getPredictedAmount());
                    forecastDataList.add(fMap);
                }
            }
        }

        // Fetch actual breakdown from Profit & Loss to serve as category breakdown
        ProfitLossResponse pl = getProfitAndLoss(sixMonthsAgo, today);
        List<Map<String, Object>> projectedIncomeByCategory = new ArrayList<>();
        if (pl.getRevenueAccounts() != null) {
            for (AccountBalanceDto acc : pl.getRevenueAccounts()) {
                Map<String, Object> map = new HashMap<>();
                map.put("name", acc.getAccountName());
                map.put("value", acc.getBalance());
                projectedIncomeByCategory.add(map);
            }
        }
        
        List<Map<String, Object>> projectedExpenseByCategory = new ArrayList<>();
        if (pl.getExpenseAccounts() != null) {
            for (AccountBalanceDto acc : pl.getExpenseAccounts()) {
                Map<String, Object> map = new HashMap<>();
                map.put("name", acc.getAccountName());
                map.put("value", acc.getBalance());
                projectedExpenseByCategory.add(map);
            }
        }

        return ForecastResponse.builder()
                .historicalData(historicalDataList)
                .forecastData(forecastDataList)
                .projectedIncomeByCategory(projectedIncomeByCategory)
                .projectedExpenseByCategory(projectedExpenseByCategory)
                .build();
    }
}
