@echo off
title Campus Ride-Pooling - Reset Database to Pristine State
echo ============================================================
echo   Campus Ride-Pooling System - Resetting Demo Database
echo ============================================================

cd /d "%~dp0\.."

REM Ensure PostgreSQL is running
powershell -ExecutionPolicy Bypass -Command "$pg = Get-Process postgres -ErrorAction SilentlyContinue; if (-not $pg) { Start-Process -FilePath \"$env:USERPROFILE\pgsql\bin\postgres.exe\" -ArgumentList \"-D `\"$env:USERPROFILE\pgsql_data`\"\" -WindowStyle Hidden; Start-Sleep -Seconds 3 }"
powershell -ExecutionPolicy Bypass -Command "while (-not (Test-NetConnection -ComputerName 127.0.0.1 -Port 5432 -InformationLevel Quiet)) { Start-Sleep -Milliseconds 500 }"

echo.
echo [1/4] Terminating existing connections and recreating database 'campus_rides'...
powershell -ExecutionPolicy Bypass -Command "& \"$env:USERPROFILE\pgsql\bin\psql.exe\" -h 127.0.0.1 -p 5432 -U postgres -d postgres -c \"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'campus_rides' AND pid != pg_backend_pid()\""
powershell -ExecutionPolicy Bypass -Command "& \"$env:USERPROFILE\pgsql\bin\dropdb.exe\" -h 127.0.0.1 -p 5432 -U postgres --if-exists campus_rides"
powershell -ExecutionPolicy Bypass -Command "& \"$env:USERPROFILE\pgsql\bin\createdb.exe\" -h 127.0.0.1 -p 5432 -U postgres campus_rides"

echo.
echo [2/4] Applying Migration 001 (Schema, Tables, Constraints, Indexes)...
powershell -ExecutionPolicy Bypass -Command "& \"$env:USERPROFILE\pgsql\bin\psql.exe\" -h 127.0.0.1 -p 5432 -U postgres -d campus_rides -v ON_ERROR_STOP=1 -f \"db\migrations\001_init_schema.sql\""

echo.
echo [3/4] Applying Migration 002 (Triggers, Audit Trail, State Machine)...
powershell -ExecutionPolicy Bypass -Command "& \"$env:USERPROFILE\pgsql\bin\psql.exe\" -h 127.0.0.1 -p 5432 -U postgres -d campus_rides -v ON_ERROR_STOP=1 -f \"db\migrations\002_triggers_and_audit.sql\""

echo.
echo [4/4] Applying Migration 003 (Stored Functions, Views)...
powershell -ExecutionPolicy Bypass -Command "& \"$env:USERPROFILE\pgsql\bin\psql.exe\" -h 127.0.0.1 -p 5432 -U postgres -d campus_rides -v ON_ERROR_STOP=1 -f \"db\migrations\003_functions_and_views.sql\""

echo.
echo [*] Seeding fresh demo data (Users, Stops, Upcoming Rides, Bookings, Ledger)...
powershell -ExecutionPolicy Bypass -Command "& \"$env:USERPROFILE\pgsql\bin\psql.exe\" -h 127.0.0.1 -p 5432 -U postgres -d campus_rides -v ON_ERROR_STOP=1 -f \"db\seed.sql\""

echo.
echo ============================================================
echo   DATABASE RESET COMPLETE! Pristine demo state ready.
echo ============================================================
pause
