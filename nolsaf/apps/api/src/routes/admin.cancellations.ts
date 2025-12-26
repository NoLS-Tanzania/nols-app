import { Router } from "express";
import type { RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth, requireRole } from "../middleware/auth.js";
import { notifyUser } from "../lib/notifications.js";
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
    let paymentInfo = null;
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
 * PATCH /api/admin/cancellations/:id
 * Body: { status?: string, decisionNote?: string }
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

    const updated = await prisma.cancellationRequest.update({
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

    // Notify customer (best-effort). notifyOwner sets both userId and ownerId; we want user notifications.
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
 */
router.post("/:id/messages", limitCancellationMessages, (async (req: AuthedRequest, res) => {
  try {
    const adminId = req.user!.id;
    const id = Number(req.params.id);
    const body = String(req.body?.body || "").trim();
    if (!body) return res.status(400).json({ error: "Message body is required" });

    const setStatus = req.body?.setStatus ? normalizeStatus(req.body.setStatus) : null;
    if (req.body?.setStatus && !setStatus) return res.status(400).json({ error: "Invalid setStatus" });

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
        select: { id: true, userId: true, bookingCode: true, status: true },
      });

      return { msg, reqRow };
    });

    // Notify customer (best-effort)
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


