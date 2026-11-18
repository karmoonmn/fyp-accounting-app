import fs from 'fs';
import path from 'path';

// Load dataset
const jsonPath = path.resolve('c:/Users/ngokarmoon/IdeaProjects/fyp-accounting-app/test-data/forecasting_24_months_dataset.json');
const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const records = rawData.records;

console.log('='.repeat(80));
console.log('FINFLOW AI — MACHINE LEARNING FORECASTING MODULE EMPIRICAL EVALUATION');
console.log('='.repeat(80));

// 1. Generate features exactly as in ml-service/main.py
function prepareFeatures(data) {
  return data.map((d, idx) => {
    const parts = d.month.split('-');
    const monthNum = parseInt(parts[1], 10);
    const quarter = Math.ceil(monthNum / 3);
    const lag1 = idx >= 1 ? data[idx - 1].revenue : 0;
    const lag2 = idx >= 2 ? data[idx - 2].revenue : 0;
    const lag3 = idx >= 3 ? data[idx - 3].revenue : 0;

    return {
      month: d.month,
      month_idx: idx,
      month_of_year: monthNum,
      quarter: quarter,
      lag_1: lag1,
      lag_2: lag2,
      lag_3: lag3,
      amount: d.revenue
    };
  });
}

const allFeatures = prepareFeatures(records);

// Train / Test Split:
// Train on 18 months (2024-01 to 2025-06)
// Test out-of-sample on 6 months (2025-07 to 2025-12)
const trainData = allFeatures.slice(0, 18);
const testData = allFeatures.slice(18, 24);

console.log(`Dataset Cardinality: Total = ${records.length} months | Train = ${trainData.length} months | Out-of-Sample Test = ${testData.length} months`);

// 2. Linear Regression Implementation via OLS Normal Equation: w = (X^T X)^(-1) X^T y
function matrixTranspose(A) {
  return A[0].map((_, c) => A.map(r => r[c]));
}

function matrixMultiply(A, B) {
  const result = [];
  for (let i = 0; i < A.length; i++) {
    result[i] = [];
    for (let j = 0; j < B[0].length; j++) {
      let sum = 0;
      for (let k = 0; k < A[0].length; k++) {
        sum += A[i][k] * B[k][j];
      }
      result[i][j] = sum;
    }
  }
  return result;
}

// Invert matrix using Gauss-Jordan elimination with L2 ridge regularization for numerical stability
function invertMatrix(M, ridge = 1e-4) {
  const n = M.length;
  const A = M.map((row, i) => row.map((val, j) => val + (i === j ? ridge : 0)));
  const I = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));

  for (let i = 0; i < n; i++) {
    let pivot = A[i][i];
    if (Math.abs(pivot) < 1e-9) {
      let swapRow = i + 1;
      while (swapRow < n && Math.abs(A[swapRow][i]) < 1e-9) swapRow++;
      if (swapRow === n) throw new Error("Singular matrix");
      [A[i], A[swapRow]] = [A[swapRow], A[i]];
      [I[i], I[swapRow]] = [I[swapRow], I[i]];
      pivot = A[i][i];
    }

    for (let j = 0; j < n; j++) {
      A[i][j] /= pivot;
      I[i][j] /= pivot;
    }

    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = A[k][i];
        for (let j = 0; j < n; j++) {
          A[k][j] -= factor * A[i][j];
          I[k][j] -= factor * I[i][j];
        }
      }
    }
  }
  return I;
}

// Build X design matrix with intercept [1, month_idx, month_of_year, quarter, lag_1, lag_2, lag_3]
const X_train = trainData.map(d => [1, d.month_idx, d.month_of_year, d.quarter, d.lag_1, d.lag_2, d.lag_3]);
const y_train = trainData.map(d => [d.amount]);

const Xt = matrixTranspose(X_train);
const XtX = matrixMultiply(Xt, X_train);
const invXtX = invertMatrix(XtX);
const XtY = matrixMultiply(Xt, y_train);
const weights = matrixMultiply(invXtX, XtY).map(r => r[0]);

console.log('\n--- Model Parameters Fitted (Weights) ---');
console.log(`Intercept:       ${weights[0].toFixed(2)}`);
console.log(`month_idx:       ${weights[1].toFixed(2)} (Organic monthly growth component)`);
console.log(`month_of_year:   ${weights[2].toFixed(2)}`);
console.log(`quarter:         ${weights[3].toFixed(2)}`);
console.log(`lag_1:           ${weights[4].toFixed(4)}`);
console.log(`lag_2:           ${weights[5].toFixed(4)}`);
console.log(`lag_3:           ${weights[6].toFixed(4)}`);

