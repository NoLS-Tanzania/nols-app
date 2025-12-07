// apps/api/src/routes/admin.owners.ts
import { Router, RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, requireRole } from "../middleware/auth.js";
import jwt from "jsonwebtoken";
import { Prisma } from "@prisma/client";

export const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("ADMIN") as unknown as RequestHandler);

/** GET /admin/owners/counts */
router.get("/counts", async (req, res) => {
  try {
    // Get total count first (this should always work)
    const total = await prisma.user.count({ where: { role: "OWNER" } }).catch(() => 0);
    
    // Try to get other counts, but handle cases where fields might not exist
    let active = 0;
    let suspended = 0;
    let pendingKYC = 0;
    let approvedKYC = 0;
    let rejectedKYC = 0;

    try {
      // Try suspendedAt field - if it doesn't exist, all are "active"
      const [activeCount, suspendedCount] = await Promise.all([
        prisma.user.count({ where: { role: "OWNER", suspendedAt: null } }).catch(() => total),
        prisma.user.count({ where: { role: "OWNER", suspendedAt: { not: null } } }).catch(() => 0),
      ]);
      active = activeCount;
      suspended = suspendedCount;
    } catch (e) {
      // If suspendedAt field doesn't exist, assume all are active
      active = total;
      suspended = 0;
    }

    try {
      // Try kycStatus field - if it doesn't exist, all are 0
      const [pending, approved, rejected] = await Promise.all([
        prisma.user.count({ where: { role: "OWNER", kycStatus: "PENDING_KYC" } }).catch(() => 0),
        prisma.user.count({ where: { role: "OWNER", kycStatus: "APPROVED_KYC" } }).catch(() => 0),
        prisma.user.count({ where: { role: "OWNER", kycStatus: "REJECTED_KYC" } }).catch(() => 0),
      ]);
      pendingKYC = pending;
      approvedKYC = approved;
      rejectedKYC = rejected;
    } catch (e) {
      // If kycStatus field doesn't exist, all are 0
      pendingKYC = 0;
      approvedKYC = 0;
      rejectedKYC = 0;
    }

    // Return flat structure matching frontend expectations
    return res.status(200).json({
      "": total,
      "ACTIVE": active,
      "SUSPENDED": suspended,
      "PENDING_KYC": pendingKYC,
      "APPROVED_KYC": approvedKYC,
      "REJECTED_KYC": rejectedKYC,
    });
  } catch (err: any) {
    console.error('Unhandled error in GET /admin/owners/counts:', err);
    // Always return JSON, never HTML
    return res.status(500).json({ 
      error: 'Internal server error',
      message: err?.message || 'Unknown error',
      // Return default counts on error so frontend doesn't break
      "": 0,
      "ACTIVE": 0,
      "SUSPENDED": 0,
      "PENDING_KYC": 0,
      "APPROVED_KYC": 0,
      "REJECTED_KYC": 0,
    });
  }
});

