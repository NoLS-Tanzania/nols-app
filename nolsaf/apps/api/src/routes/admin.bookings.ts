// apps/api/src/routes/admin.bookings.ts
import { Router } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import type { RequestHandler } from 'express';
import { generateReadableCode, hashCode } from "../lib/codes";
import { audit } from "../lib/audit";
import { invalidateOwnerReports } from "../lib/cache";

export const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("ADMIN") as unknown as RequestHandler);

/* ----------------------------- Utilities ------------------------------ */

async function idempotentConfirmAndCode(tx: typeof prisma, bookingId: number) {
  const booking = await tx.booking.findUnique({
    where: { id: bookingId },
    include: { code: true, property: true },
  });
  if (!booking) return { error: "Booking not found", status: 404 as const };

  // Ensure CONFIRMED
  if (booking.status !== "CONFIRMED") {
    await tx.booking.update({ where: { id: bookingId }, data: { status: "CONFIRMED" } });
  }

  // If code already exists, return it (idempotent)
  if (booking.code) {
    return { bookingId, codeVisible: booking.code.codeVisible };
  }

  // Create new single-use code (store hash + visible copy for UI/notification)
  const visible = generateReadableCode(8); // e.g. ABCD9F3A (no ambiguous chars)
  const hashed = hashCode(visible);
  const created = await tx.checkinCode.create({
    data: {
      bookingId,
      codeHash: hashed,
      codeVisible: visible,
      status: "ACTIVE",
      generatedAt: new Date(),
    },
  });

  return { bookingId, codeVisible: created.codeVisible };
}

/* ------------------------------ Listings ------------------------------ */

/**
 * GET /admin/bookings
 * Query: date=YYYY-MM-DD&status=&propertyId=&ownerId=&userId=&q=&page=&pageSize=
 */
router.get("/", async (req, res) => {
  const { date, status, propertyId, ownerId, userId, q, page = "1", pageSize = "30" } = req.query as any;

  const where: any = {};
  if (status) where.status = status;
  if (propertyId) where.propertyId = Number(propertyId);
  if (ownerId) where.property = { ownerId: Number(ownerId) };
  if (userId) where.userId = Number(userId);

  if (date) {
    const d = new Date(String(date));
    const next = new Date(d); next.setDate(d.getDate() + 1);
    where.AND = [
      { checkIn: { lt: next } },
      { checkOut: { gt: d } },
    ];
  }

  if (q) {
    where.OR = [
      { guestName: { contains: q, mode: "insensitive" } },
      { property: { title: { contains: q, mode: "insensitive" } } },
      { code: { codeVisible: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
    ];
  }

  const skip = (Number(page) - 1) * Number(pageSize);
  const take = Math.min(Number(pageSize), 100);

  const [items, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      include: {
        property: { 
          select: { 
            id: true, 
            title: true, 
            ownerId: true,
            owner: { select: { id: true, name: true, email: true } }
          } 
        },
        code: { 
          select: { 
            id: true, 
            codeVisible: true, 
            status: true,
            generatedAt: true,
            usedAt: true,
            usedByOwner: true
          } 
        },
        user: { select: { id: true, name: true, email: true, phone: true } },
        cancellationRequests: {
          select: {
            id: true,
            reason: true,
            createdAt: true,
            status: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1, // Get the most recent cancellation request
        },
      },
      orderBy: { id: "desc" },
      skip,
      take,
    }),
    prisma.booking.count({ where }),
  ]);

  res.json({
    total,
    page: Number(page),
    pageSize: take,
    items: items.map((b: any) => {
      const latestCancellation = b.cancellationRequests && b.cancellationRequests.length > 0 
        ? b.cancellationRequests[0] 
        : null;
      
      return {
      id: b.id,
      status: b.status,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
        guestName: b.guestName ?? null,
        roomCode: b.roomCode ?? null,
      totalAmount: b.totalAmount,
        cancelReason: latestCancellation?.reason ?? null,
        canceledAt: latestCancellation?.createdAt ?? null,
      property: b.property,
        code: b.code ? { 
          id: b.code.id, 
          code: b.code.codeVisible, 
          status: b.code.status,
          generatedAt: b.code.generatedAt,
          usedAt: b.code.usedAt,
          usedByOwner: b.code.usedByOwner
        } : null,
        user: b.user,
      };
    }),
  });
});

