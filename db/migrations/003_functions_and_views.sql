-- 003_functions_and_views.sql
-- Core business logic functions with strict transaction safety, row locking, and views

-- ============================================================================
-- 1. FUNCTION: book_seat
-- Row lock on rides -> validation -> insert booking -> decrement seats
-- ============================================================================
CREATE OR REPLACE FUNCTION book_seat(
    p_ride_id UUID,
    p_rider_id UUID,
    p_seats_booked INTEGER DEFAULT 1,
    p_idempotency_key VARCHAR(128) DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_ride rides%ROWTYPE;
    v_existing_booking bookings%ROWTYPE;
    v_new_booking bookings%ROWTYPE;
    v_total_price NUMERIC(10, 2);
BEGIN
    -- Input validation
    IF p_seats_booked <= 0 THEN
        RAISE EXCEPTION 'Seats booked must be greater than 0' USING ERRCODE = '22003';
    END IF;

    -- Check Idempotency key if provided
    IF p_idempotency_key IS NOT NULL AND length(trim(p_idempotency_key)) > 0 THEN
        SELECT * INTO v_existing_booking
        FROM bookings
        WHERE idempotency_key = p_idempotency_key;

        IF FOUND THEN
            RETURN jsonb_build_object(
                'success', true,
                'idempotent_replay', true,
                'booking_id', v_existing_booking.id,
                'ride_id', v_existing_booking.ride_id,
                'rider_id', v_existing_booking.rider_id,
                'seats_booked', v_existing_booking.seats_booked,
                'total_price', v_existing_booking.total_price,
                'status', v_existing_booking.status,
                'hold_expires_at', v_existing_booking.hold_expires_at
            );
        END IF;
    END IF;

    -- STRICT ROW LOCK: Lock the target ride row for update
    -- Guarantees serialization of concurrent booking requests on this ride
    SELECT * INTO v_ride
    FROM rides
    WHERE id = p_ride_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ride not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_ride.status <> 'SCHEDULED' THEN
        RAISE EXCEPTION 'Ride is no longer available for booking (status: %)', v_ride.status USING ERRCODE = '22000';
    END IF;

    IF v_ride.departure_time <= NOW() THEN
        RAISE EXCEPTION 'Ride has already departed' USING ERRCODE = '22000';
    END IF;

    IF v_ride.driver_id = p_rider_id THEN
        RAISE EXCEPTION 'Drivers cannot book seats on their own ride' USING ERRCODE = '22000';
    END IF;

    -- Seat availability check
    IF v_ride.seats_available < p_seats_booked THEN
        RAISE EXCEPTION 'Not enough seats available: requested %, available %', p_seats_booked, v_ride.seats_available
            USING ERRCODE = '55P03';
    END IF;

    -- Check if rider already has an active booking on this ride
    PERFORM 1 FROM bookings
    WHERE ride_id = p_ride_id 
      AND rider_id = p_rider_id 
      AND status IN ('PENDING', 'CONFIRMED');

    IF FOUND THEN
        RAISE EXCEPTION 'You already have an active booking on this ride' USING ERRCODE = '23505';
    END IF;

    -- Calculate total price
    v_total_price := v_ride.price_per_seat * p_seats_booked;

    -- Insert new booking in PENDING state with 5 minute hold expiry
    INSERT INTO bookings (
        ride_id,
        rider_id,
        seats_booked,
        total_price,
        status,
        hold_expires_at,
        idempotency_key,
        created_at,
        updated_at
    )
    VALUES (
        p_ride_id,
        p_rider_id,
        p_seats_booked,
        v_total_price,
        'PENDING',
        NOW() + INTERVAL '5 minutes',
        p_idempotency_key,
        NOW(),
        NOW()
    )
    RETURNING * INTO v_new_booking;

    -- Decrement seats_available on the ride
    UPDATE rides
    SET seats_available = seats_available - p_seats_booked,
        updated_at = NOW()
    WHERE id = p_ride_id;

    RETURN jsonb_build_object(
        'success', true,
        'idempotent_replay', false,
        'booking_id', v_new_booking.id,
        'ride_id', v_new_booking.ride_id,
        'rider_id', v_new_booking.rider_id,
        'seats_booked', v_new_booking.seats_booked,
        'total_price', v_new_booking.total_price,
        'status', v_new_booking.status,
        'hold_expires_at', v_new_booking.hold_expires_at
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. FUNCTION: cancel_booking
-- Concurrency lock order: Ride first, then Booking.
-- Tiered refund: >24h = 100%, 2-24h = 50%, <2h = 0%
-- ============================================================================
CREATE OR REPLACE FUNCTION cancel_booking(
    p_booking_id UUID,
    p_rider_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_booking bookings%ROWTYPE;
    v_ride rides%ROWTYPE;
    v_hours_until_departure NUMERIC;
    v_refund_percent INTEGER := 0;
    v_refund_amount NUMERIC(10, 2) := 0.00;
BEGIN
    -- Lookup booking to get ride_id
    SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Booking not found' USING ERRCODE = 'P0002';
    END IF;

    -- Ownership check
    IF v_booking.rider_id <> p_rider_id THEN
        RAISE EXCEPTION 'Unauthorized: Booking belongs to another user' USING ERRCODE = '42501';
    END IF;

    -- Check status
    IF v_booking.status NOT IN ('PENDING', 'CONFIRMED') THEN
        RAISE EXCEPTION 'Cannot cancel booking in % state', v_booking.status USING ERRCODE = '22000';
    END IF;

    -- LOCK ORDER: Rides first, then Bookings
    SELECT * INTO v_ride
    FROM rides
    WHERE id = v_booking.ride_id
    FOR UPDATE;

    SELECT * INTO v_booking
    FROM bookings
    WHERE id = p_booking_id
    FOR UPDATE;

    -- Calculate refund if booking was CONFIRMED
    IF v_booking.status = 'CONFIRMED' THEN
        v_hours_until_departure := EXTRACT(EPOCH FROM (v_ride.departure_time - NOW())) / 3600.0;

        IF v_hours_until_departure > 24.0 THEN
            v_refund_percent := 100;
        ELSIF v_hours_until_departure >= 2.0 THEN
            v_refund_percent := 50;
        ELSE
            v_refund_percent := 0;
        END IF;

        v_refund_amount := ROUND((v_booking.total_price * (v_refund_percent / 100.0)), 2);

        -- Ledger entry for refund
        IF v_refund_amount > 0 THEN
            INSERT INTO payments (
                booking_id,
                amount,
                type,
                reason,
                created_at
            )
            VALUES (
                v_booking.id,
                v_refund_amount,
                'REFUND',
                format('Rider cancellation refund (%s%%)', v_refund_percent),
                NOW()
            );
        END IF;
    END IF;

    -- Update booking status
    UPDATE bookings
    SET status = 'CANCELLED_BY_RIDER',
        updated_at = NOW()
    WHERE id = p_booking_id;

    -- Return seats to the ride
    UPDATE rides
    SET seats_available = seats_available + v_booking.seats_booked,
        updated_at = NOW()
    WHERE id = v_booking.ride_id;

    RETURN jsonb_build_object(
        'success', true,
        'booking_id', p_booking_id,
        'status', 'CANCELLED_BY_RIDER',
        'refund_percent', v_refund_percent,
        'refund_amount', v_refund_amount
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. FUNCTION: cancel_ride
-- Driver cancels ride: in ONE transaction, cancel ride and refund 100% to all active bookings
-- ============================================================================
CREATE OR REPLACE FUNCTION cancel_ride(
    p_ride_id UUID,
    p_driver_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_ride rides%ROWTYPE;
    v_b RECORD;
    v_cancelled_count INTEGER := 0;
    v_refunded_total NUMERIC(10, 2) := 0.00;
BEGIN
    -- LOCK Ride
    SELECT * INTO v_ride
    FROM rides
    WHERE id = p_ride_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ride not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_ride.driver_id <> p_driver_id THEN
        RAISE EXCEPTION 'Unauthorized: Only the ride driver can cancel the ride' USING ERRCODE = '42501';
    END IF;

    IF v_ride.status <> 'SCHEDULED' THEN
        RAISE EXCEPTION 'Cannot cancel ride in % status', v_ride.status USING ERRCODE = '22000';
    END IF;

    -- Update ride status
    UPDATE rides
    SET status = 'CANCELLED',
        updated_at = NOW()
    WHERE id = p_ride_id;

    -- Iterate over all active bookings on this ride
    FOR v_b IN
        SELECT * FROM bookings
        WHERE ride_id = p_ride_id AND status IN ('PENDING', 'CONFIRMED')
        FOR UPDATE
    LOOP
        -- If CONFIRMED, issue 100% refund ledger entry
        IF v_b.status = 'CONFIRMED' THEN
            INSERT INTO payments (
                booking_id,
                amount,
                type,
                reason,
                created_at
            )
            VALUES (
                v_b.id,
                v_b.total_price,
                'REFUND',
                'Driver cancelled ride (100% refund)',
                NOW()
            );
            v_refunded_total := v_refunded_total + v_b.total_price;
        END IF;

        -- Update booking status to CANCELLED_BY_DRIVER
        UPDATE bookings
        SET status = 'CANCELLED_BY_DRIVER',
            updated_at = NOW()
        WHERE id = v_b.id;

        v_cancelled_count := v_cancelled_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'ride_id', p_ride_id,
        'status', 'CANCELLED',
        'cancelled_bookings_count', v_cancelled_count,
        'total_refunded', v_refunded_total
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. FUNCTION: complete_ride
-- Driver marks ride completed -> all CONFIRMED bookings marked COMPLETED
-- ============================================================================
CREATE OR REPLACE FUNCTION complete_ride(
    p_ride_id UUID,
    p_driver_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_ride rides%ROWTYPE;
    v_completed_count INTEGER := 0;
BEGIN
    -- LOCK Ride
    SELECT * INTO v_ride
    FROM rides
    WHERE id = p_ride_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ride not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_ride.driver_id <> p_driver_id THEN
        RAISE EXCEPTION 'Unauthorized: Only the ride driver can mark the ride completed' USING ERRCODE = '42501';
    END IF;

    IF v_ride.status <> 'SCHEDULED' THEN
        RAISE EXCEPTION 'Cannot complete ride in % status', v_ride.status USING ERRCODE = '22000';
    END IF;

    -- Mark ride as COMPLETED
    UPDATE rides
    SET status = 'COMPLETED',
        updated_at = NOW()
    WHERE id = p_ride_id;

    -- Update all CONFIRMED bookings to COMPLETED
    WITH updated_bookings AS (
        UPDATE bookings
        SET status = 'COMPLETED',
            updated_at = NOW()
        WHERE ride_id = p_ride_id AND status = 'CONFIRMED'
        RETURNING id
    )
    SELECT COUNT(*) INTO v_completed_count FROM updated_bookings;

    RETURN jsonb_build_object(
        'success', true,
        'ride_id', p_ride_id,
        'status', 'COMPLETED',
        'completed_bookings_count', v_completed_count
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 5. FUNCTION: expire_holds
-- Periodic background job: releases holds on PENDING bookings past hold_expires_at
-- ============================================================================
CREATE OR REPLACE FUNCTION expire_holds()
RETURNS JSONB AS $$
DECLARE
    v_expired_count INTEGER := 0;
    v_ride RECORD;
    v_b RECORD;
BEGIN
    -- CONSISTENT LOCK ORDER: Ride first, then Booking
    -- Group expired bookings by ride_id to lock rides in order
    FOR v_ride IN
        SELECT DISTINCT b.ride_id
        FROM bookings b
        WHERE b.status = 'PENDING' AND b.hold_expires_at < NOW()
        ORDER BY b.ride_id
    LOOP
        -- Lock the ride FIRST (consistent with cancel_booking)
        PERFORM 1 FROM rides WHERE id = v_ride.ride_id FOR UPDATE;

        -- Then lock and process each expired booking on this ride
        FOR v_b IN
            SELECT b.id AS booking_id, b.seats_booked
            FROM bookings b
            WHERE b.ride_id = v_ride.ride_id
              AND b.status = 'PENDING'
              AND b.hold_expires_at < NOW()
            ORDER BY b.id
            FOR UPDATE OF b
        LOOP
            -- Mark booking as EXPIRED
            UPDATE bookings
            SET status = 'EXPIRED',
                updated_at = NOW()
            WHERE id = v_b.booking_id;

            -- Return seats to the ride
            UPDATE rides
            SET seats_available = seats_available + v_b.seats_booked,
                updated_at = NOW()
            WHERE id = v_ride.ride_id;

            v_expired_count := v_expired_count + 1;
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'expired_count', v_expired_count
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: v_available_rides
-- For search and browse listings
CREATE OR REPLACE VIEW v_available_rides AS
SELECT 
    r.id AS ride_id,
    r.driver_id,
    u.full_name AS driver_name,
    u.email AS driver_email,
    u.rating_avg AS driver_rating_avg,
    u.rating_count AS driver_rating_count,
    r.origin_stop_id,
    so.name AS origin_stop_name,
    so.landmark AS origin_landmark,
    r.destination_stop_id,
    sd.name AS destination_stop_name,
    sd.landmark AS destination_landmark,
    r.departure_time,
    r.total_seats,
    r.seats_available,
    r.price_per_seat,
    r.status,
    r.created_at
FROM rides r
JOIN users u ON r.driver_id = u.id
JOIN stops so ON r.origin_stop_id = so.id
JOIN stops sd ON r.destination_stop_id = sd.id
WHERE r.status = 'SCHEDULED' 
  AND r.departure_time > NOW() 
  AND r.seats_available > 0;

-- View: v_rider_history
-- For riders viewing their rides, tickets, and payment history
CREATE OR REPLACE VIEW v_rider_history AS
SELECT 
    b.id AS booking_id,
    b.rider_id,
    b.ride_id,
    b.seats_booked,
    b.total_price,
    b.status AS booking_status,
    b.hold_expires_at,
    b.created_at AS booked_at,
    b.updated_at AS booking_updated_at,
    r.departure_time,
    r.status AS ride_status,
    r.price_per_seat,
    r.driver_id,
    u_driver.full_name AS driver_name,
    u_driver.rating_avg AS driver_rating_avg,
    so.name AS origin_stop_name,
    sd.name AS destination_stop_name,
    rt.id AS rating_id,
    rt.score AS rating_score,
    rt.comment AS rating_comment,
    COALESCE((
        SELECT SUM(p.amount) 
        FROM payments p 
        WHERE p.booking_id = b.id AND p.type = 'REFUND'
    ), 0.00) AS total_refunded
FROM bookings b
JOIN rides r ON b.ride_id = r.id
JOIN users u_driver ON r.driver_id = u_driver.id
JOIN stops so ON r.origin_stop_id = so.id
JOIN stops sd ON r.destination_stop_id = sd.id
LEFT JOIN ratings rt ON rt.booking_id = b.id;
