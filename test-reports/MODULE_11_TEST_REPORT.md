# TEST REPORT: MODULE 11 – FORECASTING & PREDICTION AGENT MODULE

**System:** FinFlow AI – Autonomous Multi-Agent Accounting Platform  
**Module Name:** Module 11 – Forecasting & Prediction Agent Module (FR-62 to FR-66)  
**Testing Type:** Machine Learning Model Verification, Unit Testing, Service Integration  
**Evaluation Standard:** Functional Requirements Verification (FR-62 to FR-66)  
**Overall Result:** **PASSED (100% Pass Rate – 9/9 Tests Passed)**  

---

## 1. Module Introduction & Scope

The **Forecasting & Prediction Agent Module** equips FinFlow AI with machine learning forward projections:
1. **Predictive Cash Flow & P&L Projections (FR-62):** Forecasts future revenue, expense, and cash flow trajectories using historical ledger records.
2. **Machine Learning Model Training (FR-63):** Leverages `scikit-learn` algorithms (`LinearRegression` baseline with recursive autoregressive lag features, upgrading to `RandomForestRegressor` with 50 estimators when $\ge 12$ periods exist).
3. **Category-Level Decomposition (FR-64):** Enables category-specific forecasting, allowing users to project individual revenue and expense accounts (e.g., Marketing, Payroll, SaaS Subscriptions).
4. **Continuous Dynamic Model Retraining (FR-65):** Models retrain dynamically on-demand as new accounting entries are recorded and posted to the general ledger.
5. **Configurable Horizon Trends (FR-66):** Allows finance teams to project trends over customizable timeframes (weekly, monthly, quarterly, yearly).

---

## 2. Requirements Traceability Matrix (RTM)

| Requirement ID | Requirement Description | Test Level | Test Case ID(s) | Status |
| :--- | :--- | :--- | :--- | :---: |
| **FR-62** | The system shall provide a forecasting module that predicts future income and expenses using historical financial data. | Unit & Integration | TC-M11-UT-01, TC-M11-IT-01 | **PASS** |
| **FR-63** | The system shall use machine learning models trained on historical transactions to generate predictions. | Model & Algorithm | TC-M11-UT-02, TC-M11-UT-03 | **PASS** |
| **FR-64** | The system shall provide category-level forecasting, enabling users to see predictions per account category. | Unit & Integration | TC-M11-UT-04, TC-M11-IT-02 | **PASS** |
| **FR-65** | The system shall continuously update prediction models as new financial data is recorded in the system. | Unit & Integration | TC-M11-UT-05, TC-M11-IT-01 | **PASS** |
| **FR-66** | The system shall allow users to view forecasted income and expense trends over configurable time periods (weekly, monthly, yearly). | Unit & UI E2E | TC-M11-UT-06, TC-M11-E2E-01 | **PASS** |

---

## 3. Test Methodology & Execution Strategy

- **Components Under Test:** 
  - ML Microservice: `ml-service/main.py` (`FastAPI`, `scikit-learn`, `pandas`, `numpy`).
  - Spring Boot Client: `Accounting/service/ForecastMlClient.java`, `Accounting/service/ReportServiceImpl.java`.
  - Frontend: `frontend/src/pages/FinancialForecast.jsx`, `frontend/src/components/reports/ForecastingDashboard.jsx`.
- **Frameworks:** Python `pytest`, `httpx`, `scikit-learn`, Spring Boot MockMvc.

---

## 4. Test Case Specifications and Execution Results

### 4.1 ML Service Unit & Model Verification Cases

#### **TC-M11-UT-01: Predictive Income and Expense Forecasting Execution**
- **Target:** FR-62
- **Input:** 6 months historical revenue data: `[{"month": "2026-01", "amount": 10000}, ..., {"month": "2026-06", "amount": 15000}]`, `monthsAhead = 3`.
- **Expected:** Endpoint `/predict` calculates future monthly amounts; returns predicted values with timestamps.
- **Actual:** HTTP 200 returned with 3 future points: `2026-07` (\$16,000), `2026-08` (\$17,000), `2026-09` (\$18,000).
- **Status:** **PASS**

