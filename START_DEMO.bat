@echo off
title Campus Ride-Pooling - DBMS Presentation Launcher
echo ============================================================
echo   Campus Ride-Pooling System - Starting All Services
echo ============================================================

cd /d "c:\Users\Tanmay Shukla\Desktop\DBMS"

REM 1. Start PostgreSQL as an independent background daemon if not already running
echo [1/4] Ensuring PostgreSQL database is running...
powershell -ExecutionPolicy Bypass -Command "$pg = Get-Process postgres -ErrorAction SilentlyContinue; if (-not $pg) { Start-Process -FilePath \"$env:USERPROFILE\pgsql\bin\postgres.exe\" -ArgumentList \"-D `\"$env:USERPROFILE\pgsql_data`\"\" -WindowStyle Hidden; Start-Sleep -Seconds 3 }"

REM Wait for PostgreSQL port 5432 to be accepting connections
powershell -ExecutionPolicy Bypass -Command "while (-not (Test-NetConnection -ComputerName 127.0.0.1 -Port 5432 -InformationLevel Quiet)) { Start-Sleep -Milliseconds 500 }"

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
