import "./env";
import express from "express";
import http from "http";
import morgan from "morgan";
import { adminOriginGuard } from "./middleware/adminOriginGuard.js";
import { csrfProtection, csrfTokenHeader } from "./middleware/csrf.js";
import { performanceMiddleware } from "./middleware/performance.js";
import { getRedis } from "./lib/redis.js";
import {
  registerApiRoutes,
  registerEarlyRoutes,
  registerFallbackHandlers,
  registerRouteBodyParsers,
} from "./routes";
import { configureSecurity } from "./security";
import { createSocketServer } from "./sockets";
import { startBackgroundWorkers } from "./workers";

export { emitReferralNotification, emitReferralUpdate } from "./sockets";

const app = express();

registerEarlyRoutes(app);

const server = http.createServer(app);
const io = createSocketServer(server, app);
startBackgroundWorkers(io);

// Global security middleware (CSP, CORS, HPP, rate limit).
configureSecurity(app);

// Admin CSRF mitigation (production): block cross-site state-changing requests.
app.use(adminOriginGuard as express.RequestHandler);
// Compatibility-safe CSRF layer: emits tokens on GET and blocks explicit cross-site
// cookie-auth mutations while existing same-site app requests continue to work.
app.use(csrfTokenHeader as express.RequestHandler);
app.use(csrfProtection as express.RequestHandler);

registerRouteBodyParsers(app);

// JSON parser with size limits for security (applied after route-specific limits).
app.use(express.json({
  limit: "100kb",
  strict: true,
}));
app.use(express.urlencoded({
  extended: true,
  limit: "100kb",
  parameterLimit: 50,
}));
app.use(morgan("dev"));
// Performance monitoring middleware should be early to capture all requests.
app.use(performanceMiddleware);

// Generic rate limit is already applied via configureSecurity; route-specific
// limits are kept inside the mounted routers/route registrar.
registerApiRoutes(app);
registerFallbackHandlers(app);

export { app, server };

// Start server (skip during tests so Vitest can import this module safely).
if (process.env.NODE_ENV !== "test") {
  // Eagerly initialize Redis so the client reaches "ready" before the first
  // request; otherwise lazyConnect keeps it at "wait" and cache checks are bypassed.
  getRedis();

  const PORT = Number(process.env.PORT) || 4000;
  const HOST = process.env.HOST;

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
