-- seed.sql
-- Comprehensive seed data for Campus Ride-Pooling system
-- Includes: 11 Users (1 Admin, 10 Students/Drivers), 9 Stops, 22 Rides, 
-- and Bookings in EVERY state (PENDING, CONFIRMED, COMPLETED, CANCELLED_BY_RIDER, CANCELLED_BY_DRIVER, EXPIRED)
-- All users share password: "Password123!" (bcrypt hashed: $2a$10$7EqJtq98hPqEX7fNZaFWoO.8/5s1J8cKz4x3Fp06dE/4U00sH3eW6)

BEGIN;

-- Clear previous data if needed
TRUNCATE audit_log, ratings, payments, bookings, rides, stops, users RESTART IDENTITY CASCADE;

-- ============================================================================
-- 1. USERS (1 Admin + 10 Students)
-- ============================================================================
INSERT INTO users (id, full_name, email, password_hash, role, rating_avg, rating_count) VALUES
('11111111-1111-1111-1111-111111111111', 'Campus Admin', 'admin@vitstudent.ac.in', '$2a$10$ZTw00uUoYPqNQb.j38FPLOEsnPHeKdIUV4fSUQYE9gr5u2.p6d4X6', 'ADMIN', 5.00, 0),
('22222222-2222-2222-2222-222222222201', 'Arun Kumar', 'arun.kumar2023@vitstudent.ac.in', '$2a$10$ZTw00uUoYPqNQb.j38FPLOEsnPHeKdIUV4fSUQYE9gr5u2.p6d4X6', 'DRIVER', 4.90, 8),
('22222222-2222-2222-2222-222222222202', 'Priya Sharma', 'priya.sharma2023@vitstudent.ac.in', '$2a$10$ZTw00uUoYPqNQb.j38FPLOEsnPHeKdIUV4fSUQYE9gr5u2.p6d4X6', 'DRIVER', 4.80, 5),
('22222222-2222-2222-2222-222222222203', 'Rohit Verma', 'rohit.verma2022@vitstudent.ac.in', '$2a$10$ZTw00uUoYPqNQb.j38FPLOEsnPHeKdIUV4fSUQYE9gr5u2.p6d4X6', 'RIDER', 4.50, 4),
('22222222-2222-2222-2222-222222222204', 'Sneha Patel', 'sneha.patel2023@vitstudent.ac.in', '$2a$10$ZTw00uUoYPqNQb.j38FPLOEsnPHeKdIUV4fSUQYE9gr5u2.p6d4X6', 'DRIVER', 5.00, 3),
('22222222-2222-2222-2222-222222222205', 'Vikram Aditya', 'vikram.aditya2022@vitstudent.ac.in', '$2a$10$ZTw00uUoYPqNQb.j38FPLOEsnPHeKdIUV4fSUQYE9gr5u2.p6d4X6', 'RIDER', 4.25, 4),
('22222222-2222-2222-2222-222222222206', 'Ananya Iyer', 'ananya.iyer2024@vitstudent.ac.in', '$2a$10$ZTw00uUoYPqNQb.j38FPLOEsnPHeKdIUV4fSUQYE9gr5u2.p6d4X6', 'RIDER', 4.70, 3),
('22222222-2222-2222-2222-222222222207', 'Karthik Rajan', 'karthik.rajan2023@vitstudent.ac.in', '$2a$10$ZTw00uUoYPqNQb.j38FPLOEsnPHeKdIUV4fSUQYE9gr5u2.p6d4X6', 'DRIVER', 5.00, 2),
('22222222-2222-2222-2222-222222222208', 'Deepa Nair', 'deepa.nair2022@vitstudent.ac.in', '$2a$10$ZTw00uUoYPqNQb.j38FPLOEsnPHeKdIUV4fSUQYE9gr5u2.p6d4X6', 'RIDER', 4.60, 5),
('22222222-2222-2222-2222-222222222209', 'Siddharth Malhotra', 'siddharth.m2023@vitstudent.ac.in', '$2a$10$ZTw00uUoYPqNQb.j38FPLOEsnPHeKdIUV4fSUQYE9gr5u2.p6d4X6', 'DRIVER', 4.85, 4),
('22222222-2222-2222-2222-222222222210', 'Pooja Reddy', 'pooja.reddy2024@vitstudent.ac.in', '$2a$10$ZTw00uUoYPqNQb.j38FPLOEsnPHeKdIUV4fSUQYE9gr5u2.p6d4X6', 'RIDER', 5.00, 1);

