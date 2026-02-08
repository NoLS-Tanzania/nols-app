import "./env";
import express from 'express';
import http from 'http';
import morgan from 'morgan';
import { Server } from 'socket.io';
import authRoutes from './routes/auth';
import conversationsRoutes from './routes/conversations';
import bookingsRoutes from './routes/bookings';
import requireRole, { requireAuth } from './middleware/auth';
import { router as ownerRevenue } from "./routes/owner.revenue";
import { router as ownerReports } from "./routes/owner.reports";
import { configureSecurity } from "./security";
import { router as account } from "./routes/account";
import { router as adminEmail } from "./routes/admin.auth.email";
import { router as publicEmailVerify } from "./routes/public.email.verify";
import publicSupportRouter from './routes/public.support';
import publicUpdatesRouter from './routes/public.updates';
import publicBookingRouter from './routes/public.booking';
import publicBookingsRouter from './routes/public.bookings';
import publicInvoicesRouter from './routes/public.invoices';
import publicPropertiesRouter from './routes/public.properties';
import publicPlanRequestRouter from './routes/public.planRequest';
import { router as ownerPhone } from "./routes/owner.phone.verify";
import { router as ownerEmail } from "./routes/owner.email.verify";
import { router as upCld } from "./routes/uploads.cloudinary";
import { router as upS3 } from "./routes/uploads.s3";
import { adminAllowlist } from "./middleware/adminAllowlist";
import { router as ownerProperties } from "./routes/owner.properties";
import { router as ownerPropLayout } from "./routes/owner.properties.layout";
import adminBookingsRouter from "./routes/admin.bookings";
import { limitCodeSearch } from "./middleware/rateLimit.js";// apps/api/src/index.ts 
import adminRevenueRouter from "./routes/admin.revenue";
import adminInvoicesRouter from "./routes/admin.invoices";
import adminPaymentsRouter from "./routes/admin.payments";
import adminSettingsRouter from "./routes/admin.settings";
import paymentWebhooksRouter from "./routes/webhooks.payments";
import azampayPaymentsRouter from "./routes/payments.azampay.js";
import adminStatsRouter from "./routes/admin.stats";
import adminUsersRouter from "./routes/admin.users";
import adminUsersSummaryRouter from "./routes/admin.users.summary";
import adminUsersTransportBookingsRouter from "./routes/admin.users.transportBookings";
import adminHelpOwnersRouter from "./routes/admin.helpOwners";
import adminBonusesRouter from "./routes/admin.bonuses";
import adminOwnersRouter from "./routes/admin.owners.js";
import adminDriversRouter from "./routes/admin.drivers";
import adminDriversSummaryRouter from "./routes/admin.drivers.summary";
import adminDriversLevelsRouter from "./routes/admin.drivers.levels";
import adminDriversLevelMessagesRouter from "./routes/admin.drivers.level-messages";
import adminGroupStaysSummaryRouter from "./routes/admin.groupStays.summary";
import adminGroupStaysBookingsRouter from "./routes/admin.groupStays.bookings";
import adminGroupStaysRequestsRouter from "./routes/admin.groupStays.requests";
import adminGroupStaysPassengersRouter from "./routes/admin.groupStays.passengers";
import adminGroupStaysArrangementsRouter from "./routes/admin.groupStays.arrangements";
import adminGroupStaysRecommendationsRouter from "./routes/admin.groupStays.recommendations";
import adminGroupStaysAssignmentsRouter from "./routes/admin.groupStays.assignments";
import adminGroupStaysBookingsAuditRouter from "./routes/admin.groupStays.bookings.audit";
import adminGroupStaysClaimsRouter from "./routes/admin.groupStays.claims";
import adminPlanWithUsSummaryRouter from "./routes/admin.planWithUs.summary";
import adminPlanWithUsRequestsRouter from "./routes/admin.planWithUs.requests";
import adminAgentsRouter from "./routes/admin.agents";
import adminTrustPartnersRouter from "./routes/admin.trustPartners";
import adminPropertiesRouter from "./routes/admin.properties.js";
import adminAuditsRouter from "./routes/admin.audits";
import adminSummaryRouter from './routes/admin.summary';
import adminPerformanceHighlightsRouter from "./routes/admin.performance.highlights";
import adminNotificationsRouter from "./routes/admin.notifications";
import adminIntegrationsRouter from "./routes/admin.integrations";
import adminUpdatesRouter from "./routes/admin.updates";
import adminCancellationsRouter from "./routes/admin.cancellations";
import adminNo4pOtpRouter from "./routes/admin.no4pOtp";
import { router as adminCareersRouter } from "./routes/admin.careers";
import adminCareersApplicationsRouter from "./routes/admin.careers.applications";
import adminCareersStatsRouter from "./routes/admin.careers.stats";
import publicCareersApplyRouter from "./routes/public.careers.apply";
import publicCareersRouter from "./routes/public.careers";
import ownerMessagesRouter from './routes/owner.messages';
import ownerNotificationsRouter from './routes/owner.notifications';
import ownerAvailabilityRouter from './routes/owner.availability';
import { router as ownerBookingsRouter } from "./routes/owner.booking";
import ownerInvoicesRouter from "./routes/owner.invoices";
import ownerGroupStaysRouter from "./routes/owner.groupStays";
import ownerGroupStaysClaimsRouter from "./routes/owner.groupStays.claims";
import admin2faRouter from "./routes/admin.2fa.js";
import driverRouter from "./routes/driver.stats";
import driverRemindersRouter from './routes/driver.reminders';
import driverBonusRouter from './routes/driver.bonus';
import driverLevelRouter from './routes/driver.level';
import driverReferralRouter from './routes/driver.referral';
import driverReferralEarningsRouter from './routes/driver.referral-earnings';
import driverReferralPerformanceRouter from './routes/driver.referral-performance';
import driverMessagesRouter from './routes/driver.messages';
import driverMatchingRouter from './routes/driver.matching';
import driverPerformanceRouter from './routes/driver.performance';
import driverNotificationsRouter from './routes/driver.notifications';
import driverLicenseRouter from './routes/driver.license';
import groupBookingsRouter from "./routes/groupBookings.js";
import adminReferralEarningsRouter from './routes/admin.referral-earnings';
import propertyReviewsRouter from './routes/property.reviews';
import customerBookingsRouter from './routes/customer.bookings';
import customerRidesRouter from './routes/customer.rides';
import customerGroupStaysRouter from './routes/customer.groupStays';
import transportMessagesRouter from './routes/transport.messages';
import transportBookingsRouter from './routes/transport.bookings';
import driverScheduledRouter from './routes/driver.scheduled';
import geocodingRouter from './routes/geocoding';
import publicAvailabilityRouter from './routes/public.availability';
import customerSavedPropertiesRouter from './routes/customer.savedProperties';
import customerCancellationsRouter from "./routes/customer.cancellations";
import customerPlanRequestsRouter from "./routes/customer.planRequests";
import chatbotRouter from "./routes/chatbot";
import adminChatbotRouter from "./routes/admin.chatbot";
import { healthRouter } from "./routes/health";
import { socketAuthMiddleware, AuthenticatedSocket } from './middleware/socketAuth.js';
import { errorHandler } from './middleware/errorHandler.js';
import { adminOriginGuard } from "./middleware/adminOriginGuard.js";
import { performanceMiddleware } from './middleware/performance.js';
import { prisma } from "@nolsaf/prisma";
import { startTransportAutoDispatch } from "./workers/transportAutoDispatch.js";

