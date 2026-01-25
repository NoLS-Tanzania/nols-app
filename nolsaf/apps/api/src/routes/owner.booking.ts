// apps/api/src/routes/owner.bookings.ts
import { Router } from "express";
import type { RequestHandler, Response } from 'express';
import { Prisma } from "@prisma/client";
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

  const raw = String(code).trim();
  const ownerId = r.user!.id;

  // --- QR payload support ---
  // Receipt QR codes encode a JSON payload including bookingId.
  // Allow owners to scan the receipt QR and still retrieve booking details.
  let booking: any | null = null;
  let validationError: string | null = null;
  let mode: "CODE" | "QR" = "CODE";

  if (raw.startsWith("{") && raw.includes("bookingId")) {
    mode = "QR";
    try {
      const parsed = JSON.parse(raw);
      const bookingId = Number(parsed?.bookingId || 0);
      if (!bookingId) {
        validationError = "Invalid QR payload (missing bookingId)";
      } else {
        booking = await prisma.booking.findFirst({
          where: { id: bookingId, property: { ownerId } },
          include: { property: true, code: true, user: true },
        });
        if (!booking) validationError = "Booking not found for this owner";
      }
    } catch (e: any) {
      validationError = "Invalid QR payload";
    }
  } else {
    // Normalize the code (trim and uppercase) before validation
    const normalizedCode = raw.toUpperCase();
    // Use the booking code service to validate
    const validation = await validateBookingCode(normalizedCode, ownerId);
    if (!validation.valid || !validation.booking) {
      validationError = validation.error || "Invalid or expired code";
    } else {
      booking = validation.booking as any;
    }
  }

  if (!booking) {
    return (res as Response).status(400).json({ error: validationError || "Invalid code" });
  }

  const codeRecord = booking.code;

  // Compute derived fields
  const nights = differenceInCalendarDays(booking.checkOut, booking.checkIn);

  // Map details with all booking information
  const details = {
    bookingId: booking.id,
    // Prefer visible code if present; fallback to legacy code fields.
    code: codeRecord?.codeVisible || codeRecord?.code || null,
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

  // Idempotent: if already checked-in and code used, do not attempt to mark again.
  if (booking.status === "CHECKED_IN" && booking.code.status === "USED") {
    await invalidateOwnerReports(r.user!.id);
    return (res as Response).json({ ok: true, bookingId: booking.id, status: booking.status, alreadyConfirmed: true, invoiceId: null });
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

  // Enforce one-time flow: check-in does NOT auto-create/submit owner invoice.
  // Invoice creation is done once via /api/owner/invoices/from-booking (DRAFT), then submitted once via /api/owner/invoices/:id/submit.
  const invoiceId: number | null = null;

  // persist to AuditLog (preferred)
  try {
    const ip = (req as any).ip || req.headers['x-forwarded-for'] || null;
    const ua = req.get('user-agent') || null;
    await prisma.auditLog.create({
      data: {
        actorId: r.user!.id,
        actorRole: 'OWNER',
        action: 'BOOKING_CHECKIN_CONFIRMED',
        entity: 'BOOKING',
        entityId: booking.id,
        beforeJson: { status: booking.status, checkIn: booking.checkIn, checkOut: booking.checkOut },
        afterJson: {
          status: updated?.status ?? 'CHECKED_IN',
          consent: consent ?? null,
          clientSnapshot: clientSnapshot ?? null,
        },
        ip: ip ? String(ip).slice(0, 64) : null,
        ua: ua ? String(ua).slice(0, 255) : null,
      } as any,
    });
  } catch (err) {
    console.warn('Could not persist AuditLog for check-in', err);
  }

  await invalidateOwnerReports(r.user!.id);

  return (res as Response).json({ ok: true, bookingId: updated.id, status: updated.status, invoiceId, alreadyConfirmed: false });
};
router.post("/confirm-checkin", confirmCheckin);
/** GET /owner/bookings/checked-in - Get checked-in bookings for the owner */
const getCheckedInBookings: RequestHandler = async (req, res) => {
  const r = req as AuthedRequest;
  try {
    const ownerId = r.user?.id;

    if (!ownerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Get bookings with status CHECKED_IN that belong to owner's properties
    const t0 = Date.now();
    const bookings = await prisma.booking.findMany({
      where: {
        property: { ownerId },
        status: "CHECKED_IN",
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
          },
        },
        code: {
          select: {
            id: true,
            codeVisible: true,
            status: true,
            usedAt: true,
            usedByOwner: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        checkIn: 'desc',
      },
    });

    // Map to include relevant fields for the UI
    const mapped = bookings.map((b: any) => ({
      id: b.id,
      property: b.property,
      code: b.code,
      codeVisible: b.code?.codeVisible ?? null,
      validatedAt: b.code?.usedAt ?? null,
      guestName: b.guestName ?? b.user?.name ?? null,
      customerName: b.guestName ?? b.user?.name ?? null,
      guestPhone: b.guestPhone ?? b.user?.phone ?? null,
      phone: b.guestPhone ?? b.user?.phone ?? null,
      roomType: b.roomType ?? b.roomCode ?? null,
      roomCode: b.roomCode,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      status: b.status,
      totalAmount: b.totalAmount,
      createdAt: b.createdAt,
      user: b.user,
    }));

    return (res as Response).json(mapped);
  } catch (err: any) {
    console.error("GET /owner/bookings/checked-in error:", err);
    return res.status(500).json({ error: "Failed to load checked-in bookings" });
  }
};
router.get("/checked-in", getCheckedInBookings);

/** GET /owner/bookings/for-checkout - bookings that are within 7 hours of checkout (or overdue) */
const getForCheckoutBookings: RequestHandler = async (req, res) => {
  const r = req as AuthedRequest;
  try {
    const ownerId = r.user?.id;
    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });

    const nowMs = Date.now();
    const windowMs = 7 * 60 * 60 * 1000;
    const cutoff = new Date(nowMs + windowMs);

    const t0 = Date.now();
    const bookings = await prisma.booking.findMany({
      where: {
        property: { ownerId },
        status: "CHECKED_IN",
        checkOut: { lte: cutoff },
      },
      include: {
        property: { select: { id: true, title: true } },
        code: { select: { id: true, codeVisible: true, status: true, usedAt: true, usedByOwner: true } },
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { checkOut: "asc" },
    });

    const mapped = bookings.map((b: any) => ({
      id: b.id,
      property: b.property,
      code: b.code,
      codeVisible: b.code?.codeVisible ?? null,
      validatedAt: b.code?.usedAt ?? null,
      guestName: b.guestName ?? b.user?.name ?? null,
      guestPhone: b.guestPhone ?? b.user?.phone ?? null,
      guestEmail: b.guestEmail ?? b.user?.email ?? null,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      status: b.status,
      totalAmount: b.totalAmount,
      createdAt: b.createdAt,
    }));
    return (res as Response).json(mapped);
  } catch (err: any) {
    console.error("GET /owner/bookings/for-checkout error:", err);
    return res.status(500).json({ error: "Failed to load check-out queue" });
  }
};
router.get("/for-checkout", getForCheckoutBookings);

/** GET /owner/bookings/checked-out - Get checked-out bookings for the owner */
const getCheckedOutBookings: RequestHandler = async (req, res) => {
  const r = req as AuthedRequest;
  try {
    const ownerId = r.user?.id;

    if (!ownerId) return res.status(401).json({ error: "Unauthorized" });

    const t0 = Date.now();
    const bookings = await prisma.booking.findMany({
      where: {
        property: { ownerId },
        status: "CHECKED_OUT",
      },
      include: {
        property: {
          select: {
            id: true,
            title: true,
          },
        },
        code: {
          select: {
            id: true,
            codeVisible: true,
            status: true,
            usedAt: true,
            usedByOwner: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: {
        checkOut: 'desc',
      },
    });

    const calcOverdueHours = (scheduledCheckOut: any, confirmedAt: any) => {
      const a = new Date(String(scheduledCheckOut ?? '')).getTime();
      const b = new Date(String(confirmedAt ?? '')).getTime();
      if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
      const diff = b - a;
      if (diff <= 0) return 0;
      // Count partial hours as an hour overdue.
      return Math.ceil(diff / 3600000);
    };

    const calcOverdueDays = (scheduledCheckOut: any, confirmedAt: any) => {
      const a = new Date(String(scheduledCheckOut ?? '')).getTime();
      const b = new Date(String(confirmedAt ?? '')).getTime();
      if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
      const diff = b - a;
      if (diff <= 0) return 0;
      // Count partial days as a day overdue.
      return Math.ceil(diff / 86400000);
    };

    const mapped = bookings.map((b: any) => {
      // NOTE: booking_checkin_confirmations table was removed in migrations.
      // Use booking.updatedAt as the best-available "confirmed" timestamp.
      const confirmedAt = b.updatedAt ?? null;
      const overdueHours = confirmedAt ? calcOverdueHours(b.checkOut, confirmedAt) : null;
      const overdueDays = confirmedAt ? calcOverdueDays(b.checkOut, confirmedAt) : null;
      const timing = confirmedAt ? ((overdueHours ?? 0) > 0 ? 'OVERDUE' : 'NORMAL') : 'UNKNOWN';

      return {
      id: b.id,
      property: b.property,
      code: b.code,
      codeVisible: b.code?.codeVisible ?? null,
      validatedAt: b.code?.usedAt ?? null,
      guestName: b.guestName ?? b.user?.name ?? null,
      customerName: b.guestName ?? b.user?.name ?? null,
      guestPhone: b.guestPhone ?? b.user?.phone ?? null,
      phone: b.guestPhone ?? b.user?.phone ?? null,
      roomType: b.roomType ?? b.roomCode ?? null,
      roomCode: b.roomCode,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      status: b.status,
      totalAmount: b.totalAmount,
      createdAt: b.createdAt,
      user: b.user,
      checkoutConfirmedAt: confirmedAt,
      overdueHours,
      overdueDays,
      checkoutTiming: timing,
      };
    });
    return (res as Response).json(mapped);
  } catch (err: any) {
    console.error("GET /owner/bookings/checked-out error:", err);
    return res.status(500).json({ error: "Failed to load checked-out bookings" });
  }
};
router.get("/checked-out", getCheckedOutBookings);

// GET /owner/bookings/:id — checked-in booking details (with code + property)
const getBooking: RequestHandler = async (req, res) => {
  const r = req as AuthedRequest;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return (res as Response).status(400).json({ error: "booking id required" });
  const b = await prisma.booking.findFirst({
    where: { id, property: { ownerId: r.user!.id } },
    include: { property: true, code: true }
  });
  if (!b) return (res as Response).status(404).json({ error: "Not found" });
  (res as Response).json(b);
};

/** GET /owner/bookings/:id/audit - audit history (check-in + check-out confirmations) */
const getBookingAudit: RequestHandler = async (req, res) => {
  const r = req as AuthedRequest;
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return (res as Response).status(400).json({ error: "booking id required" });

  // ensure booking belongs to this owner
  const booking = await prisma.booking.findFirst({ where: { id, property: { ownerId: r.user!.id } }, select: { id: true, status: true, checkOut: true, updatedAt: true } });
  if (!booking) return (res as Response).status(404).json({ error: "Not found" });

  const items: any[] = [];

  // Preferred: AuditLog
  try {
    const rows = await prisma.auditLog.findMany({
      where: {
        entity: 'BOOKING',
        entityId: id,
        action: { in: ['BOOKING_CHECKIN_CONFIRMED', 'BOOKING_CHECKOUT_CONFIRMED'] },
      },
      include: {
        actor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { id: 'desc' },
      take: 100,
    });

    for (const row of rows) {
      let after: any = (row as any).afterJson ?? null;
      try {
        if (typeof after === 'string') after = JSON.parse(after);
      } catch {
        // ignore
      }
      const action = String((row as any).action ?? '');
      const isCheckout = action === 'BOOKING_CHECKOUT_CONFIRMED';
      const rating = isCheckout ? Number(after?.rating ?? after?.checkoutRating ?? NaN) : NaN;

      const actorId = (row as any).actorId ?? null;
      const actorName = (row as any)?.actor?.name || (row as any)?.actor?.email || (actorId ? `User #${actorId}` : null);
      const actorRole = (row as any)?.actorRole ?? null;
      items.push({
        bookingId: id,
        ownerId: r.user!.id,
        confirmedAt: (row as any).createdAt,
        note: isCheckout ? 'checkout' : 'checkin',
        rating: Number.isFinite(rating) ? rating : null,
        feedback: isCheckout && typeof after?.feedback === 'string' ? after.feedback : null,
        clientIp: (row as any).ip ?? null,
        clientUa: (row as any).ua ?? null,
        actorId,
        actorName,
        actorRole,
      });
    }
  } catch (err) {
    // ignore
  }

  // Backward-compat: legacy booking_checkin_confirmations table (may not exist)
  if (items.length === 0) {
    try {
      const rows: any[] = await prisma.$queryRaw`
        SELECT booking_id as bookingId,
               owner_id as ownerId,
               confirmed_at as confirmedAt,
               consent_accepted as consentAccepted,
               consent_method as consentMethod,
               terms_version as termsVersion,
               client_snapshot as clientSnapshot,
               client_ip as clientIp,
               client_ua as clientUa,
               note as note
        FROM booking_checkin_confirmations
        WHERE booking_id = ${id} AND owner_id = ${r.user!.id}
        ORDER BY confirmed_at DESC
        LIMIT 100
      `;

      for (const x of rows ?? []) {
        let snap: any = null;
        try {
          if (typeof x?.clientSnapshot === "string") snap = JSON.parse(x.clientSnapshot);
          else snap = x?.clientSnapshot ?? null;
        } catch {
          snap = null;
        }
        const rating = Number(snap?.rating ?? snap?.checkoutRating ?? NaN);
        items.push({
          bookingId: x.bookingId,
          ownerId: x.ownerId,
          confirmedAt: x.confirmedAt,
          note: x.note,
          rating: Number.isFinite(rating) ? rating : null,
          feedback: typeof snap?.feedback === "string" ? snap.feedback : null,
          clientIp: x.clientIp ?? null,
          clientUa: x.clientUa ?? null,
        });
      }
    } catch {
      // ignore
    }
  }

  // Final fallback: synthesize a checkout event from Booking.updatedAt if checked-out.
  if (items.length === 0 && booking.status === 'CHECKED_OUT') {
    let actorName: string | null = null;
    try {
      const u = await prisma.user.findUnique({ where: { id: r.user!.id }, select: { name: true, email: true } });
      actorName = u?.name ?? u?.email ?? null;
    } catch {
      actorName = null;
    }
    items.push({
      bookingId: id,
      ownerId: r.user!.id,
      confirmedAt: booking.updatedAt,
      note: 'checkout',
      rating: null,
      feedback: null,
      clientIp: null,
      clientUa: null,
      actorId: r.user!.id,
      actorName,
      actorRole: 'OWNER',
    });
  }

  return (res as Response).json({ ok: true, items });
};
router.get("/:id/audit", getBookingAudit);

router.get("/:id", getBooking);

/** OWNER: confirm check-out (owner completes the process) */
const confirmCheckout: RequestHandler = async (req, res) => {
  const r = req as AuthedRequest;
  const id = Number(req.params.id);
  if (!id) return (res as Response).status(400).json({ error: "booking id required" });

  const body = (req as any).body ?? {};
  const ratingRaw = body?.rating;
  const feedbackRaw = body?.feedback;
  const rating = Number(ratingRaw);
  const feedback = typeof feedbackRaw === "string" ? feedbackRaw.trim().slice(0, 500) : null;

  const booking = await prisma.booking.findFirst({ where: { id, property: { ownerId: r.user!.id } }, include: { property: true } });
  if (!booking) return (res as Response).status(404).json({ error: "Booking not found" });

  if (booking.status === "CHECKED_OUT") {
    return (res as Response).json({ ok: true, bookingId: booking.id, status: booking.status, alreadyConfirmed: true });
  }
  if (booking.status !== "CHECKED_IN") return (res as Response).status(400).json({ error: "Booking must be CHECKED_IN to confirm check-out" });
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return (res as Response).status(400).json({ error: "Please rate the guest (1–5) before confirming check-out" });

  const updated = await prisma.booking.update({ where: { id: booking.id }, data: { status: "CHECKED_OUT" } });

  // AuditLog (preferred)
  try {
    const ip = (req as any).ip || req.headers['x-forwarded-for'] || null;
    const ua = req.get('user-agent') || null;
    await prisma.auditLog.create({
      data: {
        actorId: r.user!.id,
        actorRole: 'OWNER',
        action: 'BOOKING_CHECKOUT_CONFIRMED',
        entity: 'BOOKING',
        entityId: booking.id,
        beforeJson: { status: booking.status, checkOut: booking.checkOut },
        afterJson: {
          status: updated.status,
          rating,
          feedback,
          ui: 'owner-checkout',
          at: new Date().toISOString(),
        },
        ip: ip ? String(ip).slice(0, 64) : null,
        ua: ua ? String(ua).slice(0, 255) : null,
      } as any,
    });
  } catch (err) {
    console.warn('Could not persist AuditLog for checkout', err);
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

  // One-time flow shortcut:
  // - Create DRAFT invoice if missing
  // - Submit once (DRAFT -> REQUESTED)
  const makeOwnerInvoiceNumber = (bookingId: number, codeId: number) => {
    const now = new Date();
    const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    return `OINV-${ym}-${bookingId}-${codeId}`;
  };

  const invoiceNumber = makeOwnerInvoiceNumber(booking.id, booking.code!.id);

  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const existing = await tx.invoice.findFirst({ where: { ownerId: r.user!.id, invoiceNumber } });
    let invoice = existing;
    let created = false;
    if (!invoice) {
      invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          ownerId: r.user!.id,
          bookingId: booking.id,
          status: "DRAFT",
          total: amount as any,
          taxPercent: 0 as any,
          commissionPercent: null,
          commissionAmount: null,
          netPayable: null,
        } as any,
      });
      created = true;
    }

    // Submit once: only transition when DRAFT.
    let submitted = false;
    if (invoice.status === "DRAFT") {
      invoice = await tx.invoice.update({ where: { id: invoice.id }, data: { status: "REQUESTED" } });
      submitted = true;
    }

    return { invoiceId: invoice.id, status: invoice.status, created, submitted };
  });

  await invalidateOwnerReports(r.user!.id);
  if (result.submitted) {
    try { req.app.get('io')?.emit?.('admin:invoice:submitted', { invoiceId: result.invoiceId, bookingId: booking.id }); } catch {}
  }

  return (res as Response).status(result.created ? 201 : 200).json({ ok: true, invoiceId: result.invoiceId, status: result.status, created: result.created, submitted: result.submitted });
};
router.post("/:id/send-invoice", sendInvoiceFromBooking);

/** GET /owner/bookings/recent - Get recent bookings for the owner */
const getRecentBookings: RequestHandler = async (req, res) => {
  const r = req as AuthedRequest;
  const ownerId = r.user!.id;

  // Get recent bookings (last 50, ordered by creation date descending)
  // Filter for bookings that belong to owner's properties
  const bookings = await prisma.booking.findMany({
    where: {
      property: { ownerId },
    },
    include: {
      property: {
        select: {
          id: true,
          title: true,
        },
      },
      code: {
        select: {
          id: true,
          codeVisible: true,
          status: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 50,
  });

  // Map to include relevant fields for the UI
  const mapped = bookings.map((b: any) => ({
    id: b.id,
    property: b.property,
    code: b.code,
    codeVisible: b.code?.codeVisible ?? null,
    guestName: b.guestName ?? b.user?.name ?? null,
    customerName: b.guestName ?? b.user?.name ?? null,
    guestPhone: b.guestPhone ?? b.user?.phone ?? null,
    phone: b.guestPhone ?? b.user?.phone ?? null,
    roomType: b.roomType ?? b.roomCode ?? null,
    roomCode: b.roomCode,
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    status: b.status,
    totalAmount: b.totalAmount,
    createdAt: b.createdAt,
    user: b.user,
  }));

  res.setHeader('Content-Type', 'application/json');
  return (res as Response).json(mapped);
};
router.get("/recent", getRecentBookings);
