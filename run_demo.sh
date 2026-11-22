#!/usr/bin/env bash

# Aimly Focus Application Demo Launcher
set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "=============================================================================="
echo "                     AIMLY FOCUS APPLICATION DEMO LAUNCHER"
echo "=============================================================================="
echo ""

echo "[1/4] Checking Backend dependencies..."
cd "$ROOT_DIR/backend"
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install
fi
if [ ! -f ".env" ]; then
    echo "Creating default backend/.env from .env.example..."
    cp .env.example .env
fi

echo "[2/4] Checking Frontend dependencies..."
cd "$ROOT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

echo "[3/4] Seeding Demo Database with 3 weeks of historical focus data..."
cd "$ROOT_DIR/backend"
node src/seed.js

echo ""
echo "[4/4] Starting all Aimly services concurrently..."
echo ""

# Start ML Service
cd "$ROOT_DIR/ml-service"
python -u -m uvicorn main:app --host 127.0.0.1 --port 8001 &
ML_PID=$!
echo "Aimly ML Service started (PID: $ML_PID) on http://127.0.0.1:8001"

sleep 2

# Start Backend API
cd "$ROOT_DIR/backend"
node src/index.js &
BACKEND_PID=$!
echo "Aimly Backend API started (PID: $BACKEND_PID) on http://localhost:8000"

sleep 1

# Start Frontend
cd "$ROOT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo "Aimly Frontend started (PID: $FRONTEND_PID) on http://localhost:5173"

echo ""
echo "=============================================================================="
echo "                            AIMLY IS RUNNING!"
echo "=============================================================================="
echo " - Frontend Web App:     http://localhost:5173"
echo " - Backend API Docs:     http://localhost:8000/docs"
echo " - Backend Health:       http://localhost:8000/health"
echo " - ML Service Health:    http://127.0.0.1:8001/health"
echo ""
echo " - Chrome Extension:     Load unpacked from: $ROOT_DIR/extension"
echo "   (Open chrome://extensions, enable Developer Mode, click Load Unpacked)"
echo ""
echo " - Demo Account:         demo@aimly.app"
echo " - Demo Password:        demo1234"
echo "=============================================================================="
echo ""
echo "Press CTRL+C to stop all services."

# Trap exit signals to kill all child processes
trap "kill $ML_PID $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

wait
