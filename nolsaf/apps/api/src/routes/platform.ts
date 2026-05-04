import { type Express, type RequestHandler } from "express";
import requireRole from "../middleware/auth";
import { router as account } from "./account";
import authRoutes from "./auth";
import azampayPaymentsRouter from "./payments.azampay.js";
import bookingsRoutes from "./bookings";
import chatbotRouter from "./chatbot";
import conversationsRoutes from "./conversations";
import geocodingRouter from "./geocoding";
import groupBookingsRouter from "./groupBookings.js";
import propertyReviewsRouter from "./property.reviews";
import { router as upCld } from "./uploads.cloudinary";
import { router as upS3 } from "./uploads.s3";
import paymentWebhooksRouter from "./webhooks.payments";

export function registerUploadRoutes(app: Express): void {
  app.use("/uploads/cloudinary", upCld);
  app.use("/api/uploads/cloudinary", upCld);
  app.use("/uploads/s3", upS3);
  app.use("/api/uploads/s3", upS3);
}

export function registerAccountAuthRoutes(app: Express): void {
  app.use("/account", account as RequestHandler);
  app.use("/api/account", account as RequestHandler);
  app.use("/api/auth", authRoutes);
}

export function registerConversationBookingRoutes(app: Express): void {
  app.use("/api/conversations", requireRole() as RequestHandler, conversationsRoutes);
  app.use("/api/bookings", requireRole() as RequestHandler, bookingsRoutes);
}

export function registerPaymentRoutes(app: Express): void {
  app.use("/webhooks", paymentWebhooksRouter);
  app.use("/api/payments/azampay", azampayPaymentsRouter);
}

export function registerGeocodingRoute(app: Express): void {
  app.use("/api/geocoding", geocodingRouter as RequestHandler);
}

export function registerChatbotRoute(app: Express): void {
  app.use("/api/chatbot", chatbotRouter as RequestHandler);
}

export function registerGroupAndReviewRoutes(app: Express): void {
  app.use("/api/group-bookings", requireRole() as RequestHandler, groupBookingsRouter);
  app.use("/api/property-reviews", propertyReviewsRouter);
}
