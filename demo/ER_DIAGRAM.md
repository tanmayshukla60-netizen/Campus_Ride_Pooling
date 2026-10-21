# Campus Ride-Pooling System: Entity-Relationship (ER) Diagram

This ER diagram and schema reference document the real database schema implemented in PostgreSQL for the **Campus Ride-Pooling System**.

---

## 1. Relational ER Diagram (Mermaid)

```mermaid
erDiagram
    USERS ||--o{ RIDES : "posts as driver (1:N)"
    USERS ||--o{ BOOKINGS : "reserves as rider (1:N)"
    USERS ||--o{ RATINGS : "gives review as rider (1:N)"
    USERS ||--o{ RATINGS : "receives review as driver (1:N)"
    USERS ||--o{ AUDIT_LOG : "triggers status changes (1:N)"

    STOPS ||--o{ RIDES : "serves as origin hub (1:N)"
    STOPS ||--o{ RIDES : "serves as destination hub (1:N)"

    RIDES ||--o{ BOOKINGS : "allocates seats to (1:N)"

    BOOKINGS ||--o{ PAYMENTS : "generates charges & refunds (1:N)"
    BOOKINGS ||--o| RATINGS : "yields completion rating (1:1)"
    BOOKINGS ||--o{ AUDIT_LOG : "state transitions recorded (1:N)"

    USERS {
        uuid id PK "gen_random_uuid()"
        varchar full_name "NOT NULL"
        varchar email "UNIQUE, NOT NULL, domain check"
        varchar password_hash "NOT NULL, bcrypt(10)"
        varchar role "DEFAULT 'USER' CHECK IN ('USER', 'ADMIN')"
        numeric rating_avg "DEFAULT 5.00 CHECK (1.00..5.00)"
        integer rating_count "DEFAULT 0 CHECK >= 0"
        timestamptz created_at "DEFAULT NOW()"
    }

    STOPS {
        serial id PK "Auto-incrementing ID"
        varchar name "UNIQUE, NOT NULL (e.g. Main Gate)"
        varchar landmark "Landmark description"
        timestamptz created_at "DEFAULT NOW()"
    }

    RIDES {
        uuid id PK "gen_random_uuid()"
        uuid driver_id FK "REFERENCES users(id) ON DELETE CASCADE"
        integer origin_stop_id FK "REFERENCES stops(id) ON DELETE RESTRICT"
        integer destination_stop_id FK "REFERENCES stops(id) ON DELETE RESTRICT"
        timestamptz departure_time "NOT NULL"
        integer total_seats "NOT NULL CHECK > 0"
        integer seats_available "CHECK >= 0 AND <= total_seats"
        numeric price_per_seat "CHECK >= 0"
        ride_status status "ENUM: SCHEDULED, COMPLETED, CANCELLED"
        timestamptz created_at "DEFAULT NOW()"
        timestamptz updated_at "DEFAULT NOW()"
    }

    BOOKINGS {
        uuid id PK "gen_random_uuid()"
        uuid ride_id FK "REFERENCES rides(id) ON DELETE RESTRICT"
        uuid rider_id FK "REFERENCES users(id) ON DELETE CASCADE"
        integer seats_booked "NOT NULL DEFAULT 1 CHECK > 0"
        numeric total_price "NOT NULL CHECK >= 0"
        booking_status status "ENUM: PENDING, CONFIRMED, COMPLETED, CANCELLED_BY_*, EXPIRED"
        timestamptz hold_expires_at "NOT NULL, NOW() + 5 min"
        varchar idempotency_key "UNIQUE, NULLABLE"
        timestamptz created_at "DEFAULT NOW()"
        timestamptz updated_at "DEFAULT NOW()"
    }

    PAYMENTS {
        uuid id PK "gen_random_uuid()"
        uuid booking_id FK "REFERENCES bookings(id) ON DELETE RESTRICT"
        numeric amount "NOT NULL CHECK > 0"
        payment_type type "ENUM: CHARGE, REFUND"
        varchar idempotency_key "UNIQUE, NULLABLE"
        varchar reason "Audit reason (e.g. 100% cancellation refund)"
        timestamptz created_at "DEFAULT NOW()"
    }

    RATINGS {
        uuid id PK "gen_random_uuid()"
        uuid booking_id FK "UNIQUE, REFERENCES bookings(id) ON DELETE CASCADE"
        uuid rider_id FK "REFERENCES users(id) ON DELETE CASCADE"
        uuid driver_id FK "REFERENCES users(id) ON DELETE CASCADE"
        integer score "NOT NULL CHECK (score >= 1 AND score <= 5)"
        text comment "Feedback comment"
        timestamptz created_at "DEFAULT NOW()"
    }

    AUDIT_LOG {
        bigserial id PK "Auto-incrementing ID"
        varchar entity_type "NOT NULL (e.g. 'BOOKING')"
        uuid entity_id "NOT NULL (Target UUID)"
        varchar action "NOT NULL (e.g. 'STATUS_CHANGE')"
        jsonb old_state "Previous tuple state as JSONB"
        new_state jsonb "New tuple state as JSONB"
        uuid changed_by FK "REFERENCES users(id) ON DELETE SET NULL"
        timestamptz created_at "DEFAULT NOW()"
    }
```

