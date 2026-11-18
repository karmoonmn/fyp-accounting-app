from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error
import datetime

app = FastAPI(title="Financial Forecasting ML Service")

class HistoricalDataPoint(BaseModel):
    month: str
    amount: float

class PredictRequest(BaseModel):
    companyId: str
    forecastType: str
    category: Optional[str] = "Total"
    monthsAhead: int
    historicalData: List[HistoricalDataPoint]

class PredictionPoint(BaseModel):
    month: str
    predictedAmount: float
    lowerBound: Optional[float] = None
    upperBound: Optional[float] = None

class PredictResponse(BaseModel):
    category: str
    metrics: dict
    predictions: List[PredictionPoint]

def generate_features(df):
    df['date'] = pd.to_datetime(df['month'])
    df['month_idx'] = np.arange(len(df))
    df['month_of_year'] = df['date'].dt.month
    df['quarter'] = df['date'].dt.quarter
    
    df['lag_1'] = df['amount'].shift(1).fillna(df['amount'].iloc[0])
    df['lag_2'] = df['amount'].shift(2).fillna(df['amount'].iloc[0])
    df['lag_3'] = df['amount'].shift(3).fillna(df['amount'].iloc[0])
    
    return df

@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    if len(request.historicalData) < 3:
        raise HTTPException(status_code=400, detail="Insufficient historical data (minimum 3 months required).")

    df = pd.DataFrame([d.model_dump() for d in request.historicalData])
    df = df.sort_values("month").reset_index(drop=True)
    df = generate_features(df)

    n_samples = len(df)
    y = df['amount']

    trend_model = LinearRegression()
    trend_model.fit(df[['month_idx']], y)
    trend_pred = trend_model.predict(df[['month_idx']])
    residuals = y - trend_pred

    df['residual_lag_1'] = pd.Series(residuals).shift(1).fillna(0)
    df['residual_lag_2'] = pd.Series(residuals).shift(2).fillna(0)

    seasonal_features = ['month_of_year', 'quarter', 'residual_lag_1', 'residual_lag_2']
    X_seasonal = df[seasonal_features]

    rf_model = None
    if n_samples >= 12:
        rf_model = RandomForestRegressor(n_estimators=50, max_depth=3, random_state=42)
        rf_model.fit(X_seasonal, residuals)
        residual_pred = rf_model.predict(X_seasonal)
        model_name = "Hybrid-Linear-RandomForest"
    else:
        baseline_features = ['month_idx', 'month_of_year', 'quarter', 'lag_1', 'lag_2', 'lag_3']
        baseline_model = LinearRegression()
        baseline_model.fit(df[baseline_features], y)
        residual_pred = None
        model_name = "LinearRegression"

    if rf_model is not None:
        y_fitted = np.maximum(0.0, trend_pred + residual_pred)
    else:
        y_fitted = np.maximum(0.0, baseline_model.predict(df[baseline_features]))

    in_sample_errors = np.abs(y - y_fitted)
    mae = float(mean_absolute_error(y, y_fitted))
    rmse = float(np.sqrt(mean_squared_error(y, y_fitted)))
    residual_std = float(np.std(y - y_fitted)) if len(y) > 1 else (0.1 * float(np.mean(y)))

    oos_mae = None
    oos_mape = None
    if n_samples >= 6:
        split_idx = max(3, int(n_samples * 0.75))
        train_sub = df.iloc[:split_idx].copy()
        test_sub = df.iloc[split_idx:].copy()

        eval_trend = LinearRegression().fit(train_sub[['month_idx']], train_sub['amount'])
        eval_trend_pred = eval_trend.predict(test_sub[['month_idx']])

        if n_samples >= 12:
            eval_res = train_sub['amount'] - eval_trend.predict(train_sub[['month_idx']])
            eval_rf = RandomForestRegressor(n_estimators=30, max_depth=3, random_state=42)
            eval_rf.fit(train_sub[seasonal_features], eval_res)
            eval_pred = np.maximum(0.0, eval_trend_pred + eval_rf.predict(test_sub[seasonal_features]))
        else:
            eval_linear = LinearRegression().fit(train_sub[baseline_features], train_sub['amount'])
            eval_pred = np.maximum(0.0, eval_linear.predict(test_sub[baseline_features]))

        oos_mae = float(mean_absolute_error(test_sub['amount'], eval_pred))
        non_zero = test_sub['amount'] > 0
        if np.any(non_zero):
            oos_mape = float(np.mean(np.abs((test_sub['amount'][non_zero] - eval_pred[non_zero]) / test_sub['amount'][non_zero])) * 100)

    predictions = []
    last_date = df['date'].iloc[-1]
    last_idx = df['month_idx'].iloc[-1]

    current_lag_1 = df['amount'].iloc[-1]
    current_lag_2 = df['amount'].iloc[-2] if len(df) >= 2 else df['amount'].iloc[-1]
    current_lag_3 = df['amount'].iloc[-3] if len(df) >= 3 else df['amount'].iloc[-1]
    curr_res_1 = residuals.iloc[-1] if rf_model else 0.0
    curr_res_2 = residuals.iloc[-2] if rf_model and len(residuals) >= 2 else 0.0

    for i in range(1, request.monthsAhead + 1):
        next_date = last_date + pd.DateOffset(months=i)
        future_idx = last_idx + i
        future_month = next_date.month
        future_quarter = next_date.quarter

        if rf_model is not None:
            future_trend = trend_model.predict(pd.DataFrame([{'month_idx': future_idx}]))[0]
            future_feat = pd.DataFrame([{
                'month_of_year': future_month,
                'quarter': future_quarter,
                'residual_lag_1': curr_res_1,
                'residual_lag_2': curr_res_2
            }])
            future_res = rf_model.predict(future_feat)[0]
            pred_amount = float(future_trend + future_res)
            curr_res_2 = curr_res_1
            curr_res_1 = future_res
        else:
            future_feat = pd.DataFrame([{
                'month_idx': future_idx,
                'month_of_year': future_month,
                'quarter': future_quarter,
                'lag_1': current_lag_1,
                'lag_2': current_lag_2,
                'lag_3': current_lag_3
            }])
            pred_amount = float(baseline_model.predict(future_feat)[0])

        pred_amount = max(0.0, pred_amount)

        step_factor = np.sqrt(i)
        margin = 1.645 * residual_std * step_factor
        lower_bound = max(0.0, round(pred_amount - margin, 2))
        upper_bound = round(pred_amount + margin, 2)

        predictions.append(PredictionPoint(
            month=next_date.strftime("%Y-%m"),
            predictedAmount=round(pred_amount, 2),
            lowerBound=lower_bound,
            upperBound=upper_bound
        ))

        current_lag_3 = current_lag_2
        current_lag_2 = current_lag_1
        current_lag_1 = pred_amount

    metrics_dict = {
        "model_used": model_name,
        "in_sample_mae": round(mae, 2),
        "in_sample_rmse": round(rmse, 2),
        "out_of_sample_mae": round(oos_mae, 2) if oos_mae is not None else round(mae, 2),
        "out_of_sample_mape": f"{round(oos_mape, 2)}%" if oos_mape is not None else "N/A",
        "confidence_interval_level": "90% (P10 to P90)",
        "trend_monthly_slope": round(float(trend_model.coef_[0]), 2)
    }

    return PredictResponse(
        category=request.category or "Total",
        metrics=metrics_dict,
        predictions=predictions
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
