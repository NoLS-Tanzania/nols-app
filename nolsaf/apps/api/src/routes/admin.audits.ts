import { Router } from "express";
import type { RequestHandler } from 'express';
import { prisma } from "@nolsaf/prisma";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { Prisma } from "@prisma/client";
// lightweight CSV serializer (avoid adding dependency)
function toCsv(rows: Array<Record<string, any>>, fields: string[]) {
  const esc = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    if (s.includes(',') || s.includes('\n') || s.includes('"')) return `"${s}"`;
    return s;
  };
  const header = fields.join(',');
  const lines = rows.map((r) => fields.map((f) => esc(r[f])).join(','));
  return [header, ...lines].join('\n');
}

const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("ADMIN") as unknown as RequestHandler);

// GET /
// supports ?q=search & ?adminId= & ?targetId= & ?action= & ?from= & ?to= & ?format=csv
// mounted at /api/admin/audits
router.get("/", async (req, res) => {
  const { q, adminId, targetId, action, from, to, format } = req.query ?? {};

  const where: any = {};
  if (adminId) where.adminId = Number(adminId);
  if (targetId) where.targetUserId = Number(targetId);
  if (action) where.action = String(action);
  if (from || to) where.createdAt = {};
  if (from) where.createdAt.gte = new Date(String(from));
  if (to) where.createdAt.lte = new Date(String(to));
  if (q) {
    // simple search over action and details
    where.OR = [
      { action: { contains: String(q), mode: "insensitive" } },
      { details: { contains: String(q), mode: "insensitive" } },
    ];
  }

  try {
    const items = await prisma.adminAudit.findMany({ where, orderBy: { createdAt: "desc" }, take: 1000 });

    if (String(format).toLowerCase() === "csv") {
      const fields = ["id", "adminId", "targetUserId", "action", "details", "createdAt"];
      const rows = items.map((i: any) => ({ id: i.id, adminId: i.adminId, targetUserId: i.targetUserId, action: i.action, details: JSON.stringify(i.details), createdAt: i.createdAt }));
      const csv = toCsv(rows, fields);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="audits-${Date.now()}.csv"`);
      return res.send(csv);
    }

    return res.json(items);
  } catch (err: any) {
    // If DB is out-of-sync, return safe empty response so UI can continue to function in dev
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch when querying adminAudit:', err.message);
      if (String(format).toLowerCase() === "csv") {
        const fields = ["id", "adminId", "targetUserId", "action", "details", "createdAt"];
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="audits-${Date.now()}.csv"`);
        return res.send(fields.join(',') + '\n');
      }
      return res.json([]);
    }
    console.error('Unhandled error in GET /admin/audits:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
