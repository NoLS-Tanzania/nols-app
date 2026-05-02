import { type Express, type RequestHandler } from "express";
import requireRole from "../middleware/auth";
import { router as ownerBookingsRouter } from "./owner.booking";
import { router as ownerEmail } from "./owner.email.verify";
import ownerGroupStaysClaimsRouter from "./owner.groupStays.claims";
import ownerGroupStaysRouter from "./owner.groupStays";
import ownerInvoicesRouter from "./owner.invoices";
import ownerMessagesRouter from "./owner.messages";
import ownerNotificationsRouter from "./owner.notifications";
import { router as ownerPhone } from "./owner.phone.verify";
import { router as ownerProperties } from "./owner.properties";
import { router as ownerPropLayout } from "./owner.properties.layout";
import { router as ownerReports } from "./owner.reports";
import { router as ownerRevenue } from "./owner.revenue";
import ownerAvailabilityRouter from "./owner.availability";

export function registerOwnerPropertyRoutes(app: Express): void {
  app.use("/owner/properties", ownerProperties);
  app.use("/owner/properties", ownerPropLayout);
  app.use("/api/owner/properties", ownerProperties);
  app.use("/api/owner/properties", ownerPropLayout);
}

export function registerOwnerReportsRoute(app: Express): void {
  app.use("/api/owner/reports", requireRole("OWNER") as RequestHandler, ownerReports);
}

export function registerOwnerBusinessRoutes(app: Express): void {
  app.use("/api/owner/revenue", requireRole("OWNER") as RequestHandler, ownerRevenue);
  app.use("/api/owner/messages", requireRole("OWNER") as RequestHandler, ownerMessagesRouter as RequestHandler);
  app.use("/api/owner/notifications", requireRole("OWNER") as RequestHandler, ownerNotificationsRouter as RequestHandler);
  app.use("/api/owner/availability", ownerAvailabilityRouter as RequestHandler);
}

export function registerOwnerContactRoutes(app: Express): void {
  app.use("/api/owner/phone", ownerPhone);
  app.use("/api/owner/email", ownerEmail);
}

export function registerOwnerBookingRoutes(app: Express): void {
  app.use("/owner/bookings", ownerBookingsRouter);
  app.use("/api/owner/bookings", ownerBookingsRouter);
  app.use("/owner/invoices", ownerInvoicesRouter as RequestHandler);
  app.use("/api/owner/invoices", ownerInvoicesRouter as RequestHandler);
  app.use("/owner/group-stays", ownerGroupStaysRouter as RequestHandler);
  app.use("/api/owner/group-stays", ownerGroupStaysRouter as RequestHandler);
  app.use("/owner/group-stays/claims", ownerGroupStaysClaimsRouter as RequestHandler);
  app.use("/api/owner/group-stays/claims", ownerGroupStaysClaimsRouter as RequestHandler);
}
