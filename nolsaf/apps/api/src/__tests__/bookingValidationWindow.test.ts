import { describe, it, expect } from "vitest";
import { getBookingValidationWindowStatus } from "../lib/bookingValidationWindow.js";

describe("getBookingValidationWindowStatus", () => {
  it("blocks validation before check-in date", () => {
    const checkIn = new Date(2026, 1, 22, 12, 0, 0);
    const checkOut = new Date(2026, 1, 23, 12, 0, 0);
    const now = new Date(2026, 1, 21, 12, 0, 0);

    const r = getBookingValidationWindowStatus(checkIn, checkOut, now);
    expect(r.canValidate).toBe(false);
    expect(r.status).toBe("BEFORE_CHECKIN");
  });

  it("allows validation during the window (inclusive)", () => {
    const checkIn = new Date(2026, 1, 20, 12, 0, 0);
    const checkOut = new Date(2026, 1, 23, 12, 0, 0);

    expect(getBookingValidationWindowStatus(checkIn, checkOut, new Date(2026, 1, 20, 10, 0, 0)).canValidate).toBe(true);
    expect(getBookingValidationWindowStatus(checkIn, checkOut, new Date(2026, 1, 23, 23, 59, 59)).canValidate).toBe(true);
  });

  it("blocks validation after check-out date", () => {
    const checkIn = new Date(2026, 1, 20, 12, 0, 0);
    const checkOut = new Date(2026, 1, 23, 12, 0, 0);
    const now = new Date(2026, 1, 24, 1, 0, 0);

    const r = getBookingValidationWindowStatus(checkIn, checkOut, now);
    expect(r.canValidate).toBe(false);
    expect(r.status).toBe("AFTER_CHECKOUT");
  });
});