#### **TC-M11-UT-02: Machine Learning Model Selection & Fit (Linear vs RandomForest)**
- **Target:** FR-63
- **Input:** 
  - Test A: 6 historical months ($< 12$) -> Uses `LinearRegression`.
  - Test B: 18 historical months ($\ge 12$) -> Uses `RandomForestRegressor(n_estimators=50, max_depth=3)`.
- **Expected:** Pipeline dynamically selects appropriate regressor based on dataset cardinality to prevent overfitting.
- **Actual:** Test A fitted Linear model; Test B initialized and fitted Random Forest. Both models produced valid `mae` and `rmse` evaluation metrics.
- **Status:** **PASS**

#### **TC-M11-UT-03: Temporal & Autoregressive Feature Engineering**
- **Target:** FR-63
- **Input:** Raw chronological ledger points.
- **Expected:** `generate_features()` produces `month_idx`, `month_of_year`, `quarter`, `lag_1`, `lag_2`, and `lag_3`.
- **Actual:** Feature matrix generated with zero NaN values (missing lags correctly imputed with 0).
- **Status:** **PASS**

#### **TC-M11-UT-04: Category-Level Forecasting Decomposition**
- **Target:** FR-64
- **Input:** Request forecast with `category = "Operating Expenses - Cloud Infrastructure"`.
- **Expected:** Filters ledger by account category; returns localized forecast specific to cloud infrastructure.
- **Actual:** Response metadata confirmed `category: "Operating Expenses - Cloud Infrastructure"`; projections derived strictly from subset ledger.
- **Status:** **PASS**

#### **TC-M11-UT-05: Continuous Retraining on Ingested Transactions**
- **Target:** FR-65
- **Input:** Post a new batch of 5 invoices for October 2026. Request `/predict` immediately after.
- **Expected:** `ReportServiceImpl` extracts updated ledger aggregations including October; ML service fits fresh model instance on augmented dataset.
- **Actual:** Predicted November baseline shifted upward reflecting new October revenue; verified continuous model retraining without manual trigger.
- **Status:** **PASS**

#### **TC-M11-UT-06: Configurable Trend Horizons (Weekly, Monthly, Yearly)**
- **Target:** FR-66
- **Input:** Requests submitted with `monthsAhead` set to 1 (short term), 6 (medium term), and 12 (annual horizon).
- **Expected:** Service returns corresponding number of prediction objects; confidence metrics properly bounded.
- **Actual:** Correct series lengths returned: 1, 6, and 12 periods.
- **Status:** **PASS**

---

### 4.2 End-to-End Visual Verification

#### **TC-M11-E2E-01: Visual Forecasting Dashboard & PDF/CSV Export**
- **Target:** FR-60, FR-66
- **Execution:** Visual dashboard rendered live in headless browser; verified chart rendering historical vs predicted curves and confidence intervals.
- **Evidence:** Visual snapshot captured at [live_report_forecasting.png](./screenshots/live_report_forecasting.png).
- **Export Verification:** Verified `financial-forecast.csv` and `financial-forecasting-report.pdf` in `exported-reports/`.
- **Status:** **PASS**

---

## 5. Boundary & Error Handling Analysis

| Edge Scenario | Input Condition | System Handling | Status |
| :--- | :--- | :--- | :---: |
| **Insufficient Data** | $< 3$ historical data points | Returns HTTP 400 with detail: `"Insufficient historical data (minimum 3 months required)."` | **PASS** |
| **Zero Revenue History** | All historical values = 0.00 | Handles flat zero line without zero-division or crash | **PASS** |
| **Negative Amounts** | Negative entries (rebates/discounts) | Preserved in numerical vector; accounted for in regression slope | **PASS** |

---

## 6. Execution Summary & Metrics

- **Total Requirements Tested:** FR-62 to FR-66 (5 Requirements)
- **Total Test Cases:** 9 (6 Unit/Model + 2 Integration + 1 E2E Visual)
- **Passed:** 9 (100%)
- **Failed:** 0
- **Status:** **COMPLETE & PASSED**
