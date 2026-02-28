/**
 * bookingEmailTemplates.ts
 * ─────────────────────────────────────────────────────────────
 * Customer-facing transactional emails for booking lifecycle:
 *   - Booking received (NEW)
 *   - Booking confirmed (CONFIRMED + check-in code)
 *   - Booking cancelled (CANCELED)
 */
import {
  BRAND_TEAL,
  BRAND_DARK,
  TEXT_MUTED,
  TEXT_MAIN,
  BORDER,
  baseEmail,
  infoCard,
  calloutBox,
  ctaButton,
} from "./emailBase.js";

// ─── Shared helpers ───────────────────────────────────────────────────────────

function fmtDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function nightCount(checkIn: Date | string, checkOut: Date | string): number {
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

function fmtMoney(amount: number | string, currency = "TZS"): string {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  return `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Shared data shape ────────────────────────────────────────────────────────

export interface BookingEmailData {
  /** Guest display name */
  guestName: string;
  /** Property name */
  propertyName: string;
  /** Booking ID (numeric) */
  bookingId: number;
  checkIn: Date | string;
  checkOut: Date | string;
  totalAmount: number | string;
  roomsQty?: number;
  /** Customer-facing booking detail URL (optional) */
  bookingUrl?: string;
}

// ─── 1. Booking Received ──────────────────────────────────────────────────────

/**
 * Sent immediately when a new booking is created (status: NEW).
 * Reassures the guest that their request is in the system and under review.
 */
export function getBookingReceivedEmail(data: BookingEmailData): { subject: string; html: string } {
  const GREEN = "#059669";
  const nights = nightCount(data.checkIn, data.checkOut);

  const rows: [string, string][] = [
    ["Property",  data.propertyName],
    ["Check-in",  fmtDate(data.checkIn)],
    ["Check-out", fmtDate(data.checkOut)],
    ["Duration",  `${nights} night${nights !== 1 ? "s" : ""}`],
    ["Rooms",     String(data.roomsQty ?? 1)],
    ["Total",     fmtMoney(data.totalAmount)],
    ["Booking #", `#${data.bookingId}`],
  ];

  const body = `
    <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:${GREEN};">Hello ${data.guestName},</p>
    <p style="margin:0 0 16px;">Thank you for choosing NoLSAF! We've received your booking request and our team is reviewing it. You'll hear from us shortly with confirmation.</p>
    ${calloutBox(GREEN, "⏳", "What happens next?", "Our team will review your booking and send you a confirmation email with your check-in code once everything is ready.")}
    ${infoCard(GREEN, rows)}
    ${data.bookingUrl ? ctaButton(data.bookingUrl, "View Booking", GREEN) : ""}
    <p style="margin:24px 0 0;">Warm regards,<br><strong style="color:${BRAND_DARK};">The NoLSAF Team</strong></p>
  `;

  return {
    subject: `Booking Received – ${data.propertyName} (#${data.bookingId})`,
    html: baseEmail(GREEN, "#047857", "Booking Received 📋", "📋", body),
  };
}

// ─── 2. Booking Confirmed ─────────────────────────────────────────────────────

/**
 * Sent when admin confirms the booking and generates a check-in code.
 * The check-in code is prominently displayed for the guest to show on arrival.
 */
export interface BookingConfirmedEmailData extends BookingEmailData {
  /** The visible check-in code (e.g. "ABCD9F3A") */
  checkinCode?: string;
}