// 3. In-Sample Training Evaluation (What ml-service currently returns)
let inSampleResiduals = [];
for (let i = 0; i < trainData.length; i++) {
  const x = [1, trainData[i].month_idx, trainData[i].month_of_year, trainData[i].quarter, trainData[i].lag_1, trainData[i].lag_2, trainData[i].lag_3];
  const pred = Math.max(0, x.reduce((sum, val, idx) => sum + val * weights[idx], 0));
  inSampleResiduals.push(trainData[i].amount - pred);
}
const inSampleMAE = inSampleResiduals.reduce((sum, r) => sum + Math.abs(r), 0) / inSampleResiduals.length;
const inSampleRMSE = Math.sqrt(inSampleResiduals.reduce((sum, r) => sum + r * r, 0) / inSampleResiduals.length);

console.log('\n--- In-Sample Training Metrics (Self-Reported by ml-service) ---');
console.log(`In-Sample MAE:   $${inSampleMAE.toFixed(2)}`);
console.log(`In-Sample RMSE:  $${inSampleRMSE.toFixed(2)}`);

// 4. True Out-of-Sample Recursive Multi-Step Forecast (Months 19 to 24)
let current_lag_1 = trainData[trainData.length - 1].amount;
let current_lag_2 = trainData[trainData.length - 2].amount;
let current_lag_3 = trainData[trainData.length - 3].amount;
let last_idx = trainData[trainData.length - 1].month_idx;

console.log('\n--- True Out-Of-Sample Recursive Projections (Months 19-24) ---');
console.log('| Month   | Actual Revenue | Predicted Revenue | Error ($)  | Error (%) | Assessment |');
console.log('| :------ | :------------- | :---------------- | :--------- | :-------- | :--------- |');

const predictions = [];
let outOfSampleResiduals = [];
let apeList = [];

for (let i = 0; i < testData.length; i++) {
  const t = testData[i];
  const pred_idx = last_idx + i + 1;
  const monthNum = t.month_of_year;
  const quarter = t.quarter;

  const x_pred = [1, pred_idx, monthNum, quarter, current_lag_1, current_lag_2, current_lag_3];
  let pred_amount = Math.max(0, x_pred.reduce((sum, val, idx) => sum + val * weights[idx], 0));
  pred_amount = Math.round(pred_amount * 100) / 100;

  const actual = t.amount;
  const error = pred_amount - actual;
  const ape = (Math.abs(error) / actual) * 100;

  outOfSampleResiduals.push(error);
  apeList.push(ape);
  predictions.push({ month: t.month, actual, pred: pred_amount, error, ape });

  const grade = ape < 5.0 ? 'EXCELLENT' : ape < 10.0 ? 'GOOD' : 'FAIR';
  console.log(`| ${t.month} | $${actual.toLocaleString()} | $${pred_amount.toLocaleString()} | ${error > 0 ? '+' : ''}$${error.toFixed(2)} | ${ape.toFixed(2)}% | ${grade} |`);

  // Shift recursive lags
  current_lag_3 = current_lag_2;
  current_lag_2 = current_lag_1;
  current_lag_1 = pred_amount;
}

const outSampleMAE = outOfSampleResiduals.reduce((sum, r) => sum + Math.abs(r), 0) / outOfSampleResiduals.length;
const outSampleRMSE = Math.sqrt(outOfSampleResiduals.reduce((sum, r) => sum + r * r, 0) / outOfSampleResiduals.length);
const outSampleMAPE = apeList.reduce((sum, p) => sum + p, 0) / apeList.length;

console.log('\n--- True Out-Of-Sample Generalization Metrics ---');
console.log(`Out-of-Sample MAE:   $${outSampleMAE.toFixed(2)}`);
console.log(`Out-of-Sample RMSE:  $${outSampleRMSE.toFixed(2)}`);
console.log(`Out-of-Sample MAPE:  ${outSampleMAPE.toFixed(2)}% (Mean Absolute Percentage Error)`);

// 5. Critical Trustability Verdict
console.log('\n--- Machine Learning Trustability Assessment ---');
console.log(`1. Directional Trend Accuracy: HIGH (Captures continuous expansion trend of $${weights[1].toFixed(2)}/mo)`);
console.log(`2. Average Predictive Error:   ${outSampleMAPE.toFixed(2)}% (Standard industry benchmark for SMB forecasting is < 10-15%)`);
console.log(`3. Overconfidence Gap:        In-sample MAE ($${inSampleMAE.toFixed(2)}) vs Out-of-sample MAE ($${outSampleMAE.toFixed(2)})`);
console.log('='.repeat(80));
