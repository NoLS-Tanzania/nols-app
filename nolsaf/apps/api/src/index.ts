import 'dotenv/config';
import express from 'express';
import http from 'http';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { Server } from 'socket.io';
import authRoutes from './routes/auth';
import { router as ownerPropsRoutes } from "./routes/owner.properties";
import { router as adminPropsRoutes } from './routes/admin.properties';
import conversationsRoutes from './routes/conversations';
import bookingsRoutes from './routes/bookings';
import requireRole from './middleware/auth';
import { router as ownerRevenue } from "./routes/owner.revenue";
import { router as ownerReports } from "./routes/owner.reports";
import rateLimit from "express-rate-limit";
import { configureSecurity } from "./security";
import { router as account } from "./routes/account";
import { router as adminEmail } from "./routes/admin.auth.email";
import { router as publicEmailVerify } from "./routes/public.email.verify";
import publicSupportRouter from './routes/public.support';
import publicUpdatesRouter from './routes/public.updates';
import publicBookingRouter from './routes/public.booking';
import publicPropertiesRouter from './routes/public.properties';
// import { router as ownerPhone } from "./routes/owner.phone.verify";
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
import adminPlanWithUsSummaryRouter from "./routes/admin.planWithUs.summary";
import adminPlanWithUsRequestsRouter from "./routes/admin.planWithUs.requests";
import adminTrustPartnersRouter from "./routes/admin.trustPartners";
import adminPropertiesRouter from "./routes/admin.properties.js";
import adminAuditsRouter from "./routes/admin.audits";
import adminSummaryRouter from './routes/admin.summary';
import adminNotificationsRouter from "./routes/admin.notifications";
import adminUpdatesRouter from "./routes/admin.updates";
import adminCancellationsRouter from "./routes/admin.cancellations";
import { router as adminCareersRouter } from "./routes/admin.careers";
import adminCareersApplicationsRouter from "./routes/admin.careers.applications";
import adminCareersStatsRouter from "./routes/admin.careers.stats";
import publicCareersApplyRouter from "./routes/public.careers.apply";
import ownerMessagesRouter from './routes/owner.messages';
import ownerNotificationsRouter from './routes/owner.notifications';
import { router as ownerBookingsRouter } from "./routes/owner.booking";
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
import customerCancellationsRouter from "./routes/customer.cancellations";

// moved the POST handler to after the app is created
// Create app and server before using them
const app = express();

// Allow local web origin (Next.js dev) to call the API
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3001',
  process.env.WEB_ORIGIN || '',
  process.env.APP_ORIGIN || '',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.length === 0) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all for development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-role'],
}));
app.options('*', cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.length === 0) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-role'],
}));

// endpoint for codes search (uses rate-limit middleware)
app.post("/codes/search", limitCodeSearch, async (req, res) => {
  // TODO: implement actual search logic; keep a simple placeholder response to avoid runtime errors
  res.status(200).json({ message: "Codes search endpoint" });
});

const server = http.createServer(app);
const io = new Server(server, { 
  cors: { 
    origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
    credentials: true,
    methods: ['GET', 'POST'],
  } 
});

// Make io globally available for webhook routes
(global as any).io = io;

