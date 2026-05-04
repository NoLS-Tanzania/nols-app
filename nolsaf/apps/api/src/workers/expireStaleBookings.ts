/**
 * expireStaleBookings — background worker
 *
 * Automatically cancels bookings that were created but never paid.
 * This reclaims blocked availability dates and removes incentive for
 * bot-flooding the booking endpoint.
 *
 * A booking is considered stale when:
 *   - status is "NEW" (created, no code issued, no payment)
 *   - createdAt is older than STALE_BOOKING_TTL_MS (default: 30 minutes)
 *
 * Effect: set status = "CANCELED", leaving an audit trail in the DB.
 * Any associated PAYMENT_PENDING transport bookings are also cancelled.
 */
import { prisma } from "@nolsaf/prisma";

type StartOptions = {
  /** How long before an unpaid NEW booking is expired. Default: 30 minutes. */
  ttlMs?: number;
  /** How often the cleanup runs. Default: 5 minutes. */
  intervalMs?: number;
};

/** Milliseconds: 30 minutes */
const DEFAULT_TTL_MS = 30 * 60 * 1000;
/** Milliseconds: 5 minutes */
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

async function expireStaleBookings(ttlMs: number): Promise<void> {
  const cutoff = new Date(Date.now() - ttlMs);

  // Find stale bookings — NEW status, no booking code, created before cutoff.
  // We deliberately do NOT cancel bookings that have a code (paid or admin-issued).
  const stale = await prisma.booking.findMany({
    where: {
      status: "NEW",
      createdAt: { lt: cutoff },
      // Ensure no code has been issued (extra safety guard)
      code: null,
    },
    select: { id: true },
  });

  if (stale.length === 0) return;

  const staleIds = stale.map((b) => b.id);

  console.log(
    `[expireStaleBookings] Expiring ${staleIds.length} stale unpaid booking(s): [${staleIds.join(", ")}]`
  );

  // Cancel all stale bookings in one query
  await prisma.booking.updateMany({
    where: { id: { in: staleIds }, status: "NEW" },
    data: { status: "CANCELED" },
  });

  // Also cancel any PAYMENT_PENDING transport bookings linked to these bookings.
  // paymentRef format: "BOOKING:{bookingId}"
  const paymentRefs = staleIds.map((id) => `BOOKING:${id}`);
  await prisma.transportBooking.updateMany({
    where: {
      paymentRef: { in: paymentRefs },
      status: "PAYMENT_PENDING",
    },
    data: { status: "CANCELED" },
  });
}

export function startExpireStaleBookings({
  ttlMs = DEFAULT_TTL_MS,
  intervalMs = DEFAULT_INTERVAL_MS,
}: StartOptions = {}): void {
  // Run immediately on startup, then on a fixed interval
  void expireStaleBookings(ttlMs).catch((err) =>
    console.error("[expireStaleBookings] Error on startup run:", err?.message)
  );

  setInterval(() => {
    void expireStaleBookings(ttlMs).catch((err) =>
      console.error("[expireStaleBookings] Error:", err?.message)
    );
  }, intervalMs);

  console.log(
    `[expireStaleBookings] Started — TTL: ${ttlMs / 60000}min, interval: ${intervalMs / 60000}min`
  );
}