export function getBookingConfirmedEmail(data: BookingConfirmedEmailData): { subject: string; html: string } {
  const nights = nightCount(data.checkIn, data.checkOut);

  const rows: [string, string][] = [
    ["Property",  data.propertyName],
    ["Check-in",  fmtDate(data.checkIn)],
    ["Check-out", fmtDate(data.checkOut)],
    ["Duration",  `${nights} night${nights !== 1 ? "s" : ""}`],
    ["Rooms",     String(data.roomsQty ?? 1)],
    ["Total",     fmtMoney(data.totalAmount)],
    ["Booking #", `#${data.bookingId}`],
  ];

  const codeBlock = data.checkinCode
    ? `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
        <tr>
          <td align="center" style="padding:28px 20px;background:#f0fdf4;border:2px dashed #16a34a;border-radius:12px;">
            <p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#166534;">Your Check-In Code</p>
            <p style="margin:0;font-size:36px;font-weight:800;letter-spacing:8px;color:#14532d;font-family:'Courier New',monospace;">${data.checkinCode}</p>
            <p style="margin:10px 0 0;font-size:12px;color:#4b5563;">Show this code to the property staff on arrival</p>
          </td>
        </tr>
      </table>
    `
    : calloutBox(BRAND_TEAL, "ℹ️", "Check-in code", "Your check-in code will be sent to you separately. Please have it ready when you arrive.");

  const body = `
    <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:${BRAND_TEAL};">Hello ${data.guestName},</p>
    <p style="margin:0 0 16px;">Great news — your booking has been <strong>confirmed</strong>! ${data.checkinCode ? "Here are your booking details and check-in code:" : "Here are your booking details:"}</p>
    ${infoCard(BRAND_TEAL, rows)}
    ${codeBlock}
    <p style="margin:16px 0;font-size:14px;color:${TEXT_MUTED};">Please keep your check-in code safe and present it to property staff on arrival. If you have any questions, contact us at <a href="mailto:support@nolsaf.com" style="color:${BRAND_TEAL};">support@nolsaf.com</a>.</p>
    ${data.bookingUrl ? ctaButton(data.bookingUrl, "View Booking Details", BRAND_TEAL) : ""}
    <p style="margin:24px 0 0;">We look forward to giving you a wonderful experience!<br><strong style="color:${BRAND_DARK};">The NoLSAF Team</strong></p>
  `;

  return {
    subject: `Booking Confirmed ✓ – ${data.propertyName} (#${data.bookingId})`,
    html: baseEmail(BRAND_TEAL, "#014d47", "Booking Confirmed ✅", "✅", body),
  };
}

// ─── 3. Booking Cancelled ─────────────────────────────────────────────────────

/**
 * Sent when a booking is cancelled (by admin or via cancellation request approval).
 */
export interface BookingCancelledEmailData extends BookingEmailData {
  /** Reason provided for the cancellation */
  cancelReason?: string;
  /** Refund information (if any) */
  refundNote?: string;
}

export function getBookingCancelledEmail(data: BookingCancelledEmailData): { subject: string; html: string } {
  const RED = "#dc2626";

  const rows: [string, string][] = [
    ["Property",  data.propertyName],
    ["Check-in",  fmtDate(data.checkIn)],
    ["Check-out", fmtDate(data.checkOut)],
    ["Booking #", `#${data.bookingId}`],
    ["Total",     fmtMoney(data.totalAmount)],
  ];

  const reasonBlock = data.cancelReason
    ? calloutBox(RED, "📋", "Cancellation reason", data.cancelReason)
    : "";

  const refundBlock = data.refundNote
    ? calloutBox("#d97706", "💳", "Refund information", data.refundNote)
    : `
      <p style="margin:16px 0;font-size:14px;color:${TEXT_MUTED};">
        If a refund is applicable, our team will process it and contact you separately. For assistance, reach us at <a href="mailto:support@nolsaf.com" style="color:${BRAND_TEAL};">support@nolsaf.com</a>.
      </p>
    `;

  const body = `
    <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:${RED};">Hello ${data.guestName},</p>
    <p style="margin:0 0 16px;">We're writing to let you know that your booking at <strong>${data.propertyName}</strong> has been <strong>cancelled</strong>.</p>
    ${infoCard(RED, rows)}
    ${reasonBlock}
    ${refundBlock}
    <p style="margin:24px 0 0;">We hope to host you again in the future.<br><strong style="color:${BRAND_DARK};">The NoLSAF Team</strong></p>
  `;

  return {
    subject: `Booking Cancelled – ${data.propertyName} (#${data.bookingId})`,
    html: baseEmail(RED, "#991b1b", "Booking Cancelled ❌", "❌", body),
  };
}