---

## 2. Table Catalog & Relational Integrity

| Table | Primary Key | Foreign Keys | Business Rule / Integrity Constraint |
|---|---|---|---|
| **`users`** | `id` (UUID) | None | `CHECK (rating_avg BETWEEN 1.00 AND 5.00)`, `UNIQUE(email)`. |
| **`stops`** | `id` (SERIAL) | None | `UNIQUE(name)`. Pick-up & drop-off hubs on & off campus. |
| **`rides`** | `id` (UUID) | `driver_id` $\to$ `users(id)`<br>`origin_stop_id` $\to$ `stops(id)`<br>`destination_stop_id` $\to$ `stops(id)` | `CONSTRAINT chk_seats_range CHECK (seats_available >= 0 AND seats_available <= total_seats)`<br>`CONSTRAINT chk_distinct_stops CHECK (origin_stop_id <> destination_stop_id)`. |
| **`bookings`** | `id` (UUID) | `ride_id` $\to$ `rides(id)`<br>`rider_id` $\to$ `users(id)` | Partial Unique Index `uq_active_rider_ride` on `(ride_id, rider_id)` WHERE `status IN ('PENDING', 'CONFIRMED')`. Trigger `trg_booking_state_machine` blocks terminal transitions. |
| **`payments`** | `id` (UUID) | `booking_id` $\to$ `bookings(id)` | Append-only ledger pattern. `CHECK (amount > 0)`. Never overwritten or updated. |
| **`ratings`** | `id` (UUID) | `booking_id` $\to$ `bookings(id)` (1:1)<br>`rider_id` $\to$ `users(id)`<br>`driver_id` $\to$ `users(id)` | `UNIQUE(booking_id)` ensures max 1 rating per trip. `CHECK (rider_id <> driver_id)`. `CHECK (score BETWEEN 1 AND 5)`. |
| **`audit_log`**| `id` (BIGSERIAL)| `changed_by` $\to$ `users(id)` | Immutable ledger capturing `old_state` and `new_state` as PostgreSQL `JSONB`. |

---

## 3. Specialized Index Architecture

```sql
-- 1. Partial Unique Index: Exactly one active seat booking per student per ride
CREATE UNIQUE INDEX uq_active_rider_ride 
ON bookings (ride_id, rider_id) 
WHERE status IN ('PENDING', 'CONFIRMED');

-- 2. Partial Composite B-Tree Index: High-speed ride searches by origin, destination & time
CREATE INDEX idx_rides_search_composite 
ON rides (origin_stop_id, destination_stop_id, departure_time) 
WHERE status = 'SCHEDULED';

-- 3. Partial B-Tree Index: Background GC worker for expired 5-minute seat holds
CREATE INDEX idx_bookings_hold_expiry 
ON bookings (hold_expires_at) 
WHERE status = 'PENDING';
```
