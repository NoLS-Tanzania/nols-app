/**
 * Collects recent AzamPay PaymentEvent IDs so they can be shared with AzamPay
 * support when they ask for "sample transaction IDs performed on sandbox".
 *
 * Usage:
 *   npm run azp:ids                    # last 20 events
 *   npm run azp:ids -- --limit=50      # last 50 events
 *   npm run azp:ids -- --since=2026-05-01
 *   npm run azp:ids -- --channel=MNO   # filter by channel (MNO/BANK/CARD)
 */

import "dotenv/config";
import { prisma } from "../src/lib/db.js";

interface CliArgs {
  limit:   number;
  since?:  Date;
  channel?: string;
}

function parseArgs(): CliArgs {
  const args: CliArgs = { limit: 20 };
  for (const arg of process.argv.slice(2)) {
    const m = /^--([^=]+)=(.+)$/.exec(arg);
    if (!m) continue;
    const [, key, value] = m;
    if (key === "limit")   args.limit   = Math.max(1, Math.min(500, Number(value) || 20));
    if (key === "since")   args.since   = new Date(value);
    if (key === "channel") args.channel = value.toUpperCase();
  }
  return args;
}

function pad(s: string, n: number): string {
  if (s.length >= n) return s.slice(0, n);
  return s + " ".repeat(n - s.length);
}

(async () => {
  const { limit, since, channel } = parseArgs();

  const where: any = { provider: "AZAMPAY" };
  if (since)   where.createdAt      = { gte: since };
  if (channel) where.paymentChannel = channel;

  const events = await prisma.paymentEvent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take:    limit,
    select: {
      createdAt:      true,
      eventId:        true,
      status:         true,
      rawStatus:      true,
      paymentChannel: true,
      phone:          true,
      invoiceId:      true,
      tourBookingId:  true,
      amount:         true,
      currency:       true,
      payload:        true,
    },
  });

  if (events.length === 0) {
    console.log("No AzamPay PaymentEvents found matching the criteria.");
    await prisma.$disconnect();
    process.exit(0);
  }

  // ── Human-readable table ───────────────────────────────────────────────────
  console.log("");
  console.log("AzamPay PaymentEvents — share with support");
  console.log("=".repeat(140));
  console.log(
    pad("Created (UTC)",         22) +
    pad("Channel",                8) +
    pad("Target",                14) +
    pad("Amount",                12) +
    pad("paymentRef (externalId)", 32) +
    pad("transactionId",         28) +
    pad("Status", 12),
  );
  console.log("-".repeat(140));

  for (const e of events) {
    const payload    = (e.payload as any) ?? {};
    const paymentRef = payload.paymentRef ?? "(none)";
    const txnId      = payload.transactionId ?? "(none)";
    const target     = e.invoiceId
      ? `inv:${e.invoiceId}`
      : e.tourBookingId
        ? `tour:${e.tourBookingId}`
        : "-";
    const amount = `${Number(e.amount).toFixed(0)} ${e.currency}`;

    console.log(
      pad(e.createdAt.toISOString().replace("T", " ").slice(0, 19), 22) +
      pad(e.paymentChannel ?? "-",      8) +
      pad(target,                      14) +
      pad(amount,                      12) +
      pad(paymentRef,                  32) +
      pad(txnId,                       28) +
      pad(e.status,                    12),
    );
  }

  // ── Copy-paste-ready block for email/ticket ────────────────────────────────
  console.log("");
  console.log("Copy-paste-ready (paymentRef / transactionId pairs):");
  console.log("-".repeat(140));
  for (const e of events) {
    const payload    = (e.payload as any) ?? {};
    const paymentRef = payload.paymentRef ?? "(none)";
    const txnId      = payload.transactionId ?? "(no transactionId returned — MNO push)";
    const when       = e.createdAt.toISOString();
    const phone      = e.phone ? ` phone=${e.phone}` : "";
    console.log(`• ${when}  ${e.paymentChannel ?? "-"}  paymentRef=${paymentRef}  transactionId=${txnId}${phone}`);
  }
  console.log("");
  console.log(`Total: ${events.length} event(s)`);

  await prisma.$disconnect();
})().catch(async (err) => {
  console.error("Failed to collect AzamPay IDs:", err?.message ?? err);
  await prisma.$disconnect();
  process.exit(1);
});