/** GET /admin/owners?q=&status=&page=&pageSize= */
router.get("/", async (req, res) => {
  try {
    const { q = "", status = "", page = "1", pageSize = "50" } = req.query as any;

    const where: any = { role: "OWNER" };
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ];
    }
    if (status) {
      if (status === "SUSPENDED") where.suspendedAt = { not: null };
      if (status === "ACTIVE") where.suspendedAt = null;
      if (["PENDING_KYC","APPROVED_KYC","REJECTED_KYC"].includes(String(status))) {
        where.kycStatus = status;
      }
    }

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Math.min(Number(pageSize), 100);

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, phone: true,
          suspendedAt: true, kycStatus: true, createdAt: true,
          _count: { select: { properties: true } },
        },
        orderBy: { id: "desc" },
        skip, take,
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({ total, page: Number(page), pageSize: take, items });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch when querying users (owners list):', err.message);
      const page = Number((req.query as any).page ?? 1);
      const pageSize = Math.min(Number((req.query as any).pageSize ?? 50), 100);
      return res.json({ total: 0, page, pageSize, items: [] });
    }
    console.error('Unhandled error in GET /admin/owners:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /admin/owners/:id */
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const owner = await prisma.user.findFirst({
      where: { id, role: "OWNER" },
      select: {
        id: true, name: true, email: true, phone: true,
        suspendedAt: true, kycStatus: true, createdAt: true,
        _count: { select: { properties: true } },
      },
    });
    if (!owner) return res.status(404).json({ error: "Owner not found" });

    const [props, money, invoices] = await Promise.all([
      prisma.property.findMany({
        where: { ownerId: id },
        select: { id: true, title: true, status: true, type: true, createdAt: true },
        orderBy: { id: "desc" },
        take: 10,
      }),
      prisma.invoice.aggregate({
        where: { ownerId: id, status: "PAID" },
        _sum: { netPayable: true, total: true, commissionAmount: true },
        _count: { _all: true },
      }),
      prisma.invoice.count({ where: { ownerId: id } }),
    ]);

    return res.json({
      owner,
      snapshot: {
        propertiesRecent: props,
        invoicesCount: invoices,
        revenue: {
          netSum: Number(money._sum.netPayable ?? 0),
          grossSum: Number(money._sum.total ?? 0),
          commissionSum: Number(money._sum.commissionAmount ?? 0),
          paidCount: money._count._all,
        },
      },
    });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch when querying owner by id:', err.message);
      return res.status(200).json({ owner: null, snapshot: { propertiesRecent: [], invoicesCount: 0, revenue: { netSum: 0, grossSum: 0, commissionSum: 0, paidCount: 0 } } });
    }
    console.error('Unhandled error in GET /admin/owners/:id', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** POST /admin/owners/:id/suspend {reason} */
router.post("/:id/suspend", async (req, res) => {
  const id = Number(req.params.id);
  const reason = String(req.body?.reason ?? "");
  const me = (req.user as any).id;

  const updated = await prisma.user.update({
    where: { id },
    data: { suspendedAt: new Date() },
  });
  await prisma.adminAudit.create({
    data: { adminId: me, targetUserId: id, action: "SUSPEND_OWNER", details: reason },
  });

  req.app.get("io")?.emit?.("admin:owner:updated", { ownerId: id });
  res.json({ ok: true, ownerId: updated.id, suspendedAt: updated.suspendedAt });
});

/** POST /admin/owners/:id/unsuspend */
router.post("/:id/unsuspend", async (req, res) => {
  const id = Number(req.params.id);
  const me = (req.user as any).id;
  const updated = await prisma.user.update({
    where: { id },
    data: { suspendedAt: null },
  });
  await prisma.adminAudit.create({
    data: { adminId: me, targetUserId: id, action: "UNSUSPEND_OWNER" },
  });

  req.app.get("io")?.emit?.("admin:owner:updated", { ownerId: id });
  res.json({ ok: true, ownerId: updated.id });
});

/** POST /admin/owners/:id/kyc/approve {note?} */
router.post("/:id/kyc/approve", async (req, res) => {
  const id = Number(req.params.id);
  const me = (req.user as any).id;
  const note = String(req.body?.note ?? "");

  const updated = await prisma.user.update({
    where: { id },
    data: { kycStatus: "APPROVED_KYC" },
  });
  await prisma.adminAudit.create({
    data: { adminId: me, targetUserId: id, action: "KYC_APPROVE", details: note },
  });

  req.app.get("io")?.emit?.("admin:kyc:updated", { ownerId: id, status: "APPROVED_KYC" });
  res.json({ ok: true });
});

/** POST /admin/owners/:id/kyc/reject {reason} */
router.post("/:id/kyc/reject", async (req, res) => {
  const id = Number(req.params.id);
  const me = (req.user as any).id;
  const reason = String(req.body?.reason ?? "");

  const updated = await prisma.user.update({
    where: { id },
    data: { kycStatus: "REJECTED_KYC" },
  });
  await prisma.adminAudit.create({
    data: { adminId: me, targetUserId: id, action: "KYC_REJECT", details: reason },
  });

  req.app.get("io")?.emit?.("admin:kyc:updated", { ownerId: id, status: "REJECTED_KYC" });
  res.json({ ok: true });
});

/** GET /admin/owners/:id/documents */
router.get("/:id/documents", async (req, res) => {
  const id = Number(req.params.id);
  const docs = await prisma.userDocument.findMany({
    where: { userId: id },
    orderBy: { id: "desc" },
  });
  res.json({ items: docs });
});

/** POST /admin/owners/:id/documents/:docId/approve */
router.post("/:id/documents/:docId/approve", async (req, res) => {
  const id = Number(req.params.id);
  const docId = Number(req.params.docId);
  await prisma.userDocument.update({
    where: { id: docId },
    data: { status: "APPROVED" },
  });
  req.app.get("io")?.emit?.("admin:kyc:updated", { ownerId: id });
  res.json({ ok: true });
});

/** POST /admin/owners/:id/documents/:docId/reject {reason} */
router.post("/:id/documents/:docId/reject", async (req, res) => {
  const id = Number(req.params.id);
  const docId = Number(req.params.docId);
  const reason = String(req.body?.reason ?? "");
  await prisma.userDocument.update({
    where: { id: docId },
    data: { status: "REJECTED", reason },
  });
  req.app.get("io")?.emit?.("admin:kyc:updated", { ownerId: id });
  res.json({ ok: true });
});

/** POST /admin/owners/:id/impersonate -> short-lived owner JWT */
router.post("/:id/impersonate", async (req, res) => {
  const id = Number(req.params.id);
  const owner = await prisma.user.findUnique({ where: { id } });
  if (!owner || owner.role !== "OWNER") return res.status(404).json({ error: "Owner not found" });

  const ttlSec = 10 * 60; // 10 minutes
  const token = jwt.sign(
    { sub: owner.id, role: "OWNER", imp: true },
    process.env.JWT_SECRET!,
    { expiresIn: ttlSec }
  );
  await prisma.adminAudit.create({
    data: { adminId: (req.user as any).id, targetUserId: id, action: "IMPERSONATE_ISSUE" },
  });
  res.json({ token, expiresIn: ttlSec });
});

/** POST /admin/owners/:id/notes {text} */
router.post("/:id/notes", async (req, res) => {
  const id = Number(req.params.id);
  const text = String(req.body?.text ?? "");
  if (!text.trim()) return res.status(400).json({ error: "Note required" });
  const note = await prisma.adminNote.create({
    data: { ownerId: id, adminId: (req.user as any).id, text },
  });
  res.json({ ok: true, note });
});

export default router;
