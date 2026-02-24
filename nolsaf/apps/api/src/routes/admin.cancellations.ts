import { Router } from "express";
import type { RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth, requireRole } from "../middleware/auth.js";
import { notifyUser, notifyOwner } from "../lib/notifications.js";
import { limitCancellationMessages } from "../middleware/rateLimit.js";

export const router = Router();
router.use(requireAuth as RequestHandler);
router.use(requireRole("ADMIN") as RequestHandler);

const VALID_STATUSES = ["SUBMITTED", "REVIEWING", "NEED_INFO", "PROCESSING", "REFUNDED", "REJECTED"] as const;
type CancellationStatus = (typeof VALID_STATUSES)[number];

function normalizeStatus(input: unknown): CancellationStatus | null {
  const v = String(input || "").trim().toUpperCase();
  return (VALID_STATUSES as readonly string[]).includes(v) ? (v as CancellationStatus) : null;
}

/**
 * GET /api/admin/cancellations?status=&q=
 * q can match bookingCode or request id
 */
router.get("/", (async (req: AuthedRequest, res) => {
  try {
    const { status, q } = req.query as any;
    const st = status ? normalizeStatus(status) : null;
    const query = String(q || "").trim();

    const where: any = {};
    if (st) where.status = st;
    if (query) {
      const asId = Number(query);
      where.OR = [
        { bookingCode: { contains: query.toUpperCase() } },
        ...(Number.isFinite(asId) ? [{ id: asId }] : []),
      ];
    }

    const items = await prisma.cancellationRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        bookingId: true,
        bookingCode: true,
        reason: true,
        policyEligible: true,
        policyRefundPercent: true,
        policyRule: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
        booking: {
          select: {
            checkIn: true,
            checkOut: true,
            totalAmount: true,
            status: true,
            property: { select: { title: true, regionName: true, city: true, district: true } },
          },
        },
      },
    });

    return res.json({ items });
  } catch (error: any) {
    console.error("GET /admin/cancellations error:", error);
    return res.status(500).json({ error: "Failed to fetch cancellation requests" });
  }
}) as RequestHandler);

/**
 * GET /api/admin/cancellations/:id
 */
