/**
 * expireStaleBookings — background worker
 *
 * Hard-deletes bookings that were created but never paid, in two tiers:
 *
 *   A) Abandoned (short TTL, default 30 min): NEW booking with NO invoice at all
 *      — the guest never reached checkout. No reason to persist.
 *
 *   B) Expired drafts (long TTL, default 7 days): NEW booking WITH an unpaid
 *      invoice — the guest reached checkout but never paid. These surface in the
 *      customer "Draft" tab (payable for 12h, then shown as EXPIRED) so they are
 *      retained well past the payment window, then purged after the grace period.
 *
 * In both tiers a booking is protected (never deleted) if it has any invoice
 * currently PROCESSING, PAID, or CUSTOMER_PAID — an in-flight or completed
 * payment must always win. Only NEW bookings without a code are eligible.
 *
 * Effect: hard DELETE from the database — no cancelled record left behind.
 * Associated unpaid invoices and transport bookings are also deleted.
 *
 * Note: NEW is not in AVAILABILITY_BLOCKING_BOOKING_STATUSES, so retaining
 * drafts longer does not block property availability.
 */
import { prisma } from "@nolsaf/prisma";

type StartOptions = {
  /** How long before an abandoned NEW booking (no invoice) is purged. Default: 30 minutes. */
  ttlMs?: number;
  /** How long before an expired draft (NEW + unpaid invoice) is purged. Default: 7 days. */
  draftTtlMs?: number;
  /** How often the cleanup runs. Default: 5 minutes. */
  intervalMs?: number;
};

/** Milliseconds: 30 minutes */
const DEFAULT_TTL_MS = 30 * 60 * 1000;
/** Milliseconds: 7 days */
const DEFAULT_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Milliseconds: 5 minutes */
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

/** Invoice statuses that protect a booking from deletion (active/successful payment). */
const PROTECTING_INVOICE_STATUSES = ["PROCESSING", "PAID", "CUSTOMER_PAID"] as const;

/** Delete a batch of stale bookings together with their unpaid invoices and transport requests. */
async function purgeBookings(staleIds: number[], label: string): Promise<void> {
  if (staleIds.length === 0) return;

  const paymentRefs = staleIds.map((id) => `BOOKING:${id}`);

  console.log(
    `[expireStaleBookings] Hard-deleting ${staleIds.length} ${label} booking(s): [${staleIds.join(", ")}]`
  );

  // Delete child records first (FK constraints), then the bookings themselves.
  // Only delete invoices that are not paid — paid invoices should never reach here
  // due to the filters, but guard anyway.
  await prisma.invoice.deleteMany({
    where: {
      bookingId: { in: staleIds },
      status: { notIn: ["PAID", "CUSTOMER_PAID"] },
    },
  });

  await prisma.transportBooking.deleteMany({
    where: { paymentRef: { in: paymentRefs } },
  });

  await prisma.booking.deleteMany({
    where: { id: { in: staleIds }, status: "NEW" },
  });
}

async function expireStaleBookings(ttlMs: number, draftTtlMs: number): Promise<void> {
  const now = Date.now();
  const abandonedCutoff = new Date(now - ttlMs);
  const draftCutoff = new Date(now - draftTtlMs);

  // Tier A — abandoned: NEW, no code, no invoice at all, older than the short TTL.
  const abandoned = await prisma.booking.findMany({
    where: {
      status: "NEW",
      createdAt: { lt: abandonedCutoff },
      code: null,
      invoices: { none: {} },
    },
    select: { id: true },
  });

  // Tier B — expired drafts: NEW, no code, has invoice(s) but none protecting,
  // older than the long draft TTL.
  const expiredDrafts = await prisma.booking.findMany({
    where: {
      status: "NEW",
      createdAt: { lt: draftCutoff },
      code: null,
      invoices: {
        some: {},
        none: { status: { in: [...PROTECTING_INVOICE_STATUSES] } },
      },
    },
    select: { id: true },
  });

  await purgeBookings(abandoned.map((b) => b.id), "abandoned unpaid");
  await purgeBookings(expiredDrafts.map((b) => b.id), "expired draft");
}

export function startExpireStaleBookings({
  ttlMs = DEFAULT_TTL_MS,
  draftTtlMs = DEFAULT_DRAFT_TTL_MS,
  intervalMs = DEFAULT_INTERVAL_MS,
}: StartOptions = {}): void {
  // Run immediately on startup, then on a fixed interval
  void expireStaleBookings(ttlMs, draftTtlMs).catch((err) =>
    console.error("[expireStaleBookings] Error on startup run:", err?.message)
  );

  setInterval(() => {
    void expireStaleBookings(ttlMs, draftTtlMs).catch((err) =>
      console.error("[expireStaleBookings] Error:", err?.message)
    );
  }, intervalMs);

  console.log(
    `[expireStaleBookings] Started — abandoned TTL: ${ttlMs / 60000}min, draft TTL: ${draftTtlMs / 3600000}h, interval: ${intervalMs / 60000}min (hard-delete mode)`
  );
}
