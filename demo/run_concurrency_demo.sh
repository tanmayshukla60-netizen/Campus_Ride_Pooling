#!/usr/bin/env bash
# run_concurrency_demo.sh
# Runs 50 concurrent booking requests and displays live colored output & database verification.
set -e

# Terminal colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

echo -e "${CYAN}================================================================================${NC}"
echo -e "${CYAN}   CAMPUS RIDE-POOLING SYSTEM - LIVE CONCURRENCY & ROW LOCKING DEMO             ${NC}"
echo -e "${CYAN}================================================================================${NC}"
echo -e "Target Ride ID : ${YELLOW}33333333-3333-3333-3333-333333333399${NC}"
echo -e "Total Capacity : ${YELLOW}3 Seats${NC}"
echo -e "Concurrent Load: ${YELLOW}50 Simultaneous HTTP Booking Requests (Promise.all)${NC}"
echo -e "Locking Engine : ${YELLOW}PostgreSQL PL/pgSQL book_seat() with SELECT ... FOR UPDATE${NC}"
echo -e "${CYAN}================================================================================${NC}"
echo ""

export NODE_ENV=test

echo -e "${YELLOW}[*] Launching 50 concurrent riders against the database engine...${NC}"
echo ""

node ./backend/node_modules/ts-node/dist/bin.js ./backend/src/scripts/test-concurrency.ts

echo ""
echo -e "${CYAN}================================================================================${NC}"
echo -e "${CYAN}   CONCURRENCY AUDIT PROOF VERIFICATION:                                        ${NC}"
echo -e "${CYAN}================================================================================${NC}"

DB_USER="${DB_USER:-postgres}"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-5432}"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d campus_rides -c "
SELECT 
    r.id AS ride_id, 
    r.total_seats, 
    r.seats_available, 
    (SELECT COUNT(*) FROM bookings WHERE ride_id = r.id) AS confirmed_bookings, 
    CASE 
        WHEN r.seats_available = 0 AND (SELECT COUNT(*) FROM bookings WHERE ride_id = r.id) = 3 
        THEN 'TEST RESULT: PASSED (ZERO OVERBOOKING)' 
        ELSE 'FAILED' 
    END AS verdict 
FROM rides r 
WHERE r.id = '33333333-3333-3333-3333-333333333399';
"

echo ""
echo -e "${GREEN}================================================================================${NC}"
echo -e "${GREEN}   LIVE DEMO COMPLETE!${NC}"
echo -e "${GREEN}================================================================================${NC}"
read -p "Press Enter to exit..."
