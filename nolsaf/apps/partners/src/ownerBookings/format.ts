import { OwnerBooking } from "./types";

export function toNumber(value: unknown): number {
  const n = Number(typeof value === "string" ? value.replace(/,/g, "") : value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function bookingAmount(booking: OwnerBooking): number {
  const owner = toNumber(booking.ownerBaseAmount);
  if (owner > 0) return owner;
  const total = toNumber(booking.totalAmount);
  const transport = toNumber(booking.transportFare);
  return Math.max(0, total - transport);
}

export function formatTzs(value: unknown): string {
  const n = toNumber(value);
  if (!Number.isFinite(n) || n <= 0) return "TSh 0";
  return `TSh ${Math.round(n).toLocaleString("en-US")}`;
}

/** Short form: TSh 22.8M / TSh 836K / TSh 500 */
export function formatTzsCompact(value: unknown): string {
  const n = toNumber(value);
  if (!Number.isFinite(n) || n <= 0) return "TSh 0";
  if (n >= 1_000_000) return `TSh ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `TSh ${(n / 1_000).toFixed(0)}K`;
  return `TSh ${Math.round(n)}`;
}

export function formatDate(value: unknown): string {
  const d = new Date(String(value ?? ""));
  if (!Number.isFinite(d.getTime())) return "Not set";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatShortDate(value: unknown): string {
  const d = new Date(String(value ?? ""));
  if (!Number.isFinite(d.getTime())) return "Not set";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function nightsBetween(checkIn: unknown, checkOut: unknown): number {
  const a = new Date(String(checkIn ?? "")).getTime();
  const b = new Date(String(checkOut ?? "")).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 1;
  return Math.max(1, Math.ceil((b - a) / 86400000));
}

export function propertyTitle(booking: OwnerBooking): string {
  if (typeof booking.property === "string") return booking.property;
  return booking.property?.title || "Property";
}

export function guestName(booking: OwnerBooking): string {
  return booking.guestName || booking.customerName || "Guest";
}

export function guestPhone(booking: OwnerBooking): string {
  return booking.guestPhone || booking.phone || "";
}

export function bookingCode(booking: OwnerBooking): string {
  return booking.code?.codeVisible || booking.codeVisible || booking.roomCode || `#${booking.id}`;
}

export function normalizedStatus(booking: OwnerBooking): string {
  return String(booking.status || "UNKNOWN").toUpperCase();
}
