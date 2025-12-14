// apps/api/src/routes/admin.drivers.ts
import { Router, RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { Prisma } from "@prisma/client";

export const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("ADMIN") as unknown as RequestHandler);

/** GET /admin/drivers?q=&status=&page=&pageSize= */
router.get("/", async (req, res) => {
  try {
    const { q = "", status = "", page = "1", pageSize = "50" } = req.query as any;

    const where: any = { role: "DRIVER" };
    if (q) {
      where.OR = [
        // MySQL doesn't support `mode: "insensitive"`, so use plain contains
        { name: { contains: q } },
        { email: { contains: q } },
        { phone: { contains: q } },
      ];
    }
    if (status) {
      if (status === "SUSPENDED") where.suspendedAt = { not: null };
      if (status === "ACTIVE") where.suspendedAt = null;
    }

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Math.min(Number(pageSize), 100);

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, phone: true,
          suspendedAt: true, createdAt: true,
          _count: true,
        },
        orderBy: { id: "desc" },
        skip, take,
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({ total, page: Number(page), pageSize: take, items });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch when querying drivers list:', err.message);
      const page = Number((req.query as any).page ?? 1);
      const pageSize = Math.min(Number((req.query as any).pageSize ?? 50), 100);
      return res.json({ total: 0, page, pageSize, items: [] });
    }
    if (err instanceof Prisma.PrismaClientValidationError) {
      console.warn('Prisma validation error when querying drivers list:', err.message);
      const page = Number((req.query as any).page ?? 1);
      const pageSize = Math.min(Number((req.query as any).pageSize ?? 50), 100);
      return res.json({ total: 0, page, pageSize, items: [] });
    }
    console.error('Unhandled error in GET /admin/drivers:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /admin/drivers/trips?driverId=&status=&date=&start=&end=&page=&pageSize=&q= */
/** GET /admin/drivers/trips/stats?period=7d|30d|month|year */
router.get("/trips/stats", async (req, res) => {
  try {
    const { period = "30d" } = req.query as any;
    
    let startDate: Date;
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    // Calculate start date based on period
    switch (period) {
      case "7d":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "month":
        startDate = new Date();
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "year":
        startDate = new Date();
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
    }
    startDate.setHours(0, 0, 0, 0);

    // Transport trips live in TransportBooking (NOT Booking).
    // Booking is for property stays and does not have driverId/scheduledAt/price.
    if (!(prisma as any).transportBooking) {
      return res.json({
        stats: [],
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
    }

    // Get all transport trips in the date range
    const trips = await (prisma as any).transportBooking.findMany({
      where: {
        driverId: { not: null },
        scheduledDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        scheduledDate: true,
        status: true,
        amount: true,
      },
      orderBy: {
        scheduledDate: "asc",
      },
    });

    // Group by date
    const dateMap = new Map<string, { count: number; completed: number; amount: number }>();
    
    trips.forEach((trip) => {
      const dateKey = trip.scheduledDate.toISOString().split("T")[0];
      const existing = dateMap.get(dateKey) || { count: 0, completed: 0, amount: 0 };
      existing.count += 1;
      if (trip.status === "COMPLETED") {
        existing.completed += 1;
      }
      existing.amount += Number(trip.amount ?? 0);
      dateMap.set(dateKey, existing);
    });

    // Convert to array and sort
    const stats = Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        count: data.count,
        completed: data.completed,
        amount: data.amount,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return res.json({ stats, period, startDate: startDate.toISOString(), endDate: endDate.toISOString() });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch when querying trip stats:', err.message);
      return res.json({ stats: [], period: (req.query as any).period || "30d", startDate: new Date().toISOString(), endDate: new Date().toISOString() });
    }
    console.error('Unhandled error in GET /admin/drivers/trips/stats:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.get("/trips", async (req, res) => {
  try {
    const { driverId, status, date, start, end, page = "1", pageSize = "50", q = "" } = req.query as any;
    
    const where: any = {};
    
    // Filter by driver if specified
    if (driverId) {
      (where as any).driverId = Number(driverId);
    } else {
      // Only show trips that have a driver assigned
      (where as any).driverId = { not: null };
    }
    
    // Filter by status
    if (status) {
      where.status = status;
    }
    
    // Date filtering
    if (date) {
      const s = new Date(String(date) + "T00:00:00.000Z");
      const e = new Date(String(date) + "T23:59:59.999Z");
      where.scheduledDate = { gte: s, lte: e };
    } else if (start || end) {
      const s = start ? new Date(String(start) + "T00:00:00.000Z") : new Date(0);
      const e = end ? new Date(String(end) + "T23:59:59.999Z") : new Date();
      where.scheduledDate = { gte: s, lte: e };
    }
    
    // Search query
    if (q) {
      const term = String(q).trim();
      if (term) {
        // MySQL doesn't support `mode: "insensitive"`, so we use plain contains.
        where.OR = [
          { fromAddress: { contains: term } },
          { toAddress: { contains: term } },
          { fromDistrict: { contains: term } },
          { toDistrict: { contains: term } },
          { fromRegion: { contains: term } },
          { toRegion: { contains: term } },
          { paymentRef: { contains: term } },
          // Optional relation filter needs `is`
          { driver: { is: { name: { contains: term } } } },
          { driver: { is: { email: { contains: term } } } },
        ];
      }
    }
    
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Math.min(Number(pageSize), 100);
    
    if (!(prisma as any).transportBooking) {
      return res.json({ total: 0, page: Number(page), pageSize: take, items: [] });
    }

    const [items, total] = await Promise.all([
      (prisma as any).transportBooking.findMany({
        where,
        include: {
          driver: {
            select: { id: true, name: true, email: true, phone: true },
          },
        },
        orderBy: { scheduledDate: "desc" },
        skip,
        take,
      }),
      (prisma as any).transportBooking.count({ where }),
    ]);
    
    const fmtLoc = (kind: "from" | "to", row: any) => {
      const addr = kind === "from" ? row.fromAddress : row.toAddress;
      if (addr) return addr;
      const ward = kind === "from" ? row.fromWard : row.toWard;
      const district = kind === "from" ? row.fromDistrict : row.toDistrict;
      const region = kind === "from" ? row.fromRegion : row.toRegion;
      const parts = [ward, district, region].filter(Boolean);
      return parts.length ? parts.join(", ") : "N/A";
    };

    const mapped = (items as any[]).map((b: any) => ({
      id: b.id,
      tripCode: b.paymentRef || `TRIP-${b.id}`,
      driver: b.driver
        ? {
            id: b.driver.id,
            name: b.driver.name || "Unknown Driver",
            email: b.driver.email,
            phone: b.driver.phone,
          }
        : null,
      pickup: fmtLoc("from", b),
      dropoff: fmtLoc("to", b),
      scheduledAt: (b.scheduledDate ?? b.createdAt)?.toISOString?.() ?? String(b.scheduledDate ?? b.createdAt ?? ""),
      amount: Number(b.amount ?? 0),
      status: b.status || "PENDING",
      createdAt: (b.createdAt ?? b.updatedAt)?.toISOString?.() ?? String(b.createdAt ?? b.updatedAt ?? ""),
    }));
    
    return res.json({ total, page: Number(page), pageSize: take, items: mapped });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch when querying trips:', err.message);
      const page = Number((req.query as any).page ?? 1);
      const pageSize = Math.min(Number((req.query as any).pageSize ?? 50), 100);
      return res.json({ total: 0, page, pageSize, items: [] });
    }
    console.error('Unhandled error in GET /admin/drivers/trips:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /admin/drivers/invoices?driverId=&status=&date=&start=&end=&page=&pageSize=&q= */
router.get("/invoices", async (req, res) => {
  try {
    const { driverId, status, date, start, end, page = "1", pageSize = "50", q = "" } = req.query as any;
    
    const where: any = {};
    
    // Filter by driver if specified
    if (driverId) {
      where.driverId = Number(driverId);
    } else {
      // Only show withdrawals for drivers
      where.driverId = { not: null };
    }
    
    // Filter by status
    if (status) {
      where.status = status;
    }
    
    // Date filtering
    if (date) {
      const s = new Date(String(date) + "T00:00:00.000Z");
      const e = new Date(String(date) + "T23:59:59.999Z");
      where.createdAt = { gte: s, lte: e };
    } else if (start || end) {
      const s = start ? new Date(String(start) + "T00:00:00.000Z") : new Date(0);
      const e = end ? new Date(String(end) + "T23:59:59.999Z") : new Date();
      where.createdAt = { gte: s, lte: e };
    }
    
    // Search query
    if (q) {
      const term = String(q).trim();
      if (term) {
        // MySQL doesn't support `mode: "insensitive"`, so use plain contains.
        where.OR = [
          { paymentRef: { contains: term } },
          { paymentMethod: { contains: term } },
          { driver: { is: { name: { contains: term } } } },
          { driver: { is: { email: { contains: term } } } },
        ];
      }
    }
    
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Math.min(Number(pageSize), 100);
    
    const [items, total] = await Promise.all([
      prisma.referralWithdrawal.findMany({
        where,
        include: {
          driver: {
            select: { id: true, name: true, email: true, phone: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      }),
      prisma.referralWithdrawal.count({ where }),
    ]);
    
    const mapped = (items as any[]).map((w: any) => ({
      id: w.id,
      invoiceNumber: `WD-${w.id}`,
      receiptNumber: w.paymentRef ?? null,
      driver: w.driver
        ? {
            id: w.driver.id,
            name: w.driver.name || "Unknown Driver",
            email: w.driver.email,
            phone: w.driver.phone,
          }
        : null,
      amount: Number(w.totalAmount ?? 0),
      status: w.status || "PENDING",
      issuedAt: (w.createdAt ?? w.approvedAt ?? w.paidAt)?.toISOString?.() ?? String(w.createdAt ?? ""),
      createdAt: (w.createdAt ?? w.updatedAt)?.toISOString?.() ?? String(w.createdAt ?? ""),
    }));
    
    return res.json({ total, page: Number(page), pageSize: take, items: mapped });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch when querying driver invoices:', err.message);
      const page = Number((req.query as any).page ?? 1);
      const pageSize = Math.min(Number((req.query as any).pageSize ?? 50), 100);
      return res.json({ total: 0, page, pageSize, items: [] });
    }
    if (err instanceof Prisma.PrismaClientValidationError) {
      console.warn('Prisma validation error when querying driver invoices:', err.message);
      const page = Number((req.query as any).page ?? 1);
      const pageSize = Math.min(Number((req.query as any).pageSize ?? 50), 100);
      return res.json({ total: 0, page, pageSize, items: [] });
    }
    console.error('Unhandled error in GET /admin/drivers/invoices:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /admin/drivers/invoices/stats?period=7d|30d|month|year */
router.get("/invoices/stats", async (req, res) => {
  try {
    const { period = "30d" } = req.query as any;
    
    let startDate: Date;
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    // Calculate start date based on period
    switch (period) {
      case "7d":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "month":
        startDate = new Date();
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "year":
        startDate = new Date();
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
    }
    startDate.setHours(0, 0, 0, 0);

    // Driver "invoice" statistics: use ReferralWithdrawal (driver withdrawal applications)
    const withdrawals = await prisma.referralWithdrawal.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        createdAt: true,
        status: true,
        totalAmount: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Group by date
    const dateMap = new Map<string, { count: number; paid: number; amount: number }>();
    
    withdrawals.forEach((w) => {
      const dateKey = w.createdAt.toISOString().split("T")[0];
      const existing = dateMap.get(dateKey) || { count: 0, paid: 0, amount: 0 };
      existing.count += 1;
      if (w.status === "PAID") {
        existing.paid += 1;
      }
      existing.amount += Number(w.totalAmount ?? 0);
      dateMap.set(dateKey, existing);
    });

    // Convert to array and sort
    const stats = Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        count: data.count,
        paid: data.paid,
        amount: data.amount,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return res.json({ stats, period, startDate: startDate.toISOString(), endDate: endDate.toISOString() });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch when querying invoice stats:', err.message);
      return res.json({ stats: [], period: (req.query as any).period || "30d", startDate: new Date().toISOString(), endDate: new Date().toISOString() });
    }
    if (err instanceof Prisma.PrismaClientValidationError) {
      console.warn('Prisma validation error when querying invoice stats:', err.message);
      return res.json({ stats: [], period: (req.query as any).period || "30d", startDate: new Date().toISOString(), endDate: new Date().toISOString() });
    }
    console.error('Unhandled error in GET /admin/drivers/invoices/stats:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /admin/drivers/paid?driverId=&date=&start=&end=&page=&pageSize=&q= */
router.get("/paid", async (req, res) => {
  try {
    const { driverId, date, start, end, page = "1", pageSize = "50", q = "" } = req.query as any;
    
    const where: any = {};
    
    // Filter by driver if specified
    if (driverId) {
      where.driverId = Number(driverId);
    } else {
      // Only show payouts for drivers
      where.driverId = { not: null };
    }
    
    // Date filtering
    if (date) {
      const s = new Date(String(date) + "T00:00:00.000Z");
      const e = new Date(String(date) + "T23:59:59.999Z");
      where.paidAt = { gte: s, lte: e };
    } else if (start || end) {
      const s = start ? new Date(String(start) + "T00:00:00.000Z") : new Date(0);
      const e = end ? new Date(String(end) + "T23:59:59.999Z") : new Date();
      where.paidAt = { gte: s, lte: e };
    }
    
    // Search query
    if (q) {
      where.OR = [
        { invoiceNumber: { contains: q, mode: "insensitive" } },
        { receiptNumber: { contains: q, mode: "insensitive" } },
        { tripCode: { contains: q, mode: "insensitive" } },
        { paymentRef: { contains: q, mode: "insensitive" } },
      ];
    }
    
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Math.min(Number(pageSize), 100);
    
    // Try to use Payout model first, fallback to Invoice
    let items: any[] = [];
    let total = 0;
    
    try {
      if ((prisma as any).payout) {
        const [payouts, count] = await Promise.all([
          (prisma as any).payout.findMany({
            where,
            include: {
              driver: {
                select: { id: true, name: true, email: true, phone: true },
              },
            },
            orderBy: { paidAt: "desc" },
            skip,
            take,
          }),
          (prisma as any).payout.count({ where }),
        ]);
        
        items = payouts.map((p: any) => ({
          id: p.id,
          invoiceId: p.invoiceId,
          invoiceNumber: p.invoiceNumber || `INV-${p.invoiceId}`,
          receiptNumber: p.receiptNumber,
          tripCode: p.tripCode,
          driver: p.driver,
          gross: p.gross ?? 0,
          commissionAmount: p.commissionAmount ?? 0,
          netPaid: p.netPaid ?? 0,
          paidAt: p.paidAt || p.createdAt,
          paymentMethod: p.paymentMethod,
          paymentRef: p.paymentRef,
        }));
        total = count;
      } else {
        // Fallback to paid invoices
        const invoiceWhere: any = {
          status: "PAID",
          booking: { driverId: { not: null } as any },
        };
        if (driverId) {
          invoiceWhere.booking = { driverId: Number(driverId) as any };
        }
        if (date) {
          const s = new Date(String(date) + "T00:00:00.000Z");
          const e = new Date(String(date) + "T23:59:59.999Z");
          invoiceWhere.paidAt = { gte: s, lte: e };
        } else if (start || end) {
          const s = start ? new Date(String(start) + "T00:00:00.000Z") : new Date(0);
          const e = end ? new Date(String(end) + "T23:59:59.999Z") : new Date();
          invoiceWhere.paidAt = { gte: s, lte: e };
        }
        
        const [invoices, count] = await Promise.all([
          prisma.invoice.findMany({
            where: invoiceWhere,
            include: {
              booking: {
                include: {
                  driver: {
                    select: { id: true, name: true, email: true, phone: true },
                  },
                },
              },
            },
            orderBy: { paidAt: "desc" },
            skip,
            take,
          }),
          prisma.invoice.count({ where: invoiceWhere }),
        ]);
        
        items = invoices.map((inv: any) => ({
          id: inv.id,
          invoiceId: inv.id,
          invoiceNumber: inv.invoiceNumber || `INV-${inv.id}`,
          receiptNumber: inv.receiptNumber,
          tripCode: inv.booking?.tripCode || inv.booking?.code,
          driver: inv.booking?.driver,
          gross: inv.totalAmount ?? inv.total ?? 0,
          commissionAmount: inv.commissionAmount ?? 0,
          netPaid: inv.netPayable ?? 0,
          paidAt: inv.paidAt || inv.createdAt,
          paymentMethod: inv.paymentMethod,
          paymentRef: inv.paymentRef,
        }));
        total = count;
      }
    } catch (err: any) {
      console.warn("Error querying payouts/invoices:", err.message);
    }
    
    return res.json({ total, page: Number(page), pageSize: take, items });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch when querying driver payments:', err.message);
      const page = Number((req.query as any).page ?? 1);
      const pageSize = Math.min(Number((req.query as any).pageSize ?? 50), 100);
      return res.json({ total: 0, page, pageSize, items: [] });
    }
    console.error('Unhandled error in GET /admin/drivers/paid:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /admin/drivers/paid/stats?period=7d|30d|month|year */
router.get("/paid/stats", async (req, res) => {
  try {
    const { period = "30d" } = req.query as any;
    
    let startDate: Date;
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    switch (period) {
      case "7d":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "month":
        startDate = new Date();
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "year":
        startDate = new Date();
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
    }
    startDate.setHours(0, 0, 0, 0);

    let payments: any[] = [];
    
    try {
      if ((prisma as any).payout) {
        payments = await (prisma as any).payout.findMany({
          where: {
            driverId: { not: null },
            paidAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            paidAt: true,
            netPaid: true,
            commissionAmount: true,
          },
        });
      } else {
        const invoices = await prisma.invoice.findMany({
          where: {
            status: "PAID",
            booking: { driverId: { not: null } },
            paidAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            paidAt: true,
            netPayable: true,
            commissionAmount: true,
            totalAmount: true,
            total: true,
          },
        });
        
        payments = invoices.map((inv: any) => ({
          paidAt: inv.paidAt,
          netPaid: inv.netPayable ?? 0,
          commissionAmount: inv.commissionAmount ?? 0,
          gross: inv.totalAmount ?? inv.total ?? 0,
        }));
      }
    } catch (err: any) {
      console.warn("Error querying payment stats:", err.message);
    }

    // Group by date
    const dateMap = new Map<string, { count: number; totalPaid: number; totalCommission: number }>();
    
    payments.forEach((p) => {
      const dateKey = p.paidAt.toISOString().split("T")[0];
      const existing = dateMap.get(dateKey) || { count: 0, totalPaid: 0, totalCommission: 0 };
      existing.count += 1;
      existing.totalPaid += p.netPaid ?? 0;
      existing.totalCommission += p.commissionAmount ?? 0;
      dateMap.set(dateKey, existing);
    });

    const stats = Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        count: data.count,
        totalPaid: data.totalPaid,
        totalCommission: data.totalCommission,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const summary = {
      totalPaid: stats.reduce((sum, s) => sum + s.totalPaid, 0),
      totalCount: stats.reduce((sum, s) => sum + s.count, 0),
      totalCommission: stats.reduce((sum, s) => sum + s.totalCommission, 0),
      averagePayment: stats.length > 0 
        ? stats.reduce((sum, s) => sum + s.totalPaid, 0) / stats.reduce((sum, s) => sum + s.count, 0)
        : 0,
    };

    return res.json({ stats, summary, period, startDate: startDate.toISOString(), endDate: endDate.toISOString() });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch when querying payment stats:', err.message);
      return res.json({ 
        stats: [], 
        summary: { totalPaid: 0, totalCount: 0, totalCommission: 0, averagePayment: 0 },
        period: (req.query as any).period || "30d", 
        startDate: new Date().toISOString(), 
        endDate: new Date().toISOString() 
      });
    }
    console.error('Unhandled error in GET /admin/drivers/paid/stats:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /admin/drivers/revenues?driverId=&date=&start=&end=&page=&pageSize=&q= */
router.get("/revenues", async (req, res) => {
  try {
    const { driverId, date, start, end, page = "1", pageSize = "50", q = "" } = req.query as any;
    
    const where: any = {
      booking: { driverId: { not: null } as any },
    };
    
    // Filter by driver if specified
    if (driverId) {
      where.booking = { driverId: Number(driverId) as any };
    }
    
    // Date filtering
    if (date) {
      const s = new Date(String(date) + "T00:00:00.000Z");
      const e = new Date(String(date) + "T23:59:59.999Z");
      where.issuedAt = { gte: s, lte: e };
    } else if (start || end) {
      const s = start ? new Date(String(start) + "T00:00:00.000Z") : new Date(0);
      const e = end ? new Date(String(end) + "T23:59:59.999Z") : new Date();
      where.issuedAt = { gte: s, lte: e };
    }
    
    // Search query
    if (q) {
      where.OR = [
        { booking: { driver: { name: { contains: q, mode: "insensitive" } } } as any },
        { booking: { driver: { email: { contains: q, mode: "insensitive" } } } as any },
      ];
    }
    
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Math.min(Number(pageSize), 100);
    
    // Get invoices grouped by driver
    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        booking: {
          include: {
            driver: {
              select: { id: true, name: true, email: true, phone: true },
            },
          },
        },
      },
      orderBy: { issuedAt: "desc" },
    });
    
    // Group by driver
    const driverMap = new Map<number, {
      driver: any;
      grossRevenue: number;
      commissionAmount: number;
      netRevenue: number;
      tripCount: number;
      invoiceCount: number;
      lastPaymentDate: Date | null;
    }>();
    
    invoices.forEach((inv: any) => {
      const driverId = inv.booking?.driverId;
      if (!driverId) return;
      
      const gross = inv.totalAmount ?? inv.total ?? 0;
      const commission = inv.commissionAmount ?? 0;
      const net = inv.netPayable ?? gross - commission;
      
      if (!driverMap.has(driverId)) {
        driverMap.set(driverId, {
          driver: inv.booking?.driver,
          grossRevenue: 0,
          commissionAmount: 0,
          netRevenue: 0,
          tripCount: 0,
          invoiceCount: 0,
          lastPaymentDate: null,
        });
      }
      
      const entry = driverMap.get(driverId)!;
      entry.grossRevenue += gross;
      entry.commissionAmount += commission;
      entry.netRevenue += net;
      entry.invoiceCount += 1;
      if (inv.booking) entry.tripCount += 1;
      
      if (inv.paidAt && (!entry.lastPaymentDate || new Date(inv.paidAt) > entry.lastPaymentDate)) {
        entry.lastPaymentDate = new Date(inv.paidAt);
      }
    });
    
    // Convert to array and sort by net revenue
    let items = Array.from(driverMap.values())
      .map((entry, idx) => ({
        id: idx + 1,
        driver: entry.driver,
        grossRevenue: entry.grossRevenue,
        commissionAmount: entry.commissionAmount,
        netRevenue: entry.netRevenue,
        tripCount: entry.tripCount,
        invoiceCount: entry.invoiceCount,
        lastPaymentDate: entry.lastPaymentDate?.toISOString() || null,
      }))
      .sort((a, b) => b.netRevenue - a.netRevenue);
    
    // Apply pagination
    const total = items.length;
    items = items.slice(skip, skip + take);
    
    return res.json({ total, page: Number(page), pageSize: take, items });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch when querying driver revenues:', err.message);
      const page = Number((req.query as any).page ?? 1);
      const pageSize = Math.min(Number((req.query as any).pageSize ?? 50), 100);
      return res.json({ total: 0, page, pageSize, items: [] });
    }
    console.error('Unhandled error in GET /admin/drivers/revenues:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /admin/drivers/revenues/stats?period=7d|30d|month|year */
router.get("/revenues/stats", async (req, res) => {
  try {
    const { period = "30d" } = req.query as any;
    
    let startDate: Date;
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    switch (period) {
      case "7d":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        break;
      case "30d":
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        break;
      case "month":
        startDate = new Date();
        startDate.setDate(1);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "year":
        startDate = new Date();
        startDate.setMonth(0, 1);
        startDate.setHours(0, 0, 0, 0);
        break;
      default:
        startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
    }
    startDate.setHours(0, 0, 0, 0);

    // Get invoices for driver bookings
    const invoices = await prisma.invoice.findMany({
      where: {
        booking: { driverId: { not: null } as any },
        issuedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        booking: {
          include: {
            driver: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    // Group by date
    const dateMap = new Map<string, { grossRevenue: number; netRevenue: number; commissionAmount: number; tripCount: number }>();
    const driverRevenueMap = new Map<number, { name: string; total: number; tripCount: number }>();
    
    invoices.forEach((inv: any) => {
      const dateKey = inv.issuedAt.toISOString().split("T")[0];
      const existing = dateMap.get(dateKey) || { grossRevenue: 0, netRevenue: 0, commissionAmount: 0, tripCount: 0 };
      
      const gross = inv.totalAmount ?? inv.total ?? 0;
      const commission = inv.commissionAmount ?? 0;
      const net = inv.netPayable ?? gross - commission;
      
      existing.grossRevenue += gross;
      existing.netRevenue += net;
      existing.commissionAmount += commission;
      if (inv.booking) existing.tripCount += 1;
      dateMap.set(dateKey, existing);
      
      // Track by driver
      const driverId = inv.booking?.driverId;
      if (driverId) {
        if (!driverRevenueMap.has(driverId)) {
          driverRevenueMap.set(driverId, {
            name: inv.booking.driver?.name || "Unknown",
            total: 0,
            tripCount: 0,
          });
        }
        const driverEntry = driverRevenueMap.get(driverId)!;
        driverEntry.total += net;
        if (inv.booking) driverEntry.tripCount += 1;
      }
    });

    const stats = Array.from(dateMap.entries())
      .map(([date, data]) => ({
        date,
        grossRevenue: data.grossRevenue,
        netRevenue: data.netRevenue,
        commissionAmount: data.commissionAmount,
        tripCount: data.tripCount,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const topDrivers = Array.from(driverRevenueMap.entries())
      .map(([driverId, data]) => ({
        driverId,
        driverName: data.name,
        totalRevenue: data.total,
        tripCount: data.tripCount,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10);

    const summary = {
      totalGrossRevenue: stats.reduce((sum, s) => sum + s.grossRevenue, 0),
      totalNetRevenue: stats.reduce((sum, s) => sum + s.netRevenue, 0),
      totalCommission: stats.reduce((sum, s) => sum + s.commissionAmount, 0),
      totalTrips: stats.reduce((sum, s) => sum + s.tripCount, 0),
      totalInvoices: invoices.length,
      averageRevenue: stats.length > 0 && stats.reduce((sum, s) => sum + s.tripCount, 0) > 0
        ? stats.reduce((sum, s) => sum + s.netRevenue, 0) / stats.reduce((sum, s) => sum + s.tripCount, 0)
        : 0,
      growthRate: 0, // Calculate based on previous period if needed
    };

    return res.json({ stats, summary, topDrivers, period, startDate: startDate.toISOString(), endDate: endDate.toISOString() });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch when querying revenue stats:', err.message);
      return res.json({ 
        stats: [], 
        summary: { totalGrossRevenue: 0, totalNetRevenue: 0, totalCommission: 0, totalTrips: 0, totalInvoices: 0, averageRevenue: 0, growthRate: 0 },
        topDrivers: [],
        period: (req.query as any).period || "30d", 
        startDate: new Date().toISOString(), 
        endDate: new Date().toISOString() 
      });
    }
    console.error('Unhandled error in GET /admin/drivers/revenues/stats:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /admin/drivers/:id */
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid driver id" });
    }
    const driver = await prisma.user.findFirst({
      where: { id, role: "DRIVER" },
      select: {
        id: true, name: true, email: true, phone: true,
        suspendedAt: true, createdAt: true,
        _count: true,
      },
    });
    if (!driver) return res.status(404).json({ error: "Driver not found" });

    const recent = await prisma.booking.findMany({
      where: { driverId: id },
      select: { id: true, status: true, createdAt: true, total: true },
      orderBy: { id: "desc" },
      take: 10,
    });

    return res.json({ driver, snapshot: { recentBookings: recent } });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch when querying driver by id:', err.message);
      return res.status(200).json({ driver: null, snapshot: { recentBookings: [] } });
    }
    console.error('Unhandled error in GET /admin/drivers/:id', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** POST /admin/drivers/:id/suspend {reason} */
router.post("/:id/suspend", async (req, res) => {
  const id = Number(req.params.id);
  const reason = String(req.body?.reason ?? "");
  const me = (req.user as any).id;

  const updated = await prisma.user.update({ where: { id }, data: { suspendedAt: new Date() } });
  await prisma.adminAudit.create({ data: { adminId: me, targetUserId: id, action: "SUSPEND_DRIVER", details: reason } });

  req.app.get("io")?.emit?.("admin:driver:updated", { driverId: id });
  res.json({ ok: true, driverId: updated.id, suspendedAt: updated.suspendedAt });
});

/** POST /admin/drivers/:id/unsuspend */
router.post("/:id/unsuspend", async (req, res) => {
  const id = Number(req.params.id);
  const me = (req.user as any).id;
  const updated = await prisma.user.update({ where: { id }, data: { suspendedAt: null } });
  await prisma.adminAudit.create({ data: { adminId: me, targetUserId: id, action: "UNSUSPEND_DRIVER" } });

  req.app.get("io")?.emit?.("admin:driver:updated", { driverId: id });
  res.json({ ok: true, driverId: updated.id });
});

/** GET /admin/drivers/:id/referrals
 * Returns referral information for a specific driver
 */
router.get("/:id/referrals", async (req, res) => {
  try {
    const driverId = Number(req.params.id);
    
    // Verify driver exists
    const driver = await prisma.user.findFirst({
      where: { id: driverId, role: "DRIVER" },
      select: { id: true, name: true, email: true },
    });
    if (!driver) return res.status(404).json({ error: "Driver not found" });

    const referralCode = `DRIVER-${driverId.toString().slice(-6).toUpperCase()}`;
    const referralLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?ref=${referralCode}`;

    let referrals: any[] = [];
    let totalReferrals = 0;
    let activeReferrals = 0;
    let totalCredits = 0;
    let pendingCredits = 0;

    try {
      // Check if there's a dedicated Referral table
      if ((prisma as any).referral) {
        const referralRecords = await (prisma as any).referral.findMany({
          where: { referrerId: driverId },
          include: {
            referredUser: {
              select: {
                id: true,
                fullName: true,
                name: true,
                email: true,
                createdAt: true,
                region: true,
                district: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        for (const ref of referralRecords) {
          const referredUserId = ref.referredUser?.id || ref.referredUserId;
          let status = 'active' as 'active' | 'completed';
          let spend = 0;
          let creditsEarned = 0;
          const referredUser = ref.referredUser;
          const userRole = (referredUser as any)?.role;

          // Check if user has used the platform (active = used platform at least once)
          try {
            let hasUsedPlatform = false;

            // Check for OWNER: has listed properties
            if (userRole === 'OWNER') {
              if ((prisma as any).property) {
                const propertyCount = await (prisma as any).property.count({
                  where: { ownerId: referredUserId },
                });
                hasUsedPlatform = propertyCount > 0;
              }
              // OWNER: spend = 0, credits = 0 (only counts for level/bonus)
              spend = 0;
              creditsEarned = 0;
            }
            // Check for DRIVER: has completed trips
            else if (userRole === 'DRIVER') {
              if ((prisma as any).booking) {
                const tripCount = await (prisma as any).booking.count({
                  where: { driverId: referredUserId, status: 'COMPLETED' },
                });
                hasUsedPlatform = tripCount > 0;
              }
              // DRIVER: spend = 0, credits = 0 (only counts for level/bonus)
              spend = 0;
              creditsEarned = 0;
            }
            // Check for CUSTOMER/USER/TRAVELLER: has made bookings and calculate spend
            else if (userRole === 'CUSTOMER' || userRole === 'USER') {
              if ((prisma as any).booking) {
                const bookings = await (prisma as any).booking.findMany({
                  where: { userId: referredUserId },
                  select: { price: true, total: true, fare: true, status: true },
                });
                hasUsedPlatform = bookings.length > 0;
                
                // Calculate total spend from completed bookings
                const completedBookings = bookings.filter((b: any) => b.status === 'COMPLETED');
                spend = completedBookings.reduce((sum: number, b: any) => sum + (Number(b.price || b.total || b.fare) || 0), 0);

                // Calculate credits using configurable percentage
                if (completedBookings.length > 0) {
                  const { getReferralCreditPercent } = await import("../lib/business-config.js");
                  const referralPercent = await getReferralCreditPercent();
                  creditsEarned = completedBookings.reduce((sum: number, b: any) => {
                    const bookingAmount = Number(b.price || b.total || b.fare) || 0;
                    return sum + Math.round(bookingAmount * referralPercent);
                  }, 0);
                  
                  // Check for completed status (5+ completed bookings)
                  if (completedBookings.length >= 5) {
                    status = 'completed';
                  }
                }
              }
            }

            // If user has used platform, they are active
            if (hasUsedPlatform) {
              status = 'active';
            }
          } catch (e) {
            console.warn('Failed to check platform usage', e);
            // Default to active if check fails
            status = 'active';
            if (userRole === 'CUSTOMER' || userRole === 'USER') {
              // Default credits for customers if calculation fails
              creditsEarned = 500;
            }
          }

          referrals.push({
            id: String(ref.referredUser?.id || ref.id),
            name: ref.referredUser?.fullName || ref.referredUser?.name || 'N/A',
            email: ref.referredUser?.email || 'N/A',
            status,
            joinedAt: ref.referredUser?.createdAt || ref.createdAt || new Date().toISOString(),
            registeredAt: ref.referredUser?.createdAt || ref.createdAt || new Date().toISOString(),
            linkSharedAt: ref.createdAt || ref.sharedAt || new Date(ref.referredUser?.createdAt || Date.now()).toISOString(),
            region: ref.referredUser?.region || ref.region || null,
            district: ref.referredUser?.district || ref.district || null,
            spend,
            creditsEarned,
          });
        }

        totalReferrals = referrals.length;
        activeReferrals = referrals.filter((r: any) => r.status === 'active' || r.status === 'completed').length;
        totalCredits = referrals.reduce((sum: number, r: any) => sum + r.creditsEarned, 0);
        pendingCredits = 0; // No pending credits since all registered users who use platform are active
      }

      // Fallback: check user table for referredBy field
      if (referrals.length === 0 && (prisma as any).user) {
        const referredUsers = await (prisma as any).user.findMany({
          where: {
            OR: [
              { referredBy: driverId },
              { referralCode: referralCode },
              { referralId: driverId },
            ],
          },
          select: {
            id: true,
            fullName: true,
            name: true,
            email: true,
            createdAt: true,
            region: true,
            district: true,
          },
          orderBy: { createdAt: 'desc' },
        });

        for (const ref of referredUsers) {
          let status = 'active' as 'active' | 'completed';
          let creditsEarned = 500; // Default active credits

          try {
            let hasUsedPlatform = false;
            const userRole = (ref as any).role;

            // Check for OWNER: has listed properties
            if (userRole === 'OWNER') {
              if ((prisma as any).property) {
                const propertyCount = await (prisma as any).property.count({
                  where: { ownerId: ref.id },
                });
                hasUsedPlatform = propertyCount > 0;
              }
            }
            // Check for CUSTOMER/USER/TRAVELLER: has made bookings
            else if (userRole === 'CUSTOMER' || userRole === 'USER') {
              if ((prisma as any).booking) {
                const bookingCount = await (prisma as any).booking.count({
                  where: { userId: ref.id },
                });
                hasUsedPlatform = bookingCount > 0;
              }
            }
            // Check for DRIVER: has completed trips
            else if (userRole === 'DRIVER') {
              if ((prisma as any).booking) {
                const tripCount = await (prisma as any).booking.count({
                  where: { driverId: ref.id, status: 'COMPLETED' },
                });
                hasUsedPlatform = tripCount > 0;
              }
            }

            // If user has used platform, they are active
            if (hasUsedPlatform) {
              status = 'active';
              creditsEarned = 500;

              // Check for completed status
              if (userRole === 'OWNER') {
                if ((prisma as any).property) {
                  const approvedProperties = await (prisma as any).property.count({
                    where: { ownerId: ref.id, status: 'APPROVED' },
                  });
                  if (approvedProperties >= 5) {
                    status = 'completed';
                    creditsEarned = 1000;
                  }
                }
              } else {
                if ((prisma as any).booking) {
                  const completedBookings = await (prisma as any).booking.count({
                    where: {
                      userId: ref.id,
                      status: 'COMPLETED',
                    },
                  });
                  if (completedBookings >= 5) {
                    status = 'completed';
                    creditsEarned = 1000;
                  }
                }
              }
            }
          } catch (e) {
            console.warn('Failed to check platform usage', e);
            // Default to active if check fails
            status = 'active';
            creditsEarned = 500;
          }

          referrals.push({
            id: String(ref.id),
            name: ref.fullName || ref.name || 'N/A',
            email: ref.email || 'N/A',
            status,
            joinedAt: ref.createdAt || new Date().toISOString(),
            registeredAt: ref.createdAt || new Date().toISOString(),
            linkSharedAt: ref.referralSharedAt || ref.createdAt || new Date().toISOString(), // Approximate: use createdAt if sharedAt not available
            region: ref.region || null,
            district: ref.district || null,
            spend,
            creditsEarned,
          });
        }

        totalReferrals = referrals.length;
        activeReferrals = referrals.filter((r: any) => r.status === 'active' || r.status === 'completed').length;
        totalCredits = referrals.reduce((sum: number, r: any) => sum + r.creditsEarned, 0);
        pendingCredits = 0; // No pending credits since all registered users who use platform are active
      }
    } catch (e) {
      console.warn('Failed to fetch referrals', e);
    }

    // Get driver's region and district if available
    let driverRegion = null;
    let driverDistrict = null;
    try {
      const driverData = await prisma.user.findUnique({
        where: { id: driverId },
        select: { region: true, district: true } as any,
      });
      driverRegion = (driverData as any)?.region || null;
      driverDistrict = (driverData as any)?.district || null;
    } catch (e) {
      // Ignore if region/district fields don't exist
    }

    return res.json({
      driver: {
        id: driver.id,
        name: driver.name,
        email: driver.email,
        region: driverRegion,
        district: driverDistrict,
      },
      referralCode,
      referralLink,
      totalReferrals,
      activeReferrals,
      totalCredits,
      pendingCredits,
      referrals,
    });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch when querying driver referrals:', err.message);
      return res.json({
        driver: null,
        referralCode: '',
        referralLink: '',
        totalReferrals: 0,
        activeReferrals: 0,
        totalCredits: 0,
        pendingCredits: 0,
        referrals: [],
      });
    }
    console.error('Unhandled error in GET /admin/drivers/:id/referrals:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /admin/drivers/:id/bonuses
 * Returns bonus history for a specific driver
 */
router.get("/:id/bonuses", async (req, res) => {
  try {
    const driverId = Number(req.params.id);
    const { page = "1", pageSize = "50" } = req.query as any;
    
    // Verify driver exists
    const driver = await prisma.user.findFirst({
      where: { id: driverId, role: "DRIVER" },
      select: { id: true, name: true, email: true },
    });
    if (!driver) return res.status(404).json({ error: "Driver not found" });

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Math.min(Number(pageSize), 100);

    let bonuses: any[] = [];

    try {
      // Check AdminAudit for bonus grants
      const auditRecords = await prisma.adminAudit.findMany({
        where: {
          targetUserId: driverId,
          action: 'GRANT_BONUS',
        },
        include: {
          admin: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      });

      bonuses = auditRecords.map((record: any) => {
        const details = typeof record.details === 'string' ? JSON.parse(record.details) : record.details;
        return {
          id: String(record.id),
          date: record.createdAt || new Date().toISOString(),
          amount: Number(details.bonusAmount || 0),
          period: details.period || (details.to ? new Date(details.to).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown'),
          status: 'paid' as const,
          reason: details.reason || null,
          bonusReasonType: details.bonusReasonType || null,
          paidAt: record.createdAt || null,
          grantedBy: record.admin ? {
            id: record.admin.id,
            name: record.admin.name,
            email: record.admin.email,
          } : null,
        };
      });
    } catch (e) {
      console.warn('AdminAudit query failed, trying alternative bonus sources', e);
    }

    // Alternative: Check if there's a Bonus table
    try {
      if ((prisma as any).bonus) {
        const bonusRecords = await (prisma as any).bonus.findMany({
          where: { driverId },
          orderBy: { createdAt: 'desc' },
          skip,
          take,
        });
        
        if (bonusRecords.length > 0) {
          bonuses = bonusRecords.map((b: any) => ({
            id: String(b.id),
            date: b.createdAt || b.date || new Date().toISOString(),
            amount: Number(b.amount || b.bonusAmount || 0),
            period: b.period || new Date(b.createdAt || b.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
            status: (b.status || 'pending').toLowerCase(),
            reason: b.reason || null,
            paidAt: b.paidAt || b.settledAt || null,
            grantedBy: null,
          }));
        }
      }
    } catch (e) {
      console.warn('Bonus table query failed', e);
    }

    // Get total count
    let total = 0;
    try {
      total = await prisma.adminAudit.count({
        where: {
          targetUserId: driverId,
          action: 'GRANT_BONUS',
        },
      });
    } catch (e) {
      // If count fails, use bonuses length
      total = bonuses.length;
    }

    return res.json({
      driver: {
        id: driver.id,
        name: driver.name,
        email: driver.email,
      },
      total,
      page: Number(page),
      pageSize: take,
      items: bonuses,
    });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch when querying driver bonuses:', err.message);
      return res.json({
        driver: null,
        total: 0,
        page: Number((req.query as any).page || 1),
        pageSize: Number((req.query as any).pageSize || 50),
        items: [],
      });
    }
    console.error('Unhandled error in GET /admin/drivers/:id/bonuses:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /admin/drivers/:id/level
 * Returns driver level information and progress
 */
router.get("/:id/level", async (req, res) => {
  try {
    const driverId = Number(req.params.id);
    
    // Verify driver exists
    const driver = await prisma.user.findFirst({
      where: { id: driverId, role: "DRIVER" },
      select: { id: true, name: true, email: true },
    });
    if (!driver) return res.status(404).json({ error: "Driver not found" });

    // Fetch driver statistics
    let totalMiles = 0;
    let totalTrips = 0;
    let averageRating = 0;
    let totalReviews = 0;
    let goalsCompleted = 0;

    try {
      // Calculate total miles from trips/bookings
      if ((prisma as any).booking) {
        const bookings = await (prisma as any).booking.findMany({
          where: {
            driverId,
            status: {
              in: ['COMPLETED', 'FINISHED', 'PAID', 'CONFIRMED'],
            },
          },
          select: {
            distance: true,
          },
        });

        totalTrips = bookings.length;
        totalMiles = bookings.reduce((sum: number, b: any) => {
          const distance = Number(b.distance || 0);
          return sum + (distance * 0.621371); // km to miles conversion
        }, 0);
      }
    } catch (e) {
      console.warn('Failed to fetch trips/miles', e);
    }

    // Get driver rating and reviews
    try {
      const driverData = await prisma.user.findUnique({
        where: { id: driverId },
        select: { rating: true } as any,
      });
      if (driverData && typeof (driverData as any).rating === 'number') {
        averageRating = (driverData as any).rating;
      }

      if ((prisma as any).review) {
        const reviewCount = await (prisma as any).review.count({
          where: { driverId },
        });
        totalReviews = reviewCount;
      } else {
        totalReviews = averageRating > 0 ? Math.round(averageRating * 25) : 0;
      }
    } catch (e) {
      console.warn('Failed to fetch rating/reviews', e);
    }

    // Count completed goals
    try {
      if ((prisma as any).adminAudit) {
        const goalCompletions = await (prisma as any).adminAudit.count({
          where: {
            targetUserId: driverId,
            action: {
              in: ['GOAL_COMPLETED', 'ACHIEVEMENT_UNLOCKED'],
            },
          },
        });
        goalsCompleted = goalCompletions;
      }
    } catch (e) {
      console.warn('Failed to fetch goals', e);
    }

    // Calculate level
    let currentLevel = 1;
    let levelName = "Silver";
    let nextLevel = 2;
    let nextLevelName = "Gold";

    if (totalMiles >= 3000 || (totalTrips >= 500 && averageRating >= 4.8)) {
      currentLevel = 3;
      levelName = "Diamond";
      nextLevel = 3;
      nextLevelName = "Diamond";
    } else if (totalMiles >= 1000 || (totalTrips >= 200 && averageRating >= 4.6)) {
      currentLevel = 2;
      levelName = "Gold";
      nextLevel = 3;
      nextLevelName = "Diamond";
    }

    // Calculate requirements for next level
    const milesForNextLevel = currentLevel === 3 ? 0 : (currentLevel === 1 ? 1000 : 3000);
    const tripsForNextLevel = currentLevel === 3 ? 0 : (currentLevel === 1 ? 200 : 500);
    const ratingForNextLevel = currentLevel === 3 ? 0 : (currentLevel === 1 ? 4.6 : 4.8);
    const reviewsForNextLevel = currentLevel === 3 ? 0 : (currentLevel === 1 ? 100 : 300);
    const goalsForNextLevel = currentLevel === 3 ? 0 : (currentLevel === 1 ? 10 : 25);

    // Calculate progress percentages
    const progress = {
      miles: currentLevel === 3 ? 100 : Math.min((totalMiles / milesForNextLevel) * 100, 100),
      trips: currentLevel === 3 ? 100 : Math.min((totalTrips / tripsForNextLevel) * 100, 100),
      rating: currentLevel === 3 ? 100 : Math.min((averageRating / ratingForNextLevel) * 100, 100),
      reviews: currentLevel === 3 ? 100 : Math.min((totalReviews / reviewsForNextLevel) * 100, 100),
      goals: currentLevel === 3 ? 100 : Math.min((goalsCompleted / goalsForNextLevel) * 100, 100),
    };

    // Level benefits
    const getLevelBenefits = (level: number): string[] => {
      const benefits: { [key: number]: string[] } = {
        1: ["Standard support", "Standard commission rate", "Access to basic features", "Basic trip assignments"],
        2: ["Priority support", "10% bonus on earnings", "Access to premium features", "Priority trip assignments", "Early access to new features"],
        3: ["Elite support", "20% bonus on earnings", "Access to all features", "Highest priority assignments", "Exclusive partnerships", "Lifetime benefits", "Brand Ambassador", "Invited to events"],
      };
      return benefits[level] || benefits[1];
    };

    return res.json({
      driver: {
        id: driver.id,
        name: driver.name,
        email: driver.email,
      },
      currentLevel,
      levelName,
      nextLevel,
      nextLevelName,
      totalMiles: Math.round(totalMiles),
      milesForNextLevel,
      totalTrips,
      tripsForNextLevel,
      averageRating: parseFloat(averageRating.toFixed(1)),
      ratingForNextLevel,
      totalReviews,
      reviewsForNextLevel,
      goalsCompleted,
      goalsForNextLevel,
      progress: {
        miles: Math.round(progress.miles),
        trips: Math.round(progress.trips),
        rating: Math.round(progress.rating),
        reviews: Math.round(progress.reviews),
        goals: Math.round(progress.goals),
      },
      levelBenefits: getLevelBenefits(currentLevel),
      nextLevelBenefits: getLevelBenefits(nextLevel),
    });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch when querying driver level:', err.message);
      return res.json({
        driver: null,
        currentLevel: 1,
        levelName: "Silver",
        nextLevel: 2,
        nextLevelName: "Gold",
        totalMiles: 0,
        milesForNextLevel: 1000,
        totalTrips: 0,
        tripsForNextLevel: 200,
        averageRating: 0,
        ratingForNextLevel: 4.6,
        totalReviews: 0,
        reviewsForNextLevel: 100,
        goalsCompleted: 0,
        goalsForNextLevel: 10,
        progress: { miles: 0, trips: 0, rating: 0, reviews: 0, goals: 0 },
        levelBenefits: [],
        nextLevelBenefits: [],
      });
    }
    console.error('Unhandled error in GET /admin/drivers/:id/level:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /admin/drivers/:id/reminders
 * Returns reminders for a specific driver
 */
router.get("/:id/reminders", async (req, res) => {
  try {
    const driverId = Number(req.params.id);
    const { page = "1", pageSize = "50" } = req.query as any;
    
    // Verify driver exists
    const driver = await prisma.user.findFirst({
      where: { id: driverId, role: "DRIVER" },
      select: { id: true, name: true, email: true },
    });
    if (!driver) return res.status(404).json({ error: "Driver not found" });

    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Math.min(Number(pageSize), 100);

    let reminders: any[] = [];
    let total = 0;

    try {
      if ((prisma as any).driverReminder) {
        const [items, count] = await Promise.all([
          (prisma as any).driverReminder.findMany({
            where: { driverId },
            orderBy: { createdAt: 'desc' },
            skip,
            take,
          }),
          (prisma as any).driverReminder.count({
            where: { driverId },
          }),
        ]);

        reminders = items.map((r: any) => ({
          id: String(r.id),
          type: r.type || 'INFO',
          message: r.message,
          action: r.action || null,
          actionLink: r.actionLink || null,
          expiresAt: r.expiresAt || null,
          isRead: Boolean(r.isRead),
          createdAt: r.createdAt || new Date().toISOString(),
        }));

        total = count;
      }
    } catch (e) {
      console.warn('Failed to fetch reminders', e);
    }

    return res.json({
      driver: {
        id: driver.id,
        name: driver.name,
        email: driver.email,
      },
      total,
      page: Number(page),
      pageSize: take,
      items: reminders,
    });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch when querying driver reminders:', err.message);
      return res.json({
        driver: null,
        total: 0,
        page: Number((req.query as any).page || 1),
        pageSize: Number((req.query as any).pageSize || 50),
        items: [],
      });
    }
    console.error('Unhandled error in GET /admin/drivers/:id/reminders:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /admin/drivers/expiring-documents
 * Get all drivers with expiring documents (license/insurance)
 * License: checks 100 days before expiry
 * Insurance: checks 90 days before expiry
 */
router.get("/expiring-documents", async (req, res) => {
  try {
    const driversWithExpiringDocs: any[] = [];

    try {
      // Get all drivers
      const drivers = await prisma.user.findMany({
        where: { role: "DRIVER" },
        select: { id: true, name: true, email: true, phone: true, vehicleType: true },
      });

      for (const driver of drivers) {
        const expiringDocs: any[] = [];

        // Check for license expiration (100 days before)
        try {
          if ((prisma as any).driverDocument) {
            const licenses = await (prisma as any).driverDocument.findMany({
              where: {
                driverId: driver.id,
                type: "LICENSE",
              },
              orderBy: { expiryDate: "desc" },
              take: 1,
            });

            if (licenses[0]?.expiryDate) {
              const expiry = new Date(licenses[0].expiryDate);
              const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              if (daysLeft <= 100 && daysLeft > 0) {
                expiringDocs.push({
                  type: "LICENSE",
                  expiryDate: licenses[0].expiryDate,
                  daysLeft,
                  documentId: licenses[0].id,
                  threshold: 100,
                });
              }
            }
          }
        } catch (e) {
          console.warn(`Failed to check license for driver ${driver.id}`, e);
        }

        // Check for insurance expiration (90 days before)
        try {
          if ((prisma as any).driverDocument) {
            const insurances = await (prisma as any).driverDocument.findMany({
              where: {
                driverId: driver.id,
                type: "INSURANCE",
              },
              orderBy: { expiryDate: "desc" },
              take: 1,
            });

            if (insurances[0]?.expiryDate) {
              const expiry = new Date(insurances[0].expiryDate);
              const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              if (daysLeft <= 90 && daysLeft > 0) {
                expiringDocs.push({
                  type: "INSURANCE",
                  expiryDate: insurances[0].expiryDate,
                  daysLeft,
                  documentId: insurances[0].id,
                  threshold: 90,
                });
              }
            }
          }
        } catch (e) {
          console.warn(`Failed to check insurance for driver ${driver.id}`, e);
        }

        if (expiringDocs.length > 0) {
          driversWithExpiringDocs.push({
            driver,
            expiringDocuments: expiringDocs,
          });
        }
      }
    } catch (e) {
      console.warn("Failed to check expiring documents", e);
    }

    return res.json({ drivers: driversWithExpiringDocs, total: driversWithExpiringDocs.length });
  } catch (err: any) {
    console.error("Failed to get expiring documents", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /admin/drivers/auto-create-reminders
 * Comprehensive auto-create reminders system
 * - License: 100 days before expiry
 * - Insurance: 90 days before expiry
 * - Rating-based reminders (auto)
 * - General safety/security reminders (auto)
 */
router.post("/auto-create-reminders", async (req, res) => {
  try {
    const createdReminders: any[] = [];
    const stats = {
      license: 0,
      insurance: 0,
      rating: 0,
      safety: 0,
      security: 0,
      goals: 0,
      earnings: 0,
    };

    try {
      // Get all drivers with their details
      const drivers = await prisma.user.findMany({
        where: { role: "DRIVER" },
        select: { 
          id: true, 
          name: true, 
          email: true, 
          vehicleType: true,
          rating: true,
        } as any,
      });

      for (const driver of drivers) {
        const driverId = driver.id;
        const vehicleType = (driver as any).vehicleType || null;
        const rating = (driver as any).rating ? Number((driver as any).rating) : 0;

        // 1. Check for license expiration (100 days before)
        try {
          if ((prisma as any).driverDocument && (prisma as any).driverReminder) {
            const licenses = await (prisma as any).driverDocument.findMany({
              where: {
                driverId: driverId,
                type: "LICENSE",
              },
              orderBy: { expiryDate: "desc" },
              take: 1,
            });

            if (licenses[0]?.expiryDate) {
              const expiry = new Date(licenses[0].expiryDate);
              const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              
              // Create reminder 100 days before expiry
              if (daysLeft <= 100 && daysLeft > 0) {
                // Check if reminder already exists for this document
                const existingReminders = await (prisma as any).driverReminder.findMany({
                  where: {
                    driverId: driverId,
                    type: "LICENSE_EXPIRY",
                    expiresAt: { gte: new Date() },
                  },
                });
                const existing = existingReminders.find((r: any) => {
                  try {
                    const meta = r.meta || {};
                    return meta.documentId === licenses[0].id || meta.documentId === String(licenses[0].id);
                  } catch {
                    return false;
                  }
                });

                if (!existing) {
                  const message = `Your driver's license expires in ${daysLeft} days (${expiry.toLocaleDateString()}). Please renew it before the expiration date to avoid service interruption.`;
                  const reminder = await (prisma as any).driverReminder.create({
                    data: {
                      driverId: driverId,
                      type: "LICENSE_EXPIRY",
                      message,
                      action: "Renew Now",
                      actionLink: "/driver/management?tab=documents",
                      expiresAt: expiry,
                      meta: { documentId: licenses[0].id, autoGenerated: true, daysRemaining: daysLeft },
                    },
                  });
                  
                  // Emit Socket.IO notification
                  const app = (req as any).app;
                  const io = app?.get('io');
                  if (io && typeof io.emit === 'function') {
                    io.to(`driver:${driverId}`).emit('new-reminder', {
                      id: String(reminder.id),
                      type: reminder.type,
                      message: reminder.message,
                      action: reminder.action,
                      actionLink: reminder.actionLink,
                      expiresAt: reminder.expiresAt ? new Date(reminder.expiresAt).toISOString() : null,
                      createdAt: reminder.createdAt ? new Date(reminder.createdAt).toISOString() : new Date().toISOString(),
                    });
                  }
                  
                  createdReminders.push(reminder);
                  stats.license++;
                }
              }
            }
          }
        } catch (e) {
          console.warn(`Failed to check/create license reminder for driver ${driverId}`, e);
        }

        // 2. Check for insurance expiration (90 days before)
        try {
          if ((prisma as any).driverDocument && (prisma as any).driverReminder) {
            const insurances = await (prisma as any).driverDocument.findMany({
              where: {
                driverId: driverId,
                type: "INSURANCE",
              },
              orderBy: { expiryDate: "desc" },
              take: 1,
            });

            if (insurances[0]?.expiryDate) {
              const expiry = new Date(insurances[0].expiryDate);
              const daysLeft = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
              
              // Create reminder 90 days before expiry
              if (daysLeft <= 90 && daysLeft > 0) {
                // Check if reminder already exists for this document
                const existingReminders = await (prisma as any).driverReminder.findMany({
                  where: {
                    driverId: driverId,
                    type: "INSURANCE_EXPIRY",
                    expiresAt: { gte: new Date() },
                  },
                });
                const existing = existingReminders.find((r: any) => {
                  try {
                    const meta = r.meta || {};
                    return meta.documentId === insurances[0].id || meta.documentId === String(insurances[0].id);
                  } catch {
                    return false;
                  }
                });

                if (!existing) {
                  const message = `Your vehicle insurance expires in ${daysLeft} days (${expiry.toLocaleDateString()}). Please renew it before the expiration date to maintain coverage.`;
                  const reminder = await (prisma as any).driverReminder.create({
                    data: {
                      driverId: driverId,
                      type: "INSURANCE_EXPIRY",
                      message,
                      action: "Renew Now",
                      actionLink: "/driver/management?tab=documents",
                      expiresAt: expiry,
                      meta: { documentId: insurances[0].id, autoGenerated: true, daysRemaining: daysLeft },
                    },
                  });
                  createdReminders.push(reminder);
                  stats.insurance++;
                }
              }
            }
          }
        } catch (e) {
          console.warn(`Failed to check/create insurance reminder for driver ${driverId}`, e);
        }

        // 3. Rating-based reminders (auto)
        try {
          if ((prisma as any).driverReminder && rating > 0) {
            // Check if rating reminder already exists (within last 7 days)
            const recentReminders = await (prisma as any).driverReminder.findMany({
              where: {
                driverId: driverId,
                type: { in: ["WARNING", "ALERT", "INFO"] },
                createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
              },
            });
            const recentRatingReminder = recentReminders.find((r: any) => {
              try {
                const meta = r.meta || {};
                return meta.autoGenerated === true && meta.type === "rating";
              } catch {
                return false;
              }
            });

            if (!recentRatingReminder) {
              let ratingMessage = null;
              let ratingType = "WARNING";

              if (rating < 3.5) {
                ratingMessage = `Your driver rating is ${rating.toFixed(1)}/5.0, which is below the minimum threshold. Immediate action required to improve service quality and maintain your driver status.`;
                ratingType = "ALERT";
              } else if (rating < 4.0) {
                ratingMessage = `Your driver rating is ${rating.toFixed(1)}/5.0. Please focus on improving service quality to meet our standards. Consider reviewing customer feedback and addressing any concerns.`;
                ratingType = "WARNING";
              } else if (rating < 4.5) {
                ratingMessage = `Your driver rating is ${rating.toFixed(1)}/5.0. Keep up the good work! Aim for 4.5+ to unlock premium benefits and higher earnings.`;
                ratingType = "INFO";
              }

              if (ratingMessage) {
                const reminder = await (prisma as any).driverReminder.create({
                  data: {
                    driverId: driverId,
                    type: ratingType,
                    message: ratingMessage,
                    action: "View Feedback",
                    actionLink: "/driver/feedback",
                    expiresAt: null,
                    meta: { autoGenerated: true, rating: rating, type: "rating" },
                  },
                });
                // Emit Socket.IO notification
                const app = (req as any).app;
                const io = app?.get('io');
                if (io && typeof io.emit === 'function') {
                  io.to(`driver:${driverId}`).emit('new-reminder', {
                    id: String(reminder.id),
                    type: reminder.type,
                    message: reminder.message,
                    action: reminder.action,
                    actionLink: reminder.actionLink,
                    expiresAt: reminder.expiresAt ? new Date(reminder.expiresAt).toISOString() : null,
                    createdAt: reminder.createdAt ? new Date(reminder.createdAt).toISOString() : new Date().toISOString(),
                  });
                }
                createdReminders.push(reminder);
                stats.rating++;
              }
            }
          }
        } catch (e) {
          console.warn(`Failed to check/create rating reminder for driver ${driverId}`, e);
        }

        // 4. General safety reminders (auto) - Vehicle type specific
        try {
          if ((prisma as any).driverReminder) {
            // Check if safety reminder exists (within last 30 days)
            const recentReminders = await (prisma as any).driverReminder.findMany({
              where: {
                driverId: driverId,
                type: "SAFETY",
                createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
              },
            });
            const recentSafetyReminder = recentReminders.find((r: any) => {
              try {
                const meta = r.meta || {};
                return meta.autoGenerated === true && meta.type === "safety";
              } catch {
                return false;
              }
            });

            if (!recentSafetyReminder) {
              let safetyMessage = null;
              
              if (vehicleType === "MotorCycle") {
                safetyMessage = "Safety Reminder: Always wear a helmet while driving. Ensure your helmet meets safety standards and is properly fastened. Safety is our top priority.";
              } else if (vehicleType === "Car" || vehicleType === "Tuktuk") {
                safetyMessage = "Safety Reminder: Always wear your seatbelt and ensure all passengers do the same. Check your vehicle's safety equipment regularly (first aid kit, fire extinguisher, etc.).";
              } else {
                safetyMessage = "Safety Reminder: Follow all traffic rules and regulations. Maintain your vehicle in good condition and report any safety concerns immediately.";
              }

              if (safetyMessage) {
                const reminder = await (prisma as any).driverReminder.create({
                  data: {
                    driverId: driverId,
                    type: "SAFETY",
                    message: safetyMessage,
                    action: "Review Safety Guidelines",
                    actionLink: "/driver/management?tab=safety",
                    expiresAt: null,
                    meta: { autoGenerated: true, vehicleType: vehicleType, type: "safety" },
                  },
                });
                // Emit Socket.IO notification
                const app = (req as any).app;
                const io = app?.get('io');
                if (io && typeof io.emit === 'function') {
                  io.to(`driver:${driverId}`).emit('new-reminder', {
                    id: String(reminder.id),
                    type: reminder.type,
                    message: reminder.message,
                    action: reminder.action,
                    actionLink: reminder.actionLink,
                    expiresAt: reminder.expiresAt ? new Date(reminder.expiresAt).toISOString() : null,
                    createdAt: reminder.createdAt ? new Date(reminder.createdAt).toISOString() : new Date().toISOString(),
                  });
                }
                createdReminders.push(reminder);
                stats.safety++;
              }
            }
          }
        } catch (e) {
          console.warn(`Failed to check/create safety reminder for driver ${driverId}`, e);
        }

        // 5. General security reminders (auto) - Monthly
        try {
          if ((prisma as any).driverReminder) {
            // Check if security reminder exists (within last 30 days)
            const recentReminders = await (prisma as any).driverReminder.findMany({
              where: {
                driverId: driverId,
                type: "INFO",
                createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
              },
            });
            const recentSecurityReminder = recentReminders.find((r: any) => {
              try {
                const meta = r.meta || {};
                return meta.type === "security" && meta.autoGenerated === true;
              } catch {
                return false;
              }
            });

            if (!recentSecurityReminder) {
              const securityMessage = "Security Reminder: Keep your driver app account secure. Never share your login credentials. Report any suspicious activity immediately. Regularly update your password.";
              
              const reminder = await (prisma as any).driverReminder.create({
                data: {
                  driverId: driverId,
                  type: "INFO",
                  message: securityMessage,
                  action: "Update Password",
                  actionLink: "/driver/settings",
                  expiresAt: null,
                  meta: { autoGenerated: true, type: "security" },
                },
              });
              emitReminderNotification(driverId, reminder);
              createdReminders.push(reminder);
              stats.security++;
            }
          }
        } catch (e) {
          console.warn(`Failed to check/create security reminder for driver ${driverId}`, e);
        }

        // 6. Automatic Goals and Earnings Reminders
        try {
          if ((prisma as any).driverReminder) {
            // Calculate driver's recent earnings
            let todayEarnings = 0;
            let weeklyEarnings = 0;
            let monthlyEarnings = 0;
            let todayTrips = 0;
            let weeklyTrips = 0;
            let monthlyTrips = 0;

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            const monthAgo = new Date(today);
            monthAgo.setDate(monthAgo.getDate() - 30);

            try {
              // Get trips with invoices
              if ((prisma as any).trip) {
                const allTrips = await (prisma as any).trip.findMany({
                  where: {
                    driverId: driverId,
                    createdAt: { gte: monthAgo },
                  },
                  include: {
                    booking: {
                      include: {
                        invoice: true,
                      },
                    },
                  },
                });

                // Calculate today's stats
                const todayTripsData = allTrips.filter((t: any) => {
                  const tripDate = new Date(t.createdAt);
                  return tripDate >= today && tripDate < tomorrow;
                });
                todayTrips = todayTripsData.length;
                todayEarnings = todayTripsData.reduce((sum: number, trip: any) => {
                  return sum + Number(trip.booking?.invoice?.totalAmount || trip.booking?.invoice?.total || trip.booking?.invoice?.amount || 0);
                }, 0);

                // Calculate weekly stats
                const weeklyTripsData = allTrips.filter((t: any) => {
                  const tripDate = new Date(t.createdAt);
                  return tripDate >= weekAgo;
                });
                weeklyTrips = weeklyTripsData.length;
                weeklyEarnings = weeklyTripsData.reduce((sum: number, trip: any) => {
                  return sum + Number(trip.booking?.invoice?.totalAmount || trip.booking?.invoice?.total || trip.booking?.invoice?.amount || 0);
                }, 0);

                // Calculate monthly stats
                monthlyTrips = allTrips.length;
                monthlyEarnings = allTrips.reduce((sum: number, trip: any) => {
                  return sum + Number(trip.booking?.invoice?.totalAmount || trip.booking?.invoice?.total || trip.booking?.invoice?.amount || 0);
                }, 0);
              }
            } catch (e) {
              console.warn(`Failed to calculate earnings for driver ${driverId}`, e);
            }

            // Calculate average daily earnings (from last 7 days)
            const avgDailyEarnings = weeklyEarnings / 7;
            const avgDailyTrips = weeklyTrips / 7;

            // Set automatic goals based on performance using configurable values
            const { getGoalConfig } = await import("../lib/business-config.js");
            const goalConfig = await getGoalConfig();
            const dailyEarningsGoal = Math.max(100000, Math.ceil(avgDailyEarnings * goalConfig.multiplier)); // Configurable multiplier above average or 100K minimum
            const dailyTripsGoal = Math.max(10, Math.ceil(avgDailyTrips * goalConfig.multiplier)); // Configurable multiplier above average or 10 trips minimum
            const weeklyEarningsGoal = Math.max(700000, Math.ceil(avgDailyEarnings * 7 * goalConfig.multiplier)); // Weekly goal
            const monthlyEarningsGoal = Math.max(goalConfig.minimumMonthly, Math.ceil(avgDailyEarnings * 30 * goalConfig.multiplier)); // Monthly goal

            // Check if goal reminder exists (within last 7 days)
            const recentGoalReminders = await (prisma as any).driverReminder.findMany({
              where: {
                driverId: driverId,
                type: { in: ["INFO", "WARNING"] },
                createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
              },
            });
            const recentGoalReminder = recentGoalReminders.find((r: any) => {
              try {
                const meta = r.meta || {};
                return meta.type === "goal" && meta.autoGenerated === true;
              } catch {
                return false;
              }
            });

            if (!recentGoalReminder) {
              // Create goal reminder
              const goalProgress = todayEarnings > 0 ? Math.min(100, Math.round((todayEarnings / dailyEarningsGoal) * 100)) : 0;
              const tripsProgress = todayTrips > 0 ? Math.min(100, Math.round((todayTrips / dailyTripsGoal) * 100)) : 0;

              let goalMessage = null;
              let goalType = "INFO";

              if (goalProgress < 50 && todayEarnings > 0) {
                goalMessage = `Daily Goal Progress: You've earned ${todayEarnings.toLocaleString()} TZS today (${goalProgress}% of your ${dailyEarningsGoal.toLocaleString()} TZS goal). Keep pushing to reach your daily target!`;
                goalType = "WARNING";
              } else if (goalProgress >= 50 && goalProgress < 100) {
                goalMessage = `Daily Goal Progress: Great work! You've earned ${todayEarnings.toLocaleString()} TZS today (${goalProgress}% of your ${dailyEarningsGoal.toLocaleString()} TZS goal). You're ${((dailyEarningsGoal - todayEarnings) / 1000).toFixed(0)}K TZS away from your daily target.`;
                goalType = "INFO";
              } else if (goalProgress >= 100) {
                goalMessage = `Congratulations! You've exceeded your daily earnings goal of ${dailyEarningsGoal.toLocaleString()} TZS. You've earned ${todayEarnings.toLocaleString()} TZS today. Keep up the excellent work!`;
                goalType = "INFO";
              } else {
                goalMessage = `Your daily goals are set: Earn ${dailyEarningsGoal.toLocaleString()} TZS and complete ${dailyTripsGoal} trips. Current progress: ${todayEarnings.toLocaleString()} TZS (${goalProgress}%) and ${todayTrips} trips (${tripsProgress}%).`;
                goalType = "INFO";
              }

              if (goalMessage) {
                const reminder = await (prisma as any).driverReminder.create({
                  data: {
                    driverId: driverId,
                    type: goalType,
                    message: goalMessage,
                    action: "View Dashboard",
                    actionLink: "/driver/dashboard",
                    expiresAt: new Date(tomorrow.getTime() - 1), // Expires at end of day
                    meta: { 
                      autoGenerated: true, 
                      type: "goal",
                      dailyEarningsGoal,
                      dailyTripsGoal,
                      weeklyEarningsGoal,
                      monthlyEarningsGoal,
                      todayEarnings,
                      todayTrips,
                      goalProgress,
                      tripsProgress,
                    },
                  },
                });
                // Emit Socket.IO notification
                const app = (req as any).app;
                const io = app?.get('io');
                if (io && typeof io.emit === 'function') {
                  io.to(`driver:${driverId}`).emit('new-reminder', {
                    id: String(reminder.id),
                    type: reminder.type,
                    message: reminder.message,
                    action: reminder.action,
                    actionLink: reminder.actionLink,
                    expiresAt: reminder.expiresAt ? new Date(reminder.expiresAt).toISOString() : null,
                    createdAt: reminder.createdAt ? new Date(reminder.createdAt).toISOString() : new Date().toISOString(),
                  });
                }
                createdReminders.push(reminder);
                stats.goals++;
              }
            }

            // 7. Earnings Performance Reminders
            const recentEarningsReminders = await (prisma as any).driverReminder.findMany({
              where: {
                driverId: driverId,
                type: { in: ["INFO", "WARNING"] },
                createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
              },
            });
            const recentEarningsReminder = recentEarningsReminders.find((r: any) => {
              try {
                const meta = r.meta || {};
                return meta.type === "earnings" && meta.autoGenerated === true;
              } catch {
                return false;
              }
            });

            if (!recentEarningsReminder) {
              let earningsMessage = null;
              let earningsType = "INFO";

              // Weekly earnings analysis
              if (weeklyEarnings > 0) {
                const weeklyProgress = Math.min(100, Math.round((weeklyEarnings / weeklyEarningsGoal) * 100));
                
                if (weeklyProgress < 60) {
                  earningsMessage = `Weekly Earnings Alert: You've earned ${weeklyEarnings.toLocaleString()} TZS this week (${weeklyProgress}% of your ${weeklyEarningsGoal.toLocaleString()} TZS goal). Consider increasing your online hours or accepting more trips to reach your target.`;
                  earningsType = "WARNING";
                } else if (weeklyProgress >= 60 && weeklyProgress < 100) {
                  earningsMessage = `Weekly Earnings Update: You've earned ${weeklyEarnings.toLocaleString()} TZS this week (${weeklyProgress}% of your ${weeklyEarningsGoal.toLocaleString()} TZS goal). You're on track! Keep it up.`;
                  earningsType = "INFO";
                } else {
                  earningsMessage = `Excellent Performance! You've exceeded your weekly earnings goal. You've earned ${weeklyEarnings.toLocaleString()} TZS this week (${weeklyProgress}% of ${weeklyEarningsGoal.toLocaleString()} TZS). Outstanding work!`;
                  earningsType = "INFO";
                }
              } else {
                earningsMessage = `Earnings Summary: Your average daily earnings are ${Math.round(avgDailyEarnings).toLocaleString()} TZS. Set a goal to earn ${dailyEarningsGoal.toLocaleString()} TZS daily and ${weeklyEarningsGoal.toLocaleString()} TZS weekly to maximize your income.`;
                earningsType = "INFO";
              }

              if (earningsMessage) {
                const reminder = await (prisma as any).driverReminder.create({
                  data: {
                    driverId: driverId,
                    type: earningsType,
                    message: earningsMessage,
                    action: "View Earnings",
                    actionLink: "/driver/dashboard",
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Expires in 7 days
                    meta: { 
                      autoGenerated: true, 
                      type: "earnings",
                      todayEarnings,
                      weeklyEarnings,
                      monthlyEarnings,
                      todayTrips,
                      weeklyTrips,
                      monthlyTrips,
                      avgDailyEarnings: Math.round(avgDailyEarnings),
                      avgDailyTrips: Math.round(avgDailyTrips),
                    },
                  },
                });
                // Emit Socket.IO notification
                const app = (req as any).app;
                const io = app?.get('io');
                if (io && typeof io.emit === 'function') {
                  io.to(`driver:${driverId}`).emit('new-reminder', {
                    id: String(reminder.id),
                    type: reminder.type,
                    message: reminder.message,
                    action: reminder.action,
                    actionLink: reminder.actionLink,
                    expiresAt: reminder.expiresAt ? new Date(reminder.expiresAt).toISOString() : null,
                    createdAt: reminder.createdAt ? new Date(reminder.createdAt).toISOString() : new Date().toISOString(),
                  });
                }
                createdReminders.push(reminder);
                stats.earnings++;
              }
            }
          }
        } catch (e) {
          console.warn(`Failed to check/create goals/earnings reminders for driver ${driverId}`, e);
        }
      }
    } catch (e) {
      console.warn("Failed to auto-create reminders", e);
    }

    return res.json({ 
      created: createdReminders.length, 
      reminders: createdReminders,
      stats: {
        license: stats.license,
        insurance: stats.insurance,
        rating: stats.rating,
        safety: stats.safety,
        security: stats.security,
        goals: stats.goals,
        earnings: stats.earnings,
      },
    });
  } catch (err: any) {
    console.error("Failed to auto-create reminders", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /admin/drivers/:id/stats
 * Returns comprehensive stats for a specific driver
 */
router.get("/:id/stats", async (req, res) => {
  try {
    const driverId = Number(req.params.id);
    const { date } = req.query as any;
    
    // Verify driver exists
    const driver = await prisma.user.findFirst({
      where: { id: driverId, role: "DRIVER" },
      select: { id: true, name: true, email: true },
    });
    if (!driver) return res.status(404).json({ error: "Driver not found" });

    const today = new Date();
    if (date) {
      today.setTime(new Date(date + "T00:00:00.000Z").getTime());
    }
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let todaysRides = 0;
    let earnings = 0;
    let rating = 0;

    try {
      const where: any = { driverId };
      if (date) {
        const start = new Date(date + "T00:00:00.000Z");
        const end = new Date(date + "T23:59:59.999Z");
        where.scheduledAt = { gte: start, lte: end };
      } else {
        where.scheduledAt = { gte: today, lt: tomorrow };
      }

      if ((prisma as any).booking) {
        todaysRides = await (prisma as any).booking.count({ where });
        const completed = await (prisma as any).booking.findMany({
          where: { ...where, status: { in: ["COMPLETED", "FINISHED", "PAID"] } },
          select: { price: true, total: true, fare: true },
        });
        earnings = (completed || []).reduce((s: number, b: any) => s + (Number(b.price || b.total || b.fare) || 0), 0);
      }
    } catch (e) {
      console.warn('Failed to fetch stats', e);
    }

    try {
      const u = await prisma.user.findUnique({
        where: { id: driverId },
        select: { rating: true } as any,
      });
      if (u && typeof (u as any).rating === "number") rating = (u as any).rating;
    } catch (e) {
      console.warn('Failed to fetch rating', e);
    }

    return res.json({
      driver: {
        id: driver.id,
        name: driver.name,
        email: driver.email,
      },
      date: date || today.toISOString().split('T')[0],
      todaysRides,
      earnings,
      rating: parseFloat(rating.toFixed(1)),
    });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch when querying driver stats:', err.message);
      return res.json({
        driver: null,
        date: (req.query as any).date || new Date().toISOString().split('T')[0],
        todaysRides: 0,
        earnings: 0,
        rating: 0,
      });
    }
    console.error('Unhandled error in GET /admin/drivers/:id/stats:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/** GET /admin/drivers/:id/activities
 * Returns a comprehensive summary of all driver activities
 */
router.get("/:id/activities", async (req, res) => {
  try {
    const driverId = Number(req.params.id);
    
    // Verify driver exists
    const driver = await prisma.user.findFirst({
      where: { id: driverId, role: "DRIVER" },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    if (!driver) return res.status(404).json({ error: "Driver not found" });

    // Get all activity summaries
    const [referrals, bonuses, level, reminders, stats, trips, invoices] = await Promise.all([
      // Referrals summary
      (async () => {
        try {
          let totalReferrals = 0;
          if ((prisma as any).referral) {
            totalReferrals = await (prisma as any).referral.count({ where: { referrerId: driverId } });
          } else if ((prisma as any).user) {
            const referralCode = `DRIVER-${driverId.toString().slice(-6).toUpperCase()}`;
            totalReferrals = await (prisma as any).user.count({
              where: {
                OR: [
                  { referredBy: driverId },
                  { referralCode: referralCode },
                  { referralId: driverId },
                ],
              },
            });
          }
          return { totalReferrals };
        } catch (e) {
          return { totalReferrals: 0 };
        }
      })(),
      // Bonuses summary
      (async () => {
        try {
          const bonusCount = await prisma.adminAudit.count({
            where: {
              targetUserId: driverId,
              action: 'GRANT_BONUS',
            },
          });
          return { totalBonuses: bonusCount };
        } catch (e) {
          return { totalBonuses: 0 };
        }
      })(),
      // Level summary
      (async () => {
        try {
          let totalTrips = 0;
          if ((prisma as any).booking) {
            totalTrips = await (prisma as any).booking.count({
              where: {
                driverId,
                status: { in: ['COMPLETED', 'FINISHED', 'PAID', 'CONFIRMED'] },
              },
            });
          }
          return { totalTrips };
        } catch (e) {
          return { totalTrips: 0 };
        }
      })(),
      // Reminders summary
      (async () => {
        try {
          let unreadReminders = 0;
          if ((prisma as any).driverReminder) {
            unreadReminders = await (prisma as any).driverReminder.count({
              where: { driverId, isRead: false },
            });
          }
          return { unreadReminders };
        } catch (e) {
          return { unreadReminders: 0 };
        }
      })(),
      // Stats summary
      (async () => {
        try {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          let todayTrips = 0;
          if ((prisma as any).booking) {
            todayTrips = await (prisma as any).booking.count({
              where: {
                driverId,
                scheduledAt: { gte: today, lt: tomorrow },
              },
            });
          }
          return { todayTrips };
        } catch (e) {
          return { todayTrips: 0 };
        }
      })(),
      // Trips summary
      (async () => {
        try {
          const totalTrips = await prisma.booking.count({
            where: { driverId },
          });
          return { totalTrips };
        } catch (e) {
          return { totalTrips: 0 };
        }
      })(),
      // Invoices summary
      (async () => {
        try {
          const totalInvoices = await prisma.invoice.count({
            where: {
              booking: {
                driverId,
              },
            },
          });
          return { totalInvoices };
        } catch (e) {
          return { totalInvoices: 0 };
        }
      })(),
    ]);

    return res.json({
      driver: {
        id: driver.id,
        name: driver.name,
        email: driver.email,
        joinedAt: driver.createdAt,
      },
      activities: {
        referrals: referrals.totalReferrals,
        bonuses: bonuses.totalBonuses,
        trips: level.totalTrips,
        unreadReminders: reminders.unreadReminders,
        todayTrips: stats.todayTrips,
        totalTrips: trips.totalTrips,
        totalInvoices: invoices.totalInvoices,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch when querying driver activities:', err.message);
      return res.json({
        driver: null,
        activities: {
          referrals: 0,
          bonuses: 0,
          trips: 0,
          unreadReminders: 0,
          todayTrips: 0,
          totalTrips: 0,
          totalInvoices: 0,
        },
        lastUpdated: new Date().toISOString(),
      });
    }
    console.error('Unhandled error in GET /admin/drivers/:id/activities:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
