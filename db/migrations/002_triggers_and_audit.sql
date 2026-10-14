-- 002_triggers_and_audit.sql
-- Database triggers for consistency, state machine enforcement, and audit trail

-- ============================================================================
-- TRIGGER A: Automatically update driver rating_avg and rating_count on rating
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_update_driver_rating()
RETURNS TRIGGER AS $$
DECLARE
    v_driver_id UUID;
    v_avg NUMERIC(3, 2);
    v_count INTEGER;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_driver_id := OLD.driver_id;
    ELSE
        v_driver_id := NEW.driver_id;
    END IF;

    SELECT 
        COALESCE(ROUND(AVG(score)::numeric, 2), 5.00),
        COUNT(*)::integer
    INTO v_avg, v_count
    FROM ratings
    WHERE driver_id = v_driver_id;

    UPDATE users
    SET rating_avg = v_avg,
        rating_count = v_count
    WHERE id = v_driver_id;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_driver_rating_sync ON ratings;
CREATE TRIGGER trg_driver_rating_sync
AFTER INSERT OR UPDATE OR DELETE ON ratings
FOR EACH ROW
EXECUTE FUNCTION trg_update_driver_rating();

-- ============================================================================
-- TRIGGER B: Record audit_log entries on booking status change
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_audit_booking_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.status IS DISTINCT FROM NEW.status) THEN
        INSERT INTO audit_log (
            entity_type,
            entity_id,
            action,
            old_state,
            new_state,
            created_at
        )
        VALUES (
            'BOOKING',
            NEW.id,
            'STATUS_CHANGE',
            jsonb_build_object(
                'status', OLD.status,
                'seats_booked', OLD.seats_booked,
                'total_price', OLD.total_price,
                'ride_id', OLD.ride_id,
                'rider_id', OLD.rider_id
            ),
            jsonb_build_object(
                'status', NEW.status,
                'seats_booked', NEW.seats_booked,
                'total_price', NEW.total_price,
                'ride_id', NEW.ride_id,
                'rider_id', NEW.rider_id
            ),
            NOW()
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_booking_audit ON bookings;
CREATE TRIGGER trg_booking_audit
AFTER UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION trg_audit_booking_status_change();

-- ============================================================================
-- TRIGGER C: Enforce valid booking state transitions (State Machine)
-- Transitions allowed:
--   PENDING -> CONFIRMED, CANCELLED_BY_RIDER, CANCELLED_BY_DRIVER, EXPIRED
--   CONFIRMED -> COMPLETED, CANCELLED_BY_RIDER, CANCELLED_BY_DRIVER
--   COMPLETED, CANCELLED_*, EXPIRED are terminal states.
-- ============================================================================
CREATE OR REPLACE FUNCTION trg_enforce_booking_state_machine()
RETURNS TRIGGER AS $$
BEGIN
    -- If status hasn't changed, allow
    IF OLD.status = NEW.status THEN
        RETURN NEW;
    END IF;

    IF OLD.status = 'PENDING' THEN
        IF NEW.status IN ('CONFIRMED', 'CANCELLED_BY_RIDER', 'CANCELLED_BY_DRIVER', 'EXPIRED') THEN
            NEW.updated_at := NOW();
            RETURN NEW;
        END IF;
    ELSIF OLD.status = 'CONFIRMED' THEN
        IF NEW.status IN ('COMPLETED', 'CANCELLED_BY_RIDER', 'CANCELLED_BY_DRIVER') THEN
            NEW.updated_at := NOW();
            RETURN NEW;
        END IF;
    END IF;

    -- If none of the legal transitions matched, reject!
    RAISE EXCEPTION 'Illegal booking state transition: cannot transition booking % from % to %',
        OLD.id, OLD.status, NEW.status
        USING ERRCODE = '22000';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_booking_state_machine ON bookings;
CREATE TRIGGER trg_booking_state_machine
BEFORE UPDATE OF status ON bookings
FOR EACH ROW
EXECUTE FUNCTION trg_enforce_booking_state_machine();
