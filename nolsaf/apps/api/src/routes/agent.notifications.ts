import { Router } from "express";
import { z } from "zod";
import { AuthedRequest, requireAuth, requireRole } from "../middleware/auth.js";
import { limitAgentPortalRead } from "../middleware/rateLimit.js";
import { fetchNotifications, markNotificationRead } from "../services/notifications";

const router = Router();
router.use(requireAuth as any, requireRole("AGENT") as any);

const listQuerySchema = z
  .object({
    tab: z.enum(["unread", "viewed"]).optional(),
    page: z
      .string()
      .regex(/^\d+$/)
      .optional()
      .default("1")
      .transform((v) => Number(v) || 1),
    pageSize: z
      .string()
      .regex(/^\d+$/)
      .optional()
      .default("20")
      .transform((v) => Math.min(Math.max(Number(v) || 20, 1), 100)),
  })
  .strict();

const idParamsSchema = z
  .object({
    id: z.string().regex(/^\d+$/),
  })
  .strict();

// GET /api/agent/notifications?tab=unread|viewed&page=1&pageSize=20
router.get(
  "/",
  limitAgentPortalRead as any,
  (async (req: AuthedRequest, res: any) => {
    const userId = req.user!.id;

    const parsed = listQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) return res.status(400).json({ ok: false, error: "invalid_query" });

    const tab = parsed.data.tab ?? "unread";
    const page = parsed.data.page;
    const pageSize = parsed.data.pageSize;

    const result = await fetchNotifications({ tab: tab as any, page, pageSize, userId, types: ["agent"] } as any);
    return res.json(result);
  }) as any
);

// POST /api/agent/notifications/:id/mark-read
router.post(
  "/:id/mark-read",
  limitAgentPortalRead as any,
  (async (req: AuthedRequest, res: any) => {
    const params = idParamsSchema.safeParse(req.params ?? {});
    if (!params.success) return res.status(400).json({ ok: false, error: "invalid_id" });

    const id = Number(params.data.id);
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ ok: false, error: "invalid_id" });

    const userId = req.user!.id;
    const r = await markNotificationRead(id, undefined, userId, { types: ["agent"] });
    if (!r.ok) return res.status(404).json(r);
    return res.json(r);
  }) as any
);

export default router;
