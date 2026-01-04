// apps/api/src/routes/owner.reports.ts
import { Router } from "express";
import { prisma } from "@nolsaf/prisma";
import { Prisma } from "@prisma/client";
import { AuthedRequest, requireAuth, requireRole } from "../middleware/auth.js";
import { eachDay, fmtKey, GroupBy, startOfDayTZ } from "../lib/reporting";
import { withCache, makeKey } from "../lib/cache";

// If you have generated Prisma types, replace these any aliases.
type Invoice = any;
type Booking = any;

import type { RequestHandler, Response } from 'express';
export const router = Router();
router.use(requireAuth as unknown as RequestHandler, requireRole("OWNER") as unknown as RequestHandler);

/** Parse common query params */
function parseQuery(q: any) {
  const now = new Date();
  const from = q.from ? new Date(String(q.from)) : new Date(now.getFullYear(), now.getMonth(), 1);
  const to = q.to ? new Date(String(q.to)) : now;
  const groupBy = (q.groupBy as GroupBy) || "day";
  const propertyId = q.propertyId ? Number(q.propertyId) : undefined;
  return { from, to, groupBy, propertyId };
}

/** -------------------------
 *  /owner/reports/overview
 *  ------------------------- */
const overviewHandler: RequestHandler = async (req, res) => {
  const r = req as AuthedRequest;
  const ownerId = r.user!.id;
  const { from, to, groupBy, propertyId } = parseQuery(req.query);

  const key = makeKey(ownerId, "overview", {
    from: from.toISOString(),
    to: to.toISOString(),
    groupBy,
    propertyId,
  });

  const data = await withCache(key, async () => {
    const invoices: Invoice[] = await prisma.invoice.findMany({
      where: {
        ownerId,
        issuedAt: { gte: from, lte: to },
        ...(propertyId ? { booking: { propertyId } } : {}),
      },
      include: { booking: { include: { property: true } } },
    });

    const bookings: Booking[] = await prisma.booking.findMany({
      where: {
        property: { ownerId },
        checkIn: { gte: from, lte: to },
        ...(propertyId ? { propertyId } : {}),
      },
      include: { property: true },
    });

    const gross = invoices.reduce((s: number, i: any) => s + Number(i.total), 0);
    const net = invoices.reduce((s: number, i: any) => s + Number(i.netPayable), 0);
    const bCnt = bookings.length;
    const nights = bookings.reduce(
      (s: number, b: any) => s + Math.max(1, Math.ceil((+b.checkOut - +b.checkIn) / 864e5)),
      0
    );
    const adr = nights ? gross / nights : 0;

    // Time series buckets
    const series: Record<string, { gross: number; net: number; bookings: number }> = {};
    for (const d of eachDay(from, to)) series[fmtKey(d, groupBy)] = { gross: 0, net: 0, bookings: 0 };
    for (const inv of invoices) {
      const k = fmtKey(startOfDayTZ(inv.issuedAt), groupBy);
      if (!series[k]) series[k] = { gross: 0, net: 0, bookings: 0 };
      series[k].gross += Number(inv.total);
      series[k].net += Number(inv.netPayable);
    }
    for (const b of bookings) {
      const k = fmtKey(startOfDayTZ(b.checkIn), groupBy);
      if (!series[k]) series[k] = { gross: 0, net: 0, bookings: 0 };
      series[k].bookings += 1;
    }

    // Booking status distribution
    const byStatus: Record<string, number> = {};
    for (const b of bookings) byStatus[b.status] = (byStatus[b.status] ?? 0) + 1;

    // Top properties by net
    const byProp: Record<number, { title: string; net: number }> = {};
    for (const inv of invoices) {
      const pid = inv.booking.propertyId;
      const title = inv.booking.property?.title ?? `#${pid}`;
      if (!byProp[pid]) byProp[pid] = { title, net: 0 };
      byProp[pid].net += Number(inv.netPayable);
    }

    return {
      kpis: { gross, net, bookings: bCnt, nights, adr },
      series: Object.entries(series).map(([key, v]) => ({ key, ...v })),
      status: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
      topProperties: Object.entries(byProp)
        .map(([pid, v]) => ({ propertyId: Number(pid), title: v.title, net: v.net }))
        .sort((a, b) => b.net - a.net)
        .slice(0, 5),
    };
  });

  res.json(data);
};
router.get("/overview", overviewHandler);

/** -------------------------
 *  /owner/reports/revenue
 *  ------------------------- */
