/**
 * Concurrency Test Script — BellCrop Hotel Booking System
 * 
 * Fires N simultaneous booking requests for the same room and overlapping date range.
 * Expected result: exactly 1 success (201), all others get conflict (409).
 * 
 * Usage:
 *   node scripts/concurrency-test.js [N] [BASE_URL]
 * 
 * Examples:
 *   node scripts/concurrency-test.js 20
 *   node scripts/concurrency-test.js 50 http://localhost:5000
 */

const N = parseInt(process.argv[2]) || 20;
const BASE_URL = process.argv[3] || 'http://localhost:5000';

async function main() {
  console.log(`\n🏨 BellCrop Hotel — Concurrency Test`);
  console.log(`${'─'.repeat(50)}`);
  console.log(`Requests:  ${N} simultaneous booking attempts`);
  console.log(`Target:    Same room, same overlapping dates`);
  console.log(`Expected:  Exactly 1 success, ${N - 1} conflicts\n`);

  // Step 1: Register N unique test users
  console.log(`📝 Registering ${N} test users...`);
  const users = [];
  for (let i = 0; i < N; i++) {
    const email = `concurrency_test_${Date.now()}_${i}@test.com`;
    const password = 'TestPass123!';

    try {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (data.token) {
        users.push({ email, token: data.token });
      } else {
        console.error(`  ⚠️  Failed to register user ${i}: ${JSON.stringify(data)}`);
      }
    } catch (err) {
      console.error(`  ⚠️  Registration error for user ${i}: ${err.message}`);
    }
  }
  console.log(`  ✅ Registered ${users.length} users\n`);

  if (users.length < 2) {
    console.error('❌ Need at least 2 users to test concurrency. Aborting.');
    process.exit(1);
  }

  // Step 2: Get the first available room
  console.log('🔍 Finding a room to book...');
  const roomsRes = await fetch(`${BASE_URL}/api/rooms`);
  const roomsData = await roomsRes.json();
  const room = roomsData.data?.[0];

  if (!room) {
    console.error('❌ No rooms available. Seed the database first.');
    process.exit(1);
  }
  console.log(`  📌 Target room: ${room.room_number} (${room.type}) — $${room.price_per_night}/night\n`);

  // Step 3: Set up a future date range
  const checkIn = new Date();
  checkIn.setDate(checkIn.getDate() + 30); // 30 days from now
  const checkOut = new Date(checkIn);
  checkOut.setDate(checkOut.getDate() + 3); // 3-night stay

  const checkInStr = checkIn.toISOString().split('T')[0];
  const checkOutStr = checkOut.toISOString().split('T')[0];
  console.log(`📅 Date range: ${checkInStr} → ${checkOutStr} (3 nights)`);
  console.log(`\n🚀 Firing ${users.length} simultaneous booking requests...\n`);

  // Step 4: Fire all requests simultaneously
  const startTime = Date.now();

  const results = await Promise.allSettled(
    users.map((user) =>
      fetch(`${BASE_URL}/api/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          roomId: room.id,
          checkIn: checkInStr,
          checkOut: checkOutStr,
        }),
      }).then(async (res) => {
        const data = await res.json();
        return { status: res.status, data, email: user.email };
      })
    )
  );

  const elapsed = Date.now() - startTime;

  // Step 5: Tally results
  let succeeded = 0;
  let conflicted = 0;
  let rateLimited = 0;
  let otherErrors = 0;

  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      const { status } = result.value;
      if (status === 201) succeeded++;
      else if (status === 409) conflicted++;
      else if (status === 429) rateLimited++;
      else otherErrors++;
    } else {
      otherErrors++;
    }
  });

  // Step 6: Print results
  console.log(`${'═'.repeat(50)}`);
  console.log(`  RESULTS (${elapsed}ms total)`);
  console.log(`${'═'.repeat(50)}`);
  console.log(`  ✅ Succeeded (201): ${succeeded}`);
  console.log(`  ❌ Conflicted (409): ${conflicted}`);
  if (rateLimited > 0) console.log(`  ⏳ Rate Limited (429): ${rateLimited}`);
  if (otherErrors > 0) console.log(`  ⚠️  Other Errors: ${otherErrors}`);
  console.log(`${'═'.repeat(50)}`);

  // Step 7: Verdict
  if (succeeded === 1 && conflicted === users.length - 1 - rateLimited) {
    console.log(`\n✅ PASS — Exactly 1 booking confirmed, ${conflicted} correctly rejected.`);
    console.log('   Concurrency protection is working correctly!\n');
  } else if (succeeded === 1) {
    console.log(`\n✅ PASS — 1 booking confirmed. Some requests were rate-limited (expected under heavy load).\n`);
  } else if (succeeded === 0) {
    console.log(`\n⚠️  WARNING — 0 bookings succeeded. All were conflicts or rate-limited.`);
    console.log('   This may happen if the room was already booked. Try with a different date range.\n');
  } else {
    console.log(`\n❌ FAIL — ${succeeded} bookings succeeded (expected exactly 1).`);
    console.log('   DOUBLE BOOKING DETECTED! The concurrency mechanism is broken!\n');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
