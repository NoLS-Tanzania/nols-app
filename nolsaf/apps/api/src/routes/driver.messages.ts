import { Router, Request, Response } from "express";
import type { RequestHandler } from "express";
import { requireAuth, requireRole } from "../middleware/auth";
import { prisma } from "@nolsaf/prisma";

const router = Router();

// Prepared templates in Swahili + English hints
const preparedMessages: Array<{ key: string; text: string }> = [
  { key: "nakuja", text: "Nakuja" },
  { key: "nisubiri", text: "Nisubiri, nafika hapo ulipo" },
  { key: "foleni", text: "Nivumilie, kuna foleni kidogo" },
  { key: "arrived", text: "Nimefika kwenye eneo la kuchukua" },
  { key: "starting", text: "Safari inaanza sasa, tafadhali vaa mkanda" },
];

// GET /api/driver/messages/templates
const getTemplates: RequestHandler = async (_req: Request, res: Response) => {
  return res.json({ templates: preparedMessages });
};

// POST /api/driver/messages/send
// Body: { toUserId: string; templateKey?: string; message?: string }
const postSendMessage: RequestHandler = async (req: Request, res: Response) => {
  const { toUserId, templateKey, message } = req.body || {};

  if (!toUserId || typeof toUserId !== "string") {
    return res.status(400).json({ error: "toUserId is required" });
  }

  let text = "";
  if (message && typeof message === "string") {
    text = message.trim();
  } else if (templateKey && typeof templateKey === "string") {
    const found = preparedMessages.find((t) => t.key === templateKey);
    if (found) text = found.text;
  }

  if (!text) {
    return res.status(400).json({ error: "Provide a message or a valid templateKey" });
  }

  // Persist as an in-app Notification (acts as an inbox item)
  const fromUserId = (req as any)?.user?.id;
  const toNumeric = Number(toUserId);
  const canDeliver = Number.isFinite(toNumeric) && toNumeric > 0;

  let savedId: number | null = null;
  if (canDeliver) {
    try {
      const n = await prisma.notification.create({
        data: {
          userId: toNumeric,
          title: "New message from driver",
          body: text,
          unread: true,
          type: "message",
          meta: {
            fromUserId: typeof fromUserId === "number" ? fromUserId : null,
            fromRole: "DRIVER",
            templateKey: typeof templateKey === "string" ? templateKey : null,
          },
        },
      });
      savedId = n.id;
    } catch (e: any) {
      // ignore DB failures; still return ok for demo/dev
    }
  }

  // Emit via Socket.IO if present (best-effort)
  try {
    const io = (req.app && (req.app as any).get && (req.app as any).get("io")) || (global as any).io;
    if (io && typeof io.to === "function" && canDeliver) {
      io.to(`user:${toNumeric}`).emit("message:new", { id: savedId, toUserId: toNumeric, fromUserId, message: text });
      if (typeof fromUserId === "number") {
        io.to(`driver:${fromUserId}`).emit("message:sent", { toUserId: toNumeric, message: text });
      }
    }
  } catch {
    // ignore
  }

  return res.json({
    ok: true,
    delivered: canDeliver,
    notificationId: savedId,
    toUserId,
    message: text,
    warning: canDeliver ? undefined : "toUserId is not a numeric user id; message was not delivered to inbox",
  });
};

router.use(requireAuth as unknown as RequestHandler);
router.use(requireRole("DRIVER") as unknown as RequestHandler);

router.get("/templates", getTemplates as unknown as RequestHandler);
router.post("/send", postSendMessage as unknown as RequestHandler);

export default router;

