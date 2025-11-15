import { Router } from "express";
import type { Request, Response, RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth, requireRole } from "../middleware/auth";
import { invalidateOwnerReports } from "../lib/cache";
export const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("OWNER") as unknown as RequestHandler);

// Helper to format an invoice number (YYYYMM-<bookingId>-<codeId>)
// Helper to format an invoice number (YYYYMM-<bookingId>-<codeId>)
function makeInvoiceNumber(bookingId: number, codeId: number) {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2, "0")}`;
  return `INV-${ym}-${bookingId}-${codeId}`;
}

router.post("/from-booking", async (req, res) => {
  const authReq = req as AuthedRequest;
  const { bookingId } = authReq.body as { bookingId: number };
  if (!bookingId) return res.status(400).json({ error: "bookingId is required" });

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, property: { ownerId: authReq.user!.id } },
    include: { property: true, code: true }
  });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  if (booking.status !== "CHECKED_IN") return res.status(400).json({ error: "Booking must be CHECKED_IN" });
  if (!booking.code || booking.code.status !== "USED") return res.status(400).json({ error: "Check-in code must be USED" });

  // Owner details (sender)
  const owner = await prisma.user.findUnique({ where: { id: authReq.user!.id } });

  // Compute line item amount
  const nights = Math.max(1, Math.ceil((+booking.checkOut - +booking.checkIn) / (1000*60*60*24)));
  // Prefer totalAmount if you already computed; otherwise fallback to nights * pricePerNight
  const pricePerNight = (booking as any).pricePerNight ?? booking.property?.pricePerNight ?? null;
  const amount = booking.totalAmount ?? (pricePerNight ? (pricePerNight as any) * nights : 0);

  // Create invoice + item atomically
  interface MinimalInvoice {
    id: number;
  }

  interface InvoiceCreationDuplicate {
    duplicate: number;
  }

  interface InvoiceCreationSuccess {
    invoiceId: number;
  }

  type InvoiceCreationResult = InvoiceCreationDuplicate | InvoiceCreationSuccess;

  const created: InvoiceCreationResult = await prisma.$transaction(
    async (tx): Promise<InvoiceCreationResult> => {
      // prevent duplicates
      const exists: MinimalInvoice | null = await tx.invoice.findUnique({ where: { bookingId: booking.id } });
      if (exists) return { duplicate: exists.id };

      const invoice: MinimalInvoice = await tx.invoice.create({
        data: {
          invoiceNumber: makeInvoiceNumber(booking.id, booking.code!.id),
          ownerId: authReq.user!.id,
          bookingId: booking.id,

          // sender (owner)
          senderName: owner?.name ?? `Owner #${authReq.user!.id}`,
          senderAddress: (owner as any)?.address ?? null,
          senderPhone: owner?.phone ?? null,

          // receiver (NoLSAF) — you can move these to env vars if you want
          receiverName: "NoLSAF",
          receiverAddress: "Dar es Salaam, Tanzania",
          receiverPhone: "+255",

          subtotal: amount as any,
          taxPercent: 0 as any,
          taxAmount: 0 as any,
          total: amount as any
        } as any
      });

      // create invoice item via nested create on the invoice to avoid direct invoiceItem delegate
      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          items: {
            create: {
              description: `Accommodation at ${booking.property?.title ?? "property"} (${nights} nights)`,
              quantity: 1,
              unitPrice: amount as any,
              amount: amount as any
            }
          }
        }
      });

      return { invoiceId: invoice.id };
    }
  );

  if ("duplicate" in created) {
    return res.status(409).json({ error: "Invoice already exists for this code", invoiceId: created.duplicate });
  }

  return res.status(201).json({ ok: true, invoiceId: created.invoiceId });
});

/** GET /owner/invoices/:id — fetch full invoice (for preview) */
router.get("/:id", async (req: Request, res: Response) => {
  const authReq = req as AuthedRequest;
  const id = Number(authReq.params.id);
  const inv = await prisma.invoice.findFirst({
    where: { id, ownerId: authReq.user!.id },
    include: { items: true, booking: { include: { property: true, user: true } }, checkinCode: true }
  });
  if (!inv) return res.status(404).json({ error: "Not found" });
  return res.json(inv);
});

/** POST /owner/invoices/:id/submit — move DRAFT → SUBMITTED and notify admin */
router.post("/:id/submit", async (req, res) => {
  const authReq = req as AuthedRequest;
  const id = Number(authReq.params.id);
  const updated = await prisma.invoice.update({
    where: { id },
    data: { status: "SUBMITTED" }
  });
  await invalidateOwnerReports(updated.ownerId);
  // notify admins in real-time (optional)
  authReq.app.get("io").emit("admin:invoice:submitted", { invoiceId: updated.id, bookingId: updated.bookingId });
  return res.json({ ok: true, status: updated.status });
});
export default router;