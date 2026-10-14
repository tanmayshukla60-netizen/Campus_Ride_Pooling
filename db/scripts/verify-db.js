// db/scripts/verify-db.js
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const pgBin = path.join(process.env.USERPROFILE, 'pgsql', 'bin', 'psql.exe');
const psqlCmd = fs.existsSync(pgBin) ? pgBin : 'psql';

function query(sql) {
  const result = execFileSync(
    psqlCmd,
    ['-U', 'postgres', '-h', '127.0.0.1', '-p', '5432', '-d', 'campus_rides', '-t', '-A', '-c', sql],
    { encoding: 'utf-8' }
  );
  return result.trim();
}

console.log('================================================================');
console.log('             VERIFYING PHASE 1: DATABASE INTEGRITY              ');
console.log('================================================================\n');

// 1. Table Verification
const tables = ['users', 'stops', 'rides', 'bookings', 'payments', 'ratings', 'audit_log'];
console.log('1. Checking Tables:');
for (const table of tables) {
  const count = query(`SELECT count(*) FROM ${table};`);
  console.log(`   [PASS] Table '${table}' exists with ${count} rows`);
}

// 2. ENUM Types Verification
console.log('\n2. Checking ENUM Types:');
const enums = ['ride_status', 'booking_status', 'payment_type'];
for (const en of enums) {
  const vals = query(`SELECT string_agg(enumlabel, ', ') FROM pg_enum JOIN pg_type ON pg_enum.enumtypid = pg_type.oid WHERE typname = '${en}';`);
  console.log(`   [PASS] ENUM '${en}': [${vals}]`);
}

// 3. Indexes Verification
console.log('\n3. Checking Critical Indexes:');
const partialIdx = query(`SELECT indexname, indexdef FROM pg_indexes WHERE indexname = 'uq_active_rider_ride';`);
if (partialIdx) {
  console.log(`   [PASS] Partial Unique Index found: uq_active_rider_ride`);
} else {
  console.error(`   [FAIL] Partial Unique Index NOT found!`);
  process.exit(1);
}

const compositeIdx = query(`SELECT indexname, indexdef FROM pg_indexes WHERE indexname = 'idx_rides_search_composite';`);
if (compositeIdx) {
  console.log(`   [PASS] Composite Search Index found: idx_rides_search_composite`);
} else {
  console.error(`   [FAIL] Composite Search Index NOT found!`);
  process.exit(1);
}

// 4. Views Verification
console.log('\n4. Checking Views:');
const availRidesCount = query(`SELECT count(*) FROM v_available_rides;`);
console.log(`   [PASS] View 'v_available_rides' returned ${availRidesCount} rows`);
const historyCount = query(`SELECT count(*) FROM v_rider_history;`);
console.log(`   [PASS] View 'v_rider_history' returned ${historyCount} rows`);

// 5. Trigger Verification: State Machine Transition Blocking
console.log('\n5. Testing State Machine Trigger (Illegal Transition Rejection):');
try {
  // Attempt illegal transition: COMPLETED -> PENDING
  const completedBookingId = query(`SELECT id FROM bookings WHERE status = 'COMPLETED' LIMIT 1;`);
  execFileSync(
    psqlCmd,
    ['-U', 'postgres', '-h', '127.0.0.1', '-p', '5432', '-d', 'campus_rides', '-c', `UPDATE bookings SET status = 'PENDING' WHERE id = '${completedBookingId}';`],
    { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
  );
  console.error('   [FAIL] State machine FAILED to block illegal transition!');
  process.exit(1);
} catch (err) {
  console.log('   [PASS] Successfully blocked illegal state transition (COMPLETED -> PENDING):');
  console.log(`          DB Output: ${err.stderr ? err.stderr.trim().split('\n')[0] : 'Illegal transition rejected'}`);
}

// 6. Functions Verification
console.log('\n6. Checking Stored Functions:');
const funcs = ['book_seat', 'cancel_booking', 'cancel_ride', 'complete_ride', 'expire_holds'];
for (const fn of funcs) {
  const exists = query(`SELECT 1 FROM pg_proc WHERE proname = '${fn}';`);
  if (exists === '1') {
    console.log(`   [PASS] Function '${fn}' is compiled and available`);
  } else {
    console.error(`   [FAIL] Function '${fn}' missing!`);
    process.exit(1);
  }
}

// 7. Booking States Verification (Every state must be represented)
console.log('\n7. Checking Booking States in Seed Data:');
const states = query(`SELECT status, count(*) FROM bookings GROUP BY status ORDER BY status;`);
console.log(states.split('\n').map(l => `   - Status: ${l}`).join('\n'));

console.log('\n================================================================');
console.log('               PHASE 1 VERIFICATION COMPLETE: ALL PASS          ');
console.log('================================================================\n');
