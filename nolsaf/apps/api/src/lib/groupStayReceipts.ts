// apps/api/src/lib/groupStayReceipts.ts
//
// Builds the PDF receipt for a paid group stay deposit. Shared by the
// authenticated customer download route and the token-based public route
// used by the mobile app's in-browser PDF viewer.

import { prisma } from "@nolsaf/prisma";
import { generatePaymentReceiptPdf } from "./pdfDocuments.js";

export type GroupStayDepositReceiptResult =
  | { ok: true; buffer: Buffer; filename: string }
  | { ok: false; status: number; error: string; message: string };

export async function loadGroupStayDepositReceipt(bookingId: number, userId: number): Promise<GroupStayDepositReceiptResult> {
  const booking = await prisma.groupBooking.findFirst({
    where: { id: bookingId, userId },
    select: {
      id: true,
      toRegion: true,
      toDistrict: true,
      checkIn: true,
      checkOut: true,
      depositAmount: true,
      depositPaid: true,
      depositPaidAt: true,
      currency: true,
      paymentRef: true,
      paymentProvider: true,
      confirmedProperty: { select: { title: true } },
      user: { select: { name: true, fullName: true, email: true } },
    },
  });

  if (!booking) {
    return { ok: false, status: 404, error: "not_found", message: "Group booking not found or access denied" };
  }
  if (!booking.depositPaid || !booking.depositPaidAt) {
    return { ok: false, status: 400, error: "deposit_not_paid", message: "No deposit payment has been recorded for this booking yet." };
  }

  const destination = [booking.toDistrict, booking.toRegion].filter(Boolean).join(", ");
  const paidAt = new Date(booking.depositPaidAt);
  const ym = `${paidAt.getFullYear()}${String(paidAt.getMonth() + 1).padStart(2, "0")}`;
  const receiptNumber = `RCPT-${ym}-${String(booking.id).padStart(7, "0")}`;
  const guestName = booking.user?.fullName || booking.user?.name || booking.user?.email || "Guest";
  const fallbackDate = booking.checkIn && booking.checkOut ? null : paidAt;

  const buffer = await generatePaymentReceiptPdf({
    receiptNumber,
    invoiceNumber: booking.paymentRef || `GBDEP-${booking.id}`,
    bookingId: booking.id,
    guestName,
    guestEmail: booking.user?.email || null,
    propertyName: booking.confirmedProperty?.title || destination || "Group stay accommodation",
    checkIn: booking.checkIn || fallbackDate || paidAt,
    checkOut: booking.checkOut || fallbackDate || paidAt,
    total: Number(booking.depositAmount || 0),
    paymentMethod: booking.paymentProvider || "AZAMPAY",
    paymentRef: booking.paymentRef || null,
    paidAt: booking.depositPaidAt,
    currency: booking.currency || "TZS",
  });

  return { ok: true, buffer, filename: `Group-Stay-Deposit-Receipt-${booking.id}.pdf` };
}