/**
 * GET /admin/bookings/counts
 * Query: start=YYYY-MM-DD&end=YYYY-MM-DD  (inclusive start, inclusive end)
 *        OR no params for simple status counts
 * Returns: { "2025-10-23": { total: 10, statuses: { NEW: 5, CONFIRMED: 3, CHECKED_IN: 2, ... } }, ... }
 *          OR { "NEW": 5, "CONFIRMED": 3, ... } if no date params
 */
router.get("/counts", async (req, res) => {
  try {
    const { start, end, month } = req.query as any;

    // If no date params, return simple status counts
    if (!start && !end && !month) {
      const statuses = ["NEW", "CONFIRMED", "CHECKED_IN", "PENDING_CHECKIN", "CHECKED_OUT", "CANCELED"];
      const counts: Record<string, number> = {};
      
      for (const status of statuses) {
        try {
          counts[status] = await prisma.booking.count({ where: { status } });
        } catch (e) {
          counts[status] = 0;
        }
      }
      
      return res.json(counts);
    }

    let s: Date | null = null;
    let e: Date | null = null;
    if (month) {
      // month format YYYY-MM
      const [y, m] = String(month).split("-").map(Number);
      if (!y || isNaN(m)) return res.status(400).json({ error: "Invalid month" });
      s = new Date(y, m - 1, 1);
      e = new Date(y, m, 0); // last day
    } else if (start && end) {
      s = new Date(String(start));
      e = new Date(String(end));
    } else if (start) {
      s = new Date(String(start));
      e = new Date(s);
    } else {
      return res.status(400).json({ error: "start/end or month required" });
    }

  // normalize to local midnight
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);

  // Optimize by fetching all bookings that overlap the requested range once,
  // then aggregating per-day counts in-process. This avoids N * M DB count queries.
  const bookings = await prisma.booking.findMany({
    where: {
      AND: [
        { checkIn: { lt: new Date(e.getFullYear(), e.getMonth(), e.getDate() + 1) } },
        { checkOut: { gt: s } },
      ],
    },
    select: { checkIn: true, checkOut: true, status: true },
  });

  const statuses = ["NEW", "CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELED"];
  const out: Record<string, { total: number; statuses: Record<string, number> }> = {};

  // initialize days
  for (let dt = new Date(s); dt <= e; dt.setDate(dt.getDate() + 1)) {
    const d = new Date(dt);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    out[iso] = { total: 0, statuses: {} };
    for (const st of statuses) out[iso].statuses[st] = 0;
  }

  // accumulate: iterate bookings and mark each day in the intersection correctly
  for (const b of bookings) {
    const bStart = new Date(b.checkIn);
    const bEnd = new Date(b.checkOut);
    // floor booking start to its date
    const bStartDate = new Date(bStart.getFullYear(), bStart.getMonth(), bStart.getDate());
    // determine inclusive last-day for the booking
    let bEndInclusive = new Date(bEnd.getFullYear(), bEnd.getMonth(), bEnd.getDate());
    // if checkOut is exactly at midnight (00:00:00), the booking does NOT include that date
    if (bEnd.getHours() === 0 && bEnd.getMinutes() === 0 && bEnd.getSeconds() === 0 && bEnd.getMilliseconds() === 0) {
      bEndInclusive.setDate(bEndInclusive.getDate() - 1);
    }

    const start = bStartDate > s ? bStartDate : new Date(s);
    const end = bEndInclusive < e ? bEndInclusive : new Date(e);
    for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
      const d = new Date(dt);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!out[iso]) continue;
      out[iso].statuses[b.status] = (out[iso].statuses[b.status] ?? 0) + 1;
      out[iso].total += 1;
    }
  }

    res.json(out);
  } catch (err: any) {
    console.error('Error in GET /admin/bookings/counts:', err);
    res.status(500).json({ error: 'Internal server error', message: err?.message || 'Unknown error' });
  }
});

