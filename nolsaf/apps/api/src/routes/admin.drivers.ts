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
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
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

    // Get all trips in the date range
    const trips = await prisma.booking.findMany({
      where: {
        driverId: { not: null },
        scheduledAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        scheduledAt: true,
        status: true,
        price: true,
      },
      orderBy: {
        scheduledAt: "asc",
      },
    });

    // Group by date
    const dateMap = new Map<string, { count: number; completed: number; amount: number }>();
    
    trips.forEach((trip) => {
      const dateKey = trip.scheduledAt.toISOString().split("T")[0];
      const existing = dateMap.get(dateKey) || { count: 0, completed: 0, amount: 0 };
      existing.count += 1;
      if (trip.status === "COMPLETED") {
        existing.completed += 1;
      }
      existing.amount += trip.price ?? 0;
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
      where.scheduledAt = { gte: s, lte: e };
    } else if (start || end) {
      const s = start ? new Date(String(start) + "T00:00:00.000Z") : new Date(0);
      const e = end ? new Date(String(end) + "T23:59:59.999Z") : new Date();
      where.scheduledAt = { gte: s, lte: e };
    }
    
    // Search query
    if (q) {
      where.OR = [
        { tripCode: { contains: q, mode: "insensitive" } },
        { pickup: { contains: q, mode: "insensitive" } },
        { dropoff: { contains: q, mode: "insensitive" } },
        { driver: { name: { contains: q, mode: "insensitive" } } },
        { driver: { email: { contains: q, mode: "insensitive" } } },
      ];
    }
    
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Math.min(Number(pageSize), 100);
    
    const [items, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          driver: {
            select: { id: true, name: true, email: true, phone: true },
          },
        },
        orderBy: { scheduledAt: "desc" },
        skip,
        take,
      }),
      prisma.booking.count({ where }),
    ]);
    
    const mapped = items.map((b: any) => ({
      id: b.id,
      tripCode: b.tripCode || b.code || b.reference || `TRIP-${b.id}`,
      driver: b.driver ? {
        id: b.driver.id,
        name: b.driver.name || "Unknown Driver",
        email: b.driver.email,
        phone: b.driver.phone,
      } : null,
      pickup: b.pickup || b.pickupAddress || b.pickupLocation || "N/A",
      dropoff: b.dropoff || b.dropoffAddress || b.dropoffLocation || "N/A",
      scheduledAt: b.scheduledAt || b.date || b.createdAt,
      amount: b.price ?? b.fare ?? b.total ?? 0,
      status: b.status || "PENDING",
      createdAt: b.createdAt,
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
      where.booking = { driverId: Number(driverId) as any };
    } else {
      // Only show invoices for bookings that have a driver assigned
      where.booking = { driverId: { not: null } as any };
    }
    
    // Filter by status
    if (status) {
      where.status = status;
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
        { invoiceNumber: { contains: q, mode: "insensitive" } },
        { receiptNumber: { contains: q, mode: "insensitive" } },
        { booking: { driver: { name: { contains: q, mode: "insensitive" } } } },
        { booking: { driver: { email: { contains: q, mode: "insensitive" } } } },
      ];
    }
    
    const skip = (Number(page) - 1) * Number(pageSize);
    const take = Math.min(Number(pageSize), 100);
    
    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
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
        skip,
        take,
      }),
      prisma.invoice.count({ where }),
    ]);
    
    const mapped = items.map((inv: any) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber || `INV-${inv.id}`,
      receiptNumber: inv.receiptNumber,
      driver: inv.booking?.driver ? {
        id: inv.booking.driver.id,
        name: inv.booking.driver.name || "Unknown Driver",
        email: inv.booking.driver.email,
        phone: inv.booking.driver.phone,
      } : null,
      amount: inv.totalAmount ?? inv.total ?? inv.amount ?? 0,
      status: inv.status || "PENDING",
      issuedAt: inv.issuedAt || inv.createdAt,
      createdAt: inv.createdAt,
    }));
    
    return res.json({ total, page: Number(page), pageSize: take, items: mapped });
  } catch (err: any) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch when querying driver invoices:', err.message);
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

    // Get all invoices in the date range for driver bookings
    const invoices = await prisma.invoice.findMany({
      where: {
        booking: {
          driverId: { not: null },
        },
        issuedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        issuedAt: true,
        status: true,
        totalAmount: true,
        total: true,
        amount: true,
      },
      orderBy: {
        issuedAt: "asc",
      },
    });

    // Group by date
    const dateMap = new Map<string, { count: number; paid: number; amount: number }>();
    
    invoices.forEach((inv) => {
      const dateKey = inv.issuedAt.toISOString().split("T")[0];
      const existing = dateMap.get(dateKey) || { count: 0, paid: 0, amount: 0 };
      existing.count += 1;
      if (inv.status === "PAID") {
        existing.paid += 1;
      }
      existing.amount += inv.totalAmount ?? inv.total ?? inv.amount ?? 0;
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

export default router;
