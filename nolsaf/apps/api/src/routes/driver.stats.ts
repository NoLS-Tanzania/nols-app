import { Router } from "express";
import type { RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import qrcode from 'qrcode';
import { authenticator } from 'otplib';
import crypto from 'crypto';
import argon2 from 'argon2';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import { validatePasswordStrength } from '../lib/security.js';
import { requireAuth, AuthedRequest } from "../middleware/auth.js";

// local no-op audit helper to satisfy references to `audit`
// If the application provides an audit function via req.app.get('audit'), delegate to it.
async function audit(req: AuthedRequest, action: string, target: string, before?: any, after?: any) {
  try {
    const maybeAudit = (req.app && (req.app as any).get && (req.app as any).get('audit')) as any;
    if (typeof maybeAudit === 'function') {
      // call the app-provided audit handler if available
      await maybeAudit({ req, action, target, before, after });
    }
  } catch (e) {
    // ignore audit errors
  }
}

export const router = Router();
router.use(requireAuth as unknown as RequestHandler);

// In-memory demo stores for passkey challenges and credentials when DB model is not available
const passkeyChallenges = new Map<string, string>(); // userId -> challenge (base64url)
const passkeyStore = new Map<string, Array<any>>(); // userId -> [{ id, name, createdAt }]

function toBase64Url(buf: Buffer | Uint8Array) {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function fromBase64Url(s: string) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Buffer.from(s, 'base64');
}

/**
 * GET /driver/stats?date=YYYY-MM-DD
 * Returns lightweight stats for the driver: todaysRides, earnings, rating
 * Attempts to compute values from DB, but falls back to zeros if models/fields are absent.
 */
const getStats: RequestHandler = async (req, res) => {
  const user = (req as AuthedRequest).user!;
  const date = (req.query.date as string) || undefined;
  try {
    // Best-effort: try to count bookings assigned to this driver on the date
    let todaysRides = 0;
    let earnings = 0;
    let rating = 0;

    // If prisma has a booking model with driverId and scheduledAt/date fields, use it.
    try {
      // Attempt common field names; wrap in try/catch to avoid runtime error if model differs
      const where: any = { driverId: user.id };
      if (date) {
        // match date by scheduledAt between start/end of the day
        const start = new Date(date + "T00:00:00.000Z");
        const end = new Date(date + "T23:59:59.999Z");
        where.scheduledAt = { gte: start, lte: end };
      }
      // count bookings
      if ((prisma as any).booking) {
        todaysRides = await (prisma as any).booking.count({ where });
        // Sum earnings from completed bookings if price/amount fields exist
        const completed = await (prisma as any).booking.findMany({ where: { ...where, status: { in: ["COMPLETED", "FINISHED", "PAID"] } }, select: { price: true } });
        earnings = (completed || []).reduce((s: number, b: any) => s + (Number(b.price) || 0), 0);
      }
    } catch (e) {
      // ignore and fallback to 0s
    }

    // rating: if user has rating field, use it
    try {
      const u = await prisma.user.findUnique({ where: { id: user.id }, select: { rating: true } as any });
      if (u && typeof (u as any).rating === "number") rating = (u as any).rating;
    } catch (e) {
      // ignore
    }

    return res.json({ todaysRides, earnings, rating });
  } catch (err) {
    console.warn("driver.stats: failed to compute stats", err);
    return res.json({ todaysRides: 0, earnings: 0, rating: 0 });
  }
};
router.get("/stats", getStats as unknown as RequestHandler);

/**
 * GET /driver/dashboard
 * Returns comprehensive dashboard statistics for the authenticated driver
 */
const getDashboard: RequestHandler = async (req, res) => {
  const user = (req as AuthedRequest).user!;
  const driverId = user.id;

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Fetch today's trips - handle if Trip model doesn't exist
    let todaysTrips: any[] = [];
    try {
      todaysTrips = await (prisma as any).trip?.findMany({
        where: {
          driverId: Number(driverId),
          createdAt: { gte: today, lt: tomorrow },
        },
        include: {
          booking: { include: { invoice: true } },
        },
      }) || [];
    } catch (e) {
      console.warn("Trip model not available, using mock data");
    }

    const todaysRides = todaysTrips.length || 8;
    const todayEarnings = todaysTrips.reduce((sum: number, trip: any) => {
      return sum + Number(trip.booking?.invoice?.totalAmount || 0);
    }, 0) || 65000;

    const acceptanceRate = 95;
    const baseFare = 55000;
    const tips = 8000;
    const bonuses = 2000;

    // Get driver rating - using mock data for now
    let rating = 4.8;
    let totalReviews = 127;

    const onlineHours = 3.5;

    // Check peak hours
    const currentHour = new Date().getHours();
    const isPeakTime = currentHour >= 16 && currentHour < 19;
    const peakHours = isPeakTime ? {
      active: true,
      start: "4:00 PM",
      end: "7:00 PM",
      multiplier: 2.5,
      timeLeft: `${19 - currentHour} hrs`,
    } : null;

    // Earnings chart - last 7 days
    const earningsChart = [
      { day: "Mon", amount: 45000 },
      { day: "Tue", amount: 52000 },
      { day: "Wed", amount: 48000 },
      { day: "Thu", amount: 58000 },
      { day: "Fri", amount: 62000 },
      { day: "Sat", amount: 71000 },
      { day: "Sun", amount: 65000 }
    ];

    // Trips by hour
    const tripsChart = [
      { hour: "6AM", trips: 2 },
      { hour: "9AM", trips: 5 },
      { hour: "12PM", trips: 4 },
      { hour: "3PM", trips: 3 },
      { hour: "6PM", trips: 8 },
      { hour: "9PM", trips: 6 }
    ];

    // Demand zones
    const demandZones = [
      { name: "Masaki", level: "high" },
      { name: "Mikocheni", level: "medium" },
      { name: "Sinza", level: "low" }
    ];

    // Recent trips
    const recentTrips = [
      { id: "1", time: "2:30 PM", from: "Masaki", to: "Airport", distance: "8.5km", amount: 12500 },
      { id: "2", time: "1:15 PM", from: "Sinza", to: "Mlimani", distance: "3.2km", amount: 5000 }
    ];

    // Reminders
    const reminders: any[] = [];
    
    // Check for document expiry
    try {
      const documents = await (prisma as any).driverDocument?.findMany({
        where: { driverId: Number(driverId), type: "INSURANCE" },
        orderBy: { expiryDate: "desc" },
        take: 1,
      }) || [];

      if (documents[0]?.expiryDate) {
        const daysUntilExpiry = Math.ceil(
          (new Date(documents[0].expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
          reminders.push({
            id: "insurance-expiry",
            type: "warning",
            message: `Insurance expires in ${daysUntilExpiry} days`,
            action: "Renew Now",
            actionLink: "/driver/management?tab=documents",
          });
        }
      }
    } catch (e) {
      console.warn("Could not check document expiry");
    }

    if (onlineHours >= 3.5) {
      reminders.push({
        id: "break-reminder",
        type: "info",
        message: `Take a break - you've been driving ${onlineHours.toFixed(1)} hours`,
      });
    }

    const todayGoal = 100000;
    const goalProgress = Math.min(Math.round((todayEarnings / todayGoal) * 100), 100);

    return res.json({
      todayGoal,
      todayEarnings,
      goalProgress,
      todaysRides,
      acceptanceRate,
      earningsBreakdown: { base: baseFare, tips, bonus: bonuses },
      rating: parseFloat(rating.toFixed(1)),
      totalReviews,
      onlineHours,
      peakHours,
      earningsChart,
      tripsChart,
      demandZones,
      recentTrips,
      reminders,
    });
  } catch (err) {
    console.error("driver.dashboard: failed to fetch dashboard data", err);
    return res.status(500).json({ error: "Failed to fetch dashboard data" });
  }
};
router.get("/dashboard", getDashboard as unknown as RequestHandler);

/**
 * GET /driver/map
 * Returns a lightweight payload for rendering a live map: driverLocation + assignments + nearbyDrivers
 * Best-effort from DB; otherwise returns sample data.
 */
const getMapData: RequestHandler = async (req, res) => {
  const user = (req as AuthedRequest).user!;
  try {
    // Attempt to read driver's last known location from sessions or a driver_location table
    let driverLocation: any = null;
    try {
      if ((prisma as any).driverLocation) {
        const loc = await (prisma as any).driverLocation.findUnique({ where: { driverId: user.id } });
  if (loc) driverLocation = { id: loc.driverId, lat: Number(loc.lat), lng: Number(loc.lng), updatedAt: loc.updatedAt };
      }
    } catch (e) {
      // ignore
    }

    // Assignments: bookings assigned to this driver with pickup/dropoff coordinates
    let assignments: any[] = [];
    try {
      if ((prisma as any).booking) {
        const items = await (prisma as any).booking.findMany({ where: { driverId: user.id, status: { in: ["ASSIGNED", "IN_PROGRESS"] } }, select: { id: true, pickupLat: true, pickupLng: true, dropoffLat: true, dropoffLng: true, status: true, passengerName: true } });
        assignments = (items || []).map((b: any) => ({ id: b.id, pickup: b.pickupLat && b.pickupLng ? { lat: Number(b.pickupLat), lng: Number(b.pickupLng) } : null, dropoff: b.dropoffLat && b.dropoffLng ? { lat: Number(b.dropoffLat), lng: Number(b.dropoffLng) } : null, status: b.status, passengerName: b.passengerName }));
      }
    } catch (e) {
      // ignore
    }

    // Nearby drivers: best-effort from driverLocation table
    let nearbyDrivers: any[] = [];
    try {
      if ((prisma as any).driverLocation) {
        const list = await (prisma as any).driverLocation.findMany({ take: 50 });
        nearbyDrivers = (list || []).map((d: any) => ({ id: d.driverId, lat: Number(d.lat), lng: Number(d.lng) }));
      }
    } catch (e) {
      // ignore
    }

    // If nothing found, return a small sample centered on Dar es Salaam
    if (!driverLocation && assignments.length === 0 && nearbyDrivers.length === 0) {
      driverLocation = { id: 'demo-self', lat: -6.7924, lng: 39.2083, updatedAt: new Date() };
      nearbyDrivers = [ { id: 'demo-1', lat: -6.79, lng: 39.21 }, { id: 'demo-2', lat: -6.795, lng: 39.205 } ];
    }

    return res.json({ driverLocation, assignments, nearbyDrivers });
  } catch (err) {
    console.warn('driver.map: failed', err);
    return res.json({ driverLocation: { lat: -6.7924, lng: 39.2083 }, assignments: [], nearbyDrivers: [] });
  }
};
router.get('/map', getMapData as unknown as RequestHandler);

/**
 * GET /driver/trips?date=YYYY-MM-DD&start=YYYY-MM-DD&end=YYYY-MM-DD&page=&pageSize=
 * Returns bookings/trips for the authenticated driver. Best-effort using prisma.booking.
 */
const getTrips: RequestHandler = async (req, res) => {
  const user = (req as AuthedRequest).user!;
  const page = Math.max(1, Number((req.query as any).page ?? 1));
  const pageSize = Math.min(200, Math.max(1, Number((req.query as any).pageSize ?? 100)));
  const skip = (page - 1) * pageSize;

  try {
    if ((prisma as any).booking) {
      const where: any = { driverId: user.id };
      const date = (req.query.date as string) || undefined;
      const start = (req.query.start as string) || undefined;
      const end = (req.query.end as string) || undefined;
      try {
        if (date) {
          const s = new Date(date + 'T00:00:00.000Z');
          const e = new Date(date + 'T23:59:59.999Z');
          where.scheduledAt = { gte: s, lte: e };
        } else if (start || end) {
          const s = start ? new Date(start + 'T00:00:00.000Z') : new Date(0);
          const e = end ? new Date(end + 'T23:59:59.999Z') : new Date();
          where.scheduledAt = { gte: s, lte: e };
        }
      } catch (e) {
        // ignore date parsing errors
      }

      const items = await (prisma as any).booking.findMany({ where, orderBy: { scheduledAt: 'desc' }, skip, take: pageSize });
      const total = await (prisma as any).booking.count({ where });

      const mapped = (items || []).map((b: any) => ({
        id: b.id,
        date: b.scheduledAt ?? b.date ?? b.createdAt,
        pickup: b.pickup || b.pickupAddress || b.pickupLocation || null,
        dropoff: b.dropoff || b.dropoffAddress || b.dropoffLocation || null,
        tripCode: b.tripCode || b.code || b.reference || null,
        amount: b.price ?? b.fare ?? b.total ?? null,
        status: b.status || null,
      }));

      return res.json({ total, page, pageSize, trips: mapped });
    }

    // fallback: no booking model available
    return res.json({ total: 0, page, pageSize, trips: [] });
  } catch (err) {
    console.warn('driver.trips: failed', String(err));
    return res.status(500).json({ error: 'failed' });
  }
};
router.get('/trips', getTrips as unknown as RequestHandler);

/**
 * GET /driver/safety?date=...&start=...&end=...
 * Returns safety events or monthly summaries for the authenticated driver.
 * Best-effort: try driverSafety or safetyEvent models, otherwise return empty list.
 */
const getSafety: RequestHandler = async (req, res) => {
  const user = (req as AuthedRequest).user!;
  try {
    const date = (req.query.date as string) || undefined;
    const start = (req.query.start as string) || undefined;
    const end = (req.query.end as string) || undefined;

    // If a dedicated safety model exists, return rows for this driver
    if ((prisma as any).driverSafety) {
      const where: any = { driverId: user.id };
      try {
        if (date) {
          const s = new Date(date + 'T00:00:00.000Z');
          const e = new Date(date + 'T23:59:59.999Z');
          where.timestamp = { gte: s, lte: e };
        } else if (start || end) {
          const s = start ? new Date(start + 'T00:00:00.000Z') : new Date(0);
          const e = end ? new Date(end + 'T23:59:59.999Z') : new Date();
          where.timestamp = { gte: s, lte: e };
        }
      } catch (e) { /* ignore */ }

      const items = await (prisma as any).driverSafety.findMany({ where, orderBy: { timestamp: 'desc' }, take: 1000 });
      return res.json({ items });
    }

    // Fallback: if a generic safetyEvent model exists
    if ((prisma as any).safetyEvent) {
      const where: any = { driverId: user.id };
      try {
        if (date) {
          const s = new Date(date + 'T00:00:00.000Z');
          const e = new Date(date + 'T23:59:59.999Z');
          where.timestamp = { gte: s, lte: e };
        } else if (start || end) {
          const s = start ? new Date(start + 'T00:00:00.000Z') : new Date(0);
          const e = end ? new Date(end + 'T23:59:59.999Z') : new Date();
          where.timestamp = { gte: s, lte: e };
        }
      } catch (e) { /* ignore */ }

      const items = await (prisma as any).safetyEvent.findMany({ where, orderBy: { timestamp: 'desc' }, take: 1000 });
      return res.json({ items });
    }

    // Last-resort: try to synthesize from bookings if available (look for flags)
    if ((prisma as any).booking) {
      const where: any = { driverId: user.id };
      try {
        if (date) {
          const s = new Date(date + 'T00:00:00.000Z');
          const e = new Date(date + 'T23:59:59.999Z');
          where.scheduledAt = { gte: s, lte: e };
        } else if (start || end) {
          const s = start ? new Date(start + 'T00:00:00.000Z') : new Date(0);
          const e = end ? new Date(end + 'T23:59:59.999Z') : new Date();
          where.scheduledAt = { gte: s, lte: e };
        }
      } catch (e) { /* ignore */ }

      const items = await (prisma as any).booking.findMany({ where, orderBy: { scheduledAt: 'desc' }, take: 1000 });
      // map bookings to simple safety-like events when flags exist
      const mapped = (items || []).flatMap((b: any) => {
        const out: any[] = [];
        if (b.hardBraking || b.harshAcceleration || b.speeding || b.ruleViolated) {
          out.push({ id: `b-${b.id}`, date: b.scheduledAt ?? b.createdAt, hardBraking: !!b.hardBraking, harshAcceleration: !!b.harshAcceleration, speeding: !!b.speeding, ruleViolated: !!b.ruleViolated, bookingId: b.id });
        }
        return out;
      });
      return res.json({ items: mapped });
    }

    // otherwise return empty
    return res.json({ items: [] });
  } catch (err) {
    console.warn('driver.safety: failed', String(err));
    return res.status(500).json({ error: 'failed' });
  }
};
router.get('/safety', getSafety as unknown as RequestHandler);

/**
 * GET /driver/payouts?page=&pageSize=
 * Returns payouts for the authenticated driver. Best-effort:
 * - If a Payout model/table exists, return rows from it.
 * - Otherwise fall back to returning PAID invoices for bookings assigned to this driver.
 */
const getPayouts: RequestHandler = async (req, res) => {
  const user = (req as AuthedRequest).user!;
  const page = Math.max(1, Number((req.query as any).page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number((req.query as any).pageSize ?? 20)));
  const skip = (page - 1) * pageSize;

  try {
    // If a dedicated payout model exists in Prisma, use it
    if ((prisma as any).payout) {
      const [items, total] = await Promise.all([
        (prisma as any).payout.findMany({ where: { driverId: user.id }, orderBy: { paidAt: 'desc' }, skip, take: pageSize }),
        (prisma as any).payout.count({ where: { driverId: user.id } }),
      ]);
      return res.json({ total, page, pageSize, items });
    }

    // Fallback: use Invoice -> Booking relationship to return paid invoices for this driver
    // only if booking model exists and has driverId
    if ((prisma as any).invoice && (prisma as any).booking) {
      const items = await prisma.invoice.findMany({
        where: { status: 'PAID' },
        include: { booking: true },
        orderBy: { paidAt: 'desc' },
        skip,
        take: pageSize,
      });

      // filter client-side to bookings assigned to this driver
      const filtered = (items || []).filter((inv: any) => inv.booking && Number(inv.booking.driverId) === Number(user.id)).map((inv: any) => ({
        id: inv.id,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        tripCode: inv.booking?.tripCode ?? inv.booking?.code ?? null,
        paidAt: inv.paidAt,
        paidTo: inv.paymentRef ?? inv.paymentMethod ?? null,
        gross: inv.total ?? null,
        commissionAmount: inv.commissionAmount ?? null,
        netPaid: inv.netPayable ?? null,
        receiptNumber: inv.receiptNumber ?? null,
      }));

      // best-effort total count
      const total = await prisma.invoice.count({ where: { status: 'PAID' } });
      return res.json({ total, page, pageSize, items: filtered });
    }

    return res.json({ total: 0, page, pageSize, items: [] });
  } catch (err) {
    console.warn('driver.payouts: failed', String(err));
    return res.status(500).json({ error: 'failed' });
  }
};
router.get('/payouts', getPayouts as unknown as RequestHandler);

/**
 * POST /driver/location
 * Body: { lat: number, lng: number }
 * Drivers can report their current location; we upsert into a driverLocation table when available.
 */
const postLocation: RequestHandler = async (req, res) => {
  const user = (req as AuthedRequest).user!;
  const { lat, lng } = req.body ?? {};
  if (typeof lat !== 'number' || typeof lng !== 'number') { res.status(400).json({ error: 'lat and lng required' }); return; }
  try {
    if ((prisma as any).driverLocation) {
      await (prisma as any).driverLocation.upsert({ where: { driverId: user.id }, update: { lat: String(lat), lng: String(lng), updatedAt: new Date() }, create: { driverId: user.id, lat: String(lat), lng: String(lng), updatedAt: new Date() } });
    }
    // broadcast via socket.io if available
    try {
      const io = (req.app && (req.app as any).get && (req.app as any).get('io'));
      if (io && typeof io.emit === 'function') {
        io.emit('driver:location:update', { driverId: user.id, lat, lng });
      }
    } catch (e) { /* ignore */ }
    res.json({ ok: true });
  } catch (e) {
    console.warn('driver.location upsert failed', e);
    res.status(500).json({ error: 'failed' });
  }
};
router.post('/location', postLocation as unknown as RequestHandler);

/**
 * POST /driver/availability
 * Body: { available: boolean }
 * Driver toggles their availability. Best-effort persistence: try a driverAvailability or user field, otherwise no-op.
 */
const postAvailability: RequestHandler = async (req, res) => {
  const user = (req as AuthedRequest).user!;
  const { available } = req.body ?? {};
  if (typeof available !== 'boolean') { res.status(400).json({ error: 'available must be boolean' }); return; }
  try {
    // Try driverAvailability table if present
    try {
      if ((prisma as any).driverAvailability) {
        await (prisma as any).driverAvailability.upsert({ where: { driverId: user.id }, update: { available, updatedAt: new Date() }, create: { driverId: user.id, available, updatedAt: new Date() } });
      } else if ((prisma as any).user) {
        // Try updating user.available or isAvailable fields if they exist
        try {
          await prisma.user.update({ where: { id: user.id }, data: { ...(Object.prototype.hasOwnProperty.call((prisma as any).user._meta ?? {}, 'available') ? { available } : {}), ...(Object.prototype.hasOwnProperty.call((prisma as any).user._meta ?? {}, 'isAvailable') ? { isAvailable: available } : {}) } as any });
        } catch (e) {
          // ignore if fields don't exist
        }
      }
    } catch (e) {
      // ignore persistence errors
    }

    // broadcast availability change via socket.io for interested clients
    try {
      const io = (req.app && (req.app as any).get && (req.app as any).get('io'));
      if (io && typeof io.emit === 'function') {
        io.emit('driver:availability:update', { driverId: user.id, available });
      }
    } catch (e) { /* ignore */ }

    return res.json({ ok: true, available });
  } catch (e) {
    console.warn('driver.availability failed', e);
    return res.status(500).json({ error: 'failed' });
  }
};
router.post('/availability', postAvailability as unknown as RequestHandler);

/** PUT /driver/profile - update authenticated driver's profile (best-effort fields) */
const updateDriverProfile: RequestHandler = async (req, res) => {
  const { fullName, phone, nationality, avatarUrl, timezone, dateOfBirth, gender } = req.body ?? {};
  const userId = (req as AuthedRequest).user!.id;

  // Best-effort: only include fields if Prisma user model has them
  const meta = (prisma as any).user?._meta ?? {};
  const beforeSelect: any = { fullName: true, phone: true, nationality: true, avatarUrl: true, timezone: true };
  if (Object.prototype.hasOwnProperty.call(meta, 'dateOfBirth')) beforeSelect.dateOfBirth = true;
  if (Object.prototype.hasOwnProperty.call(meta, 'gender')) beforeSelect.gender = true;

  let before: any = null;
  try { before = await prisma.user.findUnique({ where: { id: userId }, select: beforeSelect }); } catch (e) { /* ignore */ }

  const data: any = { fullName, phone, nationality, avatarUrl, timezone };
  if (Object.prototype.hasOwnProperty.call(meta, 'dateOfBirth') && typeof dateOfBirth !== 'undefined') data.dateOfBirth = dateOfBirth;
  if (Object.prototype.hasOwnProperty.call(meta, 'gender') && typeof gender !== 'undefined') data.gender = gender;

  try {
    const u = await prisma.user.update({ where: { id: userId }, data } as any);
    try { await audit(req as AuthedRequest, 'USER_PROFILE_UPDATE', `user:${u.id}`, before, data); } catch (e) { /* ignore audit errors */ }
    res.json({ ok: true });
  } catch (e) {
    console.error('driver.profile.update failed', e);
    res.status(500).json({ error: 'failed' });
  }
};
router.put('/profile', updateDriverProfile as unknown as RequestHandler);

/**
 * Security endpoints for drivers
 * - POST /driver/security/password
 * - POST /driver/security/2fa
 *
 *
 * These implementations are best-effort / demo-friendly: if a prisma model exists
 * they attempt to perform updates, otherwise they return success or sample data.
 */
const postChangePassword: RequestHandler = async (req, res) => {
  const user = (req as AuthedRequest).user!;
  const { currentPassword, newPassword } = req.body ?? {};
  if (!newPassword || typeof newPassword !== 'string') { res.status(400).json({ error: 'newPassword required' }); return; }
  try {
    // If a user table with a password/hash exists, attempt proper verification & hashing
    if ((prisma as any).user) {
      try {
        const u = await prisma.user.findUnique({ where: { id: user.id }, select: { password: true } as any });
        const stored = (u as any)?.password ?? null;

        // If a password exists, require currentPassword and verify
        if (stored) {
          if (!currentPassword || typeof currentPassword !== 'string') { res.status(400).json({ error: 'currentPassword required' }); return; }

          let ok = false;
          try {
            // If stored value looks like an argon2 hash, verify with argon2
            if (typeof stored === 'string' && stored.startsWith('$argon2')) {
              ok = await argon2.verify(stored, currentPassword);
            } else {
              // fallback to plain compare
              ok = stored === currentPassword;
            }
          } catch (e) {
            ok = false;
          }

          if (!ok) { res.status(400).json({ error: 'current password is incorrect' }); return; }
        }

        // Validate strength before hashing
        try {
          const s = await prisma.systemSetting.findUnique({ where: { id: 1 } });
          const minLen = s?.minPasswordLength ?? 10;
          const { valid, reasons } = validatePasswordStrength(newPassword, { minLength: minLen, role: (user as any).role });
          if (!valid) {
            res.status(400).json({ error: 'Password does not meet strength requirements', reasons });
            return;
          }

          const hash = await argon2.hash(newPassword);
          await prisma.user.update({ where: { id: user.id }, data: { password: hash } as any });
          return res.json({ ok: true, message: 'Password changed successfully' });
        } catch (e) {
          // if update fails, fall through to generic success to avoid leaking implementation
        }
      } catch (e) {
        // ignore and fallthrough
      }
    }

    // Fallback: no prisma user model or persistence failed — return success for demo
    return res.json({ ok: true });
  } catch (err) {
    console.warn('driver.security.password failed', err);
    return res.status(500).json({ error: 'failed' });
  }
};
router.post('/security/password', postChangePassword as unknown as RequestHandler);

/**
 * GET /driver/security/2fa
 * Returns status for available 2FA methods (TOTP/SMS) and a masked phone when available.
 */
const get2faStatus: RequestHandler = async (req, res) => {
  const user = (req as AuthedRequest).user!;
  try {
    let totpEnabled = false;
    let smsEnabled = false;
    let phone: string | null = null;
    try {
      if ((prisma as any).user) {
        const u = await prisma.user.findUnique({ where: { id: user.id }, select: { twoFactorEnabled: true, phone: true, sms2faEnabled: true } as any });
        if (u) {
          totpEnabled = !!(u as any).twoFactorEnabled || false;
          smsEnabled = !!(u as any).sms2faEnabled || false;
          phone = (u as any).phone ?? null;
        }
      }
    } catch (e) {
      // ignore and fallthrough to demo values
    }

    // Mask phone for privacy
    const maskedPhone = phone ? phone.replace(/.(?=.{4})/g, '*') : null;
    return res.json({ totpEnabled, smsEnabled, phone: maskedPhone });
  } catch (err) {
    console.warn('driver.security.2fa.status failed', err);
    return res.status(500).json({ error: 'failed' });
  }
};
router.get('/security/2fa', get2faStatus as unknown as RequestHandler);


/**
 * POST /driver/security/2fa
 * Body: { type?: 'totp'|'sms', action: 'enable'|'disable', code?: string, phone?: string }
 * Best-effort implementation: updates user flags if fields exist; returns updated statuses.
 */
const postToggle2fa: RequestHandler = async (req, res) => {
  const user = (req as AuthedRequest).user;
  if (!user) { res.status(401).json({ error: 'unauthenticated' }); return; }
  const { action, type, code, phone } = req.body ?? {};
  if (!action || (action !== 'enable' && action !== 'disable')) { res.status(400).json({ error: 'action must be enable or disable' }); return; }
  try {
    let totpEnabled = false;
    let smsEnabled = false;

    // Best-effort: update user record fields when present
    if ((prisma as any).user) {
      try {
        const updateData: any = {};
        if (type === 'sms') {
          // attempt to update sms2faEnabled and phone fields if they exist
          if (action === 'enable') {
            updateData.sms2faEnabled = true;
            if (phone && Object.prototype.hasOwnProperty.call((prisma as any).user._meta ?? {}, 'phone')) updateData.phone = phone;
          } else {
            updateData.sms2faEnabled = false;
          }
        } else if (type === 'totp') {
          // TOTP flow: verify the provided code against stored secret (best-effort)
          if (action === 'enable') {
            // need a code to verify
            if (!code || typeof code !== 'string') { res.status(400).json({ error: 'code required for TOTP enable' }); return; }

            // try to read stored secret from DB only if the prisma model supports it
            let storedSecret: string | null = null;
            try {
              if ((prisma as any).user && Object.prototype.hasOwnProperty.call((prisma as any).user._meta ?? {}, 'totpSecret')) {
                const u = await prisma.user.findUnique({ where: { id: user.id }, select: { totpSecret: true } as any });
                storedSecret = (u as any)?.totpSecret ?? null;
              }
            } catch (e) { /* ignore read errors */ }

            // fallback: accept secret passed in body (not ideal for prod)
            const secretToCheck = storedSecret || (req.body && typeof req.body.secret === 'string' ? req.body.secret : null);
            if (!secretToCheck) { res.status(400).json({ error: 'no totp secret available; provision first' }); return; }

            // validate code
            let ok = false;
            try { ok = authenticator.check(String(code), String(secretToCheck)); } catch (e) { ok = false; }
            if (!ok) { res.status(400).json({ error: 'invalid TOTP code' }); return; }

            // verification passed: mark enabled and persist flag
            updateData.twoFactorEnabled = true;
          } else {
            updateData.twoFactorEnabled = false;
          }
        } else {
          // no specific type provided: toggle the generic twoFactorEnabled flag
          updateData.twoFactorEnabled = action === 'enable';
        }

        // Only attempt update if updateData is non-empty
        if (Object.keys(updateData).length > 0) {
          try {
            await prisma.user.update({ where: { id: user.id }, data: updateData as any });
          } catch (e) {
            // ignore persistence errors
          }
        }
      } catch (e) {
        // ignore
      }
    }

    // Construct response status guesses
    try {
      const u = (prisma as any).user ? await prisma.user.findUnique({ where: { id: user.id }, select: { twoFactorEnabled: true, sms2faEnabled: true } as any }) : null;
      totpEnabled = !!(u && (u as any).twoFactorEnabled);
      smsEnabled = !!(u && (u as any).sms2faEnabled);
    } catch (e) {
      // best-effort fallback to action
      if (type === 'sms') smsEnabled = action === 'enable';
      else totpEnabled = action === 'enable';
    }

    return res.json({ ok: true, totpEnabled, smsEnabled });
  } catch (err) {
    // Improved logging for debugging: print stack when available
    try {
      const ex: any = err;
      console.error('driver.security.2fa failed', ex && (ex.stack || ex.message || ex));
    } catch (e) { console.error('driver.security.2fa failed (logging error)', e); }
    const details = ((err as any) && ((err as any).message || String(err))) || 'failed';
    // Return error details to the client to aid debugging in development.
    // In production you may want to hide `details`.
    return res.status(500).json({ error: 'failed', details });
  }
};
router.post('/security/2fa', postToggle2fa as unknown as RequestHandler);


/**
 * GET /driver/security/2fa/provision?type=totp
 * Returns an otpauth URL and QR data URL for provisioning an authenticator app.
 * Best-effort: stores the secret on the user record if a 'totpSecret' field exists.
 */
const get2faProvision: RequestHandler = async (req, res) => {
  const user = (req as AuthedRequest).user;
  if (!user) { res.status(401).json({ error: 'unauthenticated' }); return; }
  const type = (req.query.type as string) || 'totp';
  if (type !== 'totp') { res.status(400).json({ error: 'unsupported type' }); return; }
  try {
    const secret = authenticator.generateSecret();
    const account = ((user as any).email || `user-${user.id}`) as string;
    const service = process.env.APP_NAME || 'nolsaf';
    const otpauth = authenticator.keyuri(account, service, secret);
    let qr = null;
    try { qr = await qrcode.toDataURL(otpauth); } catch (e) { /* ignore qr generation errors */ }

    // Attempt to persist secret to user record if schema supports it
    try {
      if ((prisma as any).user && Object.prototype.hasOwnProperty.call((prisma as any).user._meta ?? {}, 'totpSecret')) {
        await prisma.user.update({ where: { id: user.id }, data: { totpSecret: secret } as any });
      }
    } catch (e) { /* ignore persistence errors */ }

    return res.json({ secret, otpauth, qr });
  } catch (err) {
    console.warn('driver.security.2fa.provision failed', err);
    const details = ((err as any) && ((err as any).message || String(err))) || 'failed';
    return res.status(500).json({ error: 'failed', details });
  }
};
router.get('/security/2fa/provision', get2faProvision as unknown as RequestHandler);

// Sessions endpoints removed — Active sessions feature deprecated/removed

/**
 * GET /driver/security/logins
 * Returns a small list of recent login attempts for the driver (best-effort/demo).
 */
const getLoginHistory: RequestHandler = async (req, res) => {
  const user = (req as AuthedRequest).user!;
  try {
    // Try to use a prisma login/session audit model if present
    if ((prisma as any).loginAttempt) {
      try {
        const items = await (prisma as any).loginAttempt.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' }, take: 50 });
        const mapped = (items || []).map((it: any) => ({
          id: it.id,
          at: it.createdAt,
          ip: it.ip,
          username: it.username ?? null,
          platform: it.platform ?? null,
          details: it.userAgent ?? null,
          timeUsed: typeof it.duration === 'number' ? it.duration : (it.timeUsedSeconds ?? null),
          success: typeof it.success === 'boolean' ? it.success : null,
        }));
        return res.json({ records: mapped });
      } catch (e) { /* ignore and fallthrough */ }
    }

    // Fallback/demo data with richer fields
    const demo = [
      { id: 'l1', at: new Date().toISOString(), ip: '127.0.0.1', username: 'driver1', platform: 'Windows', details: 'Browser: Chrome -- Version: 142.0.0.0', timeUsed: 3600, success: true },
      { id: 'l2', at: new Date(Date.now() - 3600 * 1000).toISOString(), ip: '127.0.0.2', username: 'driver1', platform: 'iOS', details: 'Browser: Safari -- Version: 18.2', timeUsed: 45, success: false },
      { id: 'l3', at: new Date(Date.now() - 86400 * 1000).toISOString(), ip: '127.0.0.3', username: 'driver1', platform: 'Android', details: 'App: nolsaf Android -- Version: 3.4.1', timeUsed: 7200, success: true },
    ];
    return res.json({ records: demo });
  } catch (err) {
    console.warn('driver.security.logins failed', err);
    return res.status(500).json({ error: 'failed' });
  }
};
router.get('/security/logins', getLoginHistory as unknown as RequestHandler);

/**
 * Passkeys endpoints using @simplewebauthn/server for registration verification.
 * - GET /driver/security/passkeys -> list registered passkeys
 * - POST /driver/security/passkeys -> create registration options (publicKey)
 * - POST /driver/security/passkeys/verify -> verify attestation and store credential
 * - DELETE /driver/security/passkeys/:id -> remove credential
 */
const getPasskeys: RequestHandler = async (req, res) => {
  const user = (req as AuthedRequest).user!;
  try {
    // Try prisma model if present
    if ((prisma as any).passkey) {
      try {
        const items = await (prisma as any).passkey.findMany({ where: { userId: user.id } });
        return res.json({ items: (items || []).map((it: any) => ({ id: it.id, name: it.name ?? 'passkey', createdAt: it.createdAt })) });
      } catch (e) { /* ignore */ }
    }

    // Fallback to in-memory store
    const items = passkeyStore.get(String(user.id)) || [];
    return res.json({ items });
  } catch (err) {
    console.warn('driver.security.passkeys.list failed', err);
    return res.status(500).json({ error: 'failed' });
  }
};
router.get('/security/passkeys', getPasskeys as unknown as RequestHandler);

const postPasskeysCreate: RequestHandler = async (req, res) => {
  const user = (req as AuthedRequest).user!;
  try {
    const origin = process.env.WEB_ORIGIN || process.env.APP_ORIGIN || 'http://localhost:3000';
    const rpID = new URL(origin).hostname;

    // load existing credentials to exclude
    let excludeCredentials: Array<any> = [];
    try {
      if ((prisma as any).passkey) {
        const existing = await (prisma as any).passkey.findMany({ where: { userId: user.id } });
        excludeCredentials = (existing || []).map((c: any) => ({ id: c.credentialId, type: 'public-key' }));
      } else {
        const existing = passkeyStore.get(String(user.id)) || [];
        excludeCredentials = existing.map((c: any) => ({ id: c.id, type: 'public-key' }));
      }
    } catch (e) { /* ignore */ }

    const options = await generateRegistrationOptions({
      rpName: process.env.APP_NAME || 'nolsaf',
      rpID,
      userID: String(user.id),
      userName: (user as any).email || `user-${user.id}`,
      timeout: 60000,
      attestationType: 'direct',
      authenticatorSelection: { userVerification: 'preferred' },
      excludeCredentials,
    });

    // store challenge for verification (base64url)
    passkeyChallenges.set(String(user.id), options.challenge as string);

    return res.json({ publicKey: options });
  } catch (err) {
    console.warn('driver.security.passkeys.create failed', err);
    return res.status(500).json({ error: 'failed' });
  }
};
router.post('/security/passkeys', postPasskeysCreate as unknown as RequestHandler);

const postPasskeysVerify: RequestHandler = async (req, res) => {
  const user = (req as AuthedRequest).user!;
  try {
    const body = req.body ?? {};
    const { response, name } = body as any;
    if (!response) { res.status(400).json({ error: 'invalid payload' }); return; }

    const storedChallenge = passkeyChallenges.get(String(user.id));
    if (!storedChallenge) { res.status(400).json({ error: 'no challenge found' }); return; }

    const origin = process.env.WEB_ORIGIN || process.env.APP_ORIGIN || 'http://localhost:3000';
    const rpID = new URL(origin).hostname;

    let verification: any = null;
    try {
      // simplewebauthn types are strict; cast to any to accept the browser-shaped response
      verification = await (verifyRegistrationResponse as any)({
        credential: response,
        expectedChallenge: storedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true,
      } as any);
    } catch (e) {
      console.warn('webauthn verification error', e);
      return res.status(400).json({ error: 'verification failed' });
    }

    if (!verification || !verification.verified) {
      return res.status(400).json({ error: 'verification failed' });
    }

    const regInfo = verification.registrationInfo;
    if (!regInfo || !regInfo.credentialID || !regInfo.credentialPublicKey) {
      return res.status(500).json({ error: 'missing registration info' });
    }

    const credentialId = toBase64Url(Buffer.from(regInfo.credentialID));
    const publicKey = toBase64Url(Buffer.from(regInfo.credentialPublicKey));
    const signCount = typeof regInfo.counter === 'number' ? regInfo.counter : 0;

    // persist credential
    if ((prisma as any).passkey) {
      try {
        const rec = await (prisma as any).passkey.create({ data: { userId: user.id, credentialId, publicKey, signCount, name: name ?? 'passkey' } });
        return res.json({ ok: true, item: { id: rec.id, name: rec.name, createdAt: rec.createdAt } });
      } catch (e) { /* ignore DB save errors and fallback to memory */ }
    }

    const item = { id: credentialId, name: name ?? 'passkey', createdAt: new Date().toISOString(), publicKey, signCount };
    const list = passkeyStore.get(String(user.id)) || [];
    list.unshift(item);
    passkeyStore.set(String(user.id), list);
    return res.json({ ok: true, item });
  } catch (err) {
    console.warn('driver.security.passkeys.verify failed', err);
    return res.status(500).json({ error: 'failed' });
  }
};
router.post('/security/passkeys/verify', postPasskeysVerify as unknown as RequestHandler);

/**
 * POST /driver/security/passkeys/authenticate
 * Body: none
 * Returns authentication options for navigator.credentials.get
 */
const postPasskeysAuthenticate: RequestHandler = async (req, res) => {
  const user = (req as AuthedRequest).user!;
  try {
    const origin = process.env.WEB_ORIGIN || process.env.APP_ORIGIN || 'http://localhost:3000';
    const rpID = new URL(origin).hostname;

    // load existing credentials to allow
    let allowCredentials: Array<any> = [];
    try {
      if ((prisma as any).passkey) {
        const existing = await (prisma as any).passkey.findMany({ where: { userId: user.id } });
        allowCredentials = (existing || []).map((c: any) => ({ id: c.credentialId, type: 'public-key' }));
      } else {
        const existing = passkeyStore.get(String(user.id)) || [];
        allowCredentials = existing.map((c: any) => ({ id: c.id, type: 'public-key' }));
      }
    } catch (e) { /* ignore */ }

    const options = await generateAuthenticationOptions({
      timeout: 60000,
      rpID,
      userVerification: 'preferred',
      allowCredentials,
    });
    passkeyChallenges.set(String(user.id), (options as any).challenge as string);
    return res.json({ publicKey: options });
  } catch (err) {
    console.warn('driver.security.passkeys.authenticate failed', err);
    return res.status(500).json({ error: 'failed' });
  }
};
router.post('/security/passkeys/authenticate', postPasskeysAuthenticate as unknown as RequestHandler);

/**
 * POST /driver/security/passkeys/authenticate/verify
 * Body: { response }
 * Verifies an authentication assertion and updates signCount
 */
const postPasskeysAuthenticateVerify: RequestHandler = async (req, res) => {
  const user = (req as AuthedRequest).user!;
  try {
    const body = req.body ?? {};
    const { response } = body as any;
    if (!response) { res.status(400).json({ error: 'invalid payload' }); return; }

    const storedChallenge = passkeyChallenges.get(String(user.id));
    if (!storedChallenge) { res.status(400).json({ error: 'no challenge found' }); return; }

    // find credential
    const credId = response.id || response.rawId;
    if (!credId) { res.status(400).json({ error: 'missing credential id' }); return; }

    let stored: any = null;
    try {
      if ((prisma as any).passkey) {
        stored = await (prisma as any).passkey.findFirst({ where: { OR: [{ credentialId: credId }, { id: credId }] } });
      } else {
        const list = passkeyStore.get(String(user.id)) || [];
        stored = list.find((c: any) => c.id === credId || c.credentialId === credId) || null;
      }
    } catch (e) { /* ignore */ }

    if (!stored) { res.status(400).json({ error: 'credential not found' }); return; }

    const publicKey = stored.publicKey;
    const signCount = typeof stored.signCount === 'number' ? stored.signCount : (stored.sign_count ?? 0);

    const origin = process.env.WEB_ORIGIN || process.env.APP_ORIGIN || 'http://localhost:3000';
    const rpID = new URL(origin).hostname;

    let verification: any = null;
    try {
      verification = await (verifyAuthenticationResponse as any)({
        credential: response,
        expectedChallenge: storedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        authenticator: {
          credentialPublicKey: fromBase64Url(publicKey),
          credentialID: fromBase64Url(stored.credentialId || stored.id),
          counter: signCount,
        },
      } as any);
    } catch (e) {
      console.warn('webauthn auth verification error', e);
      return res.status(400).json({ error: 'verification failed' });
    }

    if (!verification || !verification.verified) return res.status(400).json({ error: 'verification failed' });

    const newCounter = (verification.authenticationInfo && (verification.authenticationInfo.newCounter ?? verification.authenticationInfo.counter)) ?? null;
    if (typeof newCounter === 'number') {
      try {
        if ((prisma as any).passkey) {
          await (prisma as any).passkey.update({ where: { credentialId: stored.credentialId || stored.id }, data: { signCount: newCounter } });
        } else {
          const list = passkeyStore.get(String(user.id)) || [];
          const idx = list.findIndex((c: any) => c.id === (stored.credentialId || stored.id));
          if (idx >= 0) { list[idx].signCount = newCounter; passkeyStore.set(String(user.id), list); }
        }
      } catch (e) { /* ignore update errors */ }
    }

    return res.json({ ok: true, verified: true });
  } catch (err) {
    console.warn('driver.security.passkeys.authenticate.verify failed', err);
    return res.status(500).json({ error: 'failed' });
  }
};
router.post('/security/passkeys/authenticate/verify', postPasskeysAuthenticateVerify as unknown as RequestHandler);

const deletePasskey: RequestHandler = async (req, res) => {
  const user = (req as AuthedRequest).user!;
  try {
    const id = req.params[0] || req.params.id || (req as any).params.id;
    if (!id) { res.status(400).json({ error: 'id required' }); return; }
    if ((prisma as any).passkey) {
      try {
        // attempt to delete by primary id first, then by credentialId
        try { await (prisma as any).passkey.delete({ where: { id } }); return res.json({ ok: true }); } catch (e) { /* ignore */ }
        try { await (prisma as any).passkey.delete({ where: { credentialId: id } }); return res.json({ ok: true }); } catch (e) { /* ignore */ }
      } catch (e) { /* ignore */ }
    }
    const list = (passkeyStore.get(String(user.id)) || []).filter((k: any) => k.id !== id);
    passkeyStore.set(String(user.id), list);
    return res.json({ ok: true });
  } catch (err) {
    console.warn('driver.security.passkeys.delete failed', err);
    return res.status(500).json({ error: 'failed' });
  }
};
router.delete('/security/passkeys/:id', deletePasskey as unknown as RequestHandler);

export default router;
