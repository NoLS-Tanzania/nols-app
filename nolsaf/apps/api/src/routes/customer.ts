import { type Express, type RequestHandler } from "express";
import customerBookingsRouter from "./customer.bookings";
import customerCancellationsRouter from "./customer.cancellations";
import customerGroupStaysRouter from "./customer.groupStays";
import customerPlanRequestsRouter from "./customer.planRequests";
import customerRidesRouter from "./customer.rides";
import customerSavedPropertiesRouter from "./customer.savedProperties";

export function registerCustomerRoutes(app: Express): void {
  app.use("/api/customer/bookings", customerBookingsRouter as RequestHandler);
  app.use("/api/customer/cancellations", customerCancellationsRouter as RequestHandler);
  app.use("/api/customer/rides", customerRidesRouter as RequestHandler);
  app.use("/api/customer/group-stays", customerGroupStaysRouter as RequestHandler);
  app.use("/api/customer/saved-properties", customerSavedPropertiesRouter as RequestHandler);
  app.use("/api/customer/plan-requests", customerPlanRequestsRouter as RequestHandler);
}
