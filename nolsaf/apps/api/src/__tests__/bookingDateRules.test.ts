import { describe, expect, it } from "vitest";
import { isCheckInBeforeToday } from "../lib/bookingDateRules.js";

describe("isCheckInBeforeToday", () => {
  it("allows today's check-in for the whole business day", () => {
    const now = new Date("2026-06-18T12:00:00.000Z");
    const checkIn = new Date("2026-06-18T00:00:00.000Z");

    expect(isCheckInBeforeToday(checkIn, now)).toBe(false);
  });

  it("blocks dates before today in the business timezone", () => {
    const now = new Date("2026-06-18T12:00:00.000Z");
    const checkIn = new Date("2026-06-17T20:59:59.000Z");

    expect(isCheckInBeforeToday(checkIn, now)).toBe(true);
  });
});
