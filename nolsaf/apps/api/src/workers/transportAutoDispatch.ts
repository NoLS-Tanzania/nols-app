import type { Server } from "socket.io";
import { prisma } from "@nolsaf/prisma";
import { AUTO_DISPATCH_GRACE_MS, AUTO_DISPATCH_LOOKAHEAD_MS } from "../lib/transportPolicy.js";

type StartOptions = {
  io?: Server;
  intervalMs?: number;
};

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

async function pickNearestAvailableDriver(pickup: { lat: number; lng: number }): Promise<number | null> {
  // Prefer live locations if present.
  if ((prisma as any).driverLiveLocation) {
    const since = new Date(Date.now() - 5 * 60 * 1000);
    try {
      const rows = await (prisma as any).driverLiveLocation.findMany({
        where: { updatedAt: { gte: since } },
        take: 200,
        orderBy: { updatedAt: "desc" },
        include: { driver: { select: { id: true, role: true, available: true } } },
      });

      const candidates = (rows || [])
        .filter((r: any) => r?.driver && r.driver.role === "DRIVER" && r.driver.available === true)
        .map((r: any) => ({
          driverId: Number(r.driverId ?? r.driver.id),
          lat: Number(r.lat),
          lng: Number(r.lng),
        }))
        .filter((d: any) => Number.isFinite(d.driverId) && Number.isFinite(d.lat) && Number.isFinite(d.lng));

      if (!candidates.length) return null;

      let best: { driverId: number; distanceKm: number } | null = null;
      for (const c of candidates) {
        const distanceKm = haversineKm(pickup, { lat: c.lat, lng: c.lng });
        if (!best || distanceKm < best.distanceKm) best = { driverId: c.driverId, distanceKm };
      }
      return best?.driverId ?? null;
    } catch {
      // fall through
    }
  }

  // Fallback: any available driver (no location awareness)
  try {
    const driver = await prisma.user.findFirst({
      where: { role: "DRIVER", available: true } as any,
      select: { id: true },
      orderBy: { id: "asc" } as any,
    });
    return driver?.id ?? null;
  } catch {
    return null;
  }
}

async function tryAutoAssignOne(io?: Server): Promise<boolean> {
  const now = new Date();
  const lookahead = new Date(now.getTime() + AUTO_DISPATCH_LOOKAHEAD_MS);
  const graceStartCutoff = new Date(now.getTime() - AUTO_DISPATCH_GRACE_MS);

  // Only consider trips that are happening soon, paid, unassigned, and still within auto-dispatch grace.
  const trip = await prisma.transportBooking.findFirst({
    where: {
      status: "PENDING_ASSIGNMENT",
      driverId: null,
      paymentStatus: "PAID" as any,
      scheduledDate: { gte: now, lte: lookahead },
      createdAt: { gte: graceStartCutoff },
    } as any,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      userId: true,
      createdAt: true,
      scheduledDate: true,
      fromLatitude: true,
      fromLongitude: true,
    } as any,
  });

  if (!trip) return false;

  const pickupLat = Number((trip as any).fromLatitude);
  const pickupLng = Number((trip as any).fromLongitude);
  if (!Number.isFinite(pickupLat) || !Number.isFinite(pickupLng)) return false;

  const driverId = await pickNearestAvailableDriver({ lat: pickupLat, lng: pickupLng });
  if (!driverId) return false;

  // Concurrency-safe assignment: only assign if still unassigned and pending.
  const updatedCount = await prisma.transportBooking.updateMany({
    where: { id: trip.id, driverId: null, status: "PENDING_ASSIGNMENT" } as any,
    data: { driverId, status: "CONFIRMED", pickupTime: new Date() } as any,
  });

  if (!updatedCount?.count) return false;

  try {
    io?.to(`driver:${driverId}`).emit("trip:update", { id: trip.id, status: "CONFIRMED" });
    io?.to(`user:${trip.userId}`).emit("trip:update", { id: trip.id, status: "CONFIRMED" });
  } catch {
    // ignore
  }

  return true;
}

export function startTransportAutoDispatch({ io, intervalMs = 15_000 }: StartOptions = {}) {
  if ((global as any).__transportAutoDispatchStarted) return;
  (global as any).__transportAutoDispatchStarted = true;

  const tick = async () => {
    try {
      // Try a few assignments per tick to avoid long single DB loops.
      for (let i = 0; i < 5; i++) {
        const didWork = await tryAutoAssignOne(io);
        if (!didWork) break;
      }
    } catch (e) {
      console.warn("[transport-auto-dispatch] tick failed", e);
    }
  };

  // Run quickly on startup, then on interval.
  void tick();
  setInterval(() => void tick(), intervalMs);
}
