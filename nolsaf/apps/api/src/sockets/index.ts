import type { Express } from "express";
import type { Server as HttpServer } from "http";
import { Server as SocketServer } from "socket.io";
import { prisma } from "@nolsaf/prisma";
import { socketAuthMiddleware, type AuthenticatedSocket } from "../middleware/socketAuth.js";
import {
  getProtectedDriverAccessDenial,
  getProtectedDriverState,
  isDriverApprovedForProtectedAccess,
} from "../lib/driverAccess.js";

let ioRef: SocketServer | null = null;

function buildSocketAllowedOrigins(): string[] {
  const localOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
  ];

  const envOrigins = [
    process.env.WEB_ORIGIN || "",
    process.env.APP_ORIGIN || "",
    ...(process.env.CORS_ORIGIN || "").split(",").map((s) => s.trim()),
  ].filter(Boolean);

  const defaultOrigins = process.env.NODE_ENV === "production" ? [] : localOrigins;
  return Array.from(new Set([...defaultOrigins, ...envOrigins]));
}

function isSocketOriginAllowed(origin: string | null | undefined, allowedOrigins: string[]): boolean {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (process.env.NODE_ENV === "production") return false;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

export function createSocketServer(server: HttpServer, app: Express): SocketServer {
  const socketAllowedOrigins = buildSocketAllowedOrigins();
  const io = new SocketServer(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        return callback(null, isSocketOriginAllowed(origin, socketAllowedOrigins));
      },
      credentials: true,
      methods: ["GET", "POST"],
    },
  });

  ioRef = io;
  (global as any).io = io;
  app.set("io", io);

  io.use(socketAuthMiddleware);
  registerSocketHandlers(io);

  return io;
}

