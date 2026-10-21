@echo off
title Campus Ride-Pooling - DBMS Presentation Launcher
echo ============================================================
echo   Campus Ride-Pooling System - Starting All Services
echo ============================================================

cd /d "%~dp0"

REM 1. Clean stale pid if any and start PostgreSQL
echo [1/3] Ensuring PostgreSQL database is running...
powershell -ExecutionPolicy Bypass -Command "if (Test-Path \"$env:USERPROFILE\pgsql_data\postmaster.pid\") { Remove-Item \"$env:USERPROFILE\pgsql_data\postmaster.pid\" -Force }; & \"$env:USERPROFILE\pgsql\bin\pg_ctl.exe\" -D \"$env:USERPROFILE\pgsql_data\" -l \"$env:USERPROFILE\pgsql_data\server.log\" start"

timeout /t 2 /nobreak >nul

REM 2. Start Full App (Backend + Frontend)
echo [2/3] Starting Backend API (port 5000) and Frontend UI (port 5173)...
start "Campus Rides - Web App" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul

REM 3. Open browser
echo [3/3] Opening browser at http://localhost:5173...
start http://localhost:5173

echo.
echo ============================================================
echo   All systems ready!
echo   Keep the black terminal window open during your demo.
echo ============================================================
