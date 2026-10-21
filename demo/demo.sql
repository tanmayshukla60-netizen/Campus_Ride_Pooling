-- ============================================================================
-- CAMPUS RIDE-POOLING SYSTEM - DBMS COURSE DEMONSTRATION SCRIPT
-- Database: PostgreSQL 16+ | Schema: public | Database Name: campus_rides
-- Author: DBMS Final Project Demo
-- Instructions: Run each numbered section or block individually in psql or pgAdmin.
-- All intentional failure blocks (Section 2) are enclosed in BEGIN; ... ROLLBACK;
-- so executing them will demonstrate the error without damaging the demo data.
-- ============================================================================


-- ============================================================================
-- SECTION 1: SCHEMA TOUR
-- Inspect tables, views, stored functions, triggers, constraints, and indexes.
-- ============================================================================

-- 1.1 List all user tables with column counts
SELECT 
    t.table_name,
    COUNT(c.column_name) AS column_count
FROM information_schema.tables t
JOIN information_schema.columns c 
    ON t.table_name = c.table_name AND t.table_schema = c.table_schema
WHERE t.table_schema = 'public' 
  AND t.table_type = 'BASE TABLE'
GROUP BY t.table_name
ORDER BY t.table_name;

-- 1.2 List all views created in the database
SELECT 
    table_name AS view_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- 1.3 List all custom stored procedures and functions
SELECT 
    p.proname AS function_name,
    pg_get_function_identity_arguments(p.oid) AS arguments,
    t.typname AS return_type,
    l.lanname AS language
FROM pg_proc p
JOIN pg_type t ON p.prorettype = t.oid
JOIN pg_language l ON p.prolang = l.oid
WHERE p.pronamespace = 'public'::regnamespace
  AND p.proname NOT LIKE 'pgp_%' 
  AND p.proname NOT IN ('armor', 'dearmor', 'crypt', 'digest', 'encrypt', 'decrypt', 'encrypt_iv', 'decrypt_iv', 'gen_random_bytes', 'gen_random_uuid', 'gen_salt', 'hmac')
ORDER BY p.proname;

-- 1.4 List all database triggers and their target tables
SELECT 
    trigger_name,
    event_object_table AS target_table,
    action_timing AS timing,
    event_manipulation AS event,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- 1.5 Inspect Table Constraints (Primary Keys, Foreign Keys, CHECK constraints)
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc 
    ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- 1.6 Inspect Specialized Indexes (including Partial Unique and Composite indexes)
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;


-- ============================================================================
-- SECTION 2: CONSTRAINT VIOLATIONS ON PURPOSE (INTEGRITY PROOFS)
-- Each block is wrapped in BEGIN; ... ROLLBACK; to demonstrate strict engine-level
-- rejection without corrupting demo state.
-- ============================================================================

-- 2.1 VIOLATION: Negative seats available (blocked by chk_seats_range CHECK constraint)
-- Expected error: new row for relation "rides" violates check constraint "chk_seats_range"
BEGIN;
UPDATE rides 
SET seats_available = -1 
WHERE id = '33333333-3333-3333-3333-333333333301';
ROLLBACK;

-- 2.2 VIOLATION: Rating score out of bounds (score = 6, allowed 1 to 5)
-- Expected error: new row for relation "ratings" violates check constraint "ratings_score_check"
BEGIN;
INSERT INTO ratings (
    id, booking_id, rider_id, driver_id, score, comment, created_at
) VALUES (
    gen_random_uuid(),
    '44444444-4444-4444-4444-444444444403', -- completed booking
    '22222222-2222-2222-2222-222222222203', -- rider Rohit
    '22222222-2222-2222-2222-222222222201', -- driver Arun
    6,                                      -- ILLEGAL: score > 5!
    'Super driver!',
    NOW()
);
ROLLBACK;

-- 2.3 VIOLATION: Duplicate active booking for same rider on same ride
-- Blocked by Partial Unique Index: uq_active_rider_ride WHERE status IN ('PENDING', 'CONFIRMED')
-- Expected error: duplicate key value violates unique constraint "uq_active_rider_ride"
BEGIN;
-- Booking 44444444-4444-4444-4444-444444444401 is ALREADY PENDING for Rohit on ride 33333333-...-3301
INSERT INTO bookings (
    id, ride_id, rider_id, seats_booked, total_price, status, hold_expires_at
) VALUES (
    gen_random_uuid(),
    '33333333-3333-3333-3333-333333333301',
    '22222222-2222-2222-2222-222222222203',
    1,
    120.00,
    'CONFIRMED',
    NOW() + INTERVAL '5 minutes'
);
ROLLBACK;

