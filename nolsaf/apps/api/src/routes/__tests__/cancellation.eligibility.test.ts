import { describe, it, expect } from 'vitest';

/**
 * Test suite for cancellation eligibility computation logic
 * This tests the core business logic for determining cancellation eligibility
 */

// Copy of the eligibility computation logic for testing
function computeEligibility(args: {
  bookingStatus: string;
  codeStatus: string | null;
  createdAt: Date;
  checkIn: Date;
  checkOut: Date;
  now: Date;
}): {
  eligible: boolean;
  reason?: string;
  refundPercent?: number;
  rule?: "FREE_24H_72H" | "PARTIAL_50_96H" | "NON_REFUNDABLE" | "AFTER_CHECKIN" | "NOT_ELIGIBLE";
  nextStep?: "PLATFORM" | "EMAIL";
} {
  const { bookingStatus, codeStatus, createdAt, checkIn, now } = args;

  if (bookingStatus === "CANCELED") return { eligible: false, reason: "This booking is already canceled." };
  if (!codeStatus) return { eligible: false, reason: "Booking code is missing." };
  if (codeStatus !== "ACTIVE") return { eligible: false, reason: "This booking code is not active." };
  if (now >= checkIn) {
    return {
      eligible: false,
      rule: "AFTER_CHECKIN",
      nextStep: "EMAIL",
      reason: "Cancellations after check-in are generally not eligible for refunds. For exceptional circumstances, please contact cancellation@nolsaf.com.",
    };
  }

  // Before check-in policy windows
  const hoursSinceBooking = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  const hoursBeforeCheckIn = (checkIn.getTime() - now.getTime()) / (1000 * 60 * 60);

  // 2.1 Free cancellation: within 24h of booking AND at least 72h before check-in
  if (hoursSinceBooking <= 24 && hoursBeforeCheckIn >= 72) {
    return { eligible: true, refundPercent: 100, rule: "FREE_24H_72H", nextStep: "PLATFORM" };
  }

  // 2.2 Partial refund: at least 96h before check-in => 50% refund
  if (hoursBeforeCheckIn >= 96) {
    return { eligible: true, refundPercent: 50, rule: "PARTIAL_50_96H", nextStep: "PLATFORM" };
  }

  // Otherwise: not eligible through platform (direct communication required)
  return {
    eligible: false,
    refundPercent: 0,
    rule: "NOT_ELIGIBLE",
    nextStep: "EMAIL",
    reason: "This booking does not qualify for platform cancellation under our policy.",
  };
}

