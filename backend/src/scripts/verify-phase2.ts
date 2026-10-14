// backend/src/scripts/verify-phase2.ts
import http from 'http';
import app from '../index';

async function runTests() {
  console.log('================================================================');
  console.log('             VERIFYING PHASE 2: AUTH, POST RIDE, SEARCH         ');
  console.log('================================================================\n');

  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(5099, '127.0.0.1', () => resolve()));
  const baseUrl = 'http://127.0.0.1:5099';

  try {
    // 1. Health Check
    console.log('1. Testing /health endpoint:');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthJson = await healthRes.json();
    if (healthRes.status === 200 && healthJson.status === 'healthy') {
      console.log('   [PASS] Server is healthy');
    } else {
      throw new Error(`Health check failed: ${JSON.stringify(healthJson)}`);
    }

    // 2. Auth: Reject non-college email
    console.log('\n2. Testing /auth/signup rejection of non-college email:');
    const badEmailRes = await fetch(`${baseUrl}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Attacker John',
        email: 'attacker@gmail.com',
        password: 'Password123!',
      }),
    });
    const badEmailJson = await badEmailRes.json();
    if (badEmailRes.status === 400 && badEmailJson.error?.code === 'INVALID_COLLEGE_EMAIL') {
      console.log('   [PASS] Non-college email correctly rejected with 400 INVALID_COLLEGE_EMAIL');
    } else {
      throw new Error(`Failed to reject bad email: ${JSON.stringify(badEmailJson)}`);
    }

    // 3. Auth: Valid College Email Signup
    console.log('\n3. Testing /auth/signup with valid college email:');
    const uniqueEmail = `driver.${Date.now()}@vitstudent.ac.in`;
    const signupRes = await fetch(`${baseUrl}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName: 'Test Driver',
        email: uniqueEmail,
        password: 'Password123!',
      }),
    });
    const signupJson = await signupRes.json();
    if (signupRes.status === 201 && signupJson.data?.token) {
      console.log(`   [PASS] Created user: ${signupJson.data.user.email} with valid JWT token`);
    } else {
      throw new Error(`Signup failed: ${JSON.stringify(signupJson)}`);
    }

    const authToken = signupJson.data.token;

    // 4. Auth: Login
    console.log('\n4. Testing /auth/login:');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail,
        password: 'Password123!',
      }),
    });
    const loginJson = await loginRes.json();
    if (loginRes.status === 200 && loginJson.data?.token) {
      console.log('   [PASS] Login successful and token verified');
    } else {
      throw new Error(`Login failed: ${JSON.stringify(loginJson)}`);
    }

    // 5. Auth: GET /me
    console.log('\n5. Testing /me endpoint with Bearer auth:');
    const meRes = await fetch(`${baseUrl}/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const meJson = await meRes.json();
    if (meRes.status === 200 && meJson.data?.email === uniqueEmail) {
      console.log(`   [PASS] Authenticated user retrieved: ${meJson.data.full_name} (${meJson.data.role})`);
    } else {
      throw new Error(`/me failed: ${JSON.stringify(meJson)}`);
    }

    // 6. Stops: GET /stops
    console.log('\n6. Testing /stops endpoint:');
    const stopsRes = await fetch(`${baseUrl}/stops`);
    const stopsJson = await stopsRes.json();
    if (stopsRes.status === 200 && Array.isArray(stopsJson.data) && stopsJson.data.length >= 8) {
      console.log(`   [PASS] Retrieved ${stopsJson.data.length} stops from database`);
    } else {
      throw new Error(`Stops fetch failed: ${JSON.stringify(stopsJson)}`);
    }

    // 7. Rides: POST /rides (Create Ride)
    console.log('\n7. Testing POST /rides:');
    const futureDeparture = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const createRideRes = await fetch(`${baseUrl}/rides`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        originStopId: 1, // Main Gate
        destinationStopId: 3, // Chennai Airport
        departureTime: futureDeparture,
        totalSeats: 4,
        pricePerSeat: 650.0,
      }),
    });
    const createRideJson = await createRideRes.json();
    if (createRideRes.status === 201 && createRideJson.data?.id) {
      console.log(`   [PASS] Posted ride ${createRideJson.data.id} with ${createRideJson.data.seats_available} seats available`);
    } else {
      throw new Error(`Post ride failed: ${JSON.stringify(createRideJson)}`);
    }

    const createdRideId = createRideJson.data.id;

    // 8. Rides: GET /rides/search
    console.log('\n8. Testing GET /rides/search with weighted rank score:');
    const searchRes = await fetch(`${baseUrl}/rides/search?from=1&to=3&seats=1`);
    const searchJson = await searchRes.json();
    if (searchRes.status === 200 && Array.isArray(searchJson.data) && searchJson.data.length > 0) {
      console.log(`   [PASS] Found ${searchJson.data.length} matching rides`);
      console.log(`          Top ride: Driver ${searchJson.data[0].driver_name}, Rating: ${searchJson.data[0].driver_rating_avg}, Rank Score: ${searchJson.data[0].rank_score}`);
    } else {
      throw new Error(`Search failed: ${JSON.stringify(searchJson)}`);
    }

    // 9. Rides: GET /rides/:id
    console.log('\n9. Testing GET /rides/:id:');
    const getRideRes = await fetch(`${baseUrl}/rides/${createdRideId}`);
    const getRideJson = await getRideRes.json();
    if (getRideRes.status === 200 && getRideJson.data?.id === createdRideId) {
      console.log(`   [PASS] Retrieved details for ride ${createdRideId}: ${getRideJson.data.origin_stop_name} -> ${getRideJson.data.destination_stop_name}`);
    } else {
      throw new Error(`Get ride failed: ${JSON.stringify(getRideJson)}`);
    }

    console.log('\n================================================================');
    console.log('               PHASE 2 VERIFICATION COMPLETE: ALL PASS          ');
    console.log('================================================================\n');
    process.exit(0);
  } finally {
    server.close();
  }
}

runTests().catch((err) => {
  console.error('Phase 2 Verification failed:', err);
  process.exit(1);
});