-- ============================================================================
-- 2. STOPS (9 stops)
-- ============================================================================
INSERT INTO stops (id, name, landmark) VALUES
(1, 'Main Gate', 'VIT Vellore Campus Main Entrance'),
(2, 'Katpadi Station', 'Katpadi Railway Junction, Platform 1 Out Gate'),
(3, 'Chennai Airport', 'MAA Terminal 1 & 4 Dropoff Zone'),
(4, 'Bangalore Majestic', 'Kempegowda Bus Station Terminal 2'),
(5, 'Vellore Town', 'Old Bus Stand, Clock Tower Circle'),
(6, 'Silk Board', 'Central Silk Board Junction, Hosur Road'),
(7, 'Green Circle', 'Vellore New Bus Stand & Green Circle Hub'),
(8, 'VIT Gate 2', 'SJT / Technology Tower Gate'),
(9, 'Gandhi Nagar', 'Gandhi Nagar 1st Main Road, Near Dominos');

ALTER SEQUENCE stops_id_seq RESTART WITH 10;

-- ============================================================================
-- 3. RIDES (22 rides covering various statuses, routes, times)
-- ============================================================================
-- Note: departure_time uses offsets relative to NOW()
INSERT INTO rides (id, driver_id, origin_stop_id, destination_stop_id, departure_time, total_seats, seats_available, price_per_seat, status) VALUES
-- Upcoming scheduled rides (for search & booking testing)
('33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222201', 1, 2, NOW() + INTERVAL '2 hours', 4, 3, 120.00, 'SCHEDULED'),
('33333333-3333-3333-3333-333333333302', '22222222-2222-2222-2222-222222222202', 1, 3, NOW() + INTERVAL '5 hours', 3, 3, 650.00, 'SCHEDULED'),
('33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222203', 1, 4, NOW() + INTERVAL '1 day', 4, 4, 850.00, 'SCHEDULED'),
('33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222204', 2, 1, NOW() + INTERVAL '3 hours', 4, 2, 100.00, 'SCHEDULED'),
('33333333-3333-3333-3333-333333333305', '22222222-2222-2222-2222-222222222205', 3, 1, NOW() + INTERVAL '8 hours', 3, 1, 700.00, 'SCHEDULED'),
('33333333-3333-3333-3333-333333333306', '22222222-2222-2222-2222-222222222206', 4, 1, NOW() + INTERVAL '2 days', 4, 4, 800.00, 'SCHEDULED'),
('33333333-3333-3333-3333-333333333307', '22222222-2222-2222-2222-222222222207', 1, 7, NOW() + INTERVAL '1 hour', 2, 0, 50.00, 'SCHEDULED'), -- FULL ride!
('33333333-3333-3333-3333-333333333308', '22222222-2222-2222-2222-222222222208', 8, 2, NOW() + INTERVAL '4 hours', 3, 2, 110.00, 'SCHEDULED'),
('33333333-3333-3333-3333-333333333309', '22222222-2222-2222-2222-222222222209', 1, 6, NOW() + INTERVAL '1 day 4 hours', 4, 4, 750.00, 'SCHEDULED'),
('33333333-3333-3333-3333-333333333310', '22222222-2222-2222-2222-222222222210', 1, 2, NOW() + INTERVAL '30 minutes', 3, 1, 130.00, 'SCHEDULED'), -- 2 confirmed bookings take 2 seats
('33333333-3333-3333-3333-333333333311', '22222222-2222-2222-2222-222222222201', 7, 3, NOW() + INTERVAL '12 hours', 4, 4, 600.00, 'SCHEDULED'),
('33333333-3333-3333-3333-333333333312', '22222222-2222-2222-2222-222222222202', 1, 5, NOW() + INTERVAL '2 hours 30 minutes', 3, 2, 60.00, 'SCHEDULED'),
('33333333-3333-3333-3333-333333333313', '22222222-2222-2222-2222-222222222203', 5, 1, NOW() + INTERVAL '6 hours', 4, 4, 60.00, 'SCHEDULED'),
('33333333-3333-3333-3333-333333333314', '22222222-2222-2222-2222-222222222204', 8, 3, NOW() + INTERVAL '1 day', 3, 3, 670.00, 'SCHEDULED'),
('33333333-3333-3333-3333-333333333315', '22222222-2222-2222-2222-222222222205', 9, 2, NOW() + INTERVAL '3 hours', 4, 4, 90.00, 'SCHEDULED'),

