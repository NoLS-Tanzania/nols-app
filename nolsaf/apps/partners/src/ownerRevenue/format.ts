import { OwnerRevenueInvoice } from "./types";

export function toRevenueNumber(value: unknown): number {
  const n = Number(typeof value === "string" ? value.replace(/,/g, "") : value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export function invoicePayout(invoice: OwnerRevenueInvoice): number {
  const net = toRevenueNumber(invoice.netPayable);
  if (net > 0) return net;
  return toRevenueNumber(invoice.total);
}

export function formatTzs(value: unknown): string {
  const n = toRevenueNumber(value);
  if (!Number.isFinite(n) || n <= 0) return "TSh 0";
  return `TSh ${Math.round(n).toLocaleString("en-US")}`;
}

/** Short form: TSh 26.2M / TSh 836K / TSh 500 — use where space is tight */
export function formatTzsCompact(value: unknown): string {
  const n = toRevenueNumber(value);
  if (!Number.isFinite(n) || n <= 0) return "TSh 0";
  if (n >= 1_000_000) return `TSh ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `TSh ${(n / 1_000).toFixed(0)}K`;
  return `TSh ${Math.round(n)}`;
}

export function formatRevenueDate(value: unknown): string {
  const d = new Date(String(value ?? ""));
  if (!Number.isFinite(d.getTime())) return "Not set";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatRevenueDatetime(value: unknown): string {
  const d = new Date(String(value ?? ""));
  if (!Number.isFinite(d.getTime())) return "Not set";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function propertyTitle(invoice: OwnerRevenueInvoice): string {
  return invoice.booking?.property?.title || "Property";
}

export function bookingCode(invoice: OwnerRevenueInvoice): string {
  return invoice.booking?.code?.codeVisible || (invoice.booking?.id ? `Booking #${invoice.booking.id}` : "Booking");
}

export function displayStatus(invoice: OwnerRevenueInvoice): string {
  const status = String(invoice.status || "PENDING").toUpperCase();
  return status === "PAID" ? "DISBURSED" : status.replace("_", " ");
}

export function invoiceSearchText(invoice: OwnerRevenueInvoice): string {
  return [
    invoice.invoiceNumber,
    invoice.receiptNumber,
    invoice.paymentRef,
    invoice.status,
    invoice.booking?.id,
    invoice.bookingId,
    invoice.booking?.property?.title,
    invoice.booking?.guestName,
    invoice.booking?.guestPhone,
    invoice.booking?.code?.codeVisible
  ].join(" ").toLowerCase();
}
