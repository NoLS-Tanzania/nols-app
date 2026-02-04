import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { Prisma } from "@prisma/client";
import { AuthedRequest, requireAuth, requireRole } from "../middleware/auth.js";
import { invalidateOwnerReports } from "../lib/cache.js";
export const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("OWNER") as unknown as RequestHandler);

/** GET /owner/invoices/for-booking/:bookingId — check if invoice already exists (used to lock Generate Invoice UI) */
router.get("/for-booking/:bookingId", async (req, res) => {
  const r = req as AuthedRequest;
  const ownerId = r.user!.id;
  const bookingId = Number(req.params.bookingId);
  if (!bookingId) return res.status(400).json({ error: "bookingId is required" });

  // IMPORTANT:
  // - "Customer payment invoices" created by the public payment flow use paymentRef like "INVREF-..."
  //   and historically used statuses like APPROVED. Those must NOT lock the owner's "Generate Invoice".
  // - Owner-submitted invoices are identified by invoiceNumber prefix "OINV-".
  const inv = await prisma.invoice.findFirst({
    where: { ownerId, bookingId, invoiceNumber: { startsWith: "OINV-" } } as any,
    orderBy: { id: "desc" } as any,
    select: { id: true, status: true, invoiceNumber: true, paymentRef: true, commissionPercent: true } as any,
  });

  return res.json({
    ok: true,
    exists: !!inv,
    invoiceId: inv?.id ?? null,
    status: inv?.status ?? null,
    invoiceNumber: inv?.invoiceNumber ?? null,
  });
});