const revenueHandler: RequestHandler = async (req, res) => {
  const r = req as AuthedRequest;
  const ownerId = r.user!.id;
  const { from, to, groupBy, propertyId } = parseQuery(req.query);

  const key = makeKey(ownerId, "revenue", {
    from: from.toISOString(),
    to: to.toISOString(),
    groupBy,
    propertyId,
  });

  const data = await withCache(key, async () => {
    const items: Invoice[] = await prisma.invoice.findMany({
      where: {
        ownerId,
        issuedAt: { gte: from, lte: to },
        ...(propertyId ? { booking: { propertyId } } : {}),
      },
      include: { booking: { include: { property: true } } },
    });

    // Series
    const series: Record<string, { gross: number; net: number; commission: number }> = {};
    for (const d of eachDay(from, to)) series[fmtKey(d, groupBy)] = { gross: 0, net: 0, commission: 0 };
    for (const i of items) {
      const k = fmtKey(startOfDayTZ(i.issuedAt), groupBy);
      if (!series[k]) series[k] = { gross: 0, net: 0, commission: 0 };
      series[k].gross += Number(i.total);
      series[k].net += Number(i.netPayable);
      series[k].commission += Number(i.commissionAmount);
    }

    // By property
    const byProp: Record<string, { gross: number; net: number; commission: number }> = {};
    for (const i of items) {
      const name = i.booking.property?.title ?? `#${i.booking.propertyId}`;
      if (!byProp[name]) byProp[name] = { gross: 0, net: 0, commission: 0 };
      byProp[name].gross += Number(i.total);
      byProp[name].net += Number(i.netPayable);
      byProp[name].commission += Number(i.commissionAmount);
    }

    return {
      series: Object.entries(series).map(([key, v]) => ({ key, ...v })),
      byProperty: Object.entries(byProp).map(([title, v]) => ({ title, ...v })),
      table: items.map((i: any) => ({
        id: i.id,
        invoiceNumber: i.invoiceNumber,
        issuedAt: i.issuedAt,
        property: i.booking.property?.title ?? `#${i.booking.propertyId}`,
        gross: i.total,
        commissionPercent: i.commissionPercent,
        commissionAmount: i.commissionAmount,
        net: i.netPayable,
        status: i.status,
        receiptNumber: i.receiptNumber ?? null,
      })),
    };
  });

  res.json(data);
};
router.get("/revenue", revenueHandler);

/** -------------------------
 *  /owner/reports/bookings
 *  ------------------------- */
const bookingsHandler: RequestHandler = async (req, res) => {
  try {
    const r = req as AuthedRequest;
    const ownerId = r.user?.id;
    const { from, to, groupBy, propertyId } = parseQuery(req.query);

    // #region agent log
    globalThis.fetch?.('http://127.0.0.1:7242/ingest/0a9c03b2-bc4e-4a78-a106-f197405e1191',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'owner.reports.ts:bookingsHandler',message:'GET reports/bookings (entry)',data:{path:req.path,baseUrl:(req as any).baseUrl,hasUser:Boolean(r.user),ownerId:ownerId??null,from:String(from),to:String(to),groupBy,propertyId:propertyId??null},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'ORPT_500A'})}).catch(()=>{});
    // #endregion

    if (!ownerId) {
      // #region agent log
      globalThis.fetch?.('http://127.0.0.1:7242/ingest/0a9c03b2-bc4e-4a78-a106-f197405e1191',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'owner.reports.ts:bookingsHandler',message:'GET reports/bookings (no owner)',data:{hasUser:Boolean(r.user)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'ORPT_500B'})}).catch(()=>{});
      // #endregion
      res.setHeader('Content-Type', 'application/json');
      return res.status(401).json({ error: "Unauthorized", series: [], stacked: [], table: [] });
    }

    const key = makeKey(ownerId, "bookings", {
      from: from.toISOString(),
      to: to.toISOString(),
      groupBy,
      propertyId,
    });

    const data = await withCache(key, async () => {
      const t0 = Date.now();
      const bs: Booking[] = await prisma.booking.findMany({
        where: {
          property: { ownerId },
          checkIn: { gte: from, lte: to },
          ...(propertyId ? { propertyId } : {}),
        },
        include: { property: true },
      });

      // #region agent log
      globalThis.fetch?.('http://127.0.0.1:7242/ingest/0a9c03b2-bc4e-4a78-a106-f197405e1191',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'owner.reports.ts:bookingsHandler',message:'GET reports/bookings (query ok)',data:{count:bs.length,durationMs:Date.now()-t0},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'ORPT_500C'})}).catch(()=>{});
      // #endregion

      const series: Record<string, { count: number }> = {};
      const stack: Record<string, Record<string, number>> = {};
      for (const d of eachDay(from, to)) {
        const k = fmtKey(d, groupBy);
        series[k] = { count: 0 };
        stack[k] = {};
      }
      for (const b of bs) {
        const k = fmtKey(startOfDayTZ(b.checkIn), groupBy);
        // Defensive: if timezone edge cases produce a key not in range, initialize it.
        if (!series[k]) { series[k] = { count: 0 }; stack[k] = stack[k] ?? {}; }
        series[k].count += 1;
        stack[k][b.status] = (stack[k][b.status] ?? 0) + 1;
      }
      const stacked = Object.entries(stack).map(([key, obj]) => ({ key, ...obj }));

      return {
        series: Object.entries(series).map(([key, v]) => ({ key, ...v })),
        stacked,
        table: bs.map((b: any) => ({
          id: b.id,
          property: b.property?.title ?? `#${b.propertyId}`,
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          status: b.status,
          totalAmount: b.totalAmount,
          guestName: (b as any).guestName ?? null,
        })),
      };
    });

    res.setHeader('Content-Type', 'application/json');
    res.json(data);
  } catch (err: any) {
    console.error('Error in GET /owner/reports/bookings:', err);

    // #region agent log
    globalThis.fetch?.('http://127.0.0.1:7242/ingest/0a9c03b2-bc4e-4a78-a106-f197405e1191',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'owner.reports.ts:bookingsHandler',message:'GET reports/bookings (error)',data:{name:String(err?.name??''),message:String(err?.message??err),code:String(err?.code??''),prismaCode:String(err?.meta?.code??''),metaKeys:err?.meta?Object.keys(err.meta):[]},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'ORPT_500D'})}).catch(()=>{});
    // #endregion
    
    // Handle Prisma schema mismatch errors (table/column not found)
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch in owner.reports.bookings:', err.message);
      res.setHeader('Content-Type', 'application/json');
      return res.json({
        series: [],
        stacked: [],
        table: [],
      });
    }
    
    // Handle other errors
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      error: 'Internal server error',
      message: err?.message || 'Unknown error',
      series: [],
      stacked: [],
      table: [],
    });
  }
};
router.get("/bookings", bookingsHandler);

