import { type Express, type RequestHandler } from "express";
import { requireAuth } from "../middleware/auth";
import transportBookingsRouter from "./transport.bookings";
import transportMessagesRouter from "./transport.messages";

export function registerTransportRoutes(app: Express): void {
  app.use("/api/transport-bookings", transportMessagesRouter as RequestHandler);
  app.use("/api/public/transport-bookings", transportBookingsRouter as RequestHandler);
  app.use("/api/transport-bookings", requireAuth as RequestHandler, transportBookingsRouter as RequestHandler);
}