// moved the POST handler to after the app is created
// Create app and server before using them
const app = express();

// Socket.IO must handle CORS/origin itself (separate from Express middleware).
// In production we keep it strict; in dev we allow localhost/127.0.0.1 on any port.
const socketLocalOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
];

const socketEnvOrigins = [
  process.env.WEB_ORIGIN || '',
  process.env.APP_ORIGIN || '',
  ...(process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()),
].filter(Boolean);

const socketAllowedOrigins = Array.from(new Set([...socketLocalOrigins, ...socketEnvOrigins]));

const isSocketOriginAllowed = (origin?: string | null): boolean => {
  if (!origin) return true;
  if (socketAllowedOrigins.includes(origin)) return true;
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
};

// Health check endpoints (must be before other routes for load balancer/probe access)
app.use("/", healthRouter);

// endpoint for codes search (uses rate-limit middleware)
app.post("/codes/search", limitCodeSearch, async (req, res) => {
  // TODO: implement actual search logic; keep a simple placeholder response to avoid runtime errors
  res.status(200).json({ message: "Codes search endpoint" });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      const isProduction = process.env.NODE_ENV === 'production';
      if (!origin) return callback(null, true);

      if (isProduction) {
        return callback(null, socketAllowedOrigins.includes(origin));
      }

      return callback(null, isSocketOriginAllowed(origin));
    },
    credentials: true,
    methods: ['GET', 'POST'],
  },
});

// Make io globally available for webhook routes and app context
(global as any).io = io;
app.set('io', io);