-- SPECIAL TEST RIDE: For Concurrency Stress Test (3 seats total, 3 available)
('33333333-3333-3333-3333-333333333399', '22222222-2222-2222-2222-222222222201', 1, 2, NOW() + INTERVAL '3 days', 3, 3, 150.00, 'SCHEDULED'),

-- Past COMPLETED rides (seats_available reflects seats taken by completed bookings)
('33333333-3333-3333-3333-333333333316', '22222222-2222-2222-2222-222222222201', 1, 2, NOW() - INTERVAL '2 days', 4, 2, 120.00, 'COMPLETED'),
('33333333-3333-3333-3333-333333333317', '22222222-2222-2222-2222-222222222202', 1, 3, NOW() - INTERVAL '3 days', 3, 2, 650.00, 'COMPLETED'),
('33333333-3333-3333-3333-333333333318', '22222222-2222-2222-2222-222222222203', 2, 1, NOW() - INTERVAL '1 day', 4, 3, 100.00, 'COMPLETED'),

-- Past CANCELLED rides (all seats returned)
('33333333-3333-3333-3333-333333333319', '22222222-2222-2222-2222-222222222204', 1, 4, NOW() - INTERVAL '1 day', 4, 4, 850.00, 'CANCELLED'),
('33333333-3333-3333-3333-333333333320', '22222222-2222-2222-2222-222222222205', 3, 1, NOW() - INTERVAL '4 hours', 3, 3, 700.00, 'CANCELLED');

-- ============================================================================
-- 4. BOOKINGS (Covers EVERY state: PENDING, CONFIRMED, COMPLETED, 
--    CANCELLED_BY_RIDER, CANCELLED_BY_DRIVER, EXPIRED)
-- ============================================================================
INSERT INTO bookings (id, ride_id, rider_id, seats_booked, total_price, status, hold_expires_at, idempotency_key, created_at) VALUES
-- State 1: PENDING (active seat hold, expires in 4 minutes)
('44444444-4444-4444-4444-444444444401', '33333333-3333-3333-3333-333333333301', '22222222-2222-2222-2222-222222222203', 1, 120.00, 'PENDING', NOW() + INTERVAL '4 minutes', 'seed-idem-001', NOW()),

-- State 2: CONFIRMED (paid, scheduled)
('44444444-4444-4444-4444-444444444402', '33333333-3333-3333-3333-333333333304', '22222222-2222-2222-2222-222222222206', 2, 200.00, 'CONFIRMED', NOW() - INTERVAL '10 minutes', 'seed-idem-002', NOW() - INTERVAL '15 minutes'),
('44444444-4444-4444-4444-444444444403', '33333333-3333-3333-3333-333333333305', '22222222-2222-2222-2222-222222222207', 2, 1400.00, 'CONFIRMED', NOW() - INTERVAL '1 hour', 'seed-idem-003', NOW() - INTERVAL '2 hours'),
('44444444-4444-4444-4444-444444444404', '33333333-3333-3333-3333-333333333307', '22222222-2222-2222-2222-222222222208', 2, 100.00, 'CONFIRMED', NOW() - INTERVAL '30 minutes', 'seed-idem-004', NOW() - INTERVAL '40 minutes'),

-- Confirmed bookings on Ride 310 (2 seats taken, 1 seat left out of 3)
('44444444-4444-4444-4444-444444444411', '33333333-3333-3333-3333-333333333310', '22222222-2222-2222-2222-222222222203', 1, 130.00, 'CONFIRMED', NOW() - INTERVAL '5 minutes', 'seed-idem-011', NOW() - INTERVAL '10 minutes'),
('44444444-4444-4444-4444-444444444412', '33333333-3333-3333-3333-333333333310', '22222222-2222-2222-2222-222222222206', 1, 130.00, 'CONFIRMED', NOW() - INTERVAL '3 minutes', 'seed-idem-012', NOW() - INTERVAL '8 minutes'),

-- Confirmed booking on Ride 308 (1 seat taken, 2 available out of 3)
('44444444-4444-4444-4444-444444444413', '33333333-3333-3333-3333-333333333308', '22222222-2222-2222-2222-222222222209', 1, 110.00, 'CONFIRMED', NOW() - INTERVAL '15 minutes', 'seed-idem-013', NOW() - INTERVAL '20 minutes'),