// Helper to format an invoice number (YYYYMM-<bookingId>-<codeId>)
// Helper to format an invoice number (YYYYMM-<bookingId>-<codeId>)
function makeInvoiceNumber(bookingId: number, codeId: number) {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2, "0")}`;
  // Separate owner-submitted invoices from public payment invoices (INV-...).
  return `OINV-${ym}-${bookingId}-${codeId}`;
}

router.post("/from-booking", async (req, res) => {
  try {
    const authReq = req as AuthedRequest;
    const ownerId = authReq.user!.id;
    const { bookingId } = authReq.body as { bookingId: number };

    if (!bookingId) return res.status(400).json({ error: "bookingId is required" });

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, property: { ownerId } },
      include: { property: true, code: true }
    });
    if (!booking) return res.status(404).json({ error: "Booking not found" });
    if (booking.status !== "CHECKED_IN") return res.status(400).json({ error: "Booking must be CHECKED_IN" });
    if (!booking.code || booking.code.status !== "USED") return res.status(400).json({ error: "Check-in code must be USED" });

    // Owner details (sender)
    const owner = await prisma.user.findUnique({ where: { id: ownerId } });

  // Compute line item amount
  const nights = Math.max(1, Math.ceil((+booking.checkOut - +booking.checkIn) / (1000*60*60*24)));
  // Prefer totalAmount if you already computed; otherwise fallback to nights * pricePerNight
  const pricePerNight = (booking as any).pricePerNight ?? booking.property?.pricePerNight ?? null;
  const transportFare = (booking as any).includeTransport ? Number((booking as any).transportFare || 0) : 0;
  const amount = booking.totalAmount
    ? Math.max(0, Number(booking.totalAmount) - transportFare)
    : (pricePerNight ? (pricePerNight as any) * nights : 0);

  // Create invoice + item atomically
  type MinimalInvoice = Prisma.InvoiceGetPayload<{ select: { id: true } }>;

  interface InvoiceCreationDuplicate {
    duplicate: number;
  }

  interface InvoiceCreationSuccess {
    invoiceId: number;
  }

  type InvoiceCreationResult = InvoiceCreationDuplicate | InvoiceCreationSuccess;

    const invoiceNumber = makeInvoiceNumber(booking.id, booking.code!.id);

    const created: InvoiceCreationResult = await prisma.$transaction(
      async (tx: Prisma.TransactionClient): Promise<InvoiceCreationResult> => {
      // prevent duplicates using the unique invoiceNumber (safe for retries/double-click)
      const exists: MinimalInvoice | null = await tx.invoice.findFirst({
        where: { invoiceNumber, ownerId } as any,
        select: { id: true },
      });
      if (exists) {
        return { duplicate: exists.id };
      }

        // IMPORTANT: Prisma schema for Invoice in this codebase does NOT include
        // sender/receiver fields or invoice items. Keep creation aligned to schema.
        const invoice: MinimalInvoice = await tx.invoice.create({
          data: {
            invoiceNumber,
            ownerId,
            bookingId: booking.id,
            // Enforce one-time flow:
            // - Create once as DRAFT
            // - Explicit submit later moves it to REQUESTED
            status: "DRAFT",
            total: amount as any,
            taxPercent: 0 as any,
            commissionPercent: null,
            commissionAmount: null,
            netPayable: null,
          } as any,
          select: { id: true },
        });

        return { invoiceId: invoice.id };
      }
    );

    if ("duplicate" in created) {
      // Idempotent: return existing invoice as success (avoid "error" UX and prevent retries creating duplicates).
      return res.status(200).json({ ok: true, existed: true, invoiceId: created.duplicate, status: "DRAFT" });
    }

    return res.status(201).json({ ok: true, existed: false, invoiceId: created.invoiceId, status: "DRAFT" });
  } catch (err: any) {
    // If a retry/double-click races, invoiceNumber uniqueness may throw P2002.
    // Resolve by returning the existing invoiceId (idempotent behavior).
    try {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        const authReq = req as AuthedRequest;
        const ownerId = authReq.user!.id;
        const { bookingId } = authReq.body as { bookingId: number };
        if (bookingId) {
          const booking = await prisma.booking.findFirst({
            where: { id: bookingId, property: { ownerId } },
            include: { code: true },
          });
          if (booking?.code?.id) {
            const invoiceNumber = makeInvoiceNumber(booking.id, booking.code.id);
            const existing = await prisma.invoice.findFirst({ where: { ownerId, invoiceNumber } as any, select: { id: true } as any });
            if (existing?.id) {
              return res.status(200).json({ ok: true, existed: true, invoiceId: existing.id, status: "DRAFT" });
            }
          }
        }
      }
    } catch {
      // fall through to 500
    }
    return res.status(500).json({ error: "Failed to create invoice", detail: err?.message || String(err) });
  }
});

/** GET /owner/invoices/:id — fetch full invoice (for preview) */
router.get("/:id", async (req: Request, res: Response) => {
  const authReq = req as AuthedRequest;
  const id = Number(authReq.params.id);
  const inv = await prisma.invoice.findFirst({
    where: { id, ownerId: authReq.user!.id, invoiceNumber: { startsWith: "OINV-" } } as any,
    include: { booking: { include: { property: true, user: true, code: true } } },
  });
  if (!inv) return res.status(404).json({ error: "Not found" });

  // Enrich response for the owner UI (these are derived fields, not stored on Invoice).
  const owner = await prisma.user.findUnique({ where: { id: authReq.user!.id } });
  const checkIn = (inv as any).booking?.checkIn ? new Date((inv as any).booking.checkIn) : null;
  const checkOut = (inv as any).booking?.checkOut ? new Date((inv as any).booking.checkOut) : null;
  const nights =
    checkIn && checkOut ? Math.max(1, Math.ceil((+checkOut - +checkIn) / (1000 * 60 * 60 * 24))) : null;
  const propertyTitle = (inv as any).booking?.property?.title ?? "property";
  const lineDescription = `Accommodation at ${propertyTitle}${nights ? ` (${nights} nights)` : ""}`;
  const total = Number((inv as any).total ?? 0);

  return res.json({
    ...inv,
    title: `${propertyTitle} — Accommodation Invoice`,
    currency: "TZS",
    senderName: owner?.name ?? `Owner #${authReq.user!.id}`,
    senderPhone: owner?.phone ?? null,
    senderAddress: (owner as any)?.address ?? null,
    receiverName: "NoLSAF",
    receiverPhone: "+255",
    receiverAddress: "Dar es Salaam, Tanzania",
    items: [
      {
        id: `synthetic-${inv.id}-1`,
        description: lineDescription,
        quantity: 1,
        unitPrice: total,
        amount: total,
      },
    ],
    checkinCode: (inv as any).booking?.code ?? null,
  });
});

/** POST /owner/invoices/:id/submit — move DRAFT → REQUESTED (one-time) and notify admin */
router.post("/:id/submit", async (req, res) => {
  const authReq = req as AuthedRequest;
  const id = Number(authReq.params.id);
  const ownerId = authReq.user!.id;

  const inv = await prisma.invoice.findFirst({ where: { id, ownerId, invoiceNumber: { startsWith: "OINV-" } } as any });
  if (!inv) return res.status(404).json({ error: "Not found" });

  // Idempotent: if already submitted/processed, do nothing (prevents repeats + duplicate admin events).
  if (inv.status !== "DRAFT") {
    return res.json({ ok: true, status: inv.status, alreadySubmitted: true });
  }

  const updated = await prisma.invoice.update({
    where: { id: inv.id },
    // Align to schema statuses: REQUESTED → (admin) VERIFIED → APPROVED → PROCESSING → PAID / REJECTED
    data: { status: "REQUESTED" },
  });
  await invalidateOwnerReports(updated.ownerId);
  // notify admins in real-time (optional) - only once (when transitioning DRAFT -> REQUESTED)
  try { authReq.app.get("io")?.emit?.("admin:invoice:submitted", { invoiceId: updated.id, bookingId: updated.bookingId }); } catch {}

  return res.json({ ok: true, status: updated.status, alreadySubmitted: false });
});
export default router;