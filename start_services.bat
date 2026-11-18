@echo off
title Launch AI Accounting Microservices
echo ============================================================
echo   Launching AI Accounting System for UAT Testing...
echo ============================================================

set ROOT=%~dp0

echo [1/4] Starting Java Accounting Backend (:8080)...
start "Java Spring Boot Backend (:8080)" cmd /k "cd /d %ROOT%Accounting && mvnw.cmd spring-boot:run"

echo [2/4] Starting Python ML Service (:8001)...
start "Python ML Service (:8001)" cmd /k "cd /d %ROOT%ml-service && venv\Scripts\uvicorn.exe main:app --port 8001 --reload"

echo [3/4] Starting Python Agent Service (:8002)...
start "Python Agent Service (:8002)" cmd /k "cd /d %ROOT%agent-service && venv\Scripts\uvicorn.exe main:app --port 8002 --reload"

echo [4/4] Starting React Frontend (:5173)...
start "React Frontend (:5173)" cmd /k "cd /d %ROOT%frontend && npm run dev"

echo.
echo All 4 services launched!
echo - Frontend:      http://localhost:5173
echo - Spring Boot:   http://localhost:8080
echo - Agent Service: http://localhost:8002
echo - ML Service:    http://localhost:8001
echo.
echo To run overnight UAT tests:
echo agent-service\venv\Scripts\python.exe run_overnight_uat.py
echo ============================================================