// Background worker: tries to auto-assign near-term paid transport bookings.
// If no driver is assigned within the grace window, the trip will later become claimable.
startTransportAutoDispatch({ io });

// Socket.IO authentication middleware
io.use(socketAuthMiddleware);

// Socket.IO handlers
io.on('connection', (socket: AuthenticatedSocket) => {
  const user = socket.data.user;
  console.log('Socket connected', socket.id, user ? `(user: ${user.id}, role: ${user.role})` : '(unauthenticated)');

  // Auto-join basic rooms for authenticated users so server-side emits can be scoped safely.
  // This avoids relying on every client to explicitly call join events.
  if (user?.id) {
    try { socket.join(`user:${user.id}`); } catch {}
    if (user.role === 'DRIVER') {
      try { socket.join(`driver:${user.id}`); } catch {}
      // Best-effort: join/leave the available-drivers room from DB state on connect.
      (async () => {
        try {
          const row = await prisma.user.findUnique({ where: { id: user.id }, select: { available: true, isAvailable: true } });
          const isAvailable = Boolean(row?.available ?? row?.isAvailable ?? false);
          if (isAvailable) socket.join('drivers:available');
          else socket.leave('drivers:available');
        } catch {
          // ignore
        }
      })();
    }
  }

  // Driver availability (socket): persists + updates room membership for offer broadcasts.
  // Payload: { available: boolean }
  socket.on('driver:availability:set', async (data: { available: boolean }, callback?: (response: any) => void) => {
    try {
      if (!user || user.role !== 'DRIVER') {
        if (callback) callback({ error: 'Unauthorized' });
        return;
      }
      const available = (data as any)?.available;
      if (typeof available !== 'boolean') {
        if (callback) callback({ error: 'available must be boolean' });
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
      if (available) socket.join('drivers:available');
      else socket.leave('drivers:available');

      // Notify interested clients (maps/admin dashboards).
      try {
        io.emit('driver:availability:update', { driverId: user.id, available });
      } catch {
        // ignore
      }

      if (callback) callback({ status: 'ok', available });
    } catch (e) {
      if (callback) callback({ error: 'failed' });
    }
  });
  
  // Handle driver room joining for referral updates
  socket.on('join-driver-room', async (data: { driverId: string | number }, callback?: (response: any) => void) => {
    if (!data.driverId) {
      if (callback) callback({ error: 'driverId required' });
      return;
    }
    
    const driverId = Number(data.driverId);
    // Verify user is the driver or an admin
    if (!user || (user.id !== driverId && user.role !== 'ADMIN')) {
      if (callback) callback({ error: 'Unauthorized' });
      return;
    }
    
    const room = `driver:${driverId}`;
    socket.join(room);
    console.log(`Driver ${driverId} joined room ${room}`);
    if (callback) callback({ status: 'ok', room });
  });

  // Handle driver room leaving
  socket.on('leave-driver-room', (data: { driverId: string | number }, callback?: (response: any) => void) => {
    if (!data.driverId) {
      if (callback) callback({ error: 'driverId required' });
      return;
    }
    
    const room = `driver:${data.driverId}`;
    socket.leave(room);
    if (callback) callback({ status: 'ok' });
  });

  // Handle property availability room joining (for real-time updates)
  socket.on('join-property-availability', async (data: { propertyId: string | number }, callback?: (response: any) => void) => {
    if (!data.propertyId) {
      if (callback) callback({ error: 'propertyId required' });
      return;
    }
    
    const propertyId = Number(data.propertyId);
    if (isNaN(propertyId)) {
      if (callback) callback({ error: 'Invalid propertyId' });
      return;
    }
    
    // Verify user is owner of property or admin
    if (user) {
      if (user.role === 'ADMIN') {
        const room = `property:${propertyId}:availability`;
        socket.join(room);
        console.log(`User ${user.id} (${user.role}) joined property availability room ${room}`);
        if (callback) callback({ status: 'ok', room });
        return;
      }
      
      if (user.role === 'OWNER') {
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
          if (callback) callback({ status: 'ok', room });
          return;
        }
      }
    }
    
    // Allow public connections to property availability (for real-time checking)
    const room = `property:${propertyId}:availability:public`;
    socket.join(room);
    console.log(`Public user joined property availability room ${room}`);
    if (callback) callback({ status: 'ok', room, public: true });
  });

  // Handle property availability room leaving
  socket.on('leave-property-availability', (data: { propertyId: string | number }, callback?: (response: any) => void) => {
    if (!data.propertyId) {
      if (callback) callback({ error: 'propertyId required' });
      return;
    }
    
    const propertyId = Number(data.propertyId);
    if (isNaN(propertyId)) {
      if (callback) callback({ error: 'Invalid propertyId' });
      return;
    }
    
    const room = `property:${propertyId}:availability`;
    const publicRoom = `property:${propertyId}:availability:public`;
    socket.leave(room);
    socket.leave(publicRoom);
    if (callback) callback({ status: 'ok' });
  });

  // Generic user room (customers/owners can join for inbox messages + notifications)
  socket.on('join-user-room', (data: { userId: string | number }, callback?: (response: any) => void) => {
    if (!data.userId) {
      if (callback) callback({ error: 'userId required' });
      return;
    }
    
    const userId = Number(data.userId);
    // Verify user is joining their own room or is an admin
    if (!user || (user.id !== userId && user.role !== 'ADMIN')) {
      if (callback) callback({ error: 'Unauthorized' });
      return;
    }
    
    const room = `user:${userId}`;
    socket.join(room);
    console.log(`User ${userId} joined room ${room}`);
    if (callback) callback({ status: 'ok', room });
  });

  socket.on('leave-user-room', (data: { userId: string | number }, callback?: (response: any) => void) => {
    if (!data.userId) {
      if (callback) callback({ error: 'userId required' });
      return;
    }
    
    const userId = Number(data.userId);
    // Verify user is leaving their own room or is an admin
    if (!user || (user.id !== userId && user.role !== 'ADMIN')) {
      if (callback) callback({ error: 'Unauthorized' });
      return;
    }
    
    const room = `user:${userId}`;
    socket.leave(room);
    console.log(`User ${userId} left room ${room}`);
    if (callback) callback({ status: 'ok' });
  });

  // Owner room (legacy convenience; also join user room)
  socket.on('join-owner-room', (data: { ownerId: string | number }, callback?: (response: any) => void) => {
    if (!data.ownerId) {
      if (callback) callback({ error: 'ownerId required' });
      return;
    }
    
    const ownerId = Number(data.ownerId);
    // Verify user is the owner or is an admin
    if (!user || (user.id !== ownerId && user.role !== 'ADMIN')) {
      if (callback) callback({ error: 'Unauthorized' });
      return;
    }
    
    const room = `owner:${ownerId}`;
    socket.join(room);
    socket.join(`user:${ownerId}`);
    console.log(`Owner ${ownerId} joined room ${room}`);
    if (callback) callback({ status: 'ok', room });
  });

  socket.on('leave-owner-room', (data: { ownerId: string | number }, callback?: (response: any) => void) => {
    if (!data.ownerId) {
      if (callback) callback({ error: 'ownerId required' });
      return;
    }
    
    const ownerId = Number(data.ownerId);
    // Verify user is the owner or is an admin
    if (!user || (user.id !== ownerId && user.role !== 'ADMIN')) {
      if (callback) callback({ error: 'Unauthorized' });
      return;
    }
    
    const room = `owner:${ownerId}`;
    socket.leave(room);
    socket.leave(`user:${ownerId}`);
    console.log(`Owner ${ownerId} left room ${room}`);
    if (callback) callback({ status: 'ok' });
  });

  // Handle admin room joining
  socket.on('join-admin-room', async (callback?: (response: any) => void) => {
    if (!user || user.role !== 'ADMIN') {
      if (callback) callback({ error: 'Unauthorized: Admin access required' });
      return;
    }
    
    socket.join('admin');
    console.log(`Admin ${user.id} joined admin room`);
    if (callback) callback({ status: 'ok', room: 'admin' });
  });

  // Handle admin room leaving
  socket.on('leave-admin-room', (callback?: (response: any) => void) => {
    if (!user || user.role !== 'ADMIN') {
      if (callback) callback({ error: 'Unauthorized: Admin access required' });
      return;
    }
    
    socket.leave('admin');
    console.log(`Admin ${user.id} left admin room`);
    if (callback) callback({ status: 'ok' });
  });

  socket.on('disconnect', () => console.log('Socket disconnected', socket.id));
});

