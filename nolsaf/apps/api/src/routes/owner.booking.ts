// apps/api/src/routes/owner.bookings.ts
import { Router } from "express";
import type { RequestHandler, Response } from 'express';
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth, requireRole } from "../middleware/auth.js";
import { invalidateOwnerReports } from "../lib/cache.js";
import { validateBookingCode, markBookingCodeAsUsed } from "../lib/bookingCodeService.js";

export const router = Router();
router.use(
  requireAuth as RequestHandler,
  requireRole("OWNER") as RequestHandler
);

function differenceInCalendarDays(end: Date | string, start: Date | string) {
  const e = new Date(end);
  const s = new Date(start);
  // normalize to calendar days (ignore time)
  e.setHours(0, 0, 0, 0);
  s.setHours(0, 0, 0, 0);
  return Math.round((e.getTime() - s.getTime()) / 86400000);
}

/** PREVIEW: validate code and return all details (no state change) */
const validateBooking: RequestHandler = async (req, res) => {
  const r = req as AuthedRequest;
  const { code } = req.body as { code: string };
  if (!code) return (res as Response).status(400).json({ error: "Code is required" });

  // Use the booking code service to validate
  const validation = await validateBookingCode(code.trim(), r.user!.id);

  if (!validation.valid || !validation.booking) {
    return (res as Response).status(400).json({ 
      error: validation.error || "Invalid or expired code" 
    });
  }

  const booking = validation.booking;
  const codeRecord = booking.code;

  // Compute derived fields
  const nights = differenceInCalendarDays(booking.checkOut, booking.checkIn);

  // Map details with all booking information
  const details = {
    bookingId: booking.id,
    code: codeRecord?.code || null,
    property: {
      id: booking.propertyId,
      title: booking.property?.title ?? "-",
      type: booking.property?.type ?? "-"
    },
    personal: {
      fullName: booking.guestName || booking.user?.name || "-",
      phone: booking.guestPhone || booking.user?.phone || "-",
      nationality: booking.nationality || "-",
      sex: booking.sex || "-",
      ageGroup: booking.ageGroup || (booking.user ? "Adult" : "-")
    },
    booking: {
      roomType: booking.roomType || booking.roomCode || "-",
      rooms: booking.rooms || 1,
      nights,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      status: booking.status,
      totalAmount: Number(booking.totalAmount || 0).toFixed(2)
    }
  };

  return (res as Response).json({ ok: true, details });
};
router.post("/validate", validateBooking);

/** CONFIRM: mark as CHECKED_IN after preview */
const confirmCheckin: RequestHandler = async (req, res) => {
  const r = req as AuthedRequest;
  const { bookingId, consent, clientSnapshot } = req.body as { bookingId: number; consent?: any; clientSnapshot?: any };
  if (!bookingId) return (res as Response).status(400).json({ error: "bookingId is required" });

  // ensure this booking belongs to one of the owner's properties
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, property: { ownerId: r.user!.id } },
    include: { property: true, code: true }
  });
  if (!booking) return (res as Response).status(404).json({ error: "Booking not found" });

  if (!booking.code) {
    return (res as Response).status(400).json({ error: "No booking code found for this booking" });
  }

  // Mark code as used and update booking status using the service
  const result = await markBookingCodeAsUsed(booking.code.id, r.user!.id);
  
  if (!result.success) {
    return (res as Response).status(400).json({ error: result.error || "Failed to confirm check-in" });
  }

  // Fetch updated booking
  const updated = await prisma.booking.findUnique({
    where: { id: booking.id }
  });

  // attempt to persist confirmation to an audit table if it exists
  try {
    const ip = (req as any).ip || req.headers['x-forwarded-for'] || null;
    const ua = req.get('user-agent') || null;
    await prisma.$executeRaw`
      INSERT INTO booking_checkin_confirmations
        (booking_id, owner_id, confirmed_at, consent_accepted, consent_method, terms_version, client_snapshot, client_ip, client_ua, note)
      VALUES
        (${booking.id}, ${r.user!.id}, NOW(), ${consent?.accepted ? 1 : 0}, ${consent?.method ?? null}, ${consent?.termsVersion ?? null}, ${clientSnapshot ? JSON.stringify(clientSnapshot) : null}, ${ip}, ${ua}, ${null})
    `;
  } catch (err) {
    // if the audit table does not exist or insert fails, log and continue
    console.warn('Could not persist booking_checkin_confirmation audit row', err);
  }

  await invalidateOwnerReports(r.user!.id);
  return (res as Response).json({ ok: true, bookingId: updated.id, status: updated.status });
};
router.post("/confirm-checkin", confirmCheckin);
// GET /owner/bookings/:id — checked-in booking details (with code + property)
const getBooking: RequestHandler = async (req, res) => {
  const r = req as AuthedRequest;
  const id = Number(req.params.id);
  const b = await prisma.booking.findFirst({
    where: { id, property: { ownerId: r.user!.id } },
    include: { property: true, code: true }
  });
  if (!b) return (res as Response).status(404).json({ error: "Not found" });
  (res as Response).json(b);
};
router.get("/:id", getBooking);