router.get("/:id", (async (req: AuthedRequest, res) => {
  try {
    const id = Number(req.params.id);
    const item = await prisma.cancellationRequest.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        bookingId: true,
        bookingCode: true,
        reason: true,
        decisionNote: true,
        reviewedAt: true,
        reviewedBy: true,
        policyEligible: true,
        policyRefundPercent: true,
        policyRule: true,
        createdAt: true,
        updatedAt: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
        booking: {
          select: {
            id: true,
            checkIn: true,
            checkOut: true,
            totalAmount: true,
            status: true,
            guestName: true,
            guestPhone: true,
            createdAt: true,
            property: { 
              select: { 
                id: true,
                title: true, 
                regionName: true, 
                city: true, 
                district: true,
                type: true,
              } 
            },
            code: {
              select: {
                id: true,
                code: true,
                codeVisible: true,
                status: true,
                generatedAt: true,
                usedAt: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          select: { id: true, senderId: true, senderRole: true, body: true, createdAt: true },
        },
      },
    });
    if (!item) return res.status(404).json({ error: "Cancellation request not found" });

    // Fetch payment information (invoice and payment events)
    let paymentInfo: { invoice: any; paymentEvents: any[]; hasTransactionId: boolean } | null = null;
    try {
      const invoice = await prisma.invoice.findFirst({
        where: { bookingId: item.bookingId },
        select: {
          id: true,
          invoiceNumber: true,
          receiptNumber: true,
          total: true,
          status: true,
          paymentMethod: true,
          paymentRef: true,
          createdAt: true,
        },
      });

      if (invoice) {
        const paymentEvents = await prisma.paymentEvent.findMany({
          where: { invoiceId: invoice.id },
          select: {
            id: true,
            eventId: true,
            provider: true,
            amount: true,
            currency: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        });

        paymentInfo = {
          invoice,
          paymentEvents,
          hasTransactionId: !!invoice.paymentRef || paymentEvents.some((e) => !!e.eventId),
        };
      }
    } catch (err) {
      console.warn("Failed to fetch payment info for cancellation request:", err);
      // Continue without payment info
    }

    return res.json({ item, paymentInfo });
  } catch (error: any) {
    console.error("GET /admin/cancellations/:id error:", error);
    return res.status(500).json({ error: "Failed to fetch cancellation request" });
  }
}) as RequestHandler);

/**
 * Determine which owner notification template to send and whether to
 * void the check-in code / cancel the booking for a given status transition.
 *
 * Progressive stages:
 *  REVIEWING  → notify owner the request is under review; no booking changes
 *  PROCESSING → notify owner it is approved; void code + cancel booking
 *  REFUNDED   → notify owner refund is complete; also void/cancel as safety
 *               fallback if admin skipped PROCESSING
 *  REJECTED   → notify owner request was denied; booking stays active
 */
function getOwnerSideEffects(nextStatus: CancellationStatus | null, prevStatus: CancellationStatus): {
  ownerTemplate: string | null;
  shouldVoidAndCancel: boolean;
} {
  if (!nextStatus || nextStatus === prevStatus) return { ownerTemplate: null, shouldVoidAndCancel: false };

  switch (nextStatus) {
    case "REVIEWING":
      return { ownerTemplate: "cancellation_reviewing", shouldVoidAndCancel: false };

    case "PROCESSING":
      // Admin just approved — THIS is the moment the owner loses the booking.
      return { ownerTemplate: "cancellation_processing", shouldVoidAndCancel: true };

    case "REFUNDED":
      // Admin confirmed refund sent. Void/cancel only if not already done at PROCESSING.
      return { ownerTemplate: "cancellation_refunded", shouldVoidAndCancel: prevStatus !== "PROCESSING" };

    case "REJECTED":
      return { ownerTemplate: "cancellation_rejected", shouldVoidAndCancel: false };

    default:
      // SUBMITTED, NEED_INFO — no owner action required
      return { ownerTemplate: null, shouldVoidAndCancel: false };
  }
}

/**
 * PATCH /api/admin/cancellations/:id
 * Body: { status?: string, decisionNote?: string }
 *
 * Progressive side-effects by status:
 *  REVIEWING  → owner notified: "request is under review"
 *  PROCESSING → booking → CANCELED, code → VOID, owner notified: "approved"
 *  REFUNDED   → owner notified: "refund complete" (void/cancel as safety fallback)
 *  REJECTED   → owner notified: "request rejected, booking stays active"
 */
router.patch("/:id", (async (req: AuthedRequest, res) => {
  try {
    const adminId = req.user!.id;
    const id = Number(req.params.id);
    const nextStatus = req.body?.status ? normalizeStatus(req.body.status) : null;
    const decisionNote = req.body?.decisionNote != null ? String(req.body.decisionNote).trim().slice(0, 4000) : undefined;

    if (req.body?.status && !nextStatus) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Always fetch current state — we need it for side-effect logic and owner notify.
    const current = await prisma.cancellationRequest.findUnique({
      where: { id },
      select: {
        status: true,
        bookingId: true,
        userId: true,
        bookingCode: true,
        booking: {
          select: {
            id: true,
            status: true,
            property: { select: { ownerId: true, title: true } },
            code: { select: { id: true, status: true, codeVisible: true } },
          },
        },
      },
    });
    if (!current) return res.status(404).json({ error: "Cancellation request not found" });

    const { ownerTemplate, shouldVoidAndCancel } = getOwnerSideEffects(
      nextStatus,
      current.status as CancellationStatus,
    );

    // Run all DB mutations atomically.
    const updated = await prisma.$transaction(async (tx) => {
      const request = await tx.cancellationRequest.update({
        where: { id },
        data: {
          ...(nextStatus ? { status: nextStatus, reviewedBy: adminId, reviewedAt: new Date() } : {}),
          ...(decisionNote !== undefined ? { decisionNote: decisionNote || null } : {}),
        },
        select: {
          id: true,
          status: true,
          decisionNote: true,
          reviewedAt: true,
          reviewedBy: true,
          userId: true,
          bookingCode: true,
        },
      });

      if (shouldVoidAndCancel && current.booking) {
        // Cancel the booking so it no longer appears as active.
        if (current.booking.status !== "CANCELED") {
          await tx.booking.update({
            where: { id: current.booking.id },
            data: { status: "CANCELED" },
          });
        }
        // Void the check-in code so the owner cannot use it.
        if (current.booking.code && current.booking.code.status === "ACTIVE") {
          await tx.checkinCode.update({
            where: { id: current.booking.code.id },
            data: {
              status: "VOID",
              voidReason: `Booking cancelled — cancellation request moved to ${nextStatus} by admin`,
              voidedAt: new Date(),
            },
          });
        }
      }

      return request;
    });

    // Post-transaction side-effects: notify owner + real-time events.
    if (ownerTemplate && current.booking) {
      const ownerId = current.booking.property?.ownerId;
      const propertyTitle = current.booking.property?.title;
      const code = current.booking.code;

      if (ownerId) {
        try {
          await notifyOwner(ownerId, ownerTemplate, {
            bookingId: current.bookingId,
            bookingCode: current.bookingCode,
            propertyTitle,
            requestId: id,
            newStatus: nextStatus,
            decisionNote: updated.decisionNote,
          });
        } catch {
          // ignore — notification failure must never block the response
        }
      }

      const io = req.app.get("io");
      if (io) {
        if (shouldVoidAndCancel && code) {
          io.emit("admin:code:voided", { bookingId: current.bookingId, code: code.codeVisible });
        }
        if (ownerId) {
          io.to(`owner:${ownerId}`).emit("booking:cancellation_update", {
            bookingId: current.bookingId,
            bookingCode: current.bookingCode,
            status: nextStatus,
            cancelled: shouldVoidAndCancel,
          });
        }
      }
    }

    // Notify the customer of the status change (best-effort).
    try {
      await notifyUser(updated.userId, "cancellation_status_update" as any, {
        requestId: updated.id,
        bookingCode: updated.bookingCode,
        status: updated.status,
        decisionNote: updated.decisionNote,
      });
    } catch {
      // ignore
    }

    return res.json({ item: updated });
  } catch (error: any) {
    console.error("PATCH /admin/cancellations/:id error:", error);
    return res.status(500).json({ error: "Failed to update cancellation request" });
  }
}) as RequestHandler);

/**
 * POST /api/admin/cancellations/:id/messages
 * Body: { body: string, setStatus?: string }
 *
 * When setStatus is provided, applies the same progressive side-effects as PATCH:
 *  REVIEWING  → notify owner "under review"
 *  PROCESSING → void code + cancel booking + notify owner "approved"
 *  REFUNDED   → notify owner "refund complete" (void/cancel as fallback if needed)
 *  REJECTED   → notify owner "request rejected, booking stays active"
 */
router.post("/:id/messages", limitCancellationMessages, (async (req: AuthedRequest, res) => {
  try {
    const adminUser = req.user;
    const adminRole = String((adminUser as any)?.role ?? "").toUpperCase();
    if (!adminUser || typeof adminUser.id !== "number" || !Number.isFinite(adminUser.id) || adminUser.id <= 0 || adminRole !== "ADMIN") {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const adminId = adminUser.id;
    const id = Number(req.params.id);
    const body = String(req.body?.body || "").trim();
    if (!body) return res.status(400).json({ error: "Message body is required" });

    const setStatus = req.body?.setStatus ? normalizeStatus(req.body.setStatus) : null;
    if (req.body?.setStatus && !setStatus) return res.status(400).json({ error: "Invalid setStatus" });

    // Pre-fetch state — needed for side-effect logic at every stage.
    const current = setStatus
      ? await prisma.cancellationRequest.findUnique({
          where: { id },
          select: {
            status: true,
            bookingId: true,
            bookingCode: true,
            booking: {
              select: {
                id: true,
                status: true,
                property: { select: { ownerId: true, title: true } },
                code: { select: { id: true, status: true, codeVisible: true } },
              },
            },
          },
        })
      : null;

    const { ownerTemplate, shouldVoidAndCancel } = getOwnerSideEffects(
      setStatus,
      (current?.status ?? "SUBMITTED") as CancellationStatus,
    );

    const updated = await prisma.$transaction(async (tx) => {
      const msg = await tx.cancellationMessage.create({
        data: {
          cancellationRequestId: id,
          senderId: adminId,
          senderRole: "ADMIN",
          body: body.slice(0, 4000),
        },
        select: { id: true, senderId: true, senderRole: true, body: true, createdAt: true },
      });

      const reqRow = await tx.cancellationRequest.update({
        where: { id },
        data: setStatus ? { status: setStatus, reviewedBy: adminId, reviewedAt: new Date() } : {},
        select: { id: true, userId: true, bookingCode: true, status: true, decisionNote: true },
      });

      if (shouldVoidAndCancel && current?.booking) {
        // Cancel the booking.
        if (current.booking.status !== "CANCELED") {
          await tx.booking.update({
            where: { id: current.booking.id },
            data: { status: "CANCELED" },
          });
        }
        // Void the check-in code.
        if (current.booking.code && current.booking.code.status === "ACTIVE") {
          await tx.checkinCode.update({
            where: { id: current.booking.code.id },
            data: {
              status: "VOID",
              voidReason: `Booking cancelled — cancellation request moved to ${setStatus} by admin`,
              voidedAt: new Date(),
            },
          });
        }
      }

      return { msg, reqRow };
    });

    // Post-transaction side-effects (owner notification + socket events).
    if (ownerTemplate && current?.booking) {
      const ownerId = current.booking.property?.ownerId;
      const propertyTitle = current.booking.property?.title;
      const code = current.booking.code;

      if (ownerId) {
        try {
          await notifyOwner(ownerId, ownerTemplate, {
            bookingId: current.bookingId,
            bookingCode: current.bookingCode,
            propertyTitle,
            requestId: id,
            newStatus: setStatus,
            decisionNote: updated.reqRow.decisionNote,
          });
        } catch {
          // ignore
        }
      }

      const io = req.app.get("io");
      if (io) {
        if (shouldVoidAndCancel && code) {
          io.emit("admin:code:voided", { bookingId: current.bookingId, code: code.codeVisible });
        }
        if (ownerId) {
          io.to(`owner:${ownerId}`).emit("booking:cancellation_update", {
            bookingId: current.bookingId,
            bookingCode: current.bookingCode,
            status: setStatus,
            cancelled: shouldVoidAndCancel,
          });
        }
      }
    }

    // Notify customer (best-effort).
    try {
      await notifyUser(updated.reqRow.userId, "cancellation_message" as any, {
        requestId: updated.reqRow.id,
        bookingCode: updated.reqRow.bookingCode,
        status: updated.reqRow.status,
      });
    } catch {
      // ignore
    }

    return res.status(201).json({ message: updated.msg, status: updated.reqRow.status });
  } catch (error: any) {
    console.error("POST /admin/cancellations/:id/messages error:", error);
    return res.status(500).json({ error: "Failed to send message" });
  }
}) as RequestHandler);

export default router;