/** GET /admin/bookings/:id — full detail */
router.get("/:id", async (req, res) => {
  try {
  const id = Number(req.params.id);
  const b = await prisma.booking.findUnique({
    where: { id },
    include: {
        property: { 
          select: {
            id: true,
            title: true,
            type: true,
            regionName: true,
            city: true,
            district: true,
            ward: true,
            country: true,
            owner: { select: { id: true, name: true, email: true, phone: true } }
          },
        },
        code: {
          select: {
            id: true,
            codeVisible: true,
            status: true,
            generatedAt: true,
            usedAt: true,
            usedByOwner: true,
          },
        },
        invoices: {
          select: {
            id: true,
            status: true,
            total: true,
            issuedAt: true,
            approvedAt: true,
            paidAt: true,
            invoiceNumber: true,
            receiptNumber: true,
          },
          orderBy: { issuedAt: 'desc' },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            createdAt: true,
          },
        },
        cancellationRequests: {
          select: {
            id: true,
            reason: true,
            createdAt: true,
            status: true,
            policyRefundPercent: true,
            policyEligible: true,
            policyRule: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
  });
  if (!b) return res.status(404).json({ error: "Booking not found" });
    
    // Transform the response to include cancellation info
    const latestCancellation = b.cancellationRequests && b.cancellationRequests.length > 0 
      ? b.cancellationRequests[0] 
      : null;
    
    const response: any = {
      ...b,
      cancelReason: latestCancellation?.reason ?? null,
      canceledAt: latestCancellation?.createdAt ?? null,
      cancelRefundPercent: latestCancellation?.policyRefundPercent ?? null,
      cancelPolicyEligible: latestCancellation?.policyEligible ?? false,
      cancelPolicyRule: latestCancellation?.policyRule ?? null,
      cancelStatus: latestCancellation?.status ?? null,
    };
    
    // Remove cancellationRequests from response to keep it clean
    delete response.cancellationRequests;
    
    res.json(response);
  } catch (err: any) {
    console.error('Error in GET /admin/bookings/:id:', err);
    res.status(500).json({ error: 'Internal server error', message: err?.message || 'Unknown error' });
  }
});

/* -------------------------- Confirm & Codes --------------------------- */

/**
 * POST /admin/bookings/:id/confirm
 * - Idempotently sets CONFIRMED
 * - Generates single-use code if missing
 * - Emits socket event for dashboards
 */
router.post("/:id/confirm", async (req, res) => {
  const id = Number(req.params.id);

  const result = await prisma.$transaction(async (tx: any) => {
    return idempotentConfirmAndCode(tx, id);
  });

  if ("error" in result) return res.status(result.status).json({ error: result.error });

  // notify dashboards (Socket.io instance set at app.set('io', io))
  const io = req.app.get("io");
  if (io) io.emit("admin:code:generated", { bookingId: result.bookingId, code: result.codeVisible });

  return res.json({ ok: true, code: result.codeVisible });
});

/** POST /admin/bookings/:id/checkin - mark as CHECKED_IN (admin observed) */
router.post("/:id/checkin", async (req, res) => {
  const id = Number(req.params.id);
  const before = await prisma.booking.findUnique({ where: { id }, select: { status: true, propertyId: true } });
  if (!before) return res.status(404).json({ error: "Booking not found" });
  if (before.status === "CHECKED_IN") return res.status(400).json({ error: "Already checked in" });

  const updated = await prisma.booking.update({ where: { id }, data: { status: "CHECKED_IN" } });
  try { await audit(req, "BOOKING_CHECKIN", "BOOKING", before, { status: "CHECKED_IN" }); } catch {}
  try {
    const b = await prisma.booking.findUnique({ where: { id }, include: { property: true } as any });
    if (b && b.property && (b.property as any).ownerId) await invalidateOwnerReports((b.property as any).ownerId);
  } catch {}
  try { req.app.get("io")?.emit?.("admin:booking:status", { bookingId: id, from: before.status, to: "CHECKED_IN" }); } catch {}
  res.json({ ok: true, booking: updated });
});

/** POST /admin/bookings/:id/checkout - mark as CHECKED_OUT (admin observed) */
router.post("/:id/checkout", async (req, res) => {
  const id = Number(req.params.id);
  const before = await prisma.booking.findUnique({ where: { id }, select: { status: true, propertyId: true } });
  if (!before) return res.status(404).json({ error: "Booking not found" });
  if (before.status === "CHECKED_OUT") return res.status(400).json({ error: "Already checked out" });

  const updated = await prisma.booking.update({ where: { id }, data: { status: "CHECKED_OUT" } });
  try { await audit(req, "BOOKING_CHECKOUT", "BOOKING", before, { status: "CHECKED_OUT" }); } catch {}
  try {
    const b = await prisma.booking.findUnique({ where: { id }, include: { property: true } as any });
    if (b && b.property && (b.property as any).ownerId) await invalidateOwnerReports((b.property as any).ownerId);
  } catch {}
  try { req.app.get("io")?.emit?.("admin:booking:status", { bookingId: id, from: before.status, to: "CHECKED_OUT" }); } catch {}
  res.json({ ok: true, booking: updated });
});

/**
 * GET /admin/bookings/:id/code
 * - Fetch code (if exists) + status
 */
router.get("/:id/code", async (req, res) => {
  const id = Number(req.params.id);
  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { code: true, property: true, user: true },
  });
  if (!booking) return res.status(404).json({ error: "Booking not found" });
  return res.json({
    bookingId: booking.id,
    status: booking.status,
    code: booking.code
      ? {
          id: booking.code.id,
          visible: booking.code.codeVisible,
          status: booking.code.status,
          generatedAt: booking.code.generatedAt,
          usedAt: booking.code.usedAt,
          usedByOwner: booking.code.usedByOwner,
        }
      : null,
  });
});

