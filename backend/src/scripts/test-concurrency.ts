// backend/src/scripts/test-concurrency.ts
import http from 'http';
import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import app from '../index';
import { query } from '../db';
import { config } from '../config';

const TEST_RIDE_ID = '33333333-3333-3333-3333-333333333399';
const NUM_CONCURRENT_REQUESTS = 50;
const RIDE_CAPACITY = 3;

interface TestRider {
  id: string;
  email: string;
  token: string;
}

async function setupTestEnvironment(): Promise<TestRider[]> {
  console.log(`Setting up test environment for ${NUM_CONCURRENT_REQUESTS} concurrent riders...`);

  // 1. Reset test ride to pristine state
  await query('DELETE FROM payments WHERE booking_id IN (SELECT id FROM bookings WHERE ride_id = $1)', [TEST_RIDE_ID]);
  await query('DELETE FROM ratings WHERE booking_id IN (SELECT id FROM bookings WHERE ride_id = $1)', [TEST_RIDE_ID]);
  await query('DELETE FROM bookings WHERE ride_id = $1', [TEST_RIDE_ID]);
  await query(
    'UPDATE rides SET total_seats = $1, seats_available = $1, status = $2, departure_time = NOW() + INTERVAL \'2 days\' WHERE id = $3',
    [RIDE_CAPACITY, 'SCHEDULED', TEST_RIDE_ID]
  );

  // 2. Provision 50 distinct test rider users (or reuse existing)
  const riders: TestRider[] = [];
  for (let i = 1; i <= NUM_CONCURRENT_REQUESTS; i++) {
    const email = `concurrency.rider.${i}@vitstudent.ac.in`;
    const fullName = `Stress Rider ${i}`;

    let userId: string;
    const existing = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      userId = existing.rows[0].id;
    } else {
      const insert = await query(
        `INSERT INTO users (full_name, email, password_hash, role)
         VALUES ($1, $2, $3, 'USER')
         RETURNING id`,
        [fullName, email, '$2a$10$7EqJtq98hPqEX7fNZaFWoO.8/5s1J8cKz4x3Fp06dE/4U00sH3eW6']
      );
      userId = insert.rows[0].id;
    }

    const token = jwt.sign(
      { userId, email, role: 'USER', fullName },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    riders.push({ id: userId, email, token });
  }

  console.log(`Provisioned ${riders.length} authenticated test riders.`);
  return riders;
}