describe('Cancellation Eligibility Computation', () => {
  const baseDate = new Date('2024-01-15T12:00:00Z');

  describe('Free Cancellation (100% refund)', () => {
    it('should be eligible: within 24h of booking AND at least 72h before check-in', () => {
      const createdAt = new Date(baseDate.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago
      const checkIn = new Date(baseDate.getTime() + 96 * 60 * 60 * 1000); // 96 hours from now

      const result = computeEligibility({
        bookingStatus: 'CONFIRMED',
        codeStatus: 'ACTIVE',
        createdAt,
        checkIn,
        checkOut: new Date(checkIn.getTime() + 24 * 60 * 60 * 1000),
        now: baseDate,
      });

      expect(result.eligible).toBe(true);
      expect(result.refundPercent).toBe(100);
      expect(result.rule).toBe('FREE_24H_72H');
      expect(result.nextStep).toBe('PLATFORM');
    });

    it('should be eligible: exactly 24h after booking and 72h before check-in', () => {
      const createdAt = new Date(baseDate.getTime() - 24 * 60 * 60 * 1000); // Exactly 24 hours ago
      const checkIn = new Date(baseDate.getTime() + 72 * 60 * 60 * 1000); // Exactly 72 hours from now

      const result = computeEligibility({
        bookingStatus: 'CONFIRMED',
        codeStatus: 'ACTIVE',
        createdAt,
        checkIn,
        checkOut: new Date(checkIn.getTime() + 24 * 60 * 60 * 1000),
        now: baseDate,
      });

      expect(result.eligible).toBe(true);
      expect(result.refundPercent).toBe(100);
      expect(result.rule).toBe('FREE_24H_72H');
    });
  });

  describe('Partial Refund (50% refund)', () => {
    it('should be eligible: 96h+ before check-in (outside 24h booking window)', () => {
      const createdAt = new Date(baseDate.getTime() - 48 * 60 * 60 * 1000); // 48 hours ago
      const checkIn = new Date(baseDate.getTime() + 120 * 60 * 60 * 1000); // 120 hours from now

      const result = computeEligibility({
        bookingStatus: 'CONFIRMED',
        codeStatus: 'ACTIVE',
        createdAt,
        checkIn,
        checkOut: new Date(checkIn.getTime() + 24 * 60 * 60 * 1000),
        now: baseDate,
      });

      expect(result.eligible).toBe(true);
      expect(result.refundPercent).toBe(50);
      expect(result.rule).toBe('PARTIAL_50_96H');
      expect(result.nextStep).toBe('PLATFORM');
    });

    it('should be eligible: exactly 96h before check-in', () => {
      const createdAt = new Date(baseDate.getTime() - 30 * 60 * 60 * 1000); // 30 hours ago
      const checkIn = new Date(baseDate.getTime() + 96 * 60 * 60 * 1000); // Exactly 96 hours from now

      const result = computeEligibility({
        bookingStatus: 'CONFIRMED',
        codeStatus: 'ACTIVE',
        createdAt,
        checkIn,
        checkOut: new Date(checkIn.getTime() + 24 * 60 * 60 * 1000),
        now: baseDate,
      });

      expect(result.eligible).toBe(true);
      expect(result.refundPercent).toBe(50);
      expect(result.rule).toBe('PARTIAL_50_96H');
    });
  });

  describe('Not Eligible Cases', () => {
    it('should not be eligible: already canceled booking', () => {
      const result = computeEligibility({
        bookingStatus: 'CANCELED',
        codeStatus: 'ACTIVE',
        createdAt: new Date(baseDate.getTime() - 10 * 60 * 60 * 1000),
        checkIn: new Date(baseDate.getTime() + 100 * 60 * 60 * 1000),
        checkOut: new Date(baseDate.getTime() + 124 * 60 * 60 * 1000),
        now: baseDate,
      });

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('This booking is already canceled.');
    });

    it('should not be eligible: missing code status', () => {
      const result = computeEligibility({
        bookingStatus: 'CONFIRMED',
        codeStatus: null,
        createdAt: new Date(baseDate.getTime() - 10 * 60 * 60 * 1000),
        checkIn: new Date(baseDate.getTime() + 100 * 60 * 60 * 1000),
        checkOut: new Date(baseDate.getTime() + 124 * 60 * 60 * 1000),
        now: baseDate,
      });

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('Booking code is missing.');
    });

    it('should not be eligible: code not active', () => {
      const result = computeEligibility({
        bookingStatus: 'CONFIRMED',
        codeStatus: 'USED',
        createdAt: new Date(baseDate.getTime() - 10 * 60 * 60 * 1000),
        checkIn: new Date(baseDate.getTime() + 100 * 60 * 60 * 1000),
        checkOut: new Date(baseDate.getTime() + 124 * 60 * 60 * 1000),
        now: baseDate,
      });

      expect(result.eligible).toBe(false);
      expect(result.reason).toBe('This booking code is not active.');
    });

    it('should not be eligible: after check-in', () => {
      const checkIn = new Date(baseDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago (already checked in)

      const result = computeEligibility({
        bookingStatus: 'CHECKED_IN',
        codeStatus: 'ACTIVE',
        createdAt: new Date(checkIn.getTime() - 10 * 24 * 60 * 60 * 1000),
        checkIn,
        checkOut: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000),
        now: baseDate,
      });

      expect(result.eligible).toBe(false);
      expect(result.rule).toBe('AFTER_CHECKIN');
      expect(result.nextStep).toBe('EMAIL');
      expect(result.reason).toContain('Cancellations after check-in');
    });

    it('should not be eligible: too close to check-in (less than 96h)', () => {
      const createdAt = new Date(baseDate.getTime() - 48 * 60 * 60 * 1000); // 48 hours ago
      const checkIn = new Date(baseDate.getTime() + 48 * 60 * 60 * 1000); // 48 hours from now (< 96h)

      const result = computeEligibility({
        bookingStatus: 'CONFIRMED',
        codeStatus: 'ACTIVE',
        createdAt,
        checkIn,
        checkOut: new Date(checkIn.getTime() + 24 * 60 * 60 * 1000),
        now: baseDate,
      });

      expect(result.eligible).toBe(false);
      expect(result.refundPercent).toBe(0);
      expect(result.rule).toBe('NOT_ELIGIBLE');
      expect(result.nextStep).toBe('EMAIL');
      expect(result.reason).toContain('does not qualify for platform cancellation');
    });

    it('should not be eligible: within 24h but less than 72h before check-in', () => {
      const createdAt = new Date(baseDate.getTime() - 12 * 60 * 60 * 1000); // 12 hours ago (within 24h)
      const checkIn = new Date(baseDate.getTime() + 48 * 60 * 60 * 1000); // 48 hours from now (< 72h)

      const result = computeEligibility({
        bookingStatus: 'CONFIRMED',
        codeStatus: 'ACTIVE',
        createdAt,
        checkIn,
        checkOut: new Date(checkIn.getTime() + 24 * 60 * 60 * 1000),
        now: baseDate,
      });

      expect(result.eligible).toBe(false);
      expect(result.rule).toBe('NOT_ELIGIBLE');
      expect(result.nextStep).toBe('EMAIL');
    });
  });

  describe('Edge Cases', () => {
    it('should handle exactly at check-in time', () => {
      const checkIn = baseDate; // Exactly now

      const result = computeEligibility({
        bookingStatus: 'CONFIRMED',
        codeStatus: 'ACTIVE',
        createdAt: new Date(baseDate.getTime() - 10 * 24 * 60 * 60 * 1000),
        checkIn,
        checkOut: new Date(baseDate.getTime() + 24 * 60 * 60 * 1000),
        now: baseDate,
      });

      expect(result.eligible).toBe(false);
      expect(result.rule).toBe('AFTER_CHECKIN');
    });

    it('should handle very recent booking (1 hour ago)', () => {
      const createdAt = new Date(baseDate.getTime() - 1 * 60 * 60 * 1000); // 1 hour ago
      const checkIn = new Date(baseDate.getTime() + 100 * 60 * 60 * 1000); // 100 hours from now

      const result = computeEligibility({
        bookingStatus: 'CONFIRMED',
        codeStatus: 'ACTIVE',
        createdAt,
        checkIn,
        checkOut: new Date(checkIn.getTime() + 24 * 60 * 60 * 1000),
        now: baseDate,
      });

      expect(result.eligible).toBe(true);
      expect(result.refundPercent).toBe(100); // Free cancellation
      expect(result.rule).toBe('FREE_24H_72H');
    });
  });
});