/**
 * POST /admin/bookings/validate-by-code { code }
 * Minimal admin-facing endpoint to validate a booking using a visible code.
 * Note: owner-facing validation should live in a public or owner-scoped route.
 */
router.post("/validate-by-code", async (req, res) => {
  const code = String(req.body?.code ?? "").trim();
  if (!code) return res.status(400).json({ error: "Code is required" });

  const c = await prisma.checkinCode.findFirst({ where: { codeVisible: code }, include: { booking: true } });
  if (!c) return res.status(404).json({ error: "Code not found" });
  if (c.status !== 'ACTIVE') return res.status(400).json({ error: `Code not active (status=${c.status})` });

  // idempotent: mark code used and set booking to CONFIRMED
  const updated = await prisma.$transaction(async (tx: any) => {
    await tx.checkinCode.update({ where: { id: c.id }, data: { status: 'USED', usedAt: new Date(), usedByOwner: true } });
    const b = await tx.booking.update({ where: { id: c.bookingId }, data: { status: 'CONFIRMED' } });
    return b;
  });

  try { req.app.get("io")?.emit?.("admin:booking:validated", { bookingId: updated.id }); } catch {}
  return res.json({ ok: true, booking: updated });
});

/* ---------------------- Cancel & Reassign Room ------------------------ */

/**
 * POST /admin/bookings/:id/cancel { reason }
 * - Cancels booking
 * - Voids ACTIVE code (if any)
 */
router.post("/:id/cancel", async (req, res) => {
  const id = Number(req.params.id);
  const reason = String(req.body?.reason ?? "").trim();
  if (reason.length < 3) return res.status(400).json({ error: "Reason is required (min 3 chars)" });

  const before = await prisma.booking.findUnique({ where: { id }, include: { code: true } });
  if (!before) return res.status(404).json({ error: "Booking not found" });
  if (before.status === "CANCELED") return res.status(400).json({ error: "Already canceled" });

  const updated = await prisma.booking.update({
    where: { id },
    data: { status: "CANCELED", cancelReason: reason, canceledAt: new Date() } as any,
  });

  if (before.code && before.code.status === "ACTIVE") {
    await prisma.checkinCode.update({
      where: { id: before.code.id },
      data: { status: "VOID", voidReason: "Booking canceled by admin", voidedAt: new Date() },
    });
    const io = req.app.get("io");
    if (io) io.emit("admin:code:voided", { bookingId: id, code: before.code.codeVisible });
  }

  return res.json({ ok: true, booking: updated });
});

