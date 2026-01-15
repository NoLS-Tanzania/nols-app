import { Router, Request, Response } from "express";
import { prisma } from "@nolsaf/prisma";

export const healthRouter = Router();

/**
 * GET /health
 * Basic health check - returns 200 if server is running
 * Used by load balancers and monitoring tools
 */
healthRouter.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

/**
 * GET /ready
 * Readiness check - returns 200 if application is ready to serve traffic
 * Checks database connectivity
 * Used by Kubernetes readiness probes
 */
healthRouter.get("/ready", async (_req: Request, res: Response) => {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    res.status(200).json({
      status: "ready",
      timestamp: new Date().toISOString(),
      checks: {
        database: "ok",
      },
    });
  } catch (error: any) {
    res.status(503).json({
      status: "not ready",
      timestamp: new Date().toISOString(),
      checks: {
        database: "error",
      },
      error: process.env.NODE_ENV === "production" ? "Database connection failed" : error.message,
    });
  }
});

/**
 * GET /live
 * Liveness check - returns 200 if application is alive
 * Used by Kubernetes liveness probes
 * Should be lightweight and not check external dependencies
 */
healthRouter.get("/live", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "alive",
    timestamp: new Date().toISOString(),
  });
});
