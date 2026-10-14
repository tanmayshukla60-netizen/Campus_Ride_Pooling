# Transaction Handling and Concurrency Architecture

## 1. READ COMMITTED + Row Locks vs. SERIALIZABLE

In PostgreSQL, default transactions operate under the **READ COMMITTED** isolation level. While `SERIALIZABLE` isolation guarantees strict serializability by monitoring data dependencies and aborting transactions that could cause serialization anomalies (error `40001: serialization_failure`), it introduces significant retry overhead and unpredictable latency under high contention.

In our ride-pooling design, `SERIALIZABLE` is **not needed**. Instead, we achieve absolute concurrency safety under **READ COMMITTED** through pessimistic row-level locking:

```sql
SELECT * FROM rides WHERE id = p_ride_id FOR UPDATE;
```

### Why this prevents overbooking without serialization failures:
1. **Serialization of Critical Section**: When multiple concurrent requests attempt to book the same ride, the first transaction acquires an exclusive write lock on that specific `rides` tuple. Subsequent transactions queue up behind it.
2. **Read Updated Committed State**: Under PostgreSQL's `READ COMMITTED` mode, when queued transactions acquire the row lock, they do not read stale snapshot data; instead, they immediately re-fetch the latest committed version of the row.
3. **Atomic Evaluation**: The stored function `book_seat()` evaluates `v_ride.seats_available < p_seats_booked` on the freshly committed state. If remaining seats are 0, it aborts immediately with exception `55P03`, rolling back cleanly.
4. **Zero Overhead Retries**: Transactions never crash with spurious serialization conflicts; exactly $N$ seats are allocated to the first $N$ requests, and subsequent requests receive clean, instant rejection responses.

---

## 2. Global Lock Ordering Hierarchy

To prevent database deadlocks across multi-entity operations (such as ride cancellations, seat bookings, and refunds), all code paths adhere to an invariant, deterministic lock acquisition order:

$$\text{Rides} \longrightarrow \text{Bookings} \longrightarrow \text{Payments}$$

### Verification:
- **`book_seat()`**: Locks `rides` row first, then inserts into `bookings`.
- **`cancel_booking()`**: Looks up `ride_id`, locks `rides` row first, then locks `bookings` row, then inserts into `payments`.
- **`cancel_ride()`**: Locks `rides` row first, then locks active `bookings` rows in cursor order, then appends to `payments`.
- **`expire_holds()`**: Orders candidate bookings deterministically by `(ride_id, id)` and locks `rides` before updating `bookings`.

Because circular wait conditions cannot occur across concurrent sessions, deadlocks are mathematically eliminated.

---

## 3. Idempotency Key Architecture
Network retries and duplicate mobile clicks are protected by an `idempotency_key VARCHAR(128) UNIQUE` on the `bookings` table.

When `book_seat()` receives an idempotency key:
1. It queries `SELECT * FROM bookings WHERE idempotency_key = p_idempotency_key;`
2. If an existing record is found, it replays the existing booking immediately (`idempotent_replay: true`) without decrementing any additional seats.
3. If concurrent requests arrive with the identical idempotency key before the first completes, the PostgreSQL unique index enforces constraint `23505`, preventing duplicate inserts.

---

## 4. Concurrency Stress Test Results
The automated stress test (`npm run test:concurrency`) validates 50 simultaneous booking requests racing for 3 seats:
- **Total Requests**: 50
- **Successful Bookings**: 3 (HTTP 201)
- **Rejected Bookings**: 47 (HTTP 409 `SEATS_UNAVAILABLE`)
- **Final `seats_available` in DB**: Exactly 0
- **Recorded Results**: See `docs/concurrency_test_results.txt`
