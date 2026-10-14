-- 001_init_schema.sql
-- Campus Ride-Pooling Database Schema
-- Focus: 3NF Relational Integrity, Strong Constraints, Indexing

-- Enable pgcrypto for UUID generation if needed (gen_random_uuid is standard in PG 13+)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- ENUM TYPES
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ride_status') THEN
        CREATE TYPE ride_status AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'booking_status') THEN
        CREATE TYPE booking_status AS ENUM (
            'PENDING',
            'CONFIRMED',
            'COMPLETED',
            'CANCELLED_BY_RIDER',
            'CANCELLED_BY_DRIVER',
            'EXPIRED'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_type') THEN
        CREATE TYPE payment_type AS ENUM ('CHARGE', 'REFUND');
    END IF;
END $$;

-- ============================================================================
-- TABLES
-- ============================================================================

-- 1. USERS
-- Any user can post rides (driver) or book rides (rider)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
    -- Denormalized cache of driver ratings for fast ranking in search queries
    rating_avg NUMERIC(3, 2) NOT NULL DEFAULT 5.00 CHECK (rating_avg >= 1.00 AND rating_avg <= 5.00),
    rating_count INTEGER NOT NULL DEFAULT 0 CHECK (rating_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. STOPS
-- Official pick-up and drop-off hubs
CREATE TABLE IF NOT EXISTS stops (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    landmark VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. RIDES
-- Posted by drivers, with real-time seat availability
CREATE TABLE IF NOT EXISTS rides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    origin_stop_id INTEGER NOT NULL REFERENCES stops(id) ON DELETE RESTRICT,
    destination_stop_id INTEGER NOT NULL REFERENCES stops(id) ON DELETE RESTRICT,
    departure_time TIMESTAMPTZ NOT NULL,
    total_seats INTEGER NOT NULL CHECK (total_seats > 0),
    -- seats_available is denormalized and locked with SELECT FOR UPDATE for concurrency
    seats_available INTEGER NOT NULL,
    price_per_seat NUMERIC(10, 2) NOT NULL CHECK (price_per_seat >= 0),
    status ride_status NOT NULL DEFAULT 'SCHEDULED',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_seats_range CHECK (seats_available >= 0 AND seats_available <= total_seats),
    CONSTRAINT chk_distinct_stops CHECK (origin_stop_id <> destination_stop_id)
);

-- 4. BOOKINGS
-- Riders booking seats on rides
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ride_id UUID NOT NULL REFERENCES rides(id) ON DELETE RESTRICT,
    rider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seats_booked INTEGER NOT NULL DEFAULT 1 CHECK (seats_booked > 0),
    total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
    status booking_status NOT NULL DEFAULT 'PENDING',
    hold_expires_at TIMESTAMPTZ NOT NULL,
    idempotency_key VARCHAR(128) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. PAYMENTS (Append-only ledger, never update balances)
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
    type payment_type NOT NULL,
    idempotency_key VARCHAR(128) UNIQUE,
    reason VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. RATINGS (Rider rates driver after ride completion)
CREATE TABLE IF NOT EXISTS ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    rider_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_rider_is_not_driver CHECK (rider_id <> driver_id)
);

-- 7. AUDIT LOG (Immutable audit trail for critical entity changes)
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    old_state JSONB,
    new_state JSONB,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Partial Unique Index: Exactly one active booking (PENDING or CONFIRMED) per rider per ride
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_rider_ride 
ON bookings (ride_id, rider_id) 
WHERE status IN ('PENDING', 'CONFIRMED');

-- Composite Search Index: Optimized for origin, destination, and departure time lookups
CREATE INDEX IF NOT EXISTS idx_rides_search_composite 
ON rides (origin_stop_id, destination_stop_id, departure_time) 
WHERE status = 'SCHEDULED';

-- Additional performance indexes on foreign keys
CREATE INDEX IF NOT EXISTS idx_rides_driver_id ON rides (driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_rider_id ON bookings (rider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_ride_id ON bookings (ride_id);
CREATE INDEX IF NOT EXISTS idx_bookings_hold_expiry ON bookings (hold_expires_at) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_ratings_driver_id ON ratings (driver_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log (entity_type, entity_id);
