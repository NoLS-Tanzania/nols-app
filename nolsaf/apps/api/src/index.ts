import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
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
// import { router as ownerPhone } from "./routes/owner.phone.verify";
import { router as upCld } from "./routes/uploads.cloudinary";
import { router as upS3 } from "./routes/uploads.s3";
import { adminAllowlist } from "./middleware/adminAllowlist";
import { router as ownerProperties } from "./routes/owner.properties";
import { router as ownerPropLayout } from "./routes/owner.properties.layout";
import adminBookingsRouter from "./routes/admin.bookings";
import { limitCodeSearch } from "./middleware/rateLimit.js";// apps/api/src/index.ts 
import adminRevenueRouter from "./routes/admin.revenue";
import adminPaymentsRouter from "./routes/admin.payments";
import paymentWebhooksRouter from "./routes/webhooks.payments";
import adminStatsRouter from "./routes/admin.stats";
import adminUsersRouter from "./routes/admin.users";
import adminBonusesRouter from "./routes/admin.bonuses";
import adminOwnersRouter from "./routes/admin.owners.js";
import adminPropertiesRouter from "./routes/admin.properties.js";
import adminAuditsRouter from "./routes/admin.audits";
import adminNotificationsRouter from "./routes/admin.notifications";
import ownerMessagesRouter from './routes/owner.messages';
import ownerNotificationsRouter from './routes/owner.notifications';
import { router as ownerBookingsRouter } from "./routes/owner.booking";
import admin2faRouter from "./routes/admin.2fa.js";
import driverRouter from "./routes/driver.stats";

// moved the POST handler to after the app is created
// Create app and server before using them
const app = express();

// endpoint for codes search (uses rate-limit middleware)
app.post("/codes/search", limitCodeSearch, async (req, res) => {
  // TODO: implement actual search logic; keep a simple placeholder response to avoid runtime errors
  res.status(200).json({ message: "Codes search endpoint" });
});

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// Socket.IO handlers
io.on('connection', (socket) => {
  console.log('Socket connected', socket.id);
  socket.on('disconnect', () => console.log('Socket disconnected', socket.id));
});

// Global security middleware (CSP, CORS, HPP, rate limit)
configureSecurity(app);

// CORS: always allow local dev + any values from CORS_ORIGIN
const DEFAULT_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
];
const ENV_ORIGINS = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean)
  : [];
const ALLOWED_ORIGINS = Array.from(new Set([...DEFAULT_ORIGINS, ...ENV_ORIGINS]));

const corsOptions: cors.CorsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true); // non-browser or same-origin
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  credentials: true,
  methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
};
// app-level cors is already applied in configureSecurity; also enable explicit whitelisting
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// JSON parser (keep small limit); note: raw body handled below for webhooks
app.use(express.json({ limit: "1mb" }));
app.use(morgan('dev'));
// generic rate limit already applied via configureSecurity; keep specific route limits where needed
app.use("/uploads/cloudinary", upCld);
app.use("/uploads/s3", upS3);
app.use("/owner/properties", ownerProperties);
app.use("/owner/properties", ownerPropLayout);
app.use("/account", account as express.RequestHandler);
app.use("/api", publicEmailVerify);
app.use('/api/auth', authRoutes);
app.use('/api/owner/reports', requireRole('OWNER') as express.RequestHandler, ownerReports);
app.use('/api/admin/properties', requireRole('ADMIN') as express.RequestHandler, adminPropsRoutes);
app.use('/api/conversations', requireRole() as express.RequestHandler, conversationsRoutes);
app.use('/api/bookings', requireRole() as express.RequestHandler, bookingsRoutes);
app.use("/admin/bookings", adminBookingsRouter);
app.use("/admin/revenue", adminRevenueRouter);
app.use("/admin/payments", adminPaymentsRouter);
app.use("/admin/stats", adminStatsRouter);
app.use("/admin/users", adminUsersRouter);
app.use("/admin/bonuses", adminBonusesRouter);
app.use("/webhooks", paymentWebhooksRouter);
app.use("/admin/owners", adminOwnersRouter);
app.use("/admin/properties", adminPropertiesRouter);
app.use('/api/admin/audits', requireRole('ADMIN') as express.RequestHandler, adminAuditsRouter as express.RequestHandler);
app.use('/api/admin/notifications', requireRole('ADMIN') as express.RequestHandler, adminNotificationsRouter as express.RequestHandler);
app.use('/api/owner/revenue', requireRole('OWNER') as express.RequestHandler, ownerRevenue);
// Owner-scoped messages & notifications (demo implementations)
app.use('/api/owner/messages', requireRole('OWNER') as express.RequestHandler, ownerMessagesRouter as express.RequestHandler);
app.use('/api/owner/notifications', requireRole('OWNER') as express.RequestHandler, ownerNotificationsRouter as express.RequestHandler);
app.use('/api/admin/email', adminAllowlist, adminEmail);
// Driver-scoped endpoints (stats + map)
app.use('/api/driver', requireRole('DRIVER') as express.RequestHandler, driverRouter as express.RequestHandler);
// app.use('/api/owner/phone', ownerPhone);
app.use("/admin/2fa", admin2faRouter);
app.use("/owner/bookings", ownerBookingsRouter);
// Public support contact endpoint
app.use('/api/public/support', publicSupportRouter);

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
