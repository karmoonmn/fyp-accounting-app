# ==============================================================================
# Antigravity Accounting Application - Service Launcher (PowerShell)
# Launches all 4 microservices in separate background console windows:
#   1. Accounting Backend (Spring Boot :8080)
#   2. ML Forecasting Service (FastAPI :8001)
#   3. Agent Service (FastAPI :8002)
#   4. React Frontend (Vite :5173)
# ==============================================================================

$Root = $PSScriptRoot

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Launching AI Accounting System for UAT Testing..." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Spring Boot Backend (:8080)
Write-Host "[1/4] Starting Java Accounting Backend (:8080)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\Accounting'; Write-Host '--- Java Accounting Backend (:8080) ---' -ForegroundColor Green; .\mvnw.cmd spring-boot:run"

# 2. ML Forecasting Service (:8001)
Write-Host "[2/4] Starting Python ML Forecasting Service (:8001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\ml-service'; Write-Host '--- ML Service (:8001) ---' -ForegroundColor Green; .\venv\Scripts\uvicorn.exe main:app --port 8001 --reload"

# 3. Agent Service (:8002)
Write-Host "[3/4] Starting Python Agent Service (:8002)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\agent-service'; Write-Host '--- Agent Service (:8002) ---' -ForegroundColor Green; .\venv\Scripts\uvicorn.exe main:app --port 8002 --reload"

# 4. React Frontend (:5173)
Write-Host "[4/4] Starting React Frontend (:5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\frontend'; Write-Host '--- React Frontend (:5173) ---' -ForegroundColor Green; npm run dev"

Write-Host ""
Write-Host "All 4 services launched in separate windows!" -ForegroundColor Green
Write-Host "• Frontend:      http://localhost:5173" -ForegroundColor White
Write-Host "• Spring Boot:   http://localhost:8080" -ForegroundColor White
Write-Host "• Agent Service: http://localhost:8002" -ForegroundColor White
Write-Host "• ML Service:    http://localhost:8001" -ForegroundColor White
Write-Host ""
Write-Host "To execute the automated overnight test suite at any time, run:" -ForegroundColor Cyan
Write-Host "  agent-service\venv\Scripts\python.exe run_overnight_uat.py" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
