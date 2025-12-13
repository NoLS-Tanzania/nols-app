import { Router, Request, Response } from "express";
import type { RequestHandler } from "express";
import { requireAuth, requireRole } from "../middleware/auth";

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

  // TODO: Integrate with actual messaging/notifications channel (e.g., push, socket, SMS)
  // For now, just acknowledge.
  return res.json({
    ok: true,
    toUserId,
    message: text,
  });
};

router.use(requireAuth as unknown as RequestHandler);
router.use(requireRole("DRIVER") as unknown as RequestHandler);

router.get("/templates", getTemplates as unknown as RequestHandler);
router.post("/send", postSendMessage as unknown as RequestHandler);

export default router;

