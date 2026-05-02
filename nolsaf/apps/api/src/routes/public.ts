import { type Express, type RequestHandler } from "express";
import publicAvailabilityRouter from "./public.availability";
import publicBookingRouter from "./public.booking";
import publicBookingsRouter from "./public.bookings";
import publicCareersApplyRouter from "./public.careers.apply";
import publicCareersRouter from "./public.careers";
import { router as publicEmailVerify } from "./public.email.verify";
import publicInvoicesRouter from "./public.invoices";
import publicNolScopeRouter from "./public.nolscope";
import publicPlanRequestRouter from "./public.planRequest";
import publicPodcastsRouter from "./public.podcasts";
import publicPropertiesRouter from "./public.properties";
import publicSupportRouter from "./public.support";
import publicTourismSitesRouter from "./public.tourismSites";
import publicUpdatesRouter from "./public.updates";

export function registerPublicEmailVerifyRoute(app: Express): void {
  app.use("/api", publicEmailVerify);
}

export function registerPublicCareerRoutes(app: Express): void {
  app.use("/api/careers/apply", publicCareersApplyRouter);
  app.use("/api/public/careers", publicCareersRouter);
}

export function registerPublicContentRoutes(app: Express): void {
  app.use("/api/public/support", publicSupportRouter);
  app.use("/api/public/updates", publicUpdatesRouter);
  app.use("/api/public/podcasts", publicPodcastsRouter);
  app.use("/api/public/booking", publicBookingRouter);
  app.use("/api/public/bookings", publicBookingsRouter);
  app.use("/api/public/invoices", publicInvoicesRouter);
  app.use("/api/public/properties", publicPropertiesRouter);
  app.use("/api/public/tourism-sites", publicTourismSitesRouter);
  app.use("/api/public/nolscope", publicNolScopeRouter);
}

export function registerPublicPlanRequestRoute(app: Express): void {
  app.use("/api/plan-request", publicPlanRequestRouter);
}

export function registerPublicAvailabilityRoute(app: Express): void {
  app.use("/api/public/availability", publicAvailabilityRouter as RequestHandler);
}