-- 2.4 VIOLATION: Illegal state transition (Terminal COMPLETED state back to PENDING)
-- Blocked by Trigger: trg_enforce_booking_state_machine (ERROR 22000)
-- Expected error: Illegal booking state transition: cannot transition booking ... from COMPLETED to PENDING
BEGIN;
UPDATE bookings 
SET status = 'PENDING' 
WHERE id = '44444444-4444-4444-4444-444444444403'; -- already COMPLETED
ROLLBACK;

-- 2.5 VIOLATION: Negative price per seat (price < 0)
-- Blocked by CHECK constraint: rides_price_per_seat_check (price_per_seat >= 0)
-- Expected error: new row for relation "rides" violates check constraint "rides_price_per_seat_check"
BEGIN;
UPDATE rides 
SET price_per_seat = -75.00 
WHERE id = '33333333-3333-3333-3333-333333333301';
ROLLBACK;

-- 2.6 VIOLATION: Origin stop equals Destination stop (chk_distinct_stops)
-- Expected error: new row for relation "rides" violates check constraint "chk_distinct_stops"
BEGIN;
INSERT INTO rides (
    driver_id, origin_stop_id, destination_stop_id, departure_time, total_seats, seats_available, price_per_seat, status
) VALUES (
    '22222222-2222-2222-2222-222222222201',
    1, -- Main Gate
    1, -- Main Gate (SAME AS ORIGIN!)
    NOW() + INTERVAL '2 hours',
    3,
    3,
    100.00,
    'SCHEDULED'
);
ROLLBACK;


-- ============================================================================
-- SECTION 3: LIVE BOOKING VERIFICATION QUERIES
-- Run these in psql immediately after creating a booking in the web UI.
-- ============================================================================

-- 3.1 Inspect the most recently updated ride and its current seat availability
SELECT 
    r.id AS ride_id,
    u.full_name AS driver_name,
    so.name AS origin,
    sd.name AS destination,
    r.seats_available,
    r.total_seats,
    r.status,
    r.updated_at
FROM rides r
JOIN users u ON r.driver_id = u.id
JOIN stops so ON r.origin_stop_id = so.id
JOIN stops sd ON r.destination_stop_id = sd.id
ORDER BY r.updated_at DESC
LIMIT 3;

-- 3.2 Inspect the newest booking row inserted by book_seat()
SELECT 
    b.id AS booking_id,
    b.ride_id,
    u.full_name AS rider_name,
    b.seats_booked,
    b.total_price,
    b.status,
    b.hold_expires_at,
    b.created_at,
    b.updated_at
FROM bookings b
JOIN users u ON b.rider_id = u.id
ORDER BY b.created_at DESC
LIMIT 5;

-- 3.3 Verify immutable audit_log triggered on booking lifecycle transitions
SELECT 
    id AS audit_id,
    entity_type,
    entity_id,
    action,
    old_state->>'status' AS old_status,
    new_state->>'status' AS new_status,
    new_state->>'total_price' AS price,
    created_at
FROM audit_log
ORDER BY id DESC
LIMIT 8;

-- 3.4 Inspect the append-only payments ledger for latest charges
SELECT 
    p.id AS payment_id,
    p.booking_id,
    p.amount,
    p.type,
    p.reason,
    p.created_at
FROM payments p
ORDER BY p.created_at DESC
LIMIT 5;


-- ============================================================================
-- SECTION 4: CONCURRENCY STRESS PROOF
-- Target Ride ID: 33333333-3333-3333-3333-333333333399
-- Run this query after executing run_concurrency_demo.bat (50 concurrent requests).
-- ============================================================================

SELECT 
    r.id AS ride_id,
    r.total_seats,
    r.seats_available,
    (SELECT COUNT(*) FROM bookings WHERE ride_id = r.id) AS total_booking_records,
    (SELECT COUNT(*) FROM bookings WHERE ride_id = r.id AND status IN ('PENDING', 'CONFIRMED')) AS active_allocated_seats,
    CASE 
        WHEN r.seats_available = 0 AND (SELECT COUNT(*) FROM bookings WHERE ride_id = r.id) = r.total_seats 
        THEN 'ZERO OVERBOOKING: Exactly total_seats allocated under 50 concurrent requests! (PASS)'
        ELSE 'FAIL OR UNTESTED'
    END AS concurrency_audit_verdict
