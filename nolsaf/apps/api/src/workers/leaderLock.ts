import crypto from "crypto";
import { getRedis } from "../lib/redis.js";

/**
 * Distributed "leader" lease for background workers.
 *
 * Why this exists:
 *   The background workers (transport auto-dispatch, stale-booking expiry,
 *   licence reminders) MUST run on exactly one process. There is no other
 *   coordination, so if two app instances both started the timers they would
 *   double-process the same jobs (e.g. send a driver two offers, delete a
 *   booking twice). This lease guarantees only ONE process runs them, no
 *   matter how many instances exist — so it survives auto-scaling, rolling
 *   deploys, and accidental duplicate environments without any AWS config.
 *
 * How it works:
 *   - Acquire with `SET key id NX EX 60` (only succeeds if nobody holds it).
 *   - A heartbeat renews the lease every 25s so the holder keeps leadership.
 *   - If the holder dies, the lease expires (≤60s) and another process can
 *     take over on its next start.
 *
 * Redis-unavailable policy (FAIL-OPEN):
 *   If Redis cannot be reached we cannot coordinate, so we ALLOW this process
 *   to run the workers. On a single-instance deployment this is exactly right
 *   (there is no second process to clash with). On a future multi-instance
 *   deployment, a sustained Redis outage is the only window where duplicates
 *   could briefly occur — an acceptable, documented trade-off versus the
 *   alternative of silently stopping dispatch/expiry during an outage.
 */

const LOCK_KEY = "nolsaf:workers:leader";
const LEASE_TTL_SECONDS = 60;
const RENEW_INTERVAL_MS = 25_000;

// Unique per process so we can verify we still own the lease before renewing.
const instanceId = `${process.pid}-${crypto.randomBytes(6).toString("hex")}`;

let renewTimer: NodeJS.Timeout | null = null;
let holdsLease = false;

/**
 * Try to become the worker leader. Returns true if this process should run
 * the background workers.
 */
export async function acquireLeaderLock(): Promise<boolean> {
  const redis = getRedis();

  if (!redis) {
    console.warn(
      "[workers] Redis unavailable — running workers without a distributed lock (safe on a single instance)."
    );
    holdsLease = true; // fail-open
    return true;
  }

  try {
    const res = await redis.set(LOCK_KEY, instanceId, "EX", LEASE_TTL_SECONDS, "NX");
    if (res !== "OK") {
      // Someone else already holds the lease.
      return false;
    }
    holdsLease = true;
    startRenewal();
    return true;
  } catch (err: any) {
    console.warn(
      "[workers] Could not reach Redis to acquire the worker lease — running without a lock (single-instance safe):",
      err?.message || err
    );
    holdsLease = true; // fail-open
    return true;
  }
}

function startRenewal(): void {
  if (renewTimer) return;

  renewTimer = setInterval(async () => {
    const redis = getRedis();
    if (!redis) return; // transient; keep the lease we already hold
    try {
      const current = await redis.get(LOCK_KEY);
      if (current === instanceId) {
        // Still the leader — extend the lease.
        await redis.set(LOCK_KEY, instanceId, "EX", LEASE_TTL_SECONDS);
      } else if (current && current !== instanceId) {
        // Another process owns the lease now (only possible if we stalled long
        // enough for ours to expire). Stop renewing; we are no longer leader.
        // We intentionally do NOT tear down in-flight timers here to avoid
        // disrupting work mid-flight; the next restart re-evaluates leadership.
        console.warn(
          "[workers] Worker lease was taken over by another process; this process is no longer the leader."
        );
        holdsLease = false;
        stopRenewal();
      } else {
        // Lease expired with no owner — reclaim it.
        const reclaimed = await redis.set(LOCK_KEY, instanceId, "EX", LEASE_TTL_SECONDS, "NX");
        if (reclaimed !== "OK") {
          holdsLease = false;
          stopRenewal();
        }
      }
    } catch {
      // Transient Redis error — keep the lease we already hold and retry next tick.
    }
  }, RENEW_INTERVAL_MS);

  // Don't keep the event loop alive solely for the heartbeat.
  renewTimer.unref?.();
}

function stopRenewal(): void {
  if (renewTimer) {
    clearInterval(renewTimer);
    renewTimer = null;
  }
}

/**
 * Best-effort release on graceful shutdown so a redeploy can hand leadership
 * over immediately instead of waiting for the TTL to lapse.
 */
export async function releaseLeaderLock(): Promise<void> {
  stopRenewal();
  if (!holdsLease) return;
  holdsLease = false;
  const redis = getRedis();
  if (!redis) return;
  try {
    const current = await redis.get(LOCK_KEY);
    if (current === instanceId) {
      await redis.del(LOCK_KEY);
    }
  } catch {
    // Ignore — the lease will expire on its own.
  }
}
