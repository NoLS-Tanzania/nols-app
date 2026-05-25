import type { Server as SocketServer } from "socket.io";
import { startExpireStaleBookings } from "./expireStaleBookings.js";
import { startOwnerBusinessLicenceExpiryReminders } from "./ownerBusinessLicenceExpiryReminders.js";
import { startTransportAutoDispatch } from "./transportAutoDispatch.js";

function shouldRunBackgroundWorkers(): boolean {
  if (process.env.NODE_ENV === "test") return false;
  return String(process.env.RUN_BACKGROUND_WORKERS || "").trim().toLowerCase() === "true";
}

export function startBackgroundWorkers(io: SocketServer): void {
  if (!shouldRunBackgroundWorkers()) {
    if (process.env.NODE_ENV !== "test") {
      console.log("[workers] Background workers disabled. Set RUN_BACKGROUND_WORKERS=true on exactly one worker process to enable them.");
    }
    return;
  }

  console.log("[workers] Background workers enabled for this process.");

  // Auto-assign near-term paid transport bookings. If no driver is assigned
  // within the grace window, the trip will later become claimable.
  startTransportAutoDispatch({ io });
  startOwnerBusinessLicenceExpiryReminders({ io });
  // Expire NEW bookings that were never paid within 30 minutes (anti-squatting).
  startExpireStaleBookings();
}
