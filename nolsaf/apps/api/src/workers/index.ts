import type { Server as SocketServer } from "socket.io";
import { startExpireStaleBookings } from "./expireStaleBookings.js";
import { startOwnerBusinessLicenceExpiryReminders } from "./ownerBusinessLicenceExpiryReminders.js";
import { startTransportAutoDispatch } from "./transportAutoDispatch.js";

export function startBackgroundWorkers(io: SocketServer): void {
  if (process.env.NODE_ENV === "test") return;

  // Auto-assign near-term paid transport bookings. If no driver is assigned
  // within the grace window, the trip will later become claimable.
  startTransportAutoDispatch({ io });
  startOwnerBusinessLicenceExpiryReminders({ io });
  // Expire NEW bookings that were never paid within 30 minutes (anti-squatting).
  startExpireStaleBookings();
}
