@echo off
title Aimly Demo Launcher
echo ==============================================================================
echo                      AIMLY FOCUS APPLICATION DEMO LAUNCHER
echo ==============================================================================
echo.

set ROOT_DIR=%~dp0
cd /d "%ROOT_DIR%"

echo [1/4] Checking and preparing Backend dependencies...
cd /d "%ROOT_DIR%backend"
if not exist "node_modules\" (
    echo Installing backend dependencies...
    call npm install
)
if not exist ".env" (
    echo Creating default backend/.env from .env.example...
    copy .env.example .env >nul
)

echo [2/4] Checking and preparing Frontend dependencies...
cd /d "%ROOT_DIR%frontend"
if not exist "node_modules\" (
    echo Installing frontend dependencies...
    call npm install
)

echo [3/4] Seeding Demo Database with 3 weeks of historical focus data...
cd /d "%ROOT_DIR%backend"
call node src/seed.js

echo.
echo [4/4] Starting all Aimly services...
echo.

echo Starting ML Service (FastAPI) on http://127.0.0.1:8001...
cd /d "%ROOT_DIR%ml-service"
start "Aimly ML Service (Port 8001)" cmd /k "python -u -m uvicorn main:app --host 127.0.0.1 --port 8001"

timeout /t 3 /nobreak >nul

echo Starting Backend API (Express) on http://localhost:8000...
cd /d "%ROOT_DIR%backend"
start "Aimly Backend API (Port 8000)" cmd /k "node src/index.js"

timeout /t 2 /nobreak >nul

echo Starting Frontend Web App (Vite React) on http://localhost:5173...
cd /d "%ROOT_DIR%frontend"
start "Aimly Frontend (Port 5173)" cmd /k "npm run dev"

echo.
echo ==============================================================================
echo                             AIMLY IS RUNNING!
echo ==============================================================================
echo  - Frontend Web App:     http://localhost:5173
echo  - Backend API Docs:     http://localhost:8000/docs
echo  - Backend Health:       http://localhost:8000/health
echo  - ML Service Health:    http://127.0.0.1:8001/health
echo.
echo  - Chrome Extension:     Load unpacked from: %ROOT_DIR%extension
echo    (Open chrome://extensions, enable Developer Mode, click Load Unpacked)
echo.
echo  - Demo Account:         demo@aimly.app
echo  - Demo Password:        demo1234
echo ==============================================================================
echo.
pause
