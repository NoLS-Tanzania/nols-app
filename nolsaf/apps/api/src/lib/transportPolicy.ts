export const MIN_TRANSPORT_LEAD_MS = 1 * 60 * 1000; // allow 1–10 minute immediate rides

// During this window, the system attempts automatic driver allocation.
// If no driver is assigned by the end of the grace window, the trip becomes claimable.
export const AUTO_DISPATCH_GRACE_MS = 10 * 60 * 1000;

// Only try auto-dispatch for rides that are happening soon.
export const AUTO_DISPATCH_LOOKAHEAD_MS = 20 * 60 * 1000;

export function clampDateMin(date: Date, minDate: Date): Date {
  return date.getTime() >= minDate.getTime() ? date : minDate;
}
