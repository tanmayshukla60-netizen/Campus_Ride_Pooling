# Database Normalization Walkthrough (1NF -> 3NF)

## 1. Normalization Stages

### First Normal Form (1NF)
A relation is in 1NF if every attribute contains only atomic (indivisible) values and there are no repeating groups.
- In our schema:
  - All attributes in `users`, `stops`, `rides`, `bookings`, `payments`, `ratings`, and `audit_log` contain atomic scalars (UUIDs, integers, numeric amounts, timestamps, enums).
  - Multi-valued attributes like passenger lists or multiple stops are separated into individual tuples in relational child tables (`bookings`, `stops`).
  - Primary keys (`id`) uniquely identify every tuple.

### Second Normal Form (2NF)
A relation is in 2NF if it is in 1NF and every non-prime attribute is fully functionally dependent on the primary key (no partial dependencies on a composite candidate key).
- In our schema:
  - All main tables use synthetic primary keys (`id` UUID or BIGSERIAL/SERIAL).
  - No non-prime attribute depends on a subset of a composite primary key.

### Third Normal Form (3NF)
A relation is in 3NF if it is in 2NF and no non-prime attribute is transitively dependent on the primary key ($X \to Y$ and $Y \to Z$).
- Stoppage details (`origin_stop_id`, `destination_stop_id`) store only foreign keys to `stops(id)`. Stop names and landmarks are stored exclusively in the `stops` relation.
- Rider details in `bookings` store only `rider_id`. Student names, emails, and passwords are not duplicated in `bookings`.
- Payment transactions are recorded in an append-only ledger `payments` referencing `booking_id`. Balances are not stored as mutable accumulators on `users` or `rides`.

---

## 2. Functional Dependencies

### `users`
- $\{ \text{id} \} \to \{ \text{full\_name}, \text{email}, \text{password\_hash}, \text{role}, \text{rating\_avg}, \text{rating\_count}, \text{created\_at} \}$
- $\{ \text{email} \} \to \{ \text{id}, \text{full\_name}, \text{password\_hash}, \text{role}, \text{rating\_avg}, \text{rating\_count}, \text{created\_at} \}$

### `stops`
- $\{ \text{id} \} \to \{ \text{name}, \text{landmark}, \text{created\_at} \}$
- $\{ \text{name} \} \to \{ \text{id}, \text{landmark}, \text{created\_at} \}$

### `rides`
- $\{ \text{id} \} \to \{ \text{driver\_id}, \text{origin\_stop\_id}, \text{destination\_stop\_id}, \text{departure\_time}, \text{total\_seats}, \text{seats\_available}, \text{price\_per\_seat}, \text{status}, \text{created\_at}, \text{updated\_at} \}$

### `bookings`
- $\{ \text{id} \} \to \{ \text{ride\_id}, \text{rider\_id}, \text{seats\_booked}, \text{total\_price}, \text{status}, \text{hold\_expires\_at}, \text{idempotency\_key}, \text{created\_at}, \text{updated\_at} \}$
- $\{ \text{idempotency\_key} \} \to \{ \text{id}, \text{ride\_id}, \text{rider\_id}, \dots \}$ (when not null)

### `payments`
- $\{ \text{id} \} \to \{ \text{booking\_id}, \text{amount}, \text{type}, \text{idempotency\_key}, \text{reason}, \text{created\_at} \}$

### `ratings`
- $\{ \text{id} \} \to \{ \text{booking\_id}, \text{rider\_id}, \text{driver\_id}, \text{score}, \text{comment}, \text{created\_at} \}$
- $\{ \text{booking\_id} \} \to \{ \text{id}, \text{rider\_id}, \text{driver\_id}, \text{score}, \text{comment}, \text{created\_at} \}$

---

## 3. Technical Justification for Deliberate Denormalization

In high-concurrency relational systems, strict 3NF purity can introduce catastrophic performance bottlenecks. We deliberately denormalized two specific attributes, maintaining relational integrity through triggers and transaction locks:

### 1. `rides.seats_available`
- **Purity Alternative (Strict 3NF)**:
  Calculate remaining seats dynamically as:
  $$\text{seats\_available} = \text{total\_seats} - \sum(\text{seats\_booked from active bookings})$$
- **Why this fails under concurrency**:
  Computing a dynamic aggregate requires table or index scans over all active bookings on every search and booking attempt. Under concurrent seat requests, locking the aggregate calculation would require table-level locking or predicates locks, leading to lock contention and deadlocks.
- **Engineered Solution**:
  By storing `seats_available` directly on the `rides` row, we can lock a single row with `SELECT ... FOR UPDATE` in `book_seat()`. The row lock serializes seat decrements with microsecond latency and zero phantom-read vulnerabilities.

### 2. `users.rating_avg` and `users.rating_count`
- **Purity Alternative (Strict 3NF)**:
  Calculate `AVG(ratings.score)` and `COUNT(ratings.id)` on the fly whenever rides are searched or listed.
- **Why this fails under search load**:
  Search queries rank results using a composite formula incorporating driver rating. Executing an aggregate subquery for every candidate ride across thousands of users degrades search latency from $O(\log N)$ (using index scans) to expensive hash aggregates.
- **Engineered Solution**:
  We maintain `rating_avg` and `rating_count` as cached attributes on `users`, kept 100% consistent via the database trigger `trg_driver_rating_sync` on every `INSERT`, `UPDATE`, or `DELETE` on the `ratings` table.
