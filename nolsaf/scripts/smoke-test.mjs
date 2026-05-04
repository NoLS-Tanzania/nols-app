#!/usr/bin/env node
/**
 * NoLSAF Smoke Test
 * Runs after every deploy to verify the critical booking path is healthy.
 *
 * Usage:
 *   node scripts/smoke-test.mjs
 *   API_URL=https://your-api.onrender.com TEST_PROPERTY_ID=3 node scripts/smoke-test.mjs
 *
 * Exit 0 = all checks passed. Exit 1 = at least one check failed.
 */

const API_URL = (process.env.API_URL || "http://localhost:4000").replace(/\/$/, "");
const TEST_PROPERTY_ID = Number(process.env.TEST_PROPERTY_ID || 0);
const TIMEOUT_MS = 15_000;

let passed = 0;
let failed = 0;

// ─── helpers ────────────────────────────────────────────────────────────────

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

function ok(label) {
  console.log(`  ✓  ${label}`);
  passed++;
}

function fail(label, detail) {
  console.error(`  ✗  ${label}`);
  if (detail) console.error(`       ${detail}`);
  failed++;
}

async function check(label, fn) {
  try {
    await fn();
  } catch (e) {
    fail(label, e?.message ?? String(e));
  }
}

// ─── test helpers ────────────────────────────────────────────────────────────

function futureDate(daysFromNow) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

// ─── checks ──────────────────────────────────────────────────────────────────

console.log(`\nNoLSAF smoke test → ${API_URL}\n`);

// 1. Health endpoints
await check("GET /health returns 200", async () => {
  const res = await fetchWithTimeout(`${API_URL}/health`);
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
  ok("GET /health returns 200");
});

await check("GET /ready returns 200", async () => {
  const res = await fetchWithTimeout(`${API_URL}/ready`);
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
  ok("GET /ready returns 200");
});

// 2. Public properties list (basic read path)
await check("GET /api/public/properties returns 200", async () => {
  const res = await fetchWithTimeout(`${API_URL}/api/public/properties?page=1&pageSize=1`);
  if (res.status !== 200) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (!Array.isArray(json?.items) && !Array.isArray(json?.properties) && !Array.isArray(json?.data)) {
    throw new Error("Response missing items/properties/data array");
  }
  ok("GET /api/public/properties returns 200");
});

// 3. Availability check endpoint responds (no booking needed)
await check("POST /api/public/availability/check rejects missing body with 400", async () => {
  const res = await fetchWithTimeout(`${API_URL}/api/public/availability/check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  ok("POST /api/public/availability/check rejects missing body with 400");
});

// 4. Booking endpoint rejects invalid payload (validation is up)
await check("POST /api/public/bookings rejects invalid payload with 400", async () => {
  const res = await fetchWithTimeout(`${API_URL}/api/public/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ propertyId: "not-a-number" }),
  });
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  ok("POST /api/public/bookings rejects invalid payload with 400");
});

// 5. Booking endpoint rejects backdated check-in
await check("POST /api/public/bookings rejects past check-in with 400", async () => {
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 2);
  const res = await fetchWithTimeout(`${API_URL}/api/public/bookings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      propertyId: 1,
      checkIn: pastDate.toISOString(),
      checkOut: futureDate(3),
      guestName: "Smoke Test",
      guestPhone: "0712345678",
    }),
  });
  if (res.status !== 400) throw new Error(`Expected 400, got ${res.status}`);
  ok("POST /api/public/bookings rejects past check-in with 400");
});

// 6. Full booking creation (only runs when TEST_PROPERTY_ID is set)
if (TEST_PROPERTY_ID > 0) {
  await check(`POST /api/public/bookings creates booking against property ${TEST_PROPERTY_ID}`, async () => {
    const res = await fetchWithTimeout(`${API_URL}/api/public/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propertyId: TEST_PROPERTY_ID,
        checkIn: futureDate(30),
        checkOut: futureDate(32),
        guestName: "Smoke Test Guest",
        guestPhone: "0712000000",
        guestEmail: "smoke-test@nolsaf.internal",
        rooms: 1,
        adults: 1,
      }),
    });

    // 201 = created, 409 = room taken (dates clash with real booking — still means the endpoint works)
    if (res.status !== 201 && res.status !== 409) {
      const body = await res.text();
      throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
    }

    if (res.status === 201) {
      const json = await res.json();
      if (!json?.bookingId) throw new Error("Response missing bookingId");
      ok(`POST /api/public/bookings → bookingId ${json.bookingId}`);
    } else {
      ok("POST /api/public/bookings → 409 (dates occupied — endpoint is healthy)");
    }
  });
} else {
  console.log(`  -  Skipping full booking test (set TEST_PROPERTY_ID=<id> to enable)`);
}

// 7. Admin route requires auth
await check("GET /api/admin/bookings rejects unauthenticated with 401", async () => {
  const res = await fetchWithTimeout(`${API_URL}/api/admin/bookings`);
  if (res.status !== 401) throw new Error(`Expected 401, got ${res.status}`);
  ok("GET /api/admin/bookings rejects unauthenticated with 401");
});

// ─── summary ─────────────────────────────────────────────────────────────────

console.log(`\n─────────────────────────────────────`);
console.log(`  Passed: ${passed}   Failed: ${failed}`);
console.log(`─────────────────────────────────────\n`);

if (failed > 0) {
  console.error("Smoke test FAILED. Do not deploy to production.\n");
  process.exit(1);
} else {
  console.log("Smoke test PASSED. Safe to merge to main.\n");
  process.exit(0);
}