/** OWNER: confirm check-out (owner completes the process) */
const confirmCheckout: RequestHandler = async (req, res) => {
  const r = req as AuthedRequest;
  const id = Number(req.params.id);
  if (!id) return (res as Response).status(400).json({ error: "booking id required" });

  const booking = await prisma.booking.findFirst({ where: { id, property: { ownerId: r.user!.id } }, include: { property: true } });
  if (!booking) return (res as Response).status(404).json({ error: "Booking not found" });
  if (booking.status !== "CHECKED_IN") return (res as Response).status(400).json({ error: "Booking must be CHECKED_IN to confirm check-out" });

  const updated = await prisma.booking.update({ where: { id: booking.id }, data: { status: "CHECKED_OUT" } });

  // append a lightweight audit row (best-effort)
  try {
    const ip = (req as any).ip || req.headers['x-forwarded-for'] || null;
    const ua = req.get('user-agent') || null;
    await prisma.$executeRaw`
      INSERT INTO booking_checkin_confirmations
        (booking_id, owner_id, confirmed_at, consent_accepted, consent_method, terms_version, client_snapshot, client_ip, client_ua, note)
      VALUES
        (${booking.id}, ${r.user!.id}, NOW(), ${0}, ${null}, ${null}, ${null}, ${ip}, ${ua}, ${'checkout'})
    `;
  } catch (err) {
    console.warn('Could not persist booking checkout audit row', err);
  }

  // notify admins in real-time
  try {
    req.app.get('io').emit('admin:owner:checkout', { bookingId: updated.id, ownerId: r.user!.id });
  } catch (err) {
    // ignore
  }

  await invalidateOwnerReports(r.user!.id);
  return (res as Response).json({ ok: true, bookingId: updated.id, status: updated.status });
};
router.post("/:id/confirm-checkout", confirmCheckout);

/** OWNER: one-click create + send invoice for a booking (creates invoice and auto-submits) */
const sendInvoiceFromBooking: RequestHandler = async (req, res) => {
  const r = req as AuthedRequest;
  const id = Number(req.params.id);
  if (!id) return (res as Response).status(400).json({ error: "booking id required" });

  const booking = await prisma.booking.findFirst({ where: { id, property: { ownerId: r.user!.id } }, include: { property: true, code: true } });
  if (!booking) return (res as Response).status(404).json({ error: "Booking not found" });
  if (booking.status !== "CHECKED_IN") return (res as Response).status(400).json({ error: "Booking must be CHECKED_IN" });
  if (!booking.code || booking.code.status !== "USED") return (res as Response).status(400).json({ error: "Check-in code must be USED" });

  // owner details
  const owner = await prisma.user.findUnique({ where: { id: r.user!.id } });

  // compute amount
  const nights = Math.max(1, Math.ceil((+booking.checkOut - +booking.checkIn) / (1000*60*60*24)));
  const pricePerNight = (booking as any).pricePerNight ?? booking.property?.pricePerNight ?? null;
  const amount = booking.totalAmount ?? (pricePerNight ? (pricePerNight as any) * nights : 0);

  // atomic create invoice + item, prevent duplicates by checkinCodeId
  const created = await prisma.$transaction(async (tx: any) => {
    const exists = await tx.invoice.findUnique({ where: { checkinCodeId: booking.code!.id } });
    if (exists) return { duplicate: exists.id };

    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2, "0")}`;
    const invoiceNumber = `INV-${ym}-${booking.id}-${booking.code!.id}`;

    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        ownerId: r.user!.id,
        bookingId: booking.id,
        checkinCodeId: booking.code!.id,
        title: `${booking.property?.title ?? "Property"} — Accommodation Invoice`,
        currency: "TZS",
        senderName: owner?.name ?? `Owner #${r.user!.id}`,
        senderAddress: (owner as any)?.address ?? null,
        senderPhone: owner?.phone ?? null,
        receiverName: "NoLSAF",
        receiverAddress: "Dar es Salaam, Tanzania",
        receiverPhone: "+255",
        subtotal: amount as any,
        taxPercent: 0 as any,
        taxAmount: 0 as any,
        total: amount as any,
        status: "SUBMITTED",
        submittedAt: now
      }
    });

    await tx.invoiceItem.create({
      data: {
        invoiceId: invoice.id,
        description: `Accommodation at ${booking.property?.title ?? "property"} (${nights} nights)`,
        quantity: 1,
        unitPrice: amount as any,
        amount: amount as any
      }
    });

    return { invoiceId: invoice.id };
  });

  if ("duplicate" in created) return (res as Response).status(409).json({ error: "Invoice already exists for this code", invoiceId: created.duplicate });

  // notify admins
  try {
    req.app.get('io').emit('admin:invoice:submitted', { invoiceId: created.invoiceId, bookingId: booking.id });
  } catch (err) { }

  await invalidateOwnerReports(r.user!.id);
  return (res as Response).status(201).json({ ok: true, invoiceId: created.invoiceId });
};
router.post("/:id/send-invoice", sendInvoiceFromBooking);