// Socket.IO handlers
io.on('connection', (socket) => {
  console.log('Socket connected', socket.id);
  
  // Handle driver room joining for referral updates
  socket.on('join-driver-room', async (data: { driverId: string | number }) => {
    if (data.driverId) {
      const room = `driver:${data.driverId}`;
      socket.join(room);
      console.log(`Driver ${data.driverId} joined room ${room}`);
    }
  });

  // Handle driver room leaving
  socket.on('leave-driver-room', (data: { driverId: string | number }) => {
    if (data.driverId) {
      const room = `driver:${data.driverId}`;
      socket.leave(room);
      console.log(`Driver ${data.driverId} left room ${room}`);
    }
  });

  // Generic user room (customers/owners can join for inbox messages + notifications)
  socket.on('join-user-room', (data: { userId: string | number }) => {
    if (data.userId) {
      const room = `user:${data.userId}`;
      socket.join(room);
      console.log(`User ${data.userId} joined room ${room}`);
    }
  });

  socket.on('leave-user-room', (data: { userId: string | number }) => {
    if (data.userId) {
      const room = `user:${data.userId}`;
      socket.leave(room);
      console.log(`User ${data.userId} left room ${room}`);
    }
  });

  // Owner room (legacy convenience; also join user room)
  socket.on('join-owner-room', (data: { ownerId: string | number }) => {
    if (data.ownerId) {
      const room = `owner:${data.ownerId}`;
      socket.join(room);
      socket.join(`user:${data.ownerId}`);
      console.log(`Owner ${data.ownerId} joined room ${room}`);
    }
  });

  socket.on('leave-owner-room', (data: { ownerId: string | number }) => {
    if (data.ownerId) {
      const room = `owner:${data.ownerId}`;
      socket.leave(room);
      socket.leave(`user:${data.ownerId}`);
      console.log(`Owner ${data.ownerId} left room ${room}`);
    }
  });

  // Handle admin room joining
  socket.on('join-admin-room', async () => {
    socket.join('admin');
    console.log(`Admin joined admin room`);
  });

  // Handle admin room leaving
  socket.on('leave-admin-room', () => {
    socket.leave('admin');
    console.log(`Admin left admin room`);
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

// JSON parser (keep small limit); note: raw body handled below for webhooks
app.use(express.json({ limit: "1mb" }));
app.use(morgan('dev'));
// generic rate limit already applied via configureSecurity; keep specific route limits where needed
app.use("/uploads/cloudinary", upCld);
app.use("/uploads/s3", upS3);
app.use("/owner/properties", ownerProperties);
app.use("/owner/properties", ownerPropLayout);
app.use("/account", account as express.RequestHandler);
// Prefer API-prefixed account routes for the web app (works with Next rewrites + cookies)
app.use("/api/account", account as express.RequestHandler);
app.use("/api", publicEmailVerify);
app.use('/api/auth', authRoutes);
app.use('/api/owner/reports', requireRole('OWNER') as express.RequestHandler, ownerReports);
app.use('/api/admin/properties', requireRole('ADMIN') as express.RequestHandler, adminPropsRoutes);
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
app.use("/admin/settings", adminSettingsRouter);
// IMPORTANT: mount /admin/drivers/summary BEFORE /admin/drivers to avoid ":id" catching "summary"
app.use('/admin/drivers/summary', adminDriversSummaryRouter);
// also expose API-prefixed route so frontend using `/api/admin/drivers/summary` works
app.use('/api/admin/drivers/summary', adminDriversSummaryRouter as express.RequestHandler);
// also expose API-prefixed drivers router (includes trips, invoices, etc.)
// NOTE: keep this AFTER /api/admin/drivers/summary to avoid ":id" catching "summary"
app.use('/api/admin/drivers', adminDriversRouter as express.RequestHandler);
app.use("/admin/drivers", adminDriversRouter);
app.use('/admin/drivers/levels', adminDriversLevelsRouter);
app.use('/api/admin/drivers/level-messages', adminAllowlist, requireRole('ADMIN') as express.RequestHandler, adminDriversLevelMessagesRouter);
app.use('/admin/group-stays/summary', adminGroupStaysSummaryRouter);
app.use('/admin/group-stays/bookings', adminGroupStaysBookingsRouter);
app.use('/admin/group-stays/requests', adminGroupStaysRequestsRouter);
app.use('/admin/group-stays/passengers', adminGroupStaysPassengersRouter);
app.use('/admin/group-stays/arrangements', adminGroupStaysArrangementsRouter);
app.use('/admin/plan-with-us/summary', adminPlanWithUsSummaryRouter);
app.use('/admin/plan-with-us/requests', adminPlanWithUsRequestsRouter);
app.use('/admin/trust-partners', adminTrustPartnersRouter);
// also expose API-prefixed route so frontend using `/api/admin/trust-partners` works
app.use('/api/admin/trust-partners', adminTrustPartnersRouter as express.RequestHandler);
app.use("/admin/stats", adminStatsRouter);
app.use("/admin/users", adminUsersRouter);
// also expose API-prefixed route so frontend using `/api/admin/users` works
app.use('/api/admin/users', adminUsersRouter as express.RequestHandler);
app.use("/admin/users/summary", adminUsersSummaryRouter);
app.use("/admin/users/transport-bookings", adminUsersTransportBookingsRouter);
app.use("/admin/help-owners", adminHelpOwnersRouter);
app.use("/admin/bonuses", adminBonusesRouter);
app.use("/admin/referral-earnings", adminReferralEarningsRouter);
app.use("/webhooks", paymentWebhooksRouter);
app.use("/api/payments/azampay", azampayPaymentsRouter);
app.use("/admin/owners", adminOwnersRouter);
// also expose API-prefixed route so frontend using `/api/admin/owners` works
app.use('/api/admin/owners', adminOwnersRouter as express.RequestHandler);
app.use("/admin/properties", adminPropertiesRouter);
// also expose API-prefixed route so frontend using `/api/admin/properties` works
app.use('/api/admin/properties', adminPropertiesRouter as express.RequestHandler);
// also expose non-api-prefixed route so Next rewrites `/admin/*` works
app.use('/admin/summary', requireRole('ADMIN') as express.RequestHandler, adminSummaryRouter as express.RequestHandler);
app.use('/api/admin/summary', requireRole('ADMIN') as express.RequestHandler, adminSummaryRouter as express.RequestHandler);
app.use('/api/admin/audits', requireRole('ADMIN') as express.RequestHandler, adminAuditsRouter as express.RequestHandler);
app.use('/api/admin/notifications', requireRole('ADMIN') as express.RequestHandler, adminNotificationsRouter as express.RequestHandler);
app.use('/api/admin/cancellations', requireRole('ADMIN') as express.RequestHandler, adminCancellationsRouter as express.RequestHandler);
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
app.use('/api/owner/revenue', requireRole('OWNER') as express.RequestHandler, ownerRevenue);
// Owner-scoped messages & notifications (demo implementations)
app.use('/api/owner/messages', requireRole('OWNER') as express.RequestHandler, ownerMessagesRouter as express.RequestHandler);
app.use('/api/owner/notifications', requireRole('OWNER') as express.RequestHandler, ownerNotificationsRouter as express.RequestHandler);
app.use('/api/admin/email', adminAllowlist, adminEmail);
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
// app.use('/api/owner/phone', ownerPhone);
app.use("/admin/2fa", admin2faRouter);
app.use("/owner/bookings", ownerBookingsRouter);
// Public support contact endpoint
app.use('/api/public/support', publicSupportRouter);
// Public updates endpoint
app.use('/api/public/updates', publicUpdatesRouter);
// Public booking view (for QR code scanning)
app.use('/api/public/booking', publicBookingRouter);
// Public properties (approved listings for public search/browse)
app.use('/api/public/properties', publicPropertiesRouter);
// Customer account endpoints (for travellers/customers)
app.use('/api/customer/bookings', customerBookingsRouter as express.RequestHandler);
app.use('/api/customer/cancellations', customerCancellationsRouter as express.RequestHandler);
app.use('/api/customer/rides', customerRidesRouter as express.RequestHandler);
app.use('/api/customer/group-stays', customerGroupStaysRouter as express.RequestHandler);
// Group bookings (requires authentication)
app.use('/api/group-bookings', requireRole() as express.RequestHandler, groupBookingsRouter);
// Property reviews (public GET, authenticated POST)
app.use('/api/property-reviews', propertyReviewsRouter);

// Start server
const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '0.0.0.0';
server.listen(PORT, HOST, () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
});

server.on('error', (err) => {
  console.error('HTTP server error:', err);
});

// keep raw body for specific routes
function rawBodySaver(req: any, _res: any, buf: Buffer) {
  if (buf && buf.length) req.rawBody = buf.toString("utf8");
}

// JSON for normal routes (skip raw parsing for webhooks)
app.use((req, res, next) => {
  if (req.path.startsWith("/webhooks/")) return next();
  express.json({ limit: "1mb", verify: rawBodySaver })(req, res, next);
});

// expose socket.io instance to routers
app.set("io", io);


// health check
app.get("/health", (_req, res) => res.json({ ok: true }));

// Note: server and PORT are declared earlier; no duplicate server.listen here.
