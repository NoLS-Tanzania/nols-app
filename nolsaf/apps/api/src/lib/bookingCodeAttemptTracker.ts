import { getRedis } from "./redis.js";

const MAX_FAILURES = 3;
const LOCKOUT_MS = 5 * 60 * 1000;
// If a user stops trying for a while, forget the failure streak.
const FAILURE_STREAK_TTL_SECONDS = 15 * 60;

type LockoutStatus = {
  locked: boolean;
  lockedUntil: number | null;
  remainingMs: number | null;
  failures: number;
  remainingAttempts: number;
};

type RecordFailureResult = LockoutStatus & {
  justLocked: boolean;
};

function failKey(ownerId: number) {
  return `nols:owner:booking-code:fail:${ownerId}`;
}

function lockKey(ownerId: number) {
  return `nols:owner:booking-code:lock:${ownerId}`;
}

// In-memory fallback (for dev/test or if Redis is unavailable)
const mem = new Map<
  number,
  {
    failures: number;
    lastFailureAt: number;
    lockedUntil: number | null;
  }
>();

function readMem(ownerId: number): { failures: number; lockedUntil: number | null } {
  const now = Date.now();
  const cur = mem.get(ownerId);
  if (!cur) return { failures: 0, lockedUntil: null };

  if (cur.lockedUntil && cur.lockedUntil <= now) {
    mem.delete(ownerId);
    return { failures: 0, lockedUntil: null };
  }

  if (!cur.lockedUntil && now - cur.lastFailureAt > FAILURE_STREAK_TTL_SECONDS * 1000) {
    mem.delete(ownerId);
    return { failures: 0, lockedUntil: null };
  }

  return { failures: cur.failures, lockedUntil: cur.lockedUntil };
}

function toStatus(ownerId: number, failures: number, lockedUntil: number | null): LockoutStatus {
  const now = Date.now();
  const locked = !!lockedUntil && lockedUntil > now;
  const remainingMs = locked ? lockedUntil! - now : null;
  const remainingAttempts = locked ? 0 : Math.max(0, MAX_FAILURES - failures);
  return {
    locked,
    lockedUntil: locked ? lockedUntil : null,
    remainingMs,
    failures: locked ? 0 : failures,
    remainingAttempts,
  };
}

export async function getBookingCodeLockoutStatus(ownerId: number): Promise<LockoutStatus> {
  const redis = getRedis();
  if (redis && redis.status === "ready") {
    try {
      const [lockedUntilRaw, failuresRaw] = await Promise.all([
        redis.get(lockKey(ownerId)).catch(() => null),
        redis.get(failKey(ownerId)).catch(() => null),
      ]);

      const lockedUntil = lockedUntilRaw ? Number(lockedUntilRaw) : null;
      const failures = failuresRaw ? Number(failuresRaw) : 0;
      return toStatus(ownerId, Number.isFinite(failures) ? failures : 0, Number.isFinite(lockedUntil) ? lockedUntil : null);
    } catch {
      // fall through to memory
    }
  }

  const { failures, lockedUntil } = readMem(ownerId);
  return toStatus(ownerId, failures, lockedUntil);
}

export async function clearBookingCodeFailures(ownerId: number): Promise<void> {
  const redis = getRedis();
  if (redis && redis.status === "ready") {
    try {
      await redis.del(failKey(ownerId)).catch(() => null);
      return;
    } catch {
      // fall through
    }
  }

  const cur = mem.get(ownerId);
  if (!cur) return;
  if (cur.lockedUntil) {
    // keep lockout (if any), but reset streak
    mem.set(ownerId, { failures: 0, lastFailureAt: Date.now(), lockedUntil: cur.lockedUntil });
    return;
  }
  mem.delete(ownerId);
}

export async function recordBookingCodeFailure(ownerId: number): Promise<RecordFailureResult> {
  const redis = getRedis();
  const now = Date.now();

  if (redis && redis.status === "ready") {
    try {
      // If locked, return immediately
      const lockedUntilRaw = await redis.get(lockKey(ownerId)).catch(() => null);
      const lockedUntil = lockedUntilRaw ? Number(lockedUntilRaw) : null;
      if (lockedUntil && Number.isFinite(lockedUntil) && lockedUntil > now) {
        const status = toStatus(ownerId, 0, lockedUntil);
        return { ...status, justLocked: false };
      }

      // Increment failure streak (with TTL)
      const failures = await redis.incr(failKey(ownerId));
      if (failures === 1) {
        await redis.expire(failKey(ownerId), FAILURE_STREAK_TTL_SECONDS).catch(() => null);
      }

      if (failures >= MAX_FAILURES) {
        const until = now + LOCKOUT_MS;
        await redis
          .multi()
          .set(lockKey(ownerId), String(until), "PX", LOCKOUT_MS)
          .del(failKey(ownerId))
          .exec();

        const status = toStatus(ownerId, 0, until);
        return { ...status, justLocked: true };
      }

      const status = toStatus(ownerId, failures, null);
      return { ...status, justLocked: false };
    } catch {
      // fall through to memory
    }
  }

  const cur = mem.get(ownerId);
  const read = readMem(ownerId);
  if (read.lockedUntil) {
    const status = toStatus(ownerId, 0, read.lockedUntil);
    return { ...status, justLocked: false };
  }

  const nextFailures = (cur?.failures ?? 0) + 1;
  if (nextFailures >= MAX_FAILURES) {
    const until = now + LOCKOUT_MS;
    mem.set(ownerId, { failures: 0, lastFailureAt: now, lockedUntil: until });
    const status = toStatus(ownerId, 0, until);
    return { ...status, justLocked: true };
  }

  mem.set(ownerId, { failures: nextFailures, lastFailureAt: now, lockedUntil: null });
  const status = toStatus(ownerId, nextFailures, null);
  return { ...status, justLocked: false };
}
