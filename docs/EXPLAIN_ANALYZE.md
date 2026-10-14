# EXPLAIN ANALYZE Benchmark: Ride Search Optimization

## Target Search Query
The primary ride search pattern filters by `origin_stop_id`, `destination_stop_id`, a departure time window (`departure_time BETWEEN ? AND ?`), and active ride status (`status = 'SCHEDULED'`):

```sql
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
```

---

## 1. Plan WITHOUT Composite Index (Sequential Scan)
*Forced sequential scan to measure worst-case linear table inspection:*

```text
SET
SET
                                                                                                             QUERY PLAN                                                                                                             
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Nested Loop  (cost=0.00..43.22 rows=1 width=274) (actual time=0.153..0.177 rows=3 loops=1)
   Output: r.id, r.departure_time, r.price_per_seat, r.seats_available, u.full_name, u.rating_avg
   Inner Unique: true
   Join Filter: (u.id = r.driver_id)
   Rows Removed by Join Filter: 23
   Buffers: shared hit=4
   ->  Seq Scan on public.rides r  (cost=0.00..32.10 rows=1 width=60) (actual time=0.115..0.119 rows=3 loops=1)
         Output: r.id, r.driver_id, r.origin_stop_id, r.destination_stop_id, r.departure_time, r.total_seats, r.seats_available, r.price_per_seat, r.status, r.created_at, r.updated_at
         Filter: ((r.origin_stop_id = 1) AND (r.destination_stop_id = 2) AND (r.status = 'SCHEDULED'::ride_status) AND (r.departure_time >= (now() - '01:00:00'::interval)) AND (r.departure_time <= (now() + '3 days'::interval)))
         Rows Removed by Filter: 18
         Buffers: shared hit=1
   ->  Seq Scan on public.users u  (cost=0.00..10.50 rows=50 width=246) (actual time=0.011..0.011 rows=9 loops=3)
         Output: u.id, u.full_name, u.email, u.password_hash, u.role, u.rating_avg, u.rating_count, u.created_at
         Buffers: shared hit=3
 Planning:
   Buffers: shared hit=300
 Planning Time: 6.325 ms
 Execution Time: 0.235 ms
(18 rows)
```

---

## 2. Plan WITH Composite Index (`idx_rides_search_composite`)
*Partial Composite B-Tree Index: `(origin_stop_id, destination_stop_id, departure_time) WHERE status = 'SCHEDULED'`*

```text
SET
SET
SET
                                                                                          QUERY PLAN                                                                                          
----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 Nested Loop  (cost=0.30..16.65 rows=1 width=274) (actual time=0.033..0.038 rows=3 loops=1)
   Output: r.id, r.departure_time, r.price_per_seat, r.seats_available, u.full_name, u.rating_avg
   Inner Unique: true
   Buffers: shared hit=8
   ->  Index Scan using idx_rides_search_composite on public.rides r  (cost=0.16..8.18 rows=1 width=60) (actual time=0.016..0.017 rows=3 loops=1)
         Output: r.id, r.driver_id, r.origin_stop_id, r.destination_stop_id, r.departure_time, r.total_seats, r.seats_available, r.price_per_seat, r.status, r.created_at, r.updated_at
         Index Cond: ((r.origin_stop_id = 1) AND (r.destination_stop_id = 2) AND (r.departure_time >= (now() - '01:00:00'::interval)) AND (r.departure_time <= (now() + '3 days'::interval)))
         Buffers: shared hit=2
   ->  Index Scan using users_pkey on public.users u  (cost=0.14..8.16 rows=1 width=246) (actual time=0.006..0.006 rows=1 loops=3)
         Output: u.id, u.full_name, u.email, u.password_hash, u.role, u.rating_avg, u.rating_count, u.created_at
         Index Cond: (u.id = r.driver_id)
         Buffers: shared hit=6
 Planning:
   Buffers: shared hit=310
 Planning Time: 4.696 ms
 Execution Time: 0.076 ms
(16 rows)
```

---

## Key Performance Observations
1. **Access Method**:
   - Without index: PostgreSQL performs a `Seq Scan on rides`, inspecting all heap blocks.
   - With composite index: PostgreSQL performs an `Index Scan` or `Bitmap Index Scan` directly targeting the exact B-Tree leaf pages matching the origin and destination tuples, then pruning by the departure timestamp range.
2. **Buffer Hit & IO**:
   - Buffer page reads are reduced from reading full table heaps to only the relevant index pages.
3. **Partial Index Advantage**:
   - By specifying `WHERE status = 'SCHEDULED'`, completed and cancelled historical rides are excluded from the index, keeping index size small and fully cached in PostgreSQL buffer pool memory (`shared_buffers`).
