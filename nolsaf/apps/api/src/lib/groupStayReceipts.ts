// apps/api/src/lib/groupStayReceipts.ts
//
// Builds the PDF receipt for a paid group stay deposit. Shared by the
// authenticated customer download route and the token-based public route
// used by the mobile app's in-browser PDF viewer.

import { prisma } from "@nolsaf/prisma";
import { createHash } from "node:crypto";
import { generatePaymentReceiptPdf } from "./pdfDocuments.js";

const RECEIPT_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function buildGroupStayReceiptNumber(bookingId: number, paidAt: Date, paymentRef: string | null): string {
  const seed = `${bookingId}:${paidAt.toISOString()}:${paymentRef || "NOLSAF"}`;
  const digest = createHash("sha256").update(seed).digest();
  let code = "";
  for (let i = 0; i < 6; i += 1) code += RECEIPT_CODE_ALPHABET[digest[i] % RECEIPT_CODE_ALPHABET.length];
  return `NGST-${code}-${bookingId}-${paidAt.getFullYear()}`;
}

export type GroupStayDepositReceiptResult =
  | { ok: true; buffer: Buffer; filename: string }
  | { ok: false; status: number; error: string; message: string };

export type GroupStayDepositReceiptDataResult =
  | { ok: true; receipt: {
      bookingId: number;
      receiptNumber: string;
      guestName: string;
      guestEmail: string | null;
      propertyName: string;
      destination: string;
      checkIn: Date;
      checkOut: Date;
      bookingTotal: number;
      depositPaid: number;
      remainingBalance: number;
      currency: string;
      paymentMethod: string;
      paymentRef: string | null;
      paidAt: Date;
    } }
  | { ok: false; status: number; error: string; message: string };

export async function loadGroupStayDepositReceiptData(bookingId: number, userId: number): Promise<GroupStayDepositReceiptDataResult> {
  const booking = await prisma.groupBooking.findFirst({
    where: { id: bookingId, userId },
    select: {
      id: true, toRegion: true, toDistrict: true, checkIn: true, checkOut: true,
      totalAmount: true, depositAmount: true, depositPaid: true, depositPaidAt: true,
      currency: true, paymentRef: true, paymentProvider: true,
      confirmedProperty: { select: { title: true } },
      user: { select: { name: true, fullName: true, email: true } },
    },
  });

  if (!booking) return { ok: false, status: 404, error: "not_found", message: "Group booking not found or access denied" };
  if (!booking.depositPaid || !booking.depositPaidAt) return { ok: false, status: 400, error: "deposit_not_paid", message: "No deposit payment has been recorded for this booking yet." };

  const paidAt = new Date(booking.depositPaidAt);
  const depositPaid = Number(booking.depositAmount || 0);
  const bookingTotal = Number(booking.totalAmount || 0);
  const destination = [booking.toDistrict, booking.toRegion].filter(Boolean).join(", ");

  return { ok: true, receipt: {
    bookingId: booking.id,
    receiptNumber: buildGroupStayReceiptNumber(booking.id, paidAt, booking.paymentRef || null),
    guestName: booking.user?.fullName || booking.user?.name || booking.user?.email || "Guest",
    guestEmail: booking.user?.email || null,
    propertyName: booking.confirmedProperty?.title || destination || "Group stay accommodation",
    destination,
    checkIn: booking.checkIn || paidAt,
    checkOut: booking.checkOut || paidAt,
    bookingTotal,
    depositPaid,
    remainingBalance: Math.max(0, bookingTotal - depositPaid),
    currency: booking.currency || "TZS",
    paymentMethod: booking.paymentProvider || "AZAMPAY",
    paymentRef: booking.paymentRef || null,
    paidAt,
  } };
}

export async function loadGroupStayDepositReceipt(bookingId: number, userId: number): Promise<GroupStayDepositReceiptResult> {
  const result = await loadGroupStayDepositReceiptData(bookingId, userId);
  if (!result.ok) return result;
  const receipt = result.receipt;

  const buffer = await generatePaymentReceiptPdf({
    receiptNumber: receipt.receiptNumber,
    invoiceNumber: receipt.paymentRef || `GBDEP-${receipt.bookingId}`,
    bookingId: receipt.bookingId,
    guestName: receipt.guestName,
    guestEmail: receipt.guestEmail,
    propertyName: receipt.propertyName,
    checkIn: receipt.checkIn,
    checkOut: receipt.checkOut,
    total: receipt.depositPaid,
    paymentMethod: receipt.paymentMethod,
    paymentRef: receipt.paymentRef,
    paidAt: receipt.paidAt,
    currency: receipt.currency,
  });

  return { ok: true, buffer, filename: `Group-Stay-Deposit-Receipt-${receipt.bookingId}.pdf` };
}