/** -------------------------
 *  /owner/reports/occupancy
 *  ------------------------- */
const occupancyHandler: RequestHandler = async (req, res) => {
  const r = req as AuthedRequest;
  const ownerId = r.user!.id;
  const { from, to, groupBy, propertyId } = parseQuery(req.query);

  const key = makeKey(ownerId, "occupancy", {
    from: from.toISOString(),
    to: to.toISOString(),
    groupBy,
    propertyId,
  });

  const data = await withCache(key, async () => {
    const props = await prisma.property.findMany({
      where: { ownerId, ...(propertyId ? { id: propertyId } : {}) },
      select: { id: true, title: true, roomsCount: true },
    });

    // Occupancy per day
    const days = eachDay(from, to);
    const occ: Array<{ date: string; occupancy: number }> = [];

    for (const d of days) {
      const sold = await prisma.booking.count({
        where: {
          property: { ownerId, ...(propertyId ? { id: propertyId } : {}) },
          checkIn: { lte: d },
          checkOut: { gt: d },
        },
      });

      const totalRooms = props.reduce((s: number, p: any) => s + (p.roomsCount ?? 1), 0);
      const available = Math.max(1, totalRooms);
      const rate = Math.min(100, Math.round((sold / available) * 100));
      occ.push({ date: fmtKey(d, groupBy), occupancy: rate });
    }

    // Net revenue by property in the window
    const invoices: Invoice[] = await prisma.invoice.findMany({
      where: {
        ownerId,
        issuedAt: { gte: from, lte: to },
        ...(propertyId ? { booking: { propertyId } } : {}),
      },
      include: { booking: true },
    });
    const byProp: Record<number, { title: string; net: number }> = {};
    for (const inv of invoices) {
      const pid = inv.booking.propertyId;
      const title = props.find((p: any) => p.id === pid)?.title ?? `#${pid}`;
      if (!byProp[pid]) byProp[pid] = { title, net: 0 };
      byProp[pid].net += Number(inv.netPayable);
    }
    const byProperty = Object.entries(byProp).map(([pid, v]: [string, any]) => ({
      propertyId: Number(pid),
      title: v.title,
      net: v.net,
    }));

    return { heat: occ, byProperty };
  });

  res.json(data);
};
router.get("/occupancy", occupancyHandler);

/** -------------------------
 *  /owner/reports/customers
 *  ------------------------- */
const customersHandler: RequestHandler = async (req, res) => {
  const r = req as AuthedRequest;
  const ownerId = r.user!.id;
  const { from, to, propertyId } = parseQuery(req.query);

  const key = makeKey(ownerId, "customers", {
    from: from.toISOString(),
    to: to.toISOString(),
    propertyId,
  });

  const data = await withCache(key, async () => {
    const bs = await prisma.booking.findMany({
      where: {
        property: { ownerId },
        checkIn: { gte: from, lte: to },
        ...(propertyId ? { propertyId } : {}),
      },
      select: {
        id: true,
        totalAmount: true,
        checkIn: true,
        checkOut: true,
        guestName: true,
        nationality: true,
      },
    });

    // By nationality
    const byNat: Record<string, number> = {};
    for (const b of bs) {
      const k = (b.nationality ?? "Unknown").toString();
      byNat[k] = (byNat[k] ?? 0) + 1;
    }

    // Top customers (by guestName proxy)
    const byGuest: Record<string, { stays: number; spend: number }> = {};
    for (const b of bs) {
      const k = (b.guestName ?? "Guest").toString();
      if (!byGuest[k]) byGuest[k] = { stays: 0, spend: 0 };
      byGuest[k].stays += 1;
      byGuest[k].spend += Number(b.totalAmount);
    }
    const topCustomers = Object.entries(byGuest)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.spend - a.spend)
      .slice(0, 20);

    return {
      byNationality: Object.entries(byNat).map(([nationality, count]) => ({ nationality, count })),
      topCustomers,
    };
  });

  res.json(data);
};
router.get("/customers", customersHandler);

export default router;
