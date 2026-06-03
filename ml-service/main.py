# pyrefly: ignore [missing-import]
from fastapi import FastAPI, HTTPException
# pyrefly: ignore [missing-import]
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
    month: str # e.g. "2025-12"
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

class PredictResponse(BaseModel):
    category: str
    metrics: dict
    predictions: List[PredictionPoint]

def generate_features(df):
    """
    Creates temporal features and simple lags for training/prediction.
    """
    df['date'] = pd.to_datetime(df['month'])
    df['month_idx'] = np.arange(len(df))
    df['month_of_year'] = df['date'].dt.month
    df['quarter'] = df['date'].dt.quarter
    
    # Lag features (if enough data)
    df['lag_1'] = df['amount'].shift(1).fillna(0)
    df['lag_2'] = df['amount'].shift(2).fillna(0)
    df['lag_3'] = df['amount'].shift(3).fillna(0)
    
    return df

@app.post("/predict", response_model=PredictResponse)
def predict(request: PredictRequest):
    if len(request.historicalData) < 3:
        raise HTTPException(status_code=400, detail="Insufficient historical data (minimum 3 months required).")

    df = pd.DataFrame([d.model_dump() for d in request.historicalData])
    df = df.sort_values("month").reset_index(drop=True)
    df = generate_features(df)

    # For very small datasets, RandomForest might overfit or fail, so we use LinearRegression as a fallback or baseline.
    features = ['month_idx', 'month_of_year', 'quarter', 'lag_1', 'lag_2', 'lag_3']
    
    X = df[features]
    y = df['amount']

    model = LinearRegression()
    model.fit(X, y)
    
    rf_model = None
    if len(df) >= 12:
        rf_model = RandomForestRegressor(n_estimators=50, max_depth=3, random_state=42)
        rf_model.fit(X, y)
        active_model = rf_model
    else:
        active_model = model

    # Calculate metrics on training data (in reality, we'd do a train/test split)
    y_pred_train = active_model.predict(X)
    mae = mean_absolute_error(y, y_pred_train)
    rmse = np.sqrt(mean_squared_error(y, y_pred_train))

    # Forecast future months recursively
    predictions = []
    last_date = df['date'].iloc[-1]
    
    current_lag_1 = df['amount'].iloc[-1]
    current_lag_2 = df['amount'].iloc[-2] if len(df) >= 2 else 0
    current_lag_3 = df['amount'].iloc[-3] if len(df) >= 3 else 0

    current_idx = df['month_idx'].iloc[-1]

    for i in range(1, request.monthsAhead + 1):
        next_date = last_date + pd.DateOffset(months=i)
        
        # Prepare feature vector for prediction
        next_features = pd.DataFrame([{
            'month_idx': current_idx + i,
            'month_of_year': next_date.month,
            'quarter': next_date.quarter,
            'lag_1': current_lag_1,
            'lag_2': current_lag_2,
            'lag_3': current_lag_3
        }])

        pred_amount = active_model.predict(next_features)[0]
        # Floor to 0 for financial data
        pred_amount = max(0.0, float(pred_amount))

        predictions.append(PredictionPoint(
            month=next_date.strftime("%Y-%m"),
            predictedAmount=round(pred_amount, 2)
        ))

        # Shift lags for next recursive prediction
        current_lag_3 = current_lag_2
        current_lag_2 = current_lag_1
        current_lag_1 = pred_amount

    return PredictResponse(
        category=request.category or "Total",
        metrics={"mae": round(mae, 2), "rmse": round(rmse, 2), "model_used": "RandomForest" if rf_model else "LinearRegression"},
        predictions=predictions
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