FROM rides r
WHERE r.id = '33333333-3333-3333-3333-333333333399';

-- View all 3 winning bookings on the stress test ride:
SELECT 
    b.id AS booking_id,
    b.seats_booked,
    b.total_price,
    b.status,
    b.idempotency_key,
    b.created_at
FROM bookings b
WHERE b.ride_id = '33333333-3333-3333-3333-333333333399'
ORDER BY b.created_at ASC;


-- ============================================================================
-- SECTION 5: CANCELLATION & REFUND LEDGER VERIFICATION
-- Demonstrates tiered refund policy (>24h = 100%, 2-24h = 50%, <2h = 0%)
-- and atomic return of seats to the ride.
-- ============================================================================

-- 5.1 Check ledger records showing both original CHARGE and subsequent REFUND for a booking
SELECT 
    p.id AS payment_id,
    p.booking_id,
    p.amount,
    p.type,
    p.reason,
    p.created_at
FROM payments p
WHERE p.booking_id = '44444444-4444-4444-4444-444444444405'
ORDER BY p.created_at ASC;

-- 5.2 Compare total charged vs total refunded across the entire system
SELECT 
    SUM(CASE WHEN type = 'CHARGE' THEN amount ELSE 0 END) AS total_gross_charges,
    SUM(CASE WHEN type = 'REFUND' THEN amount ELSE 0 END) AS total_issued_refunds,
    SUM(CASE WHEN type = 'CHARGE' THEN amount ELSE -amount END) AS net_platform_revenue
FROM payments;


-- ============================================================================
-- SECTION 6: VIEWS AND EXPLAIN ANALYZE BENCHMARK
-- ============================================================================

-- 6.1 Query View: v_available_rides (Search & browse projection)
SELECT 
    ride_id,
    driver_name,
    driver_rating_avg,
    origin_stop_name,
    destination_stop_name,
    departure_time,
    seats_available,
    price_per_seat
FROM v_available_rides
ORDER BY departure_time ASC
LIMIT 5;

-- 6.2 Query View: v_rider_history (Ticket details & payment rollups)
SELECT 
    booking_id,
    booking_status,
    origin_stop_name,
    destination_stop_name,
    departure_time,
    total_price,
    total_refunded,
    rating_score
FROM v_rider_history
WHERE booking_status IN ('CONFIRMED', 'COMPLETED', 'CANCELLED_BY_RIDER')
LIMIT 5;

-- 6.3 EXPLAIN ANALYZE WITH Composite Index (Index Scan)
EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    r.id, r.departure_time, r.price_per_seat, r.seats_available,
    u.full_name AS driver_name, u.rating_avg
FROM rides r
JOIN users u ON r.driver_id = u.id
WHERE r.origin_stop_id = 1 
  AND r.destination_stop_id = 2 
  AND r.departure_time >= NOW() - INTERVAL '1 hour'
  AND r.departure_time <= NOW() + INTERVAL '3 days'
  AND r.status = 'SCHEDULED';

-- 6.4 EXPLAIN ANALYZE WITHOUT Composite Index (Forced Sequential Scan via Rollback)
-- Inside a transaction, index is dropped, plan is inspected, and ROLLBACK restores the index!
BEGIN;
DROP INDEX idx_rides_search_composite;

EXPLAIN (ANALYZE, BUFFERS)
SELECT 
    r.id, r.departure_time, r.price_per_seat, r.seats_available,
    u.full_name AS driver_name, u.rating_avg
FROM rides r
JOIN users u ON r.driver_id = u.id
WHERE r.origin_stop_id = 1 
  AND r.destination_stop_id = 2 
  AND r.departure_time >= NOW() - INTERVAL '1 hour'
  AND r.departure_time <= NOW() + INTERVAL '3 days'
  AND r.status = 'SCHEDULED';

ROLLBACK; -- Index idx_rides_search_composite is completely preserved!


-- ============================================================================
-- SECTION 7: STORED FUNCTION & TRIGGER DEFINITIONS
-- Inspect internal PL/pgSQL implementation directly from system catalog
-- ============================================================================