/**
 * POST /admin/bookings/:id/reassign-room { roomCode }
 * - Assigns/changes roomCode with overlap safety on same property
 */
router.post("/:id/reassign-room", async (req, res) => {
  const id = Number(req.params.id);
  const roomCode = String(req.body?.roomCode ?? "").trim();
  if (!roomCode) return res.status(400).json({ error: "roomCode is required" });

  const b = await prisma.booking.findUnique({ where: { id }, include: { property: true } });
  if (!b) return res.status(404).json({ error: "Booking not found" });

  // overlap check
  const conflict = await prisma.booking.findFirst({
    where: {
      id: { not: id },
      propertyId: b.propertyId,
      roomCode,
      // treat any PENDING_CHECKIN rows as CHECKED_IN via migration; only check CONFIRMED/CHECKED_IN
      status: { in: ["CONFIRMED", "CHECKED_IN"] },
      AND: [{ checkIn: { lt: b.checkOut } }, { checkOut: { gt: b.checkIn } }],
    },
    select: { id: true },
  });
  if (conflict) return res.status(409).json({ error: "Room already assigned for overlapping dates", conflictWith: conflict.id });

  const updated = await prisma.booking.update({ where: { id }, data: { roomCode } });
  return res.json({ ok: true, booking: updated });
});

/* ---------------------- Code Search / Void / List --------------------- */

/** POST /admin/codes/search { code } */
router.post("/codes/search", async (req, res) => {
  const code = String(req.body?.code ?? "").trim();
  if (!code) return res.status(400).json({ error: "Code is required" });

  const c = await prisma.checkinCode.findFirst({
    where: { codeVisible: code },
    include: { booking: { include: { property: true, user: true } } },
  });
  if (!c) return res.status(404).json({ error: "Not found" });
  res.json(c);
});

/** POST /admin/codes/:id/void { reason? } */
router.post("/codes/:id/void", async (req, res) => {
  const id = Number(req.params.id);
  const reason = String(req.body?.reason ?? "").trim() || "Voided by admin";
  const before = await prisma.checkinCode.findUnique({ where: { id }, include: { booking: true } });
  if (!before) return res.status(404).json({ error: "Code not found" });
  if (before.status !== "ACTIVE") return res.status(400).json({ error: `Cannot void from status ${before.status}` });

  const updated = await prisma.checkinCode.update({
    where: { id },
    data: { status: "VOID", voidReason: reason, voidedAt: new Date() },
  });

  const io = req.app.get("io");
  if (io) io.emit("admin:code:voided", { bookingId: before.bookingId, code: before.codeVisible, reason });

  res.json({ ok: true, code: updated });
});

/**
 * GET /admin/codes?status=ACTIVE|USED|VOID
 * - List codes (paged via take)
 */
router.get("/codes", async (req, res) => {
  const status = (req.query.status as string | undefined) ?? undefined;
  const take = Math.min(Number(req.query.take ?? 50), 100);

  const codes = await prisma.checkinCode.findMany({
    where: status ? { status } : undefined,
    include: {
      booking: {
        include: {
          property: true,
          user: true,
        },
      },
    },
    orderBy: { id: "desc" },
    take,
  });

  return res.json({ items: codes });
});

/* ---------------------- Archive & Export ------------------------ */

/**
 * POST /admin/bookings/:id/archive
 * - Archives a booking (soft delete - marks as archived)
 * - Requires reason in body
 */