async function runConcurrencyStressTest() {
  const logLines: string[] = [];
  function log(msg: string) {
    console.log(msg);
    logLines.push(msg);
  }

  log('================================================================================');
  log('   CAMPUS RIDE-POOLING: CONCURRENCY & TRANSACTION ISOLATION STRESS TEST         ');
  log('================================================================================');
  log(`Test Timestamp: ${new Date().toISOString()}`);
  log(`Target Ride ID: ${TEST_RIDE_ID}`);
  log(`Ride Capacity: ${RIDE_CAPACITY} seats`);
  log(`Simultaneous Booking Requests: ${NUM_CONCURRENT_REQUESTS}`);
  log(`Locking Mechanism: Stored Function book_seat() with SELECT ... FOR UPDATE\n`);

  const riders = await setupTestEnvironment();

  // Start temporary HTTP server on port 5098
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(5098, '127.0.0.1', () => resolve()));
  const baseUrl = 'http://127.0.0.1:5098';

  try {
    log(`Dispatching ${NUM_CONCURRENT_REQUESTS} simultaneous requests concurrently via Promise.all...`);
    const startTime = Date.now();

    const requestPromises = riders.map((rider, idx) => {
      const idempotencyKey = `concurrency-key-${Date.now()}-${idx + 1}`;
      return fetch(`${baseUrl}/rides/${TEST_RIDE_ID}/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${rider.token}`,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({ seatsBooked: 1 }),
      }).then(async (res) => {
        const body = await res.json();
        return {
          riderIndex: idx + 1,
          riderEmail: rider.email,
          status: res.status,
          success: body.success,
          data: body.data,
          error: body.error,
        };
      });
    });

    const results = await Promise.all(requestPromises);
    const durationMs = Date.now() - startTime;

    log(`All ${NUM_CONCURRENT_REQUESTS} requests completed in ${durationMs}ms.\n`);

    // Aggregate results
    let successCount = 0;
    let conflictCount = 0;
    let otherCount = 0;

    for (const r of results) {
      if (r.status === 201 && r.success) {
        successCount++;
        log(`  [SUCCESS 201] Rider ${r.riderIndex} (${r.riderEmail}) booked seat -> Booking ID: ${r.data?.booking_id}`);
      } else if (r.status === 409) {
        conflictCount++;
      } else {
        otherCount++;
        log(`  [UNEXPECTED ${r.status}] Rider ${r.riderIndex}: ${JSON.stringify(r.error)}`);
      }
    }

    log(`\nConcurrency Test Summary:`);
    log(`  - Total Requests:      ${NUM_CONCURRENT_REQUESTS}`);
    log(`  - Successful Bookings: ${successCount} (Expected: ${RIDE_CAPACITY})`);
    log(`  - Rejected (Full):     ${conflictCount} (Expected: ${NUM_CONCURRENT_REQUESTS - RIDE_CAPACITY})`);
    log(`  - Unexpected Errors:   ${otherCount} (Expected: 0)`);

    // Verify Database State directly
    const rideDbRes = await query('SELECT seats_available, total_seats, status FROM rides WHERE id = $1', [TEST_RIDE_ID]);
    const rideDb = rideDbRes.rows[0];
    const bookingsDbRes = await query('SELECT count(*) AS count FROM bookings WHERE ride_id = $1', [TEST_RIDE_ID]);
    const actualBookings = parseInt(bookingsDbRes.rows[0].count, 10);

    log(`\nPost-Test Database State Verification:`);
    log(`  - DB seats_available:  ${rideDb.seats_available} (Expected: 0)`);
    log(`  - DB total_seats:      ${rideDb.total_seats}`);
    log(`  - DB bookings count:   ${actualBookings} (Expected: ${RIDE_CAPACITY})`);

    // Assert Concurrency Guarantees
    if (successCount !== RIDE_CAPACITY) {
      throw new Error(`FAILURE: Expected exactly ${RIDE_CAPACITY} successes, got ${successCount}`);
    }
    if (rideDb.seats_available !== 0) {
      throw new Error(`FAILURE: Expected 0 seats available, got ${rideDb.seats_available}`);
    }
    if (actualBookings !== RIDE_CAPACITY) {
      throw new Error(`FAILURE: Expected exactly ${RIDE_CAPACITY} bookings in DB, got ${actualBookings}`);
    }
    log(`  -> OVERBOOKING CHECK: PASSED (Zero overbooking under heavy race conditions)`);

    // =========================================================================
    // IDEMPOTENCY TEST: Submit same Idempotency-Key twice
    // =========================================================================
    log(`\n--------------------------------------------------------------------------------`);
    log(`IDEMPOTENCY TEST: Submitting same Idempotency-Key twice`);
    log(`--------------------------------------------------------------------------------`);

    // Create a new fresh ride with 1 seat
    const tempRideRes = await query(
      `INSERT INTO rides (driver_id, origin_stop_id, destination_stop_id, departure_time, total_seats, seats_available, price_per_seat, status)
       VALUES ('22222222-2222-2222-2222-222222222201', 1, 2, NOW() + INTERVAL '2 days', 1, 1, 150.00, 'SCHEDULED')
       RETURNING id`
    );
    const tempRideId = tempRideRes.rows[0].id;
    const fixedIdempotencyKey = `idem-test-fixed-${Date.now()}`;
    const testRider = riders[0];

    log(`1st Call with Idempotency-Key: ${fixedIdempotencyKey}`);
    const firstCall = await fetch(`${baseUrl}/rides/${tempRideId}/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testRider.token}`,
        'Idempotency-Key': fixedIdempotencyKey,
      },
      body: JSON.stringify({ seatsBooked: 1 }),
    });
    const firstBody = await firstCall.json();
    log(`  -> 1st Call Status: ${firstCall.status}, idempotent_replay: ${firstBody.data?.idempotent_replay}, Booking ID: ${firstBody.data?.booking_id}`);

    log(`2nd Call with identical Idempotency-Key: ${fixedIdempotencyKey}`);
    const secondCall = await fetch(`${baseUrl}/rides/${tempRideId}/book`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testRider.token}`,
        'Idempotency-Key': fixedIdempotencyKey,
      },
      body: JSON.stringify({ seatsBooked: 1 }),
    });
    const secondBody = await secondCall.json();
    log(`  -> 2nd Call Status: ${secondCall.status}, idempotent_replay: ${secondBody.data?.idempotent_replay}, Booking ID: ${secondBody.data?.booking_id}`);

    // Verify idempotency
    const bookingsCountRes = await query('SELECT count(*) AS count FROM bookings WHERE ride_id = $1', [tempRideId]);
    const totalBookingsOnTempRide = parseInt(bookingsCountRes.rows[0].count, 10);

    if (
      firstCall.status === 201 &&
      secondCall.status === 200 &&
      secondBody.data?.idempotent_replay === true &&
      firstBody.data?.booking_id === secondBody.data?.booking_id &&
      totalBookingsOnTempRide === 1
    ) {
      log(`  -> IDEMPOTENCY CHECK: PASSED (Returned identical booking, zero duplicate rows inserted)`);
    } else {
      throw new Error(`FAILURE: Idempotency test failed: ${JSON.stringify({ firstBody, secondBody })}`);
    }

    log('\n================================================================================');
    log('               ALL CONCURRENCY & IDEMPOTENCY TESTS PASSED!                      ');
    log('================================================================================\n');

    // Save output to /docs/concurrency_test_results.txt
    const docsFilePath = path.join(__dirname, '..', '..', '..', 'docs', 'concurrency_test_results.txt');
    fs.writeFileSync(docsFilePath, logLines.join('\n'), 'utf-8');
    log(`Test report successfully written to ${docsFilePath}`);

    process.exit(0);
  } finally {
    server.close();
  }
}

runConcurrencyStressTest().catch((err) => {
  console.error('Concurrency Test Error:', err);
  process.exit(1);
});