-- Confirmed booking on Ride 312 (1 seat taken, 2 available out of 3)
('44444444-4444-4444-4444-444444444414', '33333333-3333-3333-3333-333333333312', '22222222-2222-2222-2222-222222222204', 1, 60.00, 'CONFIRMED', NOW() - INTERVAL '10 minutes', 'seed-idem-014', NOW() - INTERVAL '15 minutes'),

-- State 3: COMPLETED (past ride completed, rated)
('44444444-4444-4444-4444-444444444405', '33333333-3333-3333-3333-333333333316', '22222222-2222-2222-2222-222222222202', 2, 240.00, 'COMPLETED', NOW() - INTERVAL '2 days', 'seed-idem-005', NOW() - INTERVAL '3 days'),
('44444444-4444-4444-4444-444444444406', '33333333-3333-3333-3333-333333333317', '22222222-2222-2222-2222-222222222205', 1, 650.00, 'COMPLETED', NOW() - INTERVAL '3 days', 'seed-idem-006', NOW() - INTERVAL '4 days'),
('44444444-4444-4444-4444-444444444407', '33333333-3333-3333-3333-333333333318', '22222222-2222-2222-2222-222222222207', 1, 100.00, 'COMPLETED', NOW() - INTERVAL '1 day', 'seed-idem-007', NOW() - INTERVAL '2 days'),

-- State 4: CANCELLED_BY_RIDER (with refund processed)
('44444444-4444-4444-4444-444444444408', '33333333-3333-3333-3333-333333333303', '22222222-2222-2222-2222-222222222206', 1, 850.00, 'CANCELLED_BY_RIDER', NOW() - INTERVAL '2 hours', 'seed-idem-008', NOW() - INTERVAL '4 hours'),

-- State 5: CANCELLED_BY_DRIVER (driver cancelled, full refund)
('44444444-4444-4444-4444-444444444409', '33333333-3333-3333-3333-333333333319', '22222222-2222-2222-2222-222222222208', 1, 850.00, 'CANCELLED_BY_DRIVER', NOW() - INTERVAL '1 day', 'seed-idem-009', NOW() - INTERVAL '2 days'),

-- State 6: EXPIRED (hold was never paid within 5 min — seat returned, ride 306 shows 4 available)
('44444444-4444-4444-4444-444444444410', '33333333-3333-3333-3333-333333333306', '22222222-2222-2222-2222-222222222209', 1, 800.00, 'EXPIRED', NOW() - INTERVAL '10 minutes', 'seed-idem-010', NOW() - INTERVAL '20 minutes');

-- ============================================================================
-- 5. PAYMENTS (Append-only ledger: CHARGE and REFUND records)
-- ============================================================================
INSERT INTO payments (id, booking_id, amount, type, idempotency_key, reason, created_at) VALUES
-- Charges for confirmed and completed rides
('55555555-5555-5555-5555-555555555501', '44444444-4444-4444-4444-444444444402', 200.00, 'CHARGE', 'pay-idem-001', 'Payment for 2 seats', NOW() - INTERVAL '15 minutes'),
('55555555-5555-5555-5555-555555555502', '44444444-4444-4444-4444-444444444403', 1400.00, 'CHARGE', 'pay-idem-002', 'Payment for 2 seats', NOW() - INTERVAL '2 hours'),
('55555555-5555-5555-5555-555555555503', '44444444-4444-4444-4444-444444444404', 100.00, 'CHARGE', 'pay-idem-003', 'Payment for 2 seats', NOW() - INTERVAL '40 minutes'),
('55555555-5555-5555-5555-555555555504', '44444444-4444-4444-4444-444444444405', 240.00, 'CHARGE', 'pay-idem-004', 'Payment for 2 seats', NOW() - INTERVAL '3 days'),
('55555555-5555-5555-5555-555555555505', '44444444-4444-4444-4444-444444444406', 650.00, 'CHARGE', 'pay-idem-005', 'Payment for 1 seat', NOW() - INTERVAL '4 days'),
('55555555-5555-5555-5555-555555555506', '44444444-4444-4444-4444-444444444407', 100.00, 'CHARGE', 'pay-idem-006', 'Payment for 1 seat', NOW() - INTERVAL '2 days'),