router.post("/:id/archive", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const reason = String(req.body?.reason ?? "").trim();
    if (reason.length < 10) {
      return res.status(400).json({ error: "Archive reason is required (minimum 10 characters)" });
    }

    const booking = await prisma.booking.findUnique({ where: { id } });
    if (!booking) return res.status(404).json({ error: "Booking not found" });

    // Update booking with archive flag and reason
    // Note: This assumes you have an `archived` field and `archiveReason` field in your Booking model
    // If not, you may need to add these fields to the schema
    const updated = await prisma.booking.update({
      where: { id },
      data: {
        // If you have an archived field:
        // archived: true,
        // archivedAt: new Date(),
        // archiveReason: reason,
        // For now, we'll use a status or add a note
        cancelReason: `ARCHIVED: ${reason}`,
      } as any,
    });

    try {
      await audit(req, "BOOKING_ARCHIVED", "BOOKING", booking, { reason, archivedAt: new Date() });
    } catch {}

    const io = req.app.get("io");
    if (io) {
      io.emit("admin:booking:archived", { bookingId: id, reason });
    }

    res.json({ ok: true, booking: updated });
  } catch (err: any) {
    console.error('Error in POST /admin/bookings/:id/archive:', err);
    res.status(500).json({ error: 'Internal server error', message: err?.message || 'Unknown error' });
  }
});

/**
 * GET /admin/bookings/export.csv
 * - Exports bookings to CSV format
 * - Query params: selectedIds (comma-separated), status, date, etc.
 */
router.get("/export.csv", async (req, res) => {
  try {
    const { selectedIds, status, date, propertyId, ownerId } = req.query as any;

    const where: any = {};
    
    // If specific IDs are selected, filter by those
    if (selectedIds) {
      const ids = String(selectedIds).split(',').map(Number).filter(Boolean);
      if (ids.length > 0) {
        where.id = { in: ids };
      }
    } else {
      // Otherwise apply filters
      if (status) where.status = status;
      if (propertyId) where.propertyId = Number(propertyId);
      if (ownerId) where.property = { ownerId: Number(ownerId) };
      if (date) {
        const d = new Date(String(date));
        const next = new Date(d); next.setDate(d.getDate() + 1);
        where.AND = [
          { checkIn: { lt: next } },
          { checkOut: { gt: d } },
        ];
      }
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        property: {
          select: {
            id: true,
            title: true,
            owner: { select: { id: true, name: true, email: true, phone: true } }
          }
        },
        user: { select: { id: true, name: true, email: true, phone: true } },
        code: { select: { codeVisible: true, status: true, usedAt: true, usedByOwner: true } },
        cancellationRequests: {
          select: { reason: true, createdAt: true, status: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { id: 'desc' },
    });

    // Generate CSV
    const headers = [
      'Booking ID',
      'Status',
      'Check-in',
      'Check-out',
      'Nights',
      'Guest Name',
      'Guest Email',
      'Guest Phone',
      'Property',
      'Property Owner',
      'Owner Email',
      'Owner Phone',
      'Total Amount',
      'Booking Code',
      'Code Status',
      'Code Used At',
      'Validation Method',
      'Cancel Reason',
      'Canceled At',
      'Created At',
    ];

    const rows = bookings.map(b => {
      const nights = Math.ceil((new Date(b.checkOut).getTime() - new Date(b.checkIn).getTime()) / (1000 * 60 * 60 * 24));
      const latestCancel = b.cancellationRequests && b.cancellationRequests.length > 0 ? b.cancellationRequests[0] : null;
      const validationMethod = b.code?.usedByOwner ? 'Booking Code' : (b.code?.usedAt ? 'QR Code' : 'N/A');

      return [
        b.id,
        b.status,
        new Date(b.checkIn).toLocaleDateString(),
        new Date(b.checkOut).toLocaleDateString(),
        nights,
        b.guestName || b.user?.name || '',
        b.user?.email || '',
        b.user?.phone || '',
        b.property?.title || '',
        b.property?.owner?.name || '',
        b.property?.owner?.email || '',
        b.property?.owner?.phone || '',
        Number(b.totalAmount).toFixed(2),
        b.code?.codeVisible || '',
        b.code?.status || '',
        b.code?.usedAt ? new Date(b.code.usedAt).toLocaleString() : '',
        validationMethod,
        latestCancel?.reason || '',
        latestCancel?.createdAt ? new Date(latestCancel.createdAt).toLocaleString() : '',
        new Date(b.createdAt).toLocaleString(),
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="bookings-export-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csvContent);
  } catch (err: any) {
    console.error('Error in GET /admin/bookings/export.csv:', err);
    res.status(500).json({ error: 'Internal server error', message: err?.message || 'Unknown error' });
  }
});

export default router;
