@echo off
title Campus Ride-Pooling - DBMS Presentation Launcher
echo ============================================================
echo   Campus Ride-Pooling System - Starting All Services
echo ============================================================

cd /d "c:\Users\Tanmay Shukla\Desktop\DBMS"

REM 1. Clean stale pid if any and start PostgreSQL
echo [1/4] Ensuring PostgreSQL database is running...
powershell -ExecutionPolicy Bypass -Command "if (Test-Path \"$env:USERPROFILE\pgsql_data\postmaster.pid\") { Remove-Item \"$env:USERPROFILE\pgsql_data\postmaster.pid\" -Force }; & \"$env:USERPROFILE\pgsql\bin\pg_ctl.exe\" -D \"$env:USERPROFILE\pgsql_data\" -l \"$env:USERPROFILE\pgsql_data\server.log\" start"

timeout /t 2 /nobreak >nul

REM 2. Automatically refresh seed data with current timestamps
echo [2/4] Generating fresh rides and bookings for right now...
powershell -ExecutionPolicy Bypass -Command "& \"$env:USERPROFILE\pgsql\bin\psql.exe\" -h 127.0.0.1 -p 5432 -U postgres -d campus_rides -f \"db\seed.sql\""

timeout /t 1 /nobreak >nul

REM 3. Start Full App (Backend + Frontend)
echo [3/4] Starting Backend API (port 5000) and Frontend UI (port 5173)...
start "Campus Rides - Web App" cmd /k "npm run dev"

timeout /t 3 /nobreak >nul

REM 4. Open browser
echo [4/4] Opening browser at http://localhost:5173...
start http://localhost:5173

echo.
echo ============================================================
echo   All systems ready!
echo   Keep the black terminal window open during your demo.
echo ============================================================