// Helper function to emit referral updates to driver
export function emitReferralUpdate(driverId: string | number, referralData: any) {
  io.to(`driver:${driverId}`).emit('referral-update', referralData);
}

// Helper function to emit referral notification to driver
export function emitReferralNotification(driverId: string | number, notification: {
  type: 'new_referral' | 'referral_active' | 'credits_earned';
  message: string;
  referralData?: any;
}) {
  io.to(`driver:${driverId}`).emit('referral-notification', notification);
}

// Global security middleware (CSP, CORS, HPP, rate limit)
// configureSecurity already handles CORS with regex allowing localhost on any port
configureSecurity(app);

// Admin CSRF mitigation (production): block cross-site state-changing requests
app.use(adminOriginGuard as express.RequestHandler);

// Apply larger body size limit for property routes BEFORE global middleware
// This allows property submissions with multiple images and room specs
app.use("/owner/properties", express.json({ limit: "25mb", strict: true }));
app.use("/owner/properties", express.urlencoded({ extended: true, limit: "25mb", parameterLimit: 200 }));
app.use("/api/owner/properties", express.json({ limit: "25mb", strict: true }));
app.use("/api/owner/properties", express.urlencoded({ extended: true, limit: "25mb", parameterLimit: 200 }));

// JSON parser with size limits for security (applied after route-specific limits)
app.use(express.json({ 
  limit: "100kb", // Reduced from 1mb for better security
  strict: true,
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: "100kb",
  parameterLimit: 50,
}));
app.use(morgan('dev'));
// Performance monitoring middleware (should be early to capture all requests)
app.use(performanceMiddleware);
// generic rate limit already applied via configureSecurity; keep specific route limits where needed
app.use("/uploads/cloudinary", upCld);
// also expose API-prefixed route so frontend using `/api/uploads/cloudinary` works
app.use("/api/uploads/cloudinary", upCld);
app.use("/uploads/s3", upS3);
// also expose API-prefixed route so frontend using `/api/uploads/s3` works
app.use("/api/uploads/s3", upS3);
app.use("/owner/properties", ownerProperties);
app.use("/owner/properties", ownerPropLayout);
// also expose API-prefixed route so frontend using `/api/owner/properties` works
app.use("/api/owner/properties", ownerProperties);
app.use("/api/owner/properties", ownerPropLayout);
app.use("/account", account as express.RequestHandler);
// Prefer API-prefixed account routes for the web app (works with Next rewrites + cookies)
app.use("/api/account", account as express.RequestHandler);
app.use("/api", publicEmailVerify);
app.use('/api/auth', authRoutes);
app.use('/api/owner/reports', requireRole('OWNER') as express.RequestHandler, ownerReports);

