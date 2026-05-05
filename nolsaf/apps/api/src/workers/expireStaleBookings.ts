/**
 * expireStaleBookings — background worker
 *
 * Hard-deletes bookings that were created but never paid within the TTL window.
 * Unpaid bookings have no right to persist — they reclaim blocked availability
 * dates and are not shown to admins or owners as cancelled noise.
 *
 * A booking is considered stale when:
 *   - status is "NEW" (created, no code issued, no payment)
 *   - createdAt is older than STALE_BOOKING_TTL_MS (default: 30 minutes)
 *   - has NO invoice currently PROCESSING, PAID, or CUSTOMER_PAID
 *     (an active payment attempt protects the booking until it resolves)
 *
 * Effect: hard DELETE from the database — no cancelled record left behind.
 * Associated invoices (DRAFT/PENDING only) and transport bookings are also deleted.
 */
import { prisma } from "@nolsaf/prisma";

type StartOptions = {
  /** How long before an unpaid NEW booking is purged. Default: 30 minutes. */
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

  // Find stale bookings — NEW status, no booking code, created before cutoff,
  // and no in-flight or completed payment (those are protected).
  const stale = await prisma.booking.findMany({
    where: {
      status: "NEW",
      createdAt: { lt: cutoff },
      code: null,
      invoices: {
        none: { status: { in: ["PROCESSING", "PAID", "CUSTOMER_PAID"] } },
      },
    },
    select: { id: true },
  });

  if (stale.length === 0) return;

  const staleIds = stale.map((b) => b.id);
  const paymentRefs = staleIds.map((id) => `BOOKING:${id}`);

  console.log(
    `[expireStaleBookings] Hard-deleting ${staleIds.length} stale unpaid booking(s): [${staleIds.join(", ")}]`
  );

  // Delete child records first (FK constraints), then the bookings themselves.
  // Only delete invoices that are not paid — paid invoices should never reach here
  // due to the filter above, but guard anyway.
  await prisma.invoice.deleteMany({
    where: {
      bookingId: { in: staleIds },
      status: { notIn: ["PAID", "CUSTOMER_PAID"] },
    },
  });

  await prisma.transportBooking.deleteMany({
    where: { paymentRef: { in: paymentRefs } },
  });

  // Hard delete the stale bookings
  await prisma.booking.deleteMany({
    where: { id: { in: staleIds }, status: "NEW" },
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
    `[expireStaleBookings] Started — TTL: ${ttlMs / 60000}min, interval: ${intervalMs / 60000}min (hard-delete mode)`
  );
}
