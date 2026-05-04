import express, { type Express, type Request, type Response } from "express";
import { errorHandler } from "../middleware/errorHandler.js";
import { limitCodeSearch } from "../middleware/rateLimit.js";
import { healthRouter } from "./health";

export function registerEarlyRoutes(app: Express): void {
  // Health check endpoints must stay before other routes for load balancer/probe access.
  app.use("/", healthRouter);

  app.post("/codes/search", limitCodeSearch, async (_req, res) => {
    // TODO: implement actual search logic; keep a simple placeholder response to avoid runtime errors.
    res.status(200).json({ message: "Codes search endpoint" });
  });
}

export function registerRouteBodyParsers(app: Express): void {
  // Apply larger body size limit for property routes BEFORE global middleware.
  app.use("/owner/properties", express.json({ limit: "25mb", strict: true }));
  app.use("/owner/properties", express.urlencoded({ extended: true, limit: "25mb", parameterLimit: 200 }));
  app.use("/api/owner/properties", express.json({ limit: "25mb", strict: true }));
  app.use("/api/owner/properties", express.urlencoded({ extended: true, limit: "25mb", parameterLimit: 200 }));
}

export function registerFallbackHandlers(app: Express): void {
  app.use((req: Request, res: Response) => {
    res.setHeader("Content-Type", "application/json");
    res.status(404).json({ error: "Not found" });
  });

  app.use(errorHandler);
}