// Optional but recommended: protect all admin endpoints behind IP allowlist (no-op unless configured).
app.use('/api/admin', adminAllowlist as express.RequestHandler);
app.use('/admin', adminAllowlist as express.RequestHandler);
// Removed duplicate registration - using adminPropertiesRouter below instead
// app.use('/api/admin/properties', requireRole('ADMIN') as express.RequestHandler, adminPropsRoutes);
app.use('/api/conversations', requireRole() as express.RequestHandler, conversationsRoutes);
app.use('/api/bookings', requireRole() as express.RequestHandler, bookingsRoutes);
app.use("/admin/bookings", adminBookingsRouter);
// also expose API-prefixed route so frontend using `/api/admin/bookings` works
app.use('/api/admin/bookings', adminBookingsRouter as express.RequestHandler);
app.use("/admin/invoices", adminInvoicesRouter);
// also expose API-prefixed route so frontend using `/api/admin/invoices` works
app.use('/api/admin/invoices', adminInvoicesRouter as express.RequestHandler);
app.use("/admin/revenue", adminRevenueRouter);
// also expose API-prefixed route so frontend using `/api/admin/revenue` works
app.use('/api/admin/revenue', adminRevenueRouter as express.RequestHandler);
app.use("/admin/payments", adminPaymentsRouter);
// also expose API-prefixed route so frontend using `/api/admin/payments` works
app.use('/api/admin/payments', adminPaymentsRouter as express.RequestHandler);
app.use("/admin/settings", adminSettingsRouter);
// also expose API-prefixed route so frontend using `/api/admin/settings` works
app.use('/api/admin/settings', adminSettingsRouter as express.RequestHandler);
// IMPORTANT: mount /admin/drivers/summary BEFORE /admin/drivers to avoid ":id" catching "summary"
app.use('/admin/drivers/summary', adminDriversSummaryRouter);
// also expose API-prefixed route so frontend using `/api/admin/drivers/summary` works
app.use('/api/admin/drivers/summary', adminDriversSummaryRouter as express.RequestHandler);
// expose levels routes under /api/admin as well (frontend uses /api/admin/drivers/levels)
app.use('/admin/drivers/levels', adminDriversLevelsRouter);
app.use('/api/admin/drivers/levels', adminDriversLevelsRouter as express.RequestHandler);
// also expose API-prefixed drivers router (includes trips, invoices, etc.)
// NOTE: keep this AFTER /api/admin/drivers/summary to avoid ":id" catching "summary"
app.use('/api/admin/drivers', adminDriversRouter as express.RequestHandler);
app.use("/admin/drivers", adminDriversRouter);
app.use('/api/admin/drivers/level-messages', requireRole('ADMIN') as express.RequestHandler, adminDriversLevelMessagesRouter);
app.use('/admin/group-stays/summary', adminGroupStaysSummaryRouter);
app.use('/api/admin/group-stays/summary', adminGroupStaysSummaryRouter);
app.use('/admin/group-stays/bookings', adminGroupStaysBookingsRouter);
app.use('/api/admin/group-stays/bookings', adminGroupStaysBookingsRouter);
app.use('/admin/group-stays/bookings', adminGroupStaysBookingsAuditRouter);
app.use('/api/admin/group-stays/bookings', adminGroupStaysBookingsAuditRouter);
app.use('/admin/group-stays/requests', adminGroupStaysRequestsRouter);
app.use('/api/admin/group-stays/requests', adminGroupStaysRequestsRouter);
app.use('/admin/group-stays/passengers', adminGroupStaysPassengersRouter);
app.use('/api/admin/group-stays/passengers', adminGroupStaysPassengersRouter);
app.use('/admin/group-stays/arrangements', adminGroupStaysArrangementsRouter);
app.use('/api/admin/group-stays/arrangements', adminGroupStaysArrangementsRouter);
app.use('/admin/group-stays/recommendations', adminGroupStaysRecommendationsRouter);
app.use('/api/admin/group-stays/recommendations', adminGroupStaysRecommendationsRouter);
app.use('/admin/group-stays/assignments', adminGroupStaysAssignmentsRouter);
app.use('/api/admin/group-stays/assignments', adminGroupStaysAssignmentsRouter);
app.use('/admin/group-stays/claims', adminGroupStaysClaimsRouter);
app.use('/api/admin/group-stays/claims', adminGroupStaysClaimsRouter);
app.use('/admin/plan-with-us/summary', adminPlanWithUsSummaryRouter);
app.use('/api/admin/plan-with-us/summary', adminPlanWithUsSummaryRouter);
app.use('/admin/plan-with-us/requests', adminPlanWithUsRequestsRouter);
app.use('/api/admin/plan-with-us/requests', adminPlanWithUsRequestsRouter);
app.use('/admin/agents', adminAgentsRouter);
app.use('/api/admin/agents', adminAgentsRouter);
app.use('/admin/trust-partners', adminTrustPartnersRouter);
// also expose API-prefixed route so frontend using `/api/admin/trust-partners` works
app.use('/api/admin/trust-partners', adminTrustPartnersRouter as express.RequestHandler);
app.use("/admin/stats", adminStatsRouter);
// IMPORTANT: mount specific /admin/users/* endpoints BEFORE the generic /admin/users router.
// Otherwise `/admin/users/:id` will catch paths like `/admin/users/summary` and `/admin/users/transport-bookings`.
app.use("/admin/users/summary", adminUsersSummaryRouter);
app.use('/api/admin/users/summary', adminUsersSummaryRouter as express.RequestHandler);
app.use("/admin/users/transport-bookings", adminUsersTransportBookingsRouter);
app.use('/api/admin/users/transport-bookings', adminUsersTransportBookingsRouter as express.RequestHandler);
app.use("/admin/users", adminUsersRouter);
// also expose API-prefixed route so frontend using `/api/admin/users` works
app.use('/api/admin/users', adminUsersRouter as express.RequestHandler);
app.use("/admin/help-owners", adminHelpOwnersRouter);
app.use("/admin/bonuses", adminBonusesRouter);
app.use("/admin/referral-earnings", adminReferralEarningsRouter);
app.use("/webhooks", paymentWebhooksRouter);
app.use("/api/payments/azampay", azampayPaymentsRouter);
app.use("/admin/owners", adminOwnersRouter);
// also expose API-prefixed route so frontend using `/api/admin/owners` works
app.use('/api/admin/owners', adminOwnersRouter as express.RequestHandler);
// Register admin properties routes
// The router already includes requireAuth and requireAdmin middleware
app.use("/admin/properties", adminPropertiesRouter);
// also expose API-prefixed route so frontend using `/api/admin/properties` works
app.use('/api/admin/properties', adminPropertiesRouter as express.RequestHandler);
// also expose non-api-prefixed route so Next rewrites `/admin/*` works
app.use('/admin/summary', requireRole('ADMIN') as express.RequestHandler, adminSummaryRouter as express.RequestHandler);
app.use('/api/admin/summary', requireRole('ADMIN') as express.RequestHandler, adminSummaryRouter as express.RequestHandler);
app.use('/admin/performance', requireRole('ADMIN') as express.RequestHandler, adminPerformanceHighlightsRouter as express.RequestHandler);
app.use('/api/admin/performance', requireRole('ADMIN') as express.RequestHandler, adminPerformanceHighlightsRouter as express.RequestHandler);
app.use('/api/admin/integrations', adminIntegrationsRouter as express.RequestHandler);
app.use('/api/admin/audits', requireRole('ADMIN') as express.RequestHandler, adminAuditsRouter as express.RequestHandler);
app.use('/api/admin/notifications', requireRole('ADMIN') as express.RequestHandler, adminNotificationsRouter as express.RequestHandler);
app.use('/api/admin/cancellations', requireRole('ADMIN') as express.RequestHandler, adminCancellationsRouter as express.RequestHandler);
app.use('/api/admin/no4p-otp', requireRole('ADMIN') as express.RequestHandler, adminNo4pOtpRouter as express.RequestHandler);
app.use('/api/admin/updates', adminUpdatesRouter as express.RequestHandler);
// Register applications routes BEFORE careers routes to avoid route conflicts
// More specific routes must come before parameterized routes
app.use('/admin/careers/applications', adminCareersApplicationsRouter);
app.use('/api/admin/careers/applications', adminCareersApplicationsRouter as express.RequestHandler);
app.use('/admin/careers/stats', adminCareersStatsRouter);
app.use('/api/admin/careers/stats', adminCareersStatsRouter as express.RequestHandler);
app.use('/admin/careers', adminCareersRouter);
app.use('/api/admin/careers', adminCareersRouter as express.RequestHandler);
app.use('/api/careers/apply', publicCareersApplyRouter);
app.use('/api/public/careers', publicCareersRouter);
app.use('/api/owner/revenue', requireRole('OWNER') as express.RequestHandler, ownerRevenue);
// Owner-scoped messages & notifications (demo implementations)
app.use('/api/owner/messages', requireRole('OWNER') as express.RequestHandler, ownerMessagesRouter as express.RequestHandler);
app.use('/api/owner/notifications', requireRole('OWNER') as express.RequestHandler, ownerNotificationsRouter as express.RequestHandler);
// Owner availability management (for external bookings)
// Note: ownerAvailabilityRouter already has requireAuth and requireRole("OWNER") applied
app.use('/api/owner/availability', ownerAvailabilityRouter as express.RequestHandler);
app.use('/api/admin/email', adminEmail);
// Driver-scoped endpoints (stats + map)
app.use('/api/driver', requireRole('DRIVER') as express.RequestHandler, driverRouter as express.RequestHandler);
// Driver reminders (list available to drivers; creation reserved for ADMIN)
app.use('/api/driver/reminders', driverRemindersRouter as express.RequestHandler);
// Driver bonus endpoints
app.use('/api/driver/bonus', requireRole('DRIVER') as express.RequestHandler, driverBonusRouter as express.RequestHandler);
// Driver level endpoints
app.use('/api/driver/level', requireRole('DRIVER') as express.RequestHandler, driverLevelRouter as express.RequestHandler);
// Driver referral endpoints
app.use('/api/driver/referral', requireRole('DRIVER') as express.RequestHandler, driverReferralRouter as express.RequestHandler);
// Driver referral earnings endpoints
app.use('/api/driver/referral-earnings', requireRole('DRIVER') as express.RequestHandler, driverReferralEarningsRouter as express.RequestHandler);
// Driver referral performance metrics
app.use('/api/driver/referral/performance', requireRole('DRIVER') as express.RequestHandler, driverReferralPerformanceRouter as express.RequestHandler);
// Driver messaging (prepared messages and send)
app.use('/api/driver/messages', requireRole('DRIVER') as express.RequestHandler, driverMessagesRouter as express.RequestHandler);
// Driver matching (find best driver for trip request)
app.use('/api/driver/matching', driverMatchingRouter as express.RequestHandler);
// Driver performance metrics for bonus eligibility
app.use('/api/driver/performance', requireRole('DRIVER') as express.RequestHandler, driverPerformanceRouter as express.RequestHandler);
// Driver notifications
app.use('/api/driver/notifications', requireRole('DRIVER') as express.RequestHandler, driverNotificationsRouter as express.RequestHandler);
// Driver license
app.use('/api/driver/license', requireRole('DRIVER') as express.RequestHandler, driverLicenseRouter as express.RequestHandler);
// Driver scheduled trips (claim system)
app.use('/api/driver/trips', driverScheduledRouter as express.RequestHandler);
app.use('/api/owner/phone', ownerPhone);
app.use('/api/owner/email', ownerEmail);
app.use("/admin/2fa", admin2faRouter);
app.use("/owner/bookings", ownerBookingsRouter);
app.use("/api/owner/bookings", ownerBookingsRouter);
// Owner invoices (create from booking, view, submit)
app.use("/owner/invoices", ownerInvoicesRouter as express.RequestHandler);
app.use("/api/owner/invoices", ownerInvoicesRouter as express.RequestHandler);
app.use("/owner/group-stays", ownerGroupStaysRouter as express.RequestHandler);
app.use("/api/owner/group-stays", ownerGroupStaysRouter as express.RequestHandler);
app.use("/owner/group-stays/claims", ownerGroupStaysClaimsRouter as express.RequestHandler);
app.use("/api/owner/group-stays/claims", ownerGroupStaysClaimsRouter as express.RequestHandler);
// Public support contact endpoint
app.use('/api/public/support', publicSupportRouter);
// Public updates endpoint
app.use('/api/public/updates', publicUpdatesRouter);
// Public booking view (for QR code scanning)
app.use('/api/public/booking', publicBookingRouter);
// Public booking creation (no auth required)
app.use('/api/public/bookings', publicBookingsRouter);
// Public invoice creation (no auth required)
app.use('/api/public/invoices', publicInvoicesRouter);
// Public properties (approved listings for public search/browse)
app.use('/api/public/properties', publicPropertiesRouter);
// Public plan request submission
app.use('/api/plan-request', publicPlanRequestRouter);
// Customer account endpoints (for travellers/customers)
app.use('/api/customer/bookings', customerBookingsRouter as express.RequestHandler);
app.use('/api/customer/cancellations', customerCancellationsRouter as express.RequestHandler);
app.use('/api/customer/rides', customerRidesRouter as express.RequestHandler);
app.use('/api/customer/group-stays', customerGroupStaysRouter as express.RequestHandler);
app.use('/api/customer/saved-properties', customerSavedPropertiesRouter as express.RequestHandler);
app.use('/api/customer/plan-requests', customerPlanRequestsRouter as express.RequestHandler);
// Transport booking messages (driver, passenger, admin communication)
app.use('/api/transport-bookings', transportMessagesRouter as express.RequestHandler);
// Transport bookings (create, get details)
app.use('/api/public/transport-bookings', transportBookingsRouter as express.RequestHandler);
app.use('/api/transport-bookings', requireAuth as express.RequestHandler, transportBookingsRouter as express.RequestHandler);
// Geocoding endpoints (forward/reverse geocoding, directions with traffic-aware routing)
app.use('/api/geocoding', geocodingRouter as express.RequestHandler);
// Public availability checking (for property/room availability)
app.use('/api/public/availability', publicAvailabilityRouter as express.RequestHandler);
// Chatbot endpoints (public, supports authenticated and anonymous users)
app.use('/api/chatbot', chatbotRouter as express.RequestHandler);
// Admin chatbot endpoints (for tracking and follow-up)
app.use('/api/admin/chatbot', adminChatbotRouter as express.RequestHandler);
// Group bookings (requires authentication)
app.use('/api/group-bookings', requireRole() as express.RequestHandler, groupBookingsRouter);
// Property reviews (public GET, authenticated POST)
app.use('/api/property-reviews', propertyReviewsRouter);

// 404 handler - must be after all routes
app.use((req: express.Request, res: express.Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({ error: 'Not found' });
});

// Error handler middleware (must be last, after all routes and 404 handler)
app.use(errorHandler);

export { app, server };

// Start server (skip during tests so Vitest can import this module safely)
if (process.env.NODE_ENV !== "test") {
  const PORT = Number(process.env.PORT) || 4000;
  const HOST = process.env.HOST; // if unset, let Node bind appropriately (supports IPv6 localhost on many systems)

  if (HOST) {
    server.listen(PORT, HOST, () => {
      console.log(`Server listening on http://${HOST}:${PORT}`);
    });
  } else {
    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  }

  server.on("error", (err) => {
    console.error("HTTP server error:", err);
  });
}

// Note: server and PORT are declared earlier; no duplicate server.listen here.
