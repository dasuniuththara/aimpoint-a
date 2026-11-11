@echo off
title AimPoint Motion Desktop Studio
cd /d "%~dp0"
set ELECTRON_RUN_AS_NODE=

echo ======================================================================
echo    AimPoint Motion - Basketball Biomechanics Desktop Application
echo    KDU Department of Computer Science (2026)
echo ======================================================================
echo.
echo [1/2] Ensuring FastAPI Biomechanics Engine is Running on Port 8080...

netstat -ano | findstr :8080 >nul
if %errorlevel% neq 0 (
    start /b python start_server.py
    timeout /t 2 /nobreak >nul
)

echo [2/2] Launching Native Electron Desktop App...
npx electron .