function registerSocketHandlers(io: SocketServer): void {
  io.on("connection", (socket: AuthenticatedSocket) => {
    const user = socket.data.user;
    console.log("Socket connected", socket.id, user ? `(user: ${user.id}, role: ${user.role})` : "(unauthenticated)");

    // Auto-join basic rooms for authenticated users so server-side emits can be scoped safely.
    // This avoids relying on every client to explicitly call join events.
    if (user?.id) {
      try { socket.join(`user:${user.id}`); } catch {}
      if (user.role === "DRIVER") {
        try { socket.join(`driver:${user.id}`); } catch {}
        // Best-effort: join/leave the available-drivers room from DB state on connect.
        (async () => {
          try {
            const driverState = await getProtectedDriverState(user.id);
            let isAvailable = false;
            try {
              if ((prisma as any).driverAvailability) {
                const row = await (prisma as any).driverAvailability.findUnique({
                  where: { driverId: user.id },
                  select: { available: true },
                });
                isAvailable = Boolean(row?.available);
              } else {
                const row = await prisma.user.findUnique({ where: { id: user.id }, select: { available: true, isAvailable: true } });
                isAvailable = Boolean(row?.available ?? row?.isAvailable ?? false);
              }
            } catch {
              isAvailable = false;
            }
            if (isAvailable && isDriverApprovedForProtectedAccess(driverState)) socket.join("drivers:available");
            else socket.leave("drivers:available");
          } catch {
            // ignore
          }
        })();
      }
    }

    // Driver availability (socket): persists + updates room membership for offer broadcasts.
    // Payload: { available: boolean }
    socket.on("driver:availability:set", async (data: { available: boolean }, callback?: (response: any) => void) => {
      try {
        if (!user || user.role !== "DRIVER") {
          if (callback) callback({ error: "Unauthorized" });
          return;
        }
        const driverState = await getProtectedDriverState(user.id);
        const denial = getProtectedDriverAccessDenial(driverState);
        if (denial) {
          try {
            socket.leave("drivers:available");
          } catch {
            // ignore
          }
          if (callback) callback({ error: denial.code, message: denial.message });
          return;
        }
        const available = (data as any)?.available;
        if (typeof available !== "boolean") {
          if (callback) callback({ error: "available must be boolean" });
          return;
        }

        // Best-effort persistence.
        try {
          if ((prisma as any).driverAvailability) {
            await (prisma as any).driverAvailability.upsert({
              where: { driverId: user.id },
              update: { available, updatedAt: new Date() },
              create: { driverId: user.id, available, updatedAt: new Date() },
            });
          } else {
            try {
              await prisma.user.update({ where: { id: user.id }, data: { available } as any });
            } catch {
              try {
                await prisma.user.update({ where: { id: user.id }, data: { isAvailable: available } as any });
              } catch {
                // ignore
              }
            }
          }
        } catch {
          // ignore persistence errors
        }

        // Maintain room membership used for offer broadcasts.
        if (available) socket.join("drivers:available");
        else socket.leave("drivers:available");

        // Notify interested clients (maps/admin dashboards).
        try {
          io.emit("driver:availability:update", { driverId: user.id, available });
        } catch {
          // ignore
        }

        if (callback) callback({ status: "ok", available });
      } catch (e) {
        if (callback) callback({ error: "failed" });
      }
    });

    // Handle driver room joining for referral updates
    socket.on("join-driver-room", async (data: { driverId: string | number }, callback?: (response: any) => void) => {
      if (!data.driverId) {
        if (callback) callback({ error: "driverId required" });
        return;
      }

      const driverId = Number(data.driverId);
      // Verify user is the driver or an admin
      if (!user || (user.id !== driverId && user.role !== "ADMIN")) {
        if (callback) callback({ error: "Unauthorized" });
        return;
      }

      const room = `driver:${driverId}`;
      socket.join(room);
      console.log(`Driver ${driverId} joined room ${room}`);
      if (callback) callback({ status: "ok", room });
    });

    // Handle driver room leaving
    socket.on("leave-driver-room", (data: { driverId: string | number }, callback?: (response: any) => void) => {
      if (!data.driverId) {
        if (callback) callback({ error: "driverId required" });
        return;
      }

      const room = `driver:${data.driverId}`;
      socket.leave(room);
      if (callback) callback({ status: "ok" });
    });

    // Handle property availability room joining (for real-time updates)
    socket.on("join-property-availability", async (data: { propertyId: string | number }, callback?: (response: any) => void) => {
      if (!data.propertyId) {
        if (callback) callback({ error: "propertyId required" });
        return;
      }

      const propertyId = Number(data.propertyId);
      if (isNaN(propertyId)) {
        if (callback) callback({ error: "Invalid propertyId" });
        return;
      }

      // Verify user is owner of property or admin
      if (user) {
        if (user.role === "ADMIN") {
          const room = `property:${propertyId}:availability`;
          socket.join(room);
          console.log(`User ${user.id} (${user.role}) joined property availability room ${room}`);
          if (callback) callback({ status: "ok", room });
          return;
        }

        if (user.role === "OWNER") {
          const property = await prisma.property.findFirst({
            where: {
              id: propertyId,
              ownerId: user.id,
            },
            select: { id: true },
          });

          if (property) {
            const room = `property:${propertyId}:availability`;
            socket.join(room);
            console.log(`Owner ${user.id} joined property availability room ${room}`);
            if (callback) callback({ status: "ok", room });
            return;
          }
        }
      }

      // Allow public connections to property availability (for real-time checking)
      const room = `property:${propertyId}:availability:public`;
      socket.join(room);
      console.log(`Public user joined property availability room ${room}`);
      if (callback) callback({ status: "ok", room, public: true });
    });

    // Handle property availability room leaving
    socket.on("leave-property-availability", (data: { propertyId: string | number }, callback?: (response: any) => void) => {
      if (!data.propertyId) {
        if (callback) callback({ error: "propertyId required" });
        return;
      }

      const propertyId = Number(data.propertyId);
      if (isNaN(propertyId)) {
        if (callback) callback({ error: "Invalid propertyId" });
        return;
      }

      const room = `property:${propertyId}:availability`;
      const publicRoom = `property:${propertyId}:availability:public`;
      socket.leave(room);
      socket.leave(publicRoom);
      if (callback) callback({ status: "ok" });
    });

    // Generic user room (customers/owners can join for inbox messages + notifications)
    socket.on("join-user-room", (data: { userId: string | number }, callback?: (response: any) => void) => {
      if (!data.userId) {
        if (callback) callback({ error: "userId required" });
        return;
      }

      const userId = Number(data.userId);
      // Verify user is joining their own room or is an admin
      if (!user || (user.id !== userId && user.role !== "ADMIN")) {
        if (callback) callback({ error: "Unauthorized" });
        return;
      }

      const room = `user:${userId}`;
      socket.join(room);
      console.log(`User ${userId} joined room ${room}`);
      if (callback) callback({ status: "ok", room });
    });

    socket.on("leave-user-room", (data: { userId: string | number }, callback?: (response: any) => void) => {
      if (!data.userId) {
        if (callback) callback({ error: "userId required" });
        return;
      }

      const userId = Number(data.userId);
      // Verify user is leaving their own room or is an admin
      if (!user || (user.id !== userId && user.role !== "ADMIN")) {
        if (callback) callback({ error: "Unauthorized" });
        return;
      }

      const room = `user:${userId}`;
      socket.leave(room);
      console.log(`User ${userId} left room ${room}`);
      if (callback) callback({ status: "ok" });
    });

    // Owner room (legacy convenience; also join user room)
    socket.on("join-owner-room", (data: { ownerId: string | number }, callback?: (response: any) => void) => {
      if (!data.ownerId) {
        if (callback) callback({ error: "ownerId required" });
        return;
      }

      const ownerId = Number(data.ownerId);
      // Verify user is the owner or is an admin
      if (!user || (user.id !== ownerId && user.role !== "ADMIN")) {
        if (callback) callback({ error: "Unauthorized" });
        return;
      }

      const room = `owner:${ownerId}`;
      socket.join(room);
      socket.join(`user:${ownerId}`);
      console.log(`Owner ${ownerId} joined room ${room}`);
      if (callback) callback({ status: "ok", room });
    });

    socket.on("leave-owner-room", (data: { ownerId: string | number }, callback?: (response: any) => void) => {
      if (!data.ownerId) {
        if (callback) callback({ error: "ownerId required" });
        return;
      }

      const ownerId = Number(data.ownerId);
      // Verify user is the owner or is an admin
      if (!user || (user.id !== ownerId && user.role !== "ADMIN")) {
        if (callback) callback({ error: "Unauthorized" });
        return;
      }

      const room = `owner:${ownerId}`;
      socket.leave(room);
      socket.leave(`user:${ownerId}`);
      console.log(`Owner ${ownerId} left room ${room}`);
      if (callback) callback({ status: "ok" });
    });

    // Handle admin room joining
    socket.on("join-admin-room", async (callback?: (response: any) => void) => {
      if (!user || user.role !== "ADMIN") {
        if (callback) callback({ error: "Unauthorized: Admin access required" });
        return;
      }

      socket.join("admin");
      console.log(`Admin ${user.id} joined admin room`);
      if (callback) callback({ status: "ok", room: "admin" });
    });

    // Handle admin room leaving
    socket.on("leave-admin-room", (callback?: (response: any) => void) => {
      if (!user || user.role !== "ADMIN") {
        if (callback) callback({ error: "Unauthorized: Admin access required" });
        return;
      }

      socket.leave("admin");
      console.log(`Admin ${user.id} left admin room`);
      if (callback) callback({ status: "ok" });
    });

    socket.on("disconnect", () => console.log("Socket disconnected", socket.id));
  });
}

function getIo(): SocketServer {
  if (!ioRef) throw new Error("Socket.IO server has not been initialized");
  return ioRef;
}

export function emitReferralUpdate(driverId: string | number, referralData: any): void {
  getIo().to(`driver:${driverId}`).emit("referral-update", referralData);
}

export function emitReferralNotification(driverId: string | number, notification: {
  type: "new_referral" | "referral_active" | "credits_earned";
  message: string;
  referralData?: any;
}): void {
  getIo().to(`driver:${driverId}`).emit("referral-notification", notification);
}
