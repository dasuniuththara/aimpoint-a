@echo off
title AimPoint Motion Mobile (Expo)
cd /d "%~dp0"

echo ======================================================================
echo    AimPoint Motion - Cross-Platform Mobile App (Expo / React Native)
echo ======================================================================
echo.
echo [1/2] Checking FastAPI Backend on Port 8080...
netstat -ano | findstr ":8080 " | findstr "LISTENING" >nul
if %errorlevel% neq 0 (
    start "" /b python start_server.py
    timeout /t 2 /nobreak >nul
)

echo [2/2] Starting Expo Metro Server in mobile\ ...
cd mobile
set EXPO_NO_TELEMETRY=1
npx expo start -c
