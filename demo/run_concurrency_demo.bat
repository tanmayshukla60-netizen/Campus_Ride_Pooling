@echo off
title Campus Ride-Pooling - Concurrency Stress Test (50 Simultaneous Requests)
color 0B
echo ================================================================================
echo   CAMPUS RIDE-POOLING SYSTEM - LIVE CONCURRENCY AND ROW LOCKING DEMO
echo ================================================================================
echo   Target Ride ID : 33333333-3333-3333-3333-333333333399
echo   Total Capacity : 3 Seats
echo   Concurrent Load: 50 Simultaneous HTTP Booking Requests (Promise.all)
echo   Locking Engine : PostgreSQL PL/pgSQL book_seat() with SELECT ... FOR UPDATE
echo ================================================================================
echo.

cd /d "%~dp0\.."

REM Ensure NODE_ENV=test so it boots isolated worker on port 5098
set NODE_ENV=test

echo [*] Launching 50 concurrent riders against the database engine...
echo.

node ./backend/node_modules/ts-node/dist/bin.js ./backend/src/scripts/test-concurrency.ts

echo.
echo ================================================================================
echo   CONCURRENCY AUDIT PROOF VERIFICATION:
echo ================================================================================
powershell -ExecutionPolicy Bypass -Command "& \"$env:USERPROFILE\pgsql\bin\psql.exe\" -h 127.0.0.1 -p 5432 -U postgres -d campus_rides -c \"SELECT r.id AS ride_id, r.total_seats, r.seats_available, (SELECT COUNT(*) FROM bookings WHERE ride_id = r.id) AS confirmed_bookings, CASE WHEN r.seats_available = 0 AND (SELECT COUNT(*) FROM bookings WHERE ride_id = r.id) = 3 THEN 'TEST RESULT: PASSED (ZERO OVERBOOKING)' ELSE 'FAILED' END AS verdict FROM rides r WHERE r.id = '33333333-3333-3333-3333-333333333399';\""

echo.
echo ================================================================================
echo   LIVE DEMO COMPLETE - PRESS ANY KEY TO EXIT
echo ================================================================================
pause
