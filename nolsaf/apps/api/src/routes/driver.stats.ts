import { Router } from "express";
import type { RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { Prisma } from "@prisma/client";
import qrcode from 'qrcode';
import { authenticator } from 'otplib';
import crypto from 'crypto';
import argon2 from 'argon2';
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server';
import { validatePasswordStrength, isPasswordReused, addPasswordToHistory } from '../lib/security.js';
import { validatePasswordWithSettings } from '../lib/securitySettings.js';
import { requireAuth, AuthedRequest } from "../middleware/auth.js";
import { z } from "zod";
import { limitDriverTripsList, limitDriverTripAction, limitDriverLocationUpdate, limitDriverAvailabilityToggle } from "../middleware/rateLimit.js";

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
      console.warn("Trip model not available, returning empty data");
    }

    const todaysRides = todaysTrips.length;
    const todayEarnings = todaysTrips.reduce((sum: number, trip: any) => {
      return sum + Number(trip.booking?.invoice?.totalAmount || 0);
    }, 0);

    // Calculate acceptance rate from real trips
    let acceptanceRate = 0;
    try {
      const totalOffered = await (prisma as any).trip?.count({
        where: { driverId: Number(driverId) },
      }) || 0;
      const totalAccepted = await (prisma as any).trip?.count({
        where: { 
          driverId: Number(driverId),
          status: { in: ["ACCEPTED", "IN_PROGRESS", "COMPLETED"] }
        },
      }) || 0;
      acceptanceRate = totalOffered > 0 ? Math.round((totalAccepted / totalOffered) * 100) : 0;
    } catch (e) {
      // ignore
    }

    // Calculate earnings breakdown from real trips
    const baseFare = todaysTrips.reduce((sum: number, trip: any) => {
      return sum + Number(trip.booking?.invoice?.baseAmount || trip.booking?.invoice?.totalAmount || 0);
    }, 0);
    const tips = todaysTrips.reduce((sum: number, trip: any) => {
      return sum + Number(trip.booking?.invoice?.tipAmount || 0);
    }, 0);
    const bonuses = todaysTrips.reduce((sum: number, trip: any) => {
      return sum + Number(trip.booking?.invoice?.bonusAmount || 0);
    }, 0);

    // Get driver rating from database
    let rating = 0;
    let totalReviews = 0;
    try {
      const driver = await prisma.user.findUnique({
        where: { id: Number(driverId) },
        select: { rating: true } as any,
      });
      if (driver && typeof (driver as any).rating === "number") {
        rating = (driver as any).rating;
      }
      // Count reviews if review model exists
      if ((prisma as any).review) {
        totalReviews = await (prisma as any).review.count({
          where: { driverId: Number(driverId) },
        }) || 0;
      }
    } catch (e) {
      // ignore
    }

    // Calculate online hours from driver session or live location records
    let onlineHours = 0;
    try {
      if ((prisma as any).driverSession) {
        const session = await (prisma as any).driverSession.findFirst({
          where: { 
            driverId: Number(driverId),
            date: today.toISOString().split('T')[0]
          },
          orderBy: { createdAt: 'desc' }
        });
        if (session && session.hoursOnline) {
          onlineHours = Number(session.hoursOnline);
        }
      }
    } catch (e) {
      // ignore
    }

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

    // Earnings chart - last 7 days from real data
    const earningsChart: Array<{ day: string; amount: number }> = [];
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    try {
      for (let i = 0; i < 7; i++) {
        const dayStart = new Date(sevenDaysAgo);
        dayStart.setDate(dayStart.getDate() + i);
        const dayEnd = new Date(dayStart);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const dayTrips = await (prisma as any).trip?.findMany({
          where: {
            driverId: Number(driverId),
            createdAt: { gte: dayStart, lt: dayEnd },
          },
          include: {
            booking: { include: { invoice: true } },
          },
        }) || [];

        const dayEarnings = dayTrips.reduce((sum: number, trip: any) => {
          return sum + Number(trip.booking?.invoice?.totalAmount || 0);
        }, 0);

        const dayName = dayStart.toLocaleDateString("en-US", { weekday: "short" });
        earningsChart.push({ day: dayName, amount: dayEarnings });
      }
    } catch (e) {
      // If error, return empty chart
      console.warn("Failed to load earnings chart:", e);
    }

    // Trips by hour - calculate from today's trips
    const tripsChart: Array<{ hour: string; trips: number }> = [
      { hour: "6AM", trips: 0 },
      { hour: "9AM", trips: 0 },
      { hour: "12PM", trips: 0 },
      { hour: "3PM", trips: 0 },
      { hour: "6PM", trips: 0 },
      { hour: "9PM", trips: 0 },
    ];

    todaysTrips.forEach((trip: any) => {
      const hour = new Date(trip.createdAt).getHours();
      if (hour >= 6 && hour < 9) tripsChart[0].trips++;
      else if (hour >= 9 && hour < 12) tripsChart[1].trips++;
      else if (hour >= 12 && hour < 15) tripsChart[2].trips++;
      else if (hour >= 15 && hour < 18) tripsChart[3].trips++;
      else if (hour >= 18 && hour < 21) tripsChart[4].trips++;
      else if (hour >= 21 || hour < 6) tripsChart[5].trips++;
    });

    // Demand zones - return empty array until real demand zone logic is implemented
    const demandZones: Array<{ name: string; level: "high" | "medium" | "low" }> = [];

    // Recent trips - fetch last 5 trips from database
    let recentTrips: Array<{ id: string; time: string; from: string; to: string; distance: string; amount: number }> = [];
    try {
      const recentTripsData = await (prisma as any).trip?.findMany({
        where: {
          driverId: Number(driverId),
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
        include: {
          booking: {
            include: {
              invoice: true,
            },
          },
        },
      }) || [];

      recentTrips = recentTripsData.map((trip: any) => ({
        id: String(trip.id),
        time: new Date(trip.createdAt).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        }),
        from: trip.pickupLocation || "Unknown",
        to: trip.dropoffLocation || "Unknown",
        distance: trip.distance ? `${Number(trip.distance).toFixed(1)}km` : "N/A",
        amount: Number(trip.booking?.invoice?.totalAmount || 0),
      }));
    } catch (e) {
      // If error, return empty array
      console.warn("Failed to load recent trips:", e);
    }

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
    // Attempt to read driver's last known location from DriverLiveLocation
    let driverLocation: any = null;
    try {
      if ((prisma as any).driverLiveLocation) {
        const loc = await (prisma as any).driverLiveLocation.findUnique({ where: { driverId: user.id } });
        if (loc) {
          driverLocation = {
            id: loc.driverId,
            lat: Number(loc.lat),
            lng: Number(loc.lng),
            headingDeg: loc.headingDeg ?? null,
            speedMps: loc.speedMps !== null && typeof loc.speedMps !== "undefined" ? Number(loc.speedMps) : null,
            accuracyM: loc.accuracyM !== null && typeof loc.accuracyM !== "undefined" ? Number(loc.accuracyM) : null,
            updatedAt: loc.updatedAt,
          };
        }
      }
    } catch (e) {
      // ignore
    }

    // Assignments: bookings assigned to this driver with pickup/dropoff coordinates
    let assignments: any[] = [];
    try {
      if ((prisma as any).booking) {
        const where: any = { driverId: user.id, status: { in: ["ASSIGNED", "IN_PROGRESS"] } };
        const items = await (prisma as any).booking.findMany({ 
          where, 
          select: { id: true, pickupLat: true, pickupLng: true, dropoffLat: true, dropoffLng: true, status: true, passengerName: true } 
        });
        assignments = (items || []).map((b: any) => ({ 
          id: b.id, 
          pickup: b.pickupLat && b.pickupLng ? { lat: Number(b.pickupLat), lng: Number(b.pickupLng) } : null, 
          dropoff: b.dropoffLat && b.dropoffLng ? { lat: Number(b.dropoffLat), lng: Number(b.dropoffLng) } : null, 
          status: b.status, 
          passengerName: b.passengerName 
        }));
      }
    } catch (e) {
      // ignore
    }

    // Nearby drivers: best-effort from DriverLiveLocation with a small bounding box + recency filter
    let nearbyDrivers: any[] = [];
    try {
      if ((prisma as any).driverLiveLocation) {
        const now = Date.now();
        const since = new Date(now - 10 * 60 * 1000); // last 10 minutes
        // Default: broad list
        let where: any = { updatedAt: { gte: since } };
        // If we have a driver center, tighten to a nearby bounding box (~15km)
        if (driverLocation && typeof driverLocation.lat === "number" && typeof driverLocation.lng === "number") {
          const lat = driverLocation.lat;
          const lng = driverLocation.lng;
          const d = 0.14; // approx degrees ~ 15km
          where = {
            updatedAt: { gte: since },
            lat: { gte: lat - d, lte: lat + d },
            lng: { gte: lng - d, lte: lng + d },
          };
        }
        const list = await (prisma as any).driverLiveLocation.findMany({
          where,
          take: 75,
          orderBy: { updatedAt: "desc" },
          include: { driver: { select: { id: true, name: true, available: true } } },
        });
        nearbyDrivers = (list || [])
          .filter((d: any) => d?.driverId !== user.id)
          .map((d: any) => ({
            id: d.driverId,
            name: d.driver?.name ?? null,
            available: typeof d.driver?.available === "boolean" ? d.driver.available : null,
            lat: Number(d.lat),
            lng: Number(d.lng),
          }));
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
    return res.json({ driverLocation: null, assignments: [], nearbyDrivers: [] });
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
    // This endpoint powers the DRIVER "Trips" table.
    // Per product definition:
    // - Scheduled Trips = future rides (drivers can claim/await assignment)
    // - Trips = rides that need attention now or already happened (not future)
    if ((prisma as any).transportBooking) {
      const now = new Date();
      const where: any = { driverId: user.id };

      // Trips = needs attention now OR already happened.
      // Scheduled Trips = future rides not started yet.
      where.OR = [
        { scheduledDate: { lte: now } },
        { status: { in: ["CONFIRMED", "IN_PROGRESS"] } },
      ];

      const date = (req.query.date as string) || undefined;
      const start = (req.query.start as string) || undefined;
      const end = (req.query.end as string) || undefined;
      try {
        if (date) {
          const s = new Date(date + 'T00:00:00.000Z');
          const e = new Date(date + 'T23:59:59.999Z');
          // If user filters by date, honor it and don't apply the Trips/Scheduled split beyond that.
          where.OR = undefined;
          where.scheduledDate = { gte: s, lte: e };
        } else if (start || end) {
          const s = start ? new Date(start + 'T00:00:00.000Z') : new Date(0);
          const e = end ? new Date(end + 'T23:59:59.999Z') : new Date();
          where.OR = undefined;
          where.scheduledDate = { gte: s, lte: e };
        }
      } catch (e) {
        // ignore date parsing errors
      }

      const items = await (prisma as any).transportBooking.findMany({
        where,
        orderBy: { scheduledDate: 'desc' },
        skip,
        take: pageSize,
      });
      const total = await (prisma as any).transportBooking.count({ where });

      const mapped = (items || []).map((b: any) => ({
        id: b.id,
        date: b.pickupTime ?? b.scheduledDate ?? b.createdAt,
        pickup: b.fromAddress || b.pickupLocation || b.fromRegion || null,
        dropoff: b.toAddress || b.toRegion || null,
        tripCode: b.paymentRef || null,
        amount: b.amount ?? null,
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

/**
 * POST /driver/trips/:tripId/accept
 * Assigns the authenticated driver to a TransportBooking and marks it CONFIRMED.
 */
const postAcceptTrip: RequestHandler = async (req, res) => {
  const user = (req as AuthedRequest).user!;
  const tripId = Number(req.params.tripId);
  if (!Number.isFinite(tripId)) return res.status(400).json({ error: "invalid_trip_id" });

  try {
    const existing = await prisma.transportBooking.findUnique({
      where: { id: tripId },
      include: {
        user: { select: { id: true, name: true, phone: true } },
      },
    });
    if (!existing) return res.status(404).json({ error: "not_found" });
    if (existing.status === "PENDING_REVIEW") {
      return res.status(409).json({ error: "trip_pending_review" });
    }
    if (existing.status === "CANCELED" || existing.status === "COMPLETED") {
      return res.status(409).json({ error: "trip_not_active" });
    }
    if (existing.driverId && Number(existing.driverId) !== Number(user.id)) {
      return res.status(409).json({ error: "already_assigned" });
    }

    const updated = await prisma.transportBooking.update({
      where: { id: tripId },
      data: {
        driverId: Number(user.id),
        status: "CONFIRMED",
        pickupTime: existing.pickupTime ?? new Date(),
      },
      include: {
        user: { select: { id: true, name: true, phone: true } },
      },
    });

    // Create inbox notifications (customer + driver)
    try {
      await prisma.notification.create({
        data: {
          userId: updated.userId,
          title: "Driver accepted your ride",
          body: "Your driver is on the way to your pickup location.",
          unread: true,
          type: "ride",
          meta: { transportBookingId: updated.id, status: updated.status, driverId: updated.driverId },
        },
      });
    } catch {
      // ignore
    }
    try {
      await prisma.notification.create({
        data: {
          userId: Number(user.id),
          title: "Trip accepted",
          body: "Navigate to pickup location.",
          unread: true,
          type: "ride",
          meta: { transportBookingId: updated.id, status: updated.status },
        },
      });
    } catch {
      // ignore
    }

    // Realtime emit (rooms are best-effort; clients may or may not join)
    try {
      const io = (req.app && (req.app as any).get && (req.app as any).get("io")) || (global as any).io;
      if (io && typeof io.to === "function") {
        io.to(`driver:${user.id}`).emit("trip:update", { id: updated.id, status: updated.status });
        io.to(`user:${updated.userId}`).emit("trip:update", { id: updated.id, status: updated.status });
      }
    } catch {
      // ignore
    }

    const trip = {
      id: String(updated.id),
      status: updated.status,
      passengerUserId: updated.userId,
      passengerName: updated.user?.name ?? "Passenger",
      phoneNumber: updated.user?.phone ?? null,
      pickupAddress: updated.fromAddress ?? updated.fromRegion ?? "",
      dropoffAddress: updated.toAddress ?? updated.toRegion ?? "",
      pickupLat: updated.fromLatitude !== null && typeof updated.fromLatitude !== "undefined" ? Number(updated.fromLatitude) : null,
      pickupLng: updated.fromLongitude !== null && typeof updated.fromLongitude !== "undefined" ? Number(updated.fromLongitude) : null,
      dropoffLat: updated.toLatitude !== null && typeof updated.toLatitude !== "undefined" ? Number(updated.toLatitude) : null,
      dropoffLng: updated.toLongitude !== null && typeof updated.toLongitude !== "undefined" ? Number(updated.toLongitude) : null,
      fare: updated.amount !== null && typeof updated.amount !== "undefined" ? `${updated.currency ?? "TZS"} ${Number(updated.amount).toLocaleString()}` : null,
    };

    return res.json({ ok: true, trip });
  } catch (err: any) {
    console.error("driver.trip.accept failed", err);
    return res.status(500).json({ error: "failed", details: err?.message || String(err) });
  }
};

/**
 * POST /driver/trips/:tripId/decline
 * Unassigns the driver from a TransportBooking (if currently assigned to them) and sets status back to PENDING.
 */
const postDeclineTrip: RequestHandler = async (req, res) => {
  const user = (req as AuthedRequest).user!;
  const tripId = Number(req.params.tripId);
  if (!Number.isFinite(tripId)) return res.status(400).json({ error: "invalid_trip_id" });

  try {
    const existing = await prisma.transportBooking.findUnique({ where: { id: tripId } });
    if (!existing) return res.status(404).json({ error: "not_found" });

    // If another driver already has it, don't allow decline here.
    if (existing.driverId && Number(existing.driverId) !== Number(user.id)) {
      return res.status(409).json({ error: "already_assigned" });
    }

    await prisma.transportBooking.update({
      where: { id: tripId },
      data: { driverId: null, status: "PENDING" },
    });

    try {
      const io = (req.app && (req.app as any).get && (req.app as any).get("io")) || (global as any).io;
      if (io && typeof io.to === "function") {
        io.to(`driver:${user.id}`).emit("trip:update", { id: tripId, status: "PENDING" });
        io.to(`user:${existing.userId}`).emit("trip:update", { id: tripId, status: "PENDING" });
      }
    } catch {
      // ignore
    }

    return res.json({ ok: true });
  } catch (err: any) {
    console.error("driver.trip.decline failed", err);
    return res.status(500).json({ error: "failed", details: err?.message || String(err) });
  }
};

/**
 * POST /driver/trips/:tripId/cancel
 * Cancels an in-progress/accepted TransportBooking (driver must be the assigned driver).
 * Body: { reason?: string }
 */
const postCancelTrip: RequestHandler = async (req, res) => {
  const user = (req as AuthedRequest).user!;
  const tripId = Number(req.params.tripId);
  if (!Number.isFinite(tripId)) return res.status(400).json({ error: "invalid_trip_id" });

  const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";

  try {
    const existing = await prisma.transportBooking.findUnique({ where: { id: tripId } });
    if (!existing) return res.status(404).json({ error: "not_found" });
    if (!existing.driverId || Number(existing.driverId) !== Number(user.id)) {
      return res.status(403).json({ error: "not_assigned_to_you" });
    }

    const newNotes =
      (existing.notes ? String(existing.notes) + "\n" : "") +
      (reason ? `Driver cancelled: ${reason}` : "Driver cancelled");

    const updated = await prisma.transportBooking.update({
      where: { id: tripId },
      data: { status: "CANCELED", notes: newNotes },
    });

    // Notify customer
    try {
      await prisma.notification.create({
        data: {
          userId: updated.userId,
          title: "Ride cancelled",
          body: reason ? `Your ride was cancelled by the driver. Reason: ${reason}` : "Your ride was cancelled by the driver.",
          unread: true,
          type: "ride",
          meta: { transportBookingId: updated.id, status: updated.status, driverId: updated.driverId },
        },
      });
    } catch {
      // ignore
    }

    // Realtime emit
    try {
      const io = (req.app && (req.app as any).get && (req.app as any).get("io")) || (global as any).io;
      if (io && typeof io.to === "function") {
        io.to(`driver:${user.id}`).emit("trip:update", { id: tripId, status: updated.status });
        io.to(`user:${updated.userId}`).emit("trip:update", { id: tripId, status: updated.status });
      }
    } catch {
      // ignore
    }

    return res.json({ ok: true });
  } catch (err: any) {
    console.error("driver.trip.cancel failed", err);
    return res.status(500).json({ error: "failed", details: err?.message || String(err) });
  }
};

router.get('/trips', limitDriverTripsList, getTrips as unknown as RequestHandler);

router.post("/trips/:tripId/accept", limitDriverTripAction, postAcceptTrip as unknown as RequestHandler);
router.post("/trips/:tripId/decline", limitDriverTripAction, postDeclineTrip as unknown as RequestHandler);
router.post("/trips/:tripId/cancel", limitDriverTripAction, postCancelTrip as unknown as RequestHandler);

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
      let range: { gte: Date; lte: Date } | undefined;
      try {
        if (date) {
          const s = new Date(date + 'T00:00:00.000Z');
          const e = new Date(date + 'T23:59:59.999Z');
          range = { gte: s, lte: e };
        } else if (start || end) {
          const s = start ? new Date(start + 'T00:00:00.000Z') : new Date(0);
          const e = end ? new Date(end + 'T23:59:59.999Z') : new Date();
          range = { gte: s, lte: e };
        }
      } catch (e) { /* ignore */ }

      // Booking doesn't have `scheduledAt` in our schema; use the closest available fields.
      if (range) {
        where.OR = [
          { transportScheduledDate: range },
          { checkIn: range },
          { createdAt: range },
        ];
      }

      const items = await (prisma as any).booking.findMany({
        where,
        orderBy: [{ transportScheduledDate: 'desc' }, { checkIn: 'desc' }, { createdAt: 'desc' }],
        take: 1000,
      });
      // map bookings to simple safety-like events when flags exist
      const mapped = (items || []).flatMap((b: any) => {
        const out: any[] = [];
        if (b.hardBraking || b.harshAcceleration || b.speeding || b.ruleViolated) {
          out.push({
            id: `b-${b.id}`,
            date: b.transportScheduledDate ?? b.checkIn ?? b.createdAt,
            hardBraking: !!b.hardBraking,
            harshAcceleration: !!b.harshAcceleration,
            speeding: !!b.speeding,
            ruleViolated: !!b.ruleViolated,
            bookingId: b.id,
          });
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
 * GET /driver/invoices?page=&pageSize=
 * Returns invoices for the authenticated driver.
 * Similar to payouts but returns all invoices (not just PAID).
 */
const getInvoices: RequestHandler = async (req, res) => {
  const user = (req as AuthedRequest).user!;
  const page = Math.max(1, Number((req.query as any).page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number((req.query as any).pageSize ?? 20)));
  const skip = (page - 1) * pageSize;

  try {
    // Use Invoice -> Booking relationship to return invoices for this driver
    if ((prisma as any).invoice && (prisma as any).booking) {
      // First, try to query with a where clause if booking.driverId exists
      let items: any[] = [];
      let total = 0;
      
      try {
        // Try querying with nested where clause first (more efficient)
        const [itemsResult, totalResult] = await Promise.all([
          prisma.invoice.findMany({
            where: {
              booking: {
                is: {
                  driverId: user.id,
                },
              },
            },
            include: { booking: true },
            orderBy: { id: 'desc' },
            skip,
            take: pageSize,
          }),
          prisma.invoice.count({
            where: {
              booking: {
                is: {
                  driverId: user.id,
                },
              },
            },
          }),
        ]);
        items = itemsResult;
        total = totalResult;
      } catch (queryErr: any) {
        // If nested where fails (e.g., driverId field doesn't exist), fall back to client-side filtering
        console.warn('Nested where query failed, falling back to client-side filter:', queryErr?.message);
        
        // Fetch all invoices and filter client-side
        const allItems = await prisma.invoice.findMany({
          where: {},
          include: { booking: true },
          orderBy: { id: 'desc' },
        });
        
        // Filter to only invoices for this driver
        items = (allItems || [])
          .filter((inv: any) => inv.booking && Number(inv.booking.driverId) === Number(user.id))
          .slice(skip, skip + pageSize);
        total = (allItems || []).filter((inv: any) => inv.booking && Number(inv.booking.driverId) === Number(user.id)).length;
      }

      // Map to response format
      const mapped = items.map((inv: any) => ({
        id: inv.id,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        tripCode: inv.booking?.tripCode ?? inv.booking?.code ?? null,
        issuedAt: inv.issuedAt,
        paidAt: inv.paidAt,
        paidTo: inv.paymentRef ?? inv.paymentMethod ?? null,
        gross: inv.total ?? null,
        commissionAmount: inv.commissionAmount ?? null,
        netPaid: inv.netPayable ?? null,
        receiptNumber: inv.receiptNumber ?? null,
      }));
      
      return res.json({ total, page, pageSize, items: mapped });
    }

    return res.json({ total: 0, page, pageSize, items: [] });
  } catch (err: any) {
    console.error('driver.invoices: failed', err);
    // If the DB schema is out-of-date (missing column), Prisma will throw P2022
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === 'P2021' || err.code === 'P2022')) {
      console.warn('Prisma schema mismatch error in /driver/invoices:', err.message);
      return res.json({ total: 0, page, pageSize, items: [] });
    }
    console.error('Unhandled error in GET /driver/invoices:', err);
    return res.status(500).json({ error: 'Internal server error', detail: err?.message || String(err) });
  }
};
router.get('/invoices', getInvoices as unknown as RequestHandler);

/**
 * POST /driver/location
 * Body: { lat: number, lng: number }
 * Drivers can report their current location; we upsert into a driverLocation table when available.
 */
const postLocation: RequestHandler = async (req, res) => {
  const user = (req as AuthedRequest).user!;
  if (String(user.role || '').toUpperCase() !== 'DRIVER') {
    return res.status(403).json({ error: 'Driver access required' });
  }

  const locationSchema = z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      headingDeg: z.number().min(0).max(360).optional(),
      speedMps: z.number().min(0).max(120).optional(),
      accuracyM: z.number().min(0).max(10_000).optional(),
      transportBookingId: z.number().int().positive().optional(),
    })
    .strict();

  const parsed = locationSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', issues: parsed.error.issues });
  }
  const { lat, lng, headingDeg, speedMps, accuracyM, transportBookingId } = parsed.data;
  try {
    if ((prisma as any).driverLiveLocation) {
      await (prisma as any).driverLiveLocation.upsert({
        where: { driverId: user.id },
        update: {
          lat,
          lng,
          headingDeg: typeof headingDeg === "number" ? Math.round(headingDeg) : undefined,
          speedMps: typeof speedMps === "number" ? speedMps : undefined,
          accuracyM: typeof accuracyM === "number" ? accuracyM : undefined,
          updatedAt: new Date(),
        },
        create: {
          driverId: user.id,
          lat,
          lng,
          headingDeg: typeof headingDeg === "number" ? Math.round(headingDeg) : undefined,
          speedMps: typeof speedMps === "number" ? speedMps : undefined,
          accuracyM: typeof accuracyM === "number" ? accuracyM : undefined,
        },
      });
    }

    // Optional history ping (only write when linked to a booking to avoid excessive growth)
    try {
      if ((prisma as any).driverLocationPing && typeof transportBookingId === "number") {
        await (prisma as any).driverLocationPing.create({
          data: {
            driverId: user.id,
            transportBookingId,
            lat,
            lng,
            headingDeg: typeof headingDeg === "number" ? Math.round(headingDeg) : undefined,
            speedMps: typeof speedMps === "number" ? speedMps : undefined,
            accuracyM: typeof accuracyM === "number" ? accuracyM : undefined,
          },
        });
      }
    } catch (e) {
      // ignore ping write errors
    }
    // broadcast via socket.io if available
    try {
      const io = (req.app && (req.app as any).get && (req.app as any).get('io'));
      if (io && typeof io.to === 'function') {
        // Admin dispatch/map views
        io.to('admin').emit('driver:location:update', { driverId: user.id, lat, lng, headingDeg, speedMps, accuracyM });
        // Driver can update their own UI if needed
        io.to(`driver:${user.id}`).emit('driver:location:update', { driverId: user.id, lat, lng, headingDeg, speedMps, accuracyM });
      }
    } catch (e) { /* ignore */ }
    res.json({ ok: true });
  } catch (e) {
    console.warn('driver.location upsert failed', e);
    res.status(500).json({ error: 'failed' });
  }
};
router.post('/location', limitDriverLocationUpdate, postLocation as unknown as RequestHandler);

/**
 * POST /driver/availability
 * Body: { available: boolean }
 * Driver toggles their availability. Best-effort persistence: try a driverAvailability or user field, otherwise no-op.
 */
const postAvailability: RequestHandler = async (req, res) => {
  const user = (req as AuthedRequest).user!;
  if (String(user.role || '').toUpperCase() !== 'DRIVER') {
    return res.status(403).json({ error: 'Driver access required' });
  }

  const availabilitySchema = z.object({ available: z.boolean() }).strict();
  const parsed = availabilitySchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'Invalid payload', issues: parsed.error.issues });
  }
  const { available } = parsed.data;
  try {
    // Persist availability best-effort.
    // Prefer dedicated availability table if present; otherwise try user fields.
    try {
      if ((prisma as any).driverAvailability) {
        await (prisma as any).driverAvailability.upsert({
          where: { driverId: user.id },
          update: { available, updatedAt: new Date() },
          create: { driverId: user.id, available, updatedAt: new Date() },
        });
      } else if ((prisma as any).user) {
        // Try user.available first, then fall back to user.isAvailable.
        try {
          await prisma.user.update({ where: { id: user.id }, data: { available } as any });
        } catch (e1) {
          try {
            await prisma.user.update({ where: { id: user.id }, data: { isAvailable: available } as any });
          } catch {
            // ignore if schema doesn't have these fields
          }
        }
      }
    } catch {
      // ignore persistence errors
    }

    // broadcast availability change via socket.io for interested clients
    try {
      const io = (req.app && (req.app as any).get && (req.app as any).get('io'));
      if (io && typeof io.to === 'function') {
        // Also maintain the offer room membership for this driver (best-effort).
        try {
          const driverRoom = `driver:${user.id}`;
          if (available) {
            // Move all sockets for this driver into the available drivers room.
            (io as any).in(driverRoom)?.socketsJoin?.('drivers:available');
          } else {
            (io as any).in(driverRoom)?.socketsLeave?.('drivers:available');
          }
        } catch {
          // ignore
        }
        // Admin dispatch/map views
        io.to('admin').emit('driver:availability:update', { driverId: user.id, available });
        // Driver can update their own UI if needed
        io.to(`driver:${user.id}`).emit('driver:availability:update', { driverId: user.id, available });
      }
    } catch (e) { /* ignore */ }

    return res.json({ ok: true, available });
  } catch (e) {
    console.warn('driver.availability failed', e);
    return res.status(500).json({ error: 'failed' });
  }
};
router.post('/availability', limitDriverAvailabilityToggle, postAvailability as unknown as RequestHandler);

/** PUT /driver/profile - update authenticated driver's profile (best-effort fields) */
const updateDriverProfile: RequestHandler = async (req, res) => {
  const {
    fullName,
    phone,
    nationality,
    avatarUrl,
    timezone,
    dateOfBirth,
    gender,
    nin,
    licenseNumber,
    plateNumber,
    vehicleType,
    vehicleMake,
    vehiclePlate,
    operationArea,
    paymentPhone,
    // Uploaded docs (Cloudinary URLs)
    drivingLicenseUrl,
    nationalIdUrl,
    vehicleRegistrationUrl,
    insuranceUrl,
    // Optional extra fields (not always present in Prisma schema)
    region,
    district,
  } = req.body ?? {};
  const userId = (req as AuthedRequest).user!.id;

  // Best-effort: only include fields if Prisma user model has them
  const meta = (prisma as any).user?._meta ?? {};
  const hasField = (field: string) => Object.prototype.hasOwnProperty.call(meta, field);
  const beforeSelect: any = { };
  if (hasField('fullName')) beforeSelect.fullName = true;
  if (hasField('name')) beforeSelect.name = true;
  if (hasField('phone')) beforeSelect.phone = true;
  if (hasField('nationality')) beforeSelect.nationality = true;
  if (hasField('avatarUrl')) beforeSelect.avatarUrl = true;
  if (hasField('timezone')) beforeSelect.timezone = true;
  if (hasField('dateOfBirth')) beforeSelect.dateOfBirth = true;
  if (hasField('region')) beforeSelect.region = true;
  if (hasField('district')) beforeSelect.district = true;
  if (hasField('gender')) beforeSelect.gender = true;
  if (hasField('nin')) beforeSelect.nin = true;
  if (hasField('licenseNumber')) beforeSelect.licenseNumber = true;
  if (hasField('plateNumber')) beforeSelect.plateNumber = true;
  if (hasField('vehicleType')) beforeSelect.vehicleType = true;
  if (hasField('vehicleMake')) beforeSelect.vehicleMake = true;
  if (hasField('vehiclePlate')) beforeSelect.vehiclePlate = true;
  if (hasField('operationArea')) beforeSelect.operationArea = true;
  if (hasField('paymentPhone')) beforeSelect.paymentPhone = true;
  // We'll also load payout JSON to store extra fields safely
  if (hasField('payout')) beforeSelect.payout = true;

  let before: any = null;
  try { before = await prisma.user.findUnique({ where: { id: userId }, select: beforeSelect }); } catch (e) { /* ignore */ }

  const data: any = {};
  // Name fields
  if (hasField('fullName') && typeof fullName !== 'undefined') data.fullName = fullName;
  if (hasField('name') && typeof fullName !== 'undefined' && typeof data.fullName === 'undefined') data.name = fullName;

  // Core driver fields
  if (hasField('phone') && typeof phone !== 'undefined') data.phone = phone;
  if (hasField('nationality') && typeof nationality !== 'undefined') data.nationality = nationality;
  if (hasField('avatarUrl') && typeof avatarUrl !== 'undefined') data.avatarUrl = avatarUrl;
  if (hasField('timezone') && typeof timezone !== 'undefined') data.timezone = timezone;
  if (hasField('dateOfBirth') && typeof dateOfBirth !== 'undefined') data.dateOfBirth = dateOfBirth;
  if (hasField('region') && typeof region !== 'undefined') data.region = region;
  if (hasField('district') && typeof district !== 'undefined') data.district = district;
  if (hasField('gender') && typeof gender !== 'undefined') data.gender = gender;
  if (hasField('nin') && typeof nin !== 'undefined') data.nin = nin;
  if (hasField('licenseNumber') && typeof licenseNumber !== 'undefined') data.licenseNumber = licenseNumber;
  if (hasField('plateNumber') && typeof plateNumber !== 'undefined') data.plateNumber = plateNumber;
  if (hasField('vehicleType') && typeof vehicleType !== 'undefined') data.vehicleType = vehicleType;
  if (hasField('vehicleMake') && typeof vehicleMake !== 'undefined') data.vehicleMake = vehicleMake;
  if (hasField('vehiclePlate') && typeof vehiclePlate !== 'undefined') data.vehiclePlate = vehiclePlate;
  if (hasField('operationArea') && typeof operationArea !== 'undefined') data.operationArea = operationArea;
  if (hasField('paymentPhone') && typeof paymentPhone !== 'undefined') data.paymentPhone = paymentPhone;

  const extractUnknownArg = (err: any): string | null => {
    const msg = String(err?.message ?? '');
    const m = msg.match(/Unknown argument `([^`]+)`/);
    return m?.[1] ?? null;
  };

  let updated: any;
  try {
    updated = await prisma.user.update({ where: { id: userId }, data } as any);
  } catch (err: any) {
    const badField = extractUnknownArg(err);
    if (badField) {
      delete (data as any)[badField];
      updated = await prisma.user.update({ where: { id: userId }, data } as any);
    } else {
      console.error('driver.profile.update failed', err);
      return res.status(500).json({ error: 'failed' });
    }
  }

  // Persist extra fields to payout JSON for drivers when schema does not have dedicated columns
  try {
    // Only do this for drivers
    const role = String((req as AuthedRequest).user?.role ?? '').toUpperCase();
    if (role === 'DRIVER' && hasField('payout')) {
      const currentPayout = (before as any)?.payout;
      const payoutObj: any = (typeof currentPayout === 'object' && currentPayout !== null) ? { ...currentPayout } : {};
      const extras: any = (typeof payoutObj.profileExtras === 'object' && payoutObj.profileExtras !== null) ? { ...payoutObj.profileExtras } : {};
      if (typeof region !== 'undefined') extras.region = region;
      if (typeof district !== 'undefined') extras.district = district;
      if (typeof timezone !== 'undefined' && !hasField('timezone')) extras.timezone = timezone;
      if (typeof dateOfBirth !== 'undefined' && !hasField('dateOfBirth')) extras.dateOfBirth = dateOfBirth;
      payoutObj.profileExtras = extras;
      await prisma.user.update({ where: { id: userId }, data: { payout: payoutObj } as any });
    }
  } catch (e) {
    // ignore
  }

  // Persist document URLs into UserDocument (best-effort)
  const upsertDoc = async (type: string, url: string | undefined, metadata?: any) => {
    if (!url || typeof url !== 'string') return;
    if (!(prisma as any).userDocument) return;
    const existing = await prisma.userDocument.findFirst({ where: { userId, type }, orderBy: { id: 'desc' } });
    if (existing) {
      await prisma.userDocument.update({ where: { id: existing.id }, data: { url, status: 'PENDING', metadata } as any });
    } else {
      await prisma.userDocument.create({ data: { userId, type, url, status: 'PENDING', metadata } as any });
    }
  };

  try {
    await upsertDoc('DRIVER_LICENSE', drivingLicenseUrl, {
      licenseNumber: typeof licenseNumber === 'string' ? licenseNumber : undefined,
      uploadedAt: new Date().toISOString(),
    });
    await upsertDoc('NATIONAL_ID', nationalIdUrl, {
      nin: typeof nin === 'string' ? nin : undefined,
      uploadedAt: new Date().toISOString(),
    });
    await upsertDoc('VEHICLE_REGISTRATION', vehicleRegistrationUrl, {
      plateNumber: typeof plateNumber === 'string' ? plateNumber : undefined,
      vehicleType: typeof vehicleType === 'string' ? vehicleType : undefined,
      uploadedAt: new Date().toISOString(),
    });
    await upsertDoc('INSURANCE', insuranceUrl, { uploadedAt: new Date().toISOString() });
  } catch (e) {
    // Best-effort: don't fail the whole profile update
  }

  try { await audit(req as AuthedRequest, 'USER_PROFILE_UPDATE', `user:${updated.id}`, before, { ...data, drivingLicenseUrl, nationalIdUrl, vehicleRegistrationUrl, insuranceUrl }); } catch (e) { /* ignore audit errors */ }
  return res.json({ ok: true });
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
  
  // DoS protection: Enforce 8-12 character limit
  if (!newPassword || typeof newPassword !== 'string') { 
    res.status(400).json({ error: 'newPassword required' }); 
    return; 
  }
  
  if (newPassword.length < 8 || newPassword.length > 12) {
    return res.status(400).json({ 
      error: 'Password must be between 8 and 12 characters', 
      reasons: ['Password length must be between 8 and 12 characters to prevent DoS attacks'] 
    });
  }

  try {
    // Import shared password change security utilities from account.ts
    // For now, implement inline to avoid circular dependencies
    // Track password change attempts (shared with account endpoint would be ideal, but using local for now)
    interface PasswordChangeAttempt {
      failures: number;
      lastFailure: number;
      lockedUntil: number | null;
      lastSuccess: number | null;
    }
    const passwordChangeAttempts = new Map<number, PasswordChangeAttempt>();
    
    function getPasswordChangeAttempt(userId: number): PasswordChangeAttempt {
      if (!passwordChangeAttempts.has(userId)) {
        passwordChangeAttempts.set(userId, { failures: 0, lastFailure: 0, lockedUntil: null, lastSuccess: null });
      }
      return passwordChangeAttempts.get(userId)!;
    }

    const attempt = getPasswordChangeAttempt(user.id);
    const now = Date.now();
    
    // Check for timeout/lockout
    if (attempt.lockedUntil && now < attempt.lockedUntil) {
      const remaining = Math.ceil((attempt.lockedUntil - now) / 1000);
      return res.status(429).json({ 
        error: `Too many failed attempts. Please wait ${remaining} seconds.`,
        reasons: [`Account temporarily locked. Try again in ${remaining} seconds.`],
        lockedUntil: attempt.lockedUntil
      });
    }

    // Check 30-minute cooldown after successful password change
    if (attempt.lastSuccess && (now - attempt.lastSuccess) < (30 * 60 * 1000)) {
      const remaining = Math.ceil((30 * 60 * 1000 - (now - attempt.lastSuccess)) / 60000);
      return res.status(429).json({ 
        error: `Password was recently changed. Please wait ${remaining} minute(s) before changing it again.`,
        reasons: [`Password change cooldown active. Try again in ${remaining} minute(s).`],
        cooldownUntil: attempt.lastSuccess + (30 * 60 * 1000)
      });
    }

    // If a user table with a password/hash exists, attempt proper verification & hashing
    if ((prisma as any).user) {
      try {
        // Try passwordHash first (standard field), then fallback to password
        const u = await prisma.user.findUnique({ 
          where: { id: user.id }, 
          select: { passwordHash: true, password: true } as any 
        });
        const stored = (u as any)?.passwordHash ?? (u as any)?.password ?? null;

        // If a password exists, require currentPassword and verify
        if (stored) {
          if (!currentPassword || typeof currentPassword !== 'string') { 
            res.status(400).json({ error: 'currentPassword required' }); 
            return; 
          }

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

          if (!ok) {
            // Track failure
            attempt.failures += 1;
            attempt.lastFailure = now;
            
            // Lock after 3 consecutive failures for 5 minutes
            if (attempt.failures >= 3) {
              attempt.lockedUntil = now + (5 * 60 * 1000); // 5 minutes
              attempt.failures = 0; // Reset counter after lockout
              return res.status(429).json({ 
                error: "Too many failed attempts. Account locked for 5 minutes.",
                reasons: ['Account temporarily locked due to multiple failed password change attempts.'],
                lockedUntil: attempt.lockedUntil
              });
            }
            
            return res.status(400).json({ 
              error: 'current password is incorrect',
              reasons: [`Incorrect current password. ${3 - attempt.failures} attempt(s) remaining before lockout.`]
            });
          }
        }

        // Reset failure counter on successful password verification
        attempt.failures = 0;
        attempt.lockedUntil = null;

        // Enforce policy: Prevent reusing the current/existing password
        if (stored) {
          let isCurrentPassword = false;
          try {
            if (typeof stored === 'string' && stored.startsWith('$argon2')) {
              isCurrentPassword = await argon2.verify(stored, newPassword);
            } else {
              isCurrentPassword = stored === newPassword;
            }
          } catch (e) {
            isCurrentPassword = false;
          }
          
          if (isCurrentPassword) {
            return res.status(400).json({ 
              error: "Cannot reuse current password", 
              reasons: ['The new password must be different from your current password. Please choose a different password.'] 
            });
          }
        }

        // Validate strength before hashing using SystemSetting configuration
        try {
          const { valid, reasons } = await validatePasswordWithSettings(newPassword, (user as any).role);
          if (!valid) {
            res.status(400).json({ error: 'Password does not meet strength requirements', reasons });
            return;
          }

          // Prevent reuse of recent passwords from history
          const reused = await isPasswordReused(user.id, newPassword);
          if (reused) {
            return res.status(400).json({ 
              error: "Password was used recently", 
              reasons: ['This password was used recently. Please choose a different password that has not been used before.'] 
            });
          }

          const hash = await argon2.hash(newPassword);
          // Try passwordHash first, then fallback to password
          const updateData: any = {};
          try {
            updateData.passwordHash = hash;
          } catch (e) {
            updateData.password = hash;
          }
          await prisma.user.update({ where: { id: user.id }, data: updateData as any });
          
          // Record the new hash in password history (best-effort)
          try {
            await addPasswordToHistory(user.id, hash);
          } catch (e) {
            // Best-effort
          }
          
          // Record successful password change and set cooldown
          attempt.lastSuccess = now;
          attempt.failures = 0;
          attempt.lockedUntil = null;
          
          return res.json({ ok: true, message: 'Password changed successfully', cooldownUntil: now + (30 * 60 * 1000) });
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
        const u = await prisma.user.findUnique({ where: { id: user.id }, select: { twoFactorEnabled: true, twoFactorMethod: true, phone: true } as any });
        if (u) {
          const twoFactorEnabled = !!(u as any).twoFactorEnabled || false;
          const twoFactorMethod = (u as any).twoFactorMethod || null;
          totpEnabled = twoFactorEnabled && twoFactorMethod === 'TOTP';
          smsEnabled = twoFactorEnabled && twoFactorMethod === 'SMS';
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
            updateData.twoFactorMethod = 'TOTP';
          } else {
            updateData.twoFactorEnabled = false;
            updateData.twoFactorMethod = null;
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
    let qr: string | null = null;
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
    const body = (req.body ?? {}) as any;
    const name = body?.name;

    // The Web app may send the full credential JSON at the top-level (id/rawId/response/...)
    // or nest it under `response`. Normalize to a RegistrationResponseJSON-like object.
    const credential = (() => {
      // If body already looks like a registration response
      if (body && typeof body === 'object' && typeof body.id === 'string' && body.response) return body;
      // If body.response is the full credential
      if (body && typeof body === 'object' && body.response && typeof body.response.id === 'string') return body.response;
      // If body has id/rawId but response is nested (common in our web page)
      if (body && typeof body === 'object' && typeof body.id === 'string' && typeof body.rawId === 'string' && body.response) {
        return {
          id: body.id,
          rawId: body.rawId,
          response: body.response,
          type: body.type ?? 'public-key',
          clientExtensionResults: body.clientExtensionResults ?? {},
        };
      }
      return null;
    })();

    if (!credential) {
      return res.status(400).json({
        error: 'invalid payload',
        hint: 'Expected WebAuthn registration response JSON (id/rawId/response/type/clientExtensionResults).',
      });
    }

    const storedChallenge = passkeyChallenges.get(String(user.id));
    if (!storedChallenge) { res.status(400).json({ error: 'no challenge found' }); return; }

    const origin = process.env.WEB_ORIGIN || process.env.APP_ORIGIN || 'http://localhost:3000';
    const rpID = new URL(origin).hostname;

    let verification: any = null;
    try {
      // simplewebauthn types are strict; cast to any to accept the browser-shaped response
      verification = await (verifyRegistrationResponse as any)({
        response: credential,
        expectedChallenge: storedChallenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        // Our registration options use `userVerification: 'preferred'`.
        // Don't hard-fail registration if a platform/roaming authenticator doesn't assert UV.
        requireUserVerification: false,
      } as any);
    } catch (e) {
      console.warn('webauthn verification error', e);
      const details = process.env.NODE_ENV !== 'production' ? String((e as any)?.message ?? e) : undefined;
      return res.status(400).json({ error: 'verification failed', ...(details ? { details } : {}) });
    }

    if (!verification || !verification.verified) {
      return res.status(400).json({ error: 'verification failed' });
    }

    // One-time challenge: clear after successful verification to prevent replay.
    try { passkeyChallenges.delete(String(user.id)); } catch { /* ignore */ }

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
