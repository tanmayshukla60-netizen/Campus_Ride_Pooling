# Entity Relationship (ER) Diagram

## Database Architecture
The **Campus Ride-Pooling System** is modeled in strict compliance with Third Normal Form (3NF) relational principles, complemented by deliberate, performance-engineered denormalization for concurrency locking and search ranking.

```mermaid
erDiagram
    USERS ||--o{ RIDES : "posts as driver"
    USERS ||--o{ BOOKINGS : "books as rider"
    USERS ||--o{ RATINGS : "rates as rider"
    USERS ||--o{ RATINGS : "rated as driver"
    USERS ||--o{ AUDIT_LOG : "changed by"
    
    STOPS ||--o{ RIDES : "origin hub"
    STOPS ||--o{ RIDES : "destination hub"
    
    RIDES ||--o{ BOOKINGS : "contains seats"
    
    BOOKINGS ||--o| PAYMENTS : "generates charges & refunds"
    BOOKINGS ||--o| RATINGS : "produces review"
    BOOKINGS ||--o{ AUDIT_LOG : "tracked by"

    USERS {
        uuid id PK "DEFAULT gen_random_uuid()"
        varchar full_name "NOT NULL"
        varchar email "UNIQUE, NOT NULL, domain checked"
        varchar password_hash "NOT NULL, bcrypt 10 rounds"
        varchar role "CHECK in ('USER', 'ADMIN')"
        numeric rating_avg "DEFAULT 5.00, cached driver avg"
        integer rating_count "DEFAULT 0, total driver ratings"
        timestamptz created_at "DEFAULT NOW()"
    }

    STOPS {
        serial id PK
        varchar name "UNIQUE, NOT NULL"
        varchar landmark "Nullable hub reference"
        timestamptz created_at "DEFAULT NOW()"
    }

    RIDES {
        uuid id PK "DEFAULT gen_random_uuid()"
        uuid driver_id FK "REFERENCES users(id) ON DELETE CASCADE"
        integer origin_stop_id FK "REFERENCES stops(id) ON DELETE RESTRICT"
        integer destination_stop_id FK "REFERENCES stops(id) ON DELETE RESTRICT"
        timestamptz departure_time "NOT NULL, future date"
        integer total_seats "CHECK > 0"
        integer seats_available "CHECK >= 0 AND <= total_seats"
        numeric price_per_seat "CHECK >= 0"
        ride_status status "ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED')"
        timestamptz created_at "DEFAULT NOW()"
        timestamptz updated_at "DEFAULT NOW()"
    }

    BOOKINGS {
        uuid id PK "DEFAULT gen_random_uuid()"
        uuid ride_id FK "REFERENCES rides(id) ON DELETE RESTRICT"
        uuid rider_id FK "REFERENCES users(id) ON DELETE CASCADE"
        integer seats_booked "CHECK > 0, DEFAULT 1"
        numeric total_price "CHECK >= 0"
        booking_status status "ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED_BY_RIDER', 'CANCELLED_BY_DRIVER', 'EXPIRED')"
        timestamptz hold_expires_at "NOT NULL, NOW() + 5 min"
        varchar idempotency_key "UNIQUE, NULLABLE"
        timestamptz created_at "DEFAULT NOW()"
        timestamptz updated_at "DEFAULT NOW()"
    }

    PAYMENTS {
        uuid id PK "DEFAULT gen_random_uuid()"
        uuid booking_id FK "REFERENCES bookings(id) ON DELETE RESTRICT"
        numeric amount "CHECK > 0"
        payment_type type "ENUM ('CHARGE', 'REFUND')"
        varchar idempotency_key "UNIQUE, NULLABLE"
        varchar reason "Audit note (e.g. 100% refund, late 50%)"
        timestamptz created_at "DEFAULT NOW()"
    }

    RATINGS {
        uuid id PK "DEFAULT gen_random_uuid()"
        uuid booking_id FK "UNIQUE, REFERENCES bookings(id) ON DELETE CASCADE"
        uuid rider_id FK "REFERENCES users(id) ON DELETE CASCADE"
        uuid driver_id FK "REFERENCES users(id) ON DELETE CASCADE"
        integer score "CHECK score BETWEEN 1 AND 5"
        text comment "Nullable feedback"
        timestamptz created_at "DEFAULT NOW()"
    }

    AUDIT_LOG {
        bigserial id PK
        varchar entity_type "NOT NULL (e.g. 'BOOKING')"
        uuid entity_id "NOT NULL"
        varchar action "NOT NULL (e.g. 'STATUS_CHANGE')"
        jsonb old_state "Historical tuple state"
        jsonb new_state "New committed tuple state"
        uuid changed_by FK "REFERENCES users(id) ON DELETE SET NULL"
        timestamptz created_at "DEFAULT NOW()"
    }
```

---

## Relational Constraints & Integrity Rules
1. **Primary & Foreign Keys**:
   - `rides.origin_stop_id` and `rides.destination_stop_id` have `ON DELETE RESTRICT` preventing orphan rides.
   - `rides.driver_id` and `bookings.rider_id` reference `users(id)` with cascading deletion for clean user lifecycle management.
2. **Business Rule Check Constraints**:
   - `rides`: `CHECK (seats_available >= 0 AND seats_available <= total_seats)` prevents negative seat balances at the database engine level.
   - `rides`: `CHECK (origin_stop_id <> destination_stop_id)` prevents circular trips.
   - `ratings`: `CHECK (rider_id <> driver_id)` prevents drivers from rating themselves.
   - `ratings`: `CHECK (score BETWEEN 1 AND 5)`.
3. **Partial Unique Index**:
   - `uq_active_rider_ride ON bookings (ride_id, rider_id) WHERE status IN ('PENDING', 'CONFIRMED')`
   - Guarantees at the storage engine level that a rider can hold or confirm at most one active seat on a given ride, while allowing historical cancelled/completed bookings.