-- 7.1 book_seat() - Core concurrency locking logic (SELECT FOR UPDATE)
SELECT pg_get_functiondef('book_seat(uuid,uuid,integer,character varying)'::regprocedure);

-- 7.2 cancel_booking() - Global lock ordering and tiered refund logic
SELECT pg_get_functiondef('cancel_booking(uuid,uuid)'::regprocedure);

-- 7.3 cancel_ride() - Atomic driver cancellation and 100% refund loop
SELECT pg_get_functiondef('cancel_ride(uuid,uuid)'::regprocedure);

-- 7.4 expire_holds() - Background garbage collection for expired seat holds
SELECT pg_get_functiondef('expire_holds()'::regprocedure);

-- 7.5 trg_enforce_booking_state_machine() - Terminal state protection trigger
SELECT pg_get_functiondef('trg_enforce_booking_state_machine()'::regprocedure);

-- 7.6 trg_audit_booking_status_change() - Automatic JSONB audit logging trigger
SELECT pg_get_functiondef('trg_audit_booking_status_change()'::regprocedure);

-- 7.7 trg_update_driver_rating() - Incremental rating cache synchronization trigger
SELECT pg_get_functiondef('trg_update_driver_rating()'::regprocedure);


-- ============================================================================
-- SECTION 8: ANALYTICAL QUERIES (JOIN, GROUP BY, SUBQUERIES)
-- Complex queries demonstrating aggregations, subqueries, and window analysis.
-- ============================================================================

-- 8.1 Top-Rated Drivers with Ride and Booking Statistics
-- Uses JOIN, GROUP BY, and a correlated scalar subquery for passenger count
SELECT 
    u.id AS driver_id,
    u.full_name AS driver_name,
    u.rating_avg,
    u.rating_count,
    COUNT(r.id) AS total_rides_posted,
    COALESCE((
        SELECT SUM(b.seats_booked) 
        FROM bookings b 
        JOIN rides r2 ON b.ride_id = r2.id 
        WHERE r2.driver_id = u.id AND b.status IN ('CONFIRMED', 'COMPLETED')
    ), 0) AS total_passengers_served
FROM users u
JOIN rides r ON r.driver_id = u.id
GROUP BY u.id, u.full_name, u.rating_avg, u.rating_count
HAVING COUNT(r.id) > 0
ORDER BY u.rating_avg DESC, u.rating_count DESC, total_rides_posted DESC;

-- 8.2 Busiest Routes by Demand, Bookings, and Total Revenue
-- Evaluates stop pairs with aggregations and revenue calculations
SELECT 
    so.name AS origin,
    sd.name AS destination,
    COUNT(DISTINCT r.id) AS total_scheduled_rides,
    COUNT(b.id) AS total_booking_requests,
    SUM(CASE WHEN b.status IN ('CONFIRMED', 'COMPLETED') THEN b.seats_booked ELSE 0 END) AS confirmed_passengers,
    COALESCE(SUM(CASE WHEN b.status IN ('CONFIRMED', 'COMPLETED') THEN b.total_price ELSE 0 END), 0.00) AS gross_route_revenue
FROM rides r
JOIN stops so ON r.origin_stop_id = so.id
JOIN stops sd ON r.destination_stop_id = sd.id
LEFT JOIN bookings b ON b.ride_id = r.id
GROUP BY so.name, sd.name
ORDER BY gross_route_revenue DESC, total_booking_requests DESC;

-- 8.3 Booking Breakdown per Status with Percentage of Platform Volume
-- Uses Subquery in FROM clause and analytical percentage calculation
SELECT 
    status,
    booking_count,
    ROUND((booking_count * 100.0 / total_system_bookings), 2) AS percentage_of_total,
    total_financial_value
FROM (
    SELECT 
        status,
        COUNT(*) AS booking_count,
        SUM(total_price) AS total_financial_value,
        SUM(COUNT(*)) OVER() AS total_system_bookings
    FROM bookings
    GROUP BY status
) sub
ORDER BY booking_count DESC;

-- 8.4 Financial Audit Ledger Summary by Payment Reason & Type
SELECT 
    type,
    COALESCE(reason, 'Standard Payment') AS transaction_description,
    COUNT(*) AS transaction_count,
    SUM(amount) AS total_amount
FROM payments
GROUP BY type, reason
ORDER BY type, total_amount DESC;
