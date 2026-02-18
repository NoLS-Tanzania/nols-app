import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  clearBookingCodeFailures,
  getBookingCodeLockoutStatus,
  recordBookingCodeFailure,
} from "../lib/bookingCodeAttemptTracker.js";

describe("bookingCodeAttemptTracker", () => {
  const ownerId = 12345;

  beforeEach(async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-02-17T10:00:00.000Z"));
    await clearBookingCodeFailures(ownerId);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("locks after 3 consecutive failures for 5 minutes", async () => {
    const r1 = await recordBookingCodeFailure(ownerId);
    expect(r1.locked).toBe(false);
    expect(r1.remainingAttempts).toBe(2);

    const r2 = await recordBookingCodeFailure(ownerId);
    expect(r2.locked).toBe(false);
    expect(r2.remainingAttempts).toBe(1);

    const r3 = await recordBookingCodeFailure(ownerId);
    expect(r3.locked).toBe(true);
    expect(r3.lockedUntil).toBeTypeOf("number");

    const status = await getBookingCodeLockoutStatus(ownerId);
    expect(status.locked).toBe(true);
    expect(status.remainingAttempts).toBe(0);
  });

  it("unlocks after lockout duration passes", async () => {
    await recordBookingCodeFailure(ownerId);
    await recordBookingCodeFailure(ownerId);
    const locked = await recordBookingCodeFailure(ownerId);
    expect(locked.locked).toBe(true);

    vi.advanceTimersByTime(5 * 60 * 1000 + 10);

    const status = await getBookingCodeLockoutStatus(ownerId);
    expect(status.locked).toBe(false);
  });
});