-- Charges for new confirmed bookings (rides 310, 308, 312)
('55555555-5555-5555-5555-555555555511', '44444444-4444-4444-4444-444444444411', 130.00, 'CHARGE', 'pay-idem-011', 'Payment for 1 seat', NOW() - INTERVAL '10 minutes'),
('55555555-5555-5555-5555-555555555512', '44444444-4444-4444-4444-444444444412', 130.00, 'CHARGE', 'pay-idem-012', 'Payment for 1 seat', NOW() - INTERVAL '8 minutes'),
('55555555-5555-5555-5555-555555555513', '44444444-4444-4444-4444-444444444413', 110.00, 'CHARGE', 'pay-idem-013', 'Payment for 1 seat', NOW() - INTERVAL '20 minutes'),
('55555555-5555-5555-5555-555555555514', '44444444-4444-4444-4444-444444444414', 60.00, 'CHARGE', 'pay-idem-014', 'Payment for 1 seat', NOW() - INTERVAL '15 minutes'),

-- Cancellation Refunds
-- Rider cancelled >24h before: 100% refund
('55555555-5555-5555-5555-555555555507', '44444444-4444-4444-4444-444444444408', 850.00, 'CHARGE', 'pay-idem-007', 'Original seat charge', NOW() - INTERVAL '4 hours'),
('55555555-5555-5555-5555-555555555508', '44444444-4444-4444-4444-444444444408', 850.00, 'REFUND', 'refund-idem-001', 'Rider cancellation refund (100%)', NOW() - INTERVAL '2 hours'),

-- Driver cancelled: 100% refund
('55555555-5555-5555-5555-555555555509', '44444444-4444-4444-4444-444444444409', 850.00, 'CHARGE', 'pay-idem-008', 'Original seat charge', NOW() - INTERVAL '2 days'),
('55555555-5555-5555-5555-555555555510', '44444444-4444-4444-4444-444444444409', 850.00, 'REFUND', 'refund-idem-002', 'Driver cancelled ride (100% refund)', NOW() - INTERVAL '1 day');

-- ============================================================================
-- 6. RATINGS (Riders rating drivers on completed bookings)
-- ============================================================================
INSERT INTO ratings (id, booking_id, rider_id, driver_id, score, comment, created_at) VALUES
('66666666-6666-6666-6666-666666666601', '44444444-4444-4444-4444-444444444405', '22222222-2222-2222-2222-222222222202', '22222222-2222-2222-2222-222222222201', 5, 'Smooth driving and reached Katpadi right on time!', NOW() - INTERVAL '2 days'),
('66666666-6666-6666-6666-666666666602', '44444444-4444-4444-4444-444444444406', '22222222-2222-2222-2222-222222222205', '22222222-2222-2222-2222-222222222202', 5, 'Great cab sharing experience to Chennai Airport. Very polite.', NOW() - INTERVAL '3 days'),
('66666666-6666-6666-6666-666666666603', '44444444-4444-4444-4444-444444444407', '22222222-2222-2222-2222-222222222207', '22222222-2222-2222-2222-222222222203', 4, 'Good ride, slightly delayed at Katpadi traffic but overall fine.', NOW() - INTERVAL '1 day');

-- ============================================================================
-- 7. AUDIT LOG (Sample audit records for state transitions)
-- ============================================================================
INSERT INTO audit_log (entity_type, entity_id, action, old_state, new_state, created_at) VALUES
('BOOKING', '44444444-4444-4444-4444-444444444402', 'STATUS_CHANGE', '{"status": "PENDING"}'::jsonb, '{"status": "CONFIRMED"}'::jsonb, NOW() - INTERVAL '15 minutes'),
('BOOKING', '44444444-4444-4444-4444-444444444405', 'STATUS_CHANGE', '{"status": "CONFIRMED"}'::jsonb, '{"status": "COMPLETED"}'::jsonb, NOW() - INTERVAL '2 days'),
('BOOKING', '44444444-4444-4444-4444-444444444408', 'STATUS_CHANGE', '{"status": "CONFIRMED"}'::jsonb, '{"status": "CANCELLED_BY_RIDER"}'::jsonb, NOW() - INTERVAL '2 hours'),
('BOOKING', '44444444-4444-4444-4444-444444444409', 'STATUS_CHANGE', '{"status": "CONFIRMED"}'::jsonb, '{"status": "CANCELLED_BY_DRIVER"}'::jsonb, NOW() - INTERVAL '1 day'),
('BOOKING', '44444444-4444-4444-4444-444444444410', 'STATUS_CHANGE', '{"status": "PENDING"}'::jsonb, '{"status": "EXPIRED"}'::jsonb, NOW() - INTERVAL '10 minutes');

COMMIT;
