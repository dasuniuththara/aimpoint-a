@echo off
title AimPoint Motion Desktop Studio
cd /d "%~dp0"
set ELECTRON_RUN_AS_NODE=

echo ======================================================================
echo    AimPoint Motion - Basketball Biomechanics Desktop Application
echo    KDU Department of Computer Science (2026)
echo ======================================================================
echo.
echo [1/2] Stopping any stale server on port 8080 and starting fresh backend...

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8080 " ^| findstr "LISTENING"') do (
    taskkill /PID %%a /F >nul 2>&1
)

start "" /b python start_server.py
timeout /t 2 /nobreak >nul

echo [2/2] Launching Updated Native Electron Desktop App...
if exist "%~dp0node_modules\.bin\electron.cmd" (
    call "%~dp0node_modules\.bin\electron.cmd" "%~dp0."
) else (
    call npx electron "%~dp0."
)
