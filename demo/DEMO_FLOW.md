# 7-Minute DBMS Presentation & Live Demo Script

**Project:** Campus Ride-Pooling Database Management System  
**Audience:** DBMS Course Professor, Panel, and Evaluators  
**Total Duration:** 7 Minutes  
**Tool Setup:** 
1. Browser open at **`http://localhost:5173`**
2. **`psql`** or **`pgAdmin Query Tool`** open connected to database **`campus_rides`** with [demo/demo.sql](file:///c:/Users/Tanmay%20Shukla/Desktop/DBMS/demo/demo.sql) loaded
3. Terminal window open at `c:\Users\Tanmay Shukla\Desktop\DBMS`

---

## Quick Reference: Demo Accounts & IDs

| Role | Email | Password | Purpose |
|---|---|---|---|
| **Driver 1** | `arun.kumar2023@vitstudent.ac.in` | `Password123!` | Posts rides, manages active rides |
| **Driver 2** | `priya.sharma2023@vitstudent.ac.in` | `Password123!` | High-rated driver with multiple routes |
| **Rider 1** | `rohit.verma2022@vitstudent.ac.in` | `Password123!` | Live search, booking, and seat hold demo |
| **Rider 2** | `vikram.aditya2022@vitstudent.ac.in` | `Password123!` | Multi-passenger and rating reviewer |
| **Admin** | `admin@vitstudent.ac.in` | `Password123!` | System ledger, audit log, and analytics |
| **Custom**| `ananyaiyer65@vitstudent.ac.in` | `Pdnmc@123` | Your personal custom driver account |
| **Stress Ride ID** | `33333333-3333-3333-3333-333333333399` | Capacity: 3 | Target of 50 concurrent requests test |

---

## 7-Minute Timeline & Step-by-Step Script

---

### Minute 0:00 – 1:00 | Introduction & Relational Architecture

#### 🗣️ What to Say:
> *"Good morning professor. Today I am presenting our **Campus Ride-Pooling Database System**, engineered specifically for high-contention university transit. In ride-sharing systems, the biggest database challenge is concurrency: preventing duplicate seat bookings, guaranteeing transaction safety, and maintaining an immutable financial audit trail.
> Our database is built on **PostgreSQL 16**, fully normalized into **Third Normal Form (3NF/BCNF)** across 7 core entities, with stored PL/pgSQL procedures, engine-level triggers, partial indexes, and an append-only financial ledger."*

#### 💻 What to Run in SQL:
Run **`Section 1: Schema Tour`** in `demo/demo.sql`:
- **1.1 Table summary:** Show all 7 base tables (`users`, `stops`, `rides`, `bookings`, `payments`, `ratings`, `audit_log`).
- **1.4 Triggers:** Show the 3 triggers (`trg_driver_rating_sync`, `trg_booking_state_machine`, `trg_booking_audit`).
- **1.6 Specialized Indexes:** Highlight the **partial unique index** (`uq_active_rider_ride`) and **partial composite search index** (`idx_rides_search_composite`).

---

### Minute 1:00 – 2:30 | Live UI Walkthrough & Real-Time Database Reflection

#### 🖱️ What to Click in Web UI (`http://localhost:5173`):
1. Click **Sign In** $\to$ Select **Rider** $\to$ Sign in as **`rohit.verma2022@vitstudent.ac.in`** (password: **`Password123!`**).
2. On the search bar, search from **Main Gate** to **Katpadi Station**.
3. Select an active ride and click **"Book Seat"**.
4. Point to the UI: *"Notice the **5-minute seat hold timer**. The seat is immediately reserved in the database in a `PENDING` state using row locking."*
5. Click **"Pay with Mock UPI"** $\to$ Success! The booking transitions to `CONFIRMED`.

#### 💻 What to Run in SQL:
Immediately run **`Section 3: Live Booking Queries`** in `demo/demo.sql`:
- **3.1 Ride seats:** Show that `seats_available` was decremented atomically.
- **3.2 Latest booking:** Show the new row with `status = 'CONFIRMED'`.
- **3.3 Audit log:** Show that PostgreSQL automatically inserted a JSONB log capturing `old_state (PENDING)` and `new_state (CONFIRMED)`.
- **3.4 Payments ledger:** Show the immutable `CHARGE` row inserted into the ledger.

---

### Minute 2:30 – 4:00 | Concurrency Stress Test & Row Locking Proof

#### 🗣️ What to Say:
> *"Now we demonstrate the most critical database challenge: **Race Conditions and Overbooking**. What happens when 50 students attempt to book the last 3 seats on a ride at the exact same millisecond?
> Rather than relying on fragile application logic, we enforce pessimistic row-level locking inside the database stored function `book_seat()` using `SELECT ... FOR UPDATE` under `READ COMMITTED` isolation."*

#### 🖱️ What to Do:
Double-click or run:
```powershell
.\demo\run_concurrency_demo.bat
```
*(or `./demo/run_concurrency_demo.sh` on bash)*

Point to the live terminal output:
- **50 concurrent HTTP requests dispatched via `Promise.all` in ~750ms**.
- **Successful Bookings:** Exactly **3** (HTTP 201).
- **Rejected Bookings:** Exactly **47** with HTTP 409 (`SEATS_UNAVAILABLE`).
- **Final DB Seats Available:** Exactly **0**.

#### 💻 What to Run in SQL:
Run **`Section 4: Concurrency Proof`** in `demo/demo.sql`:
Show the query verdict: **`ZERO OVERBOOKING: Exactly total_seats allocated under 50 concurrent requests! (PASS)`**.
Run **`Section 7.1`** (`pg_get_functiondef('book_seat...')`) and show the professor the `SELECT * FROM rides WHERE id = p_ride_id FOR UPDATE;` line!

---

### Minute 4:00 – 5:15 | Engine-Level Integrity & Constraint Violations on Purpose

#### 🗣️ What to Say:
> *"A hallmark of production database design is that data corruption must be mathematically impossible, even if an attacker bypasses the backend API. We enforce this through CHECK constraints, custom ENUMs, partial unique indexes, and state machine triggers."*

#### 💻 What to Run in SQL:
Run each block in **`Section 2: Constraint Violations on Purpose`** in `demo/demo.sql` one by one:
1. **Block 2.1 (Negative Seats):** Shows `chk_seats_range` violation.
2. **Block 2.2 (Rating = 6):** Shows `ratings_score_check` rejection.
3. **Block 2.3 (Duplicate Active Booking):** Shows partial unique index `uq_active_rider_ride` rejection.
4. **Block 2.4 (Illegal State Transition):** Shows trigger `trg_enforce_booking_state_machine` rejecting a terminal `COMPLETED` booking being forced back to `PENDING` (Error code `22000`).
5. **Block 2.5 (Negative Price):** Shows `rides_price_per_seat_check` rejection.

> *Point out to the panel: "Each test is wrapped in `BEGIN; ... ROLLBACK;` so the database rejects the illegal tuple at the engine level while keeping demo data 100% clean."*

---

### Minute 5:15 – 6:15 | Cancellation Tiered Refunds & EXPLAIN ANALYZE

#### 🗣️ What to Say:
> *"Next is our financial ledger and index query optimization."*

#### 💻 What to Run in SQL:
1. Run **`Section 5.1 & 5.2`**:
   - Show how cancelling a booking automatically calculates the tiered refund (>24h = 100%, 2-24h = 50%, <2h = 0%) and appends an immutable `REFUND` row into `payments`.
2. Run **`Section 6.3 & 6.4: EXPLAIN ANALYZE`**:
   - **With Index (`idx_rides_search_composite`):** Point to `Index Scan using idx_rides_search_composite`. Cost is **16.65**, execution time **< 0.08ms**, only 2 shared buffer hits.
   - **Without Index:** Point to `Seq Scan on rides`. Cost jumps to **43.22**, inspecting every heap row.
   - Explain that the index is partial (`WHERE status = 'SCHEDULED'`), meaning historical completed rides never bloat the B-Tree index.

---

### Minute 6:15 – 7:00 | Analytical Aggregations & Conclusion

#### 💻 What to Run in SQL:
Run **`Section 8: Analytical Queries`**:
- **8.1 Top-Rated Drivers:** Uses `JOIN`, `GROUP BY`, and a correlated subquery for passenger count.
- **8.2 Busiest Routes:** Aggregates passenger demand, total rides, and gross platform revenue per route.
- **8.3 Status Distribution:** Uses a subquery with `SUM(COUNT(*)) OVER()` window calculation to show percentages of platform volume.

#### 🗣️ Conclusion:
> *"In summary, our database architecture solves university transit challenges through:
> 1. Complete **3NF/BCNF** relational normalization.
> 2. **Pessimistic row locking** that guarantees zero overbooking under heavy race conditions without serialization retries.
> 3. **Deterministic global lock ordering** that mathematically prevents deadlocks.
> 4. **Append-only financial auditing** and engine-enforced state machine triggers.
> Thank you, and I am ready for questions."*

---

## 🚨 Contingency / "If Something Fails" Backup Plan

| Issue | Quick Fix (10 seconds) |
|---|---|
| **Database disconnected or stopped** | Open terminal or double click: `.\START_CAMPUS_RIDES.bat` on Desktop. |
| **Want a clean database reset right before demo** | Double click: `.\demo\reset_demo.bat`. In 5 seconds, database drops, migrates, and re-seeds with fresh rides! |
| **Port 5000 / 5173 conflict** | Run in PowerShell: `Get-Process node \| Stop-Process -Force`, then run `npm run dev`. |
| **UI has an issue during demo** | Run queries directly in **`pgAdmin`** or **`psql`** using `demo/demo.sql`. The entire database logic lives in PostgreSQL stored functions! |
