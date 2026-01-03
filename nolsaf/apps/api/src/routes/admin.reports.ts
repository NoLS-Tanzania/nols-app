import { Router } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, requireRole } from "../middleware/auth.js";
import type { Prisma } from "@prisma/client";

const router = Router();
router.use(requireAuth as any, requireRole("ADMIN") as any);

// GET /api/admin/reports
// Returns aggregates for week / month / year
router.get("/", async (req, res) => {
  try {
    const now = new Date();
    // compute period boundaries (local server time)
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diffToMonday = (day + 6) % 7; // 0->Mon
    startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);
    startOfWeek.setHours(0,0,0,0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0,0,0,0);
    const startOfYear = new Date(now.getFullYear(), 0, 1, 0,0,0,0);

    const params = {
      weekStart: startOfWeek.toISOString(),
      monthStart: startOfMonth.toISOString(),
      yearStart: startOfYear.toISOString(),
    };

    // invoices: counts and sums using paidAt when available, otherwise issuedAt
    const invoicesWeek = await prisma.$queryRaw`
      SELECT COUNT(*) AS cnt, COALESCE(SUM(netPayable),0) AS sum
      FROM Invoice
      WHERE status = 'PAID' AND (paidAt IS NOT NULL AND paidAt >= ${params.weekStart} OR (paidAt IS NULL AND issuedAt >= ${params.weekStart}))
    `;
    const invoicesMonth = await prisma.$queryRaw`
      SELECT COUNT(*) AS cnt, COALESCE(SUM(netPayable),0) AS sum
      FROM Invoice
      WHERE status = 'PAID' AND (paidAt IS NOT NULL AND paidAt >= ${params.monthStart} OR (paidAt IS NULL AND issuedAt >= ${params.monthStart}))
    `;
    const invoicesYear = await prisma.$queryRaw`
      SELECT COUNT(*) AS cnt, COALESCE(SUM(netPayable),0) AS sum
      FROM Invoice
      WHERE status = 'PAID' AND (paidAt IS NOT NULL AND paidAt >= ${params.yearStart} OR (paidAt IS NULL AND issuedAt >= ${params.yearStart}))
    `;

    // revenue: sum of PaymentEvent.amount where status indicates success and receivedAt >= period
    const revenueWeek = await prisma.$queryRaw`
      SELECT COALESCE(SUM(amount),0) AS sum FROM PaymentEvent WHERE status IN ('SUCCESS','COMPLETED','PAID') AND receivedAt >= ${params.weekStart}
    `;
    const revenueMonth = await prisma.$queryRaw`
      SELECT COALESCE(SUM(amount),0) AS sum FROM PaymentEvent WHERE status IN ('SUCCESS','COMPLETED','PAID') AND receivedAt >= ${params.monthStart}
    `;
    const revenueYear = await prisma.$queryRaw`
      SELECT COALESCE(SUM(amount),0) AS sum FROM PaymentEvent WHERE status IN ('SUCCESS','COMPLETED','PAID') AND receivedAt >= ${params.yearStart}
    `;

    // properties approved
    const propsWeek = await prisma.$queryRaw`
      SELECT COUNT(*) AS cnt FROM Property WHERE status = 'APPROVED' AND createdAt >= ${params.weekStart}
    `;
    const propsMonth = await prisma.$queryRaw`
      SELECT COUNT(*) AS cnt FROM Property WHERE status = 'APPROVED' AND createdAt >= ${params.monthStart}
    `;
    const propsYear = await prisma.$queryRaw`
      SELECT COUNT(*) AS cnt FROM Property WHERE status = 'APPROVED' AND createdAt >= ${params.yearStart}
    `;

    // new owners
    const ownersWeek = await prisma.$queryRaw`
      SELECT COUNT(*) AS cnt FROM User WHERE role = 'OWNER' AND createdAt >= ${params.weekStart}
    `;
    const ownersMonth = await prisma.$queryRaw`
      SELECT COUNT(*) AS cnt FROM User WHERE role = 'OWNER' AND createdAt >= ${params.monthStart}
    `;
    const ownersYear = await prisma.$queryRaw`
      SELECT COUNT(*) AS cnt FROM User WHERE role = 'OWNER' AND createdAt >= ${params.yearStart}
    `;

    // bookings count (bookings with checkIn in period)
    const bookingsWeek = await prisma.$queryRaw`
      SELECT COUNT(*) AS cnt FROM Booking WHERE checkIn >= ${params.weekStart} AND checkIn < ${new Date(startOfWeek.getTime()+7*24*3600*1000).toISOString()}
    `;
    const bookingsMonth = await prisma.$queryRaw`
      SELECT COUNT(*) AS cnt FROM Booking WHERE checkIn >= ${params.monthStart}
    `;
    const bookingsYear = await prisma.$queryRaw`
      SELECT COUNT(*) AS cnt FROM Booking WHERE checkIn >= ${params.yearStart}
    `;

    const result = {
      invoices: {
        week: { count: Number((invoicesWeek as any)[0]?.cnt ?? 0), sum: Number((invoicesWeek as any)[0]?.sum ?? 0) },
        month: { count: Number((invoicesMonth as any)[0]?.cnt ?? 0), sum: Number((invoicesMonth as any)[0]?.sum ?? 0) },
        year: { count: Number((invoicesYear as any)[0]?.cnt ?? 0), sum: Number((invoicesYear as any)[0]?.sum ?? 0) },
      },
      revenue: {
        week: Number((revenueWeek as any)[0]?.sum ?? 0),
        month: Number((revenueMonth as any)[0]?.sum ?? 0),
        year: Number((revenueYear as any)[0]?.sum ?? 0),
      },
      properties: {
        week: Number((propsWeek as any)[0]?.cnt ?? 0),
        month: Number((propsMonth as any)[0]?.cnt ?? 0),
        year: Number((propsYear as any)[0]?.cnt ?? 0),
      },
      owners: {
        week: Number((ownersWeek as any)[0]?.cnt ?? 0),
        month: Number((ownersMonth as any)[0]?.cnt ?? 0),
        year: Number((ownersYear as any)[0]?.cnt ?? 0),
      },
      bookings: {
        week: Number((bookingsWeek as any)[0]?.cnt ?? 0),
        month: Number((bookingsMonth as any)[0]?.cnt ?? 0),
        year: Number((bookingsYear as any)[0]?.cnt ?? 0),
      },
      generatedAt: new Date().toISOString(),
    };

    return res.json(result);
  } catch (err: any) {
    // Defensive: Prisma schema mismatch — return safe nulls so frontend remains usable in dev
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch in admin.reports:', err.message);
      return res.json({ invoices: { week:{count:0,sum:0},month:{count:0,sum:0},year:{count:0,sum:0} }, revenue: { week:0,month:0,year:0 }, properties: { week:0,month:0,year:0 }, owners: { week:0,month:0,year:0 }, bookings: { week:0,month:0,year:0 }, generatedAt: new Date().toISOString() });
    }
    console.error('Unhandled error in admin.reports:', err);
    return res.status(500).json({ error: 'internal' });
  }
});

export default router;
