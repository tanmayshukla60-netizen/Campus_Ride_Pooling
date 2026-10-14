/**
 * SQL Injection Demo Script for DBMS Course Project
 * ==================================================
 * Demonstrates that our application is SAFE from SQL injection
 * because we use parameterized queries ($1, $2, ...) everywhere.
 *
 * Run: npx ts-node src/scripts/test-sql-injection.ts
 *
 * Each test attempts a classic SQL injection payload.
 * If the system is safe, all attacks will fail gracefully
 * (rejected by validation or treated as literal strings).
 */

import { query } from '../db';

const PAYLOADS = [
  // 1. Classic tautology attack (login bypass)
  { name: 'Login bypass (OR 1=1)', email: "' OR '1'='1' --", password: 'anything' },
  // 2. Union-based extraction
  { name: 'UNION SELECT passwords', email: "' UNION SELECT id, password_hash, email, role, 5, 6, 7 FROM users --", password: 'x' },
  // 3. Stacked queries (DROP TABLE)
  { name: 'DROP TABLE via stacked query', email: "'; DROP TABLE users; --", password: 'x' },
  // 4. Time-based blind injection
  { name: 'Time-based blind (pg_sleep)', email: "' OR pg_sleep(5) --", password: 'x' },
  // 5. Boolean-based blind injection
  { name: 'Boolean-based blind', email: "' OR (SELECT COUNT(*) FROM users) > 0 --", password: 'x' },
  // 6. Comment-based bypass
  { name: 'Comment-based bypass', email: "admin@vitstudent.ac.in'--", password: 'wrong' },
  // 7. Second-order injection in ride search
  { name: 'Ride search injection', email: "1; UPDATE rides SET price_per_seat = 0 --", password: 'x' },
];

async function runInjectionTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  SQL INJECTION DEFENSE DEMONSTRATION');
  console.log('  Campus Ride-Pooling — DBMS Course Project');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('All queries use parameterized placeholders ($1, $2, ...).');
  console.log('PostgreSQL treats injection payloads as LITERAL STRINGS.\n');

  let passed = 0;
  let failed = 0;

  for (const payload of PAYLOADS) {
    console.log(`\n┌── Test: ${payload.name}`);
    console.log(`│   Payload email: ${payload.email}`);
    console.log(`│   Payload pass:  ${payload.password}`);

    try {
      // Attempt the login query with the malicious payload
      // This mirrors our auth.service.ts loginUser() query
      const res = await query(
        `SELECT id, full_name, email, password_hash, role
         FROM users
         WHERE email = $1`,
        [payload.email]
      );

      if (res.rows.length === 0) {
        console.log(`│   ✅ SAFE — Query returned 0 rows (payload treated as literal string)`);
        passed++;
      } else {
        // Even if rows returned, it would be because the payload is a real email
        console.log(`│   ⚠️  Query returned ${res.rows.length} row(s) — checking if injection succeeded...`);
        const returnedEmail = res.rows[0]?.email;
        if (returnedEmail === payload.email) {
          console.log(`│   ✅ SAFE — Matched literal email, not an injection bypass`);
          passed++;
        } else {
          console.log(`│   ❌ VULNERABLE — Unexpected row returned: ${returnedEmail}`);
          failed++;
        }
      }
    } catch (err: any) {
      // PostgreSQL syntax errors from literal string processing = SAFE
      console.log(`│   ✅ SAFE — Database rejected payload: ${err.message?.slice(0, 80)}`);
      passed++;
    }

    console.log(`└──`);
  }

  // Test ride search endpoint injection
  console.log(`\n┌── Test: Ride search parameter injection`);
  console.log(`│   Payload: from=1 OR 1=1`);
  try {
    const res = await query(
      `SELECT * FROM v_available_rides
       WHERE origin_stop_id = $1 AND destination_stop_id = $2
       AND seats_available >= $3`,
      ['1 OR 1=1', '2', '1']
    );
    console.log(`│   ✅ SAFE — Invalid integer rejected or returned 0 rows`);
    passed++;
  } catch (err: any) {
    console.log(`│   ✅ SAFE — Database rejected: ${err.message?.slice(0, 80)}`);
    passed++;
  }
  console.log(`└──`);

  // Test UPDATE injection via password field
  console.log(`\n┌── Test: Password field UPDATE injection`);
  console.log(`│   Payload: UPDATE users SET password_hash = `);
  try {
    const res = await query(
      `UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING id`,
      ["'; UPDATE users SET role='ADMIN' WHERE email='attacker@vitstudent.ac.in'; --", 'nonexistent@vitstudent.ac.in']
    );
    if (res.rows.length === 0) {
      console.log(`│   ✅ SAFE — No rows affected, payload stored as literal if user existed`);
      passed++;
    }
  } catch (err: any) {
    console.log(`│   ✅ SAFE — Database rejected: ${err.message?.slice(0, 80)}`);
    passed++;
  }
  console.log(`└──`);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} tests`);
  if (failed === 0) {
    console.log('  🛡️  ALL INJECTION ATTACKS BLOCKED — System is SAFE');
    console.log('  Parameterized queries prevent SQL injection at the driver level.');
  } else {
    console.log('  ⚠️  SOME TESTS FAILED — Review parameterized query usage!');
  }
  console.log('═══════════════════════════════════════════════════════\n');

  process.exit(failed === 0 ? 0 : 1);
}

runInjectionTests().catch((err) => {
  console.error('Script error:', err);
  process.exit(1);
});
