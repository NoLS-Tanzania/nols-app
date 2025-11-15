// apps/api/src/routes/admin.revenue.secure.ts
import { Router, RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { requireFinanceGrant } from "../middleware/financeGrant.js";

export const router = Router();
router.use(requireAuth as RequestHandler, requireRole("ADMIN") as RequestHandler);

router.get("/kpis", requireFinanceGrant, async (req, res) => {
  const paidAgg = await prisma.invoice.aggregate({
    _sum: { commissionAmount: true, netPayable: true, total: true },
    where: { status: "PAID" }
  });
  res.json({
    totalGross: Number(paidAgg._sum.total ?? 0),
    totalNet: Number(paidAgg._sum.netPayable ?? 0),
    companyRevenue: Number(paidAgg._sum.commissionAmount ?? 0),
  });
});

export default router;
