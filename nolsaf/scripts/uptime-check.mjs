#!/usr/bin/env node
/**
 * NoLSAF uptime checker.
 *
 * Usage:
 *   node scripts/uptime-check.mjs
 *   API_URL=https://api.example.com node scripts/uptime-check.mjs
 *   UPTIME_URLS=https://api.example.com/health,https://api.example.com/ready node scripts/uptime-check.mjs
 *
 * Run with cron, Windows Task Scheduler, PM2, or GitHub Actions.
 */

const apiUrl = (process.env.API_URL || "http://localhost:4000").replace(/\/$/, "");
const timeoutMs = Number(process.env.UPTIME_TIMEOUT_MS || 10_000);
const urls = (process.env.UPTIME_URLS || `${apiUrl}/health,${apiUrl}/ready`)
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);

let failures = 0;
const results = [];

for (const url of urls) {
  const startedAt = Date.now();
  try {
    const res = await fetchWithTimeout(url, timeoutMs);
    const durationMs = Date.now() - startedAt;
    const ok = res.status >= 200 && res.status < 300;
    if (!ok) failures += 1;
    results.push({ url, ok, status: res.status, durationMs });
  } catch (err) {
    failures += 1;
    results.push({ url, ok: false, status: null, durationMs: Date.now() - startedAt, error: err?.message || String(err) });
  }
}

const payload = {
  ok: failures === 0,
  checkedAt: new Date().toISOString(),
  failures,
  results,
};

const line = JSON.stringify(payload);
if (payload.ok) console.log(line);
else console.error(line);

process.exit(payload.ok ? 0 : 1);

async function fetchWithTimeout(url, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
