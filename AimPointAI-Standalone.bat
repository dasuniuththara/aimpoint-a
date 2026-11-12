@echo off
title AimPointAI Standalone Desktop App
cd /d "%~dp0"

echo [1/2] Starting fresh FastAPI Biomechanics Backend on port 8080...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)

start "" /b python start_server.py
timeout /t 2 /nobreak >nul

echo [2/2] Launching Standalone Native Desktop Window (Fresh Cache)...
start msedge --app=http://127.0.0.1:8080/?standalone=1 --window-size=1440,920 --disk-cache-size=1
exit
