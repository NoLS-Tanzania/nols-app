import { prisma } from "@nolsaf/prisma";

function toFiniteNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function normalizeCommissionPercent(value: unknown): number {
  const raw = toFiniteNumber(value);
  if (raw == null) return 0;
  return Math.max(0, Math.min(100, raw));
}

export function isOwnerSubmittedInvoice(invoiceNumber: unknown): boolean {
  return String(invoiceNumber ?? "").startsWith("OINV-");
}

export function deriveAccommodationGrossFromBooking(bookingTotalAmount: unknown, transportFare: unknown): number | null {
  const bookingTotal = toFiniteNumber(bookingTotalAmount);
  if (bookingTotal == null) return null;

  const transport = Math.max(0, toFiniteNumber(transportFare) ?? 0);
  return roundMoney(Math.max(0, bookingTotal - transport));
}

export function extractOwnerPayoutFromAccommodationGross(accommodationGross: number, commissionPercent: number) {
  const safeGross = Math.max(0, roundMoney(accommodationGross));
  const safeCommissionPercent = normalizeCommissionPercent(commissionPercent);

  if (safeCommissionPercent <= 0) {
    return {
      ownerPayout: safeGross,
      commissionAmount: 0,
    };
  }

  const ownerPayout = roundMoney(safeGross / (1 + safeCommissionPercent / 100));
  const commissionAmount = roundMoney(Math.max(0, safeGross - ownerPayout));

  return {
    ownerPayout,
    commissionAmount,
  };
}

export async function getEffectiveCommissionPercent(propertyServices: unknown): Promise<number> {
  const fromProperty = (() => {
    const services = propertyServices as any;
    const value = services?.commissionPercent;
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    return Math.max(0, Math.min(100, parsed));
  })();

  if (fromProperty != null) return fromProperty;

  try {
    const settings =
      (await prisma.systemSetting.findUnique({ where: { id: 1 }, select: { commissionPercent: true } as any })) ??
      (await prisma.systemSetting.create({ data: { id: 1 } } as any));
    return normalizeCommissionPercent((settings as any)?.commissionPercent);
  } catch {
    return 0;
  }
}

export function resolveOwnerPayoutAmount(params: {
  invoiceNumber?: unknown;
  invoiceTotal?: unknown;
  netPayable?: unknown;
  bookingTotalAmount?: unknown;
  transportFare?: unknown;
  commissionPercent?: unknown;
}): number {
  const storedNetPayable = toFiniteNumber(params.netPayable);
  if (storedNetPayable != null && storedNetPayable > 0) {
    return roundMoney(Math.max(0, storedNetPayable));
  }

  const commissionPercent = normalizeCommissionPercent(params.commissionPercent);
  const accommodationGross = deriveAccommodationGrossFromBooking(params.bookingTotalAmount, params.transportFare);
  if (accommodationGross != null) {
    return extractOwnerPayoutFromAccommodationGross(accommodationGross, commissionPercent).ownerPayout;
  }

  const invoiceTotal = toFiniteNumber(params.invoiceTotal);
  if (invoiceTotal != null) {
    if (isOwnerSubmittedInvoice(params.invoiceNumber)) {
      return extractOwnerPayoutFromAccommodationGross(invoiceTotal, commissionPercent).ownerPayout;
    }

    if (commissionPercent <= 0) {
      return roundMoney(Math.max(0, invoiceTotal));
    }
  }

  return 0;
}

export function resolveCommissionAmount(params: {
  invoiceNumber?: unknown;
  invoiceTotal?: unknown;
  commissionAmount?: unknown;
  netPayable?: unknown;
  bookingTotalAmount?: unknown;
  transportFare?: unknown;
  commissionPercent?: unknown;
}): number | null {
  const storedCommissionAmount = toFiniteNumber(params.commissionAmount);
  if (storedCommissionAmount != null && storedCommissionAmount >= 0) {
    return roundMoney(storedCommissionAmount);
  }

  if (isOwnerSubmittedInvoice(params.invoiceNumber)) {
    return null;
  }

  const commissionPercent = normalizeCommissionPercent(params.commissionPercent);
  const accommodationGross = deriveAccommodationGrossFromBooking(params.bookingTotalAmount, params.transportFare);
  if (accommodationGross != null) {
    return extractOwnerPayoutFromAccommodationGross(accommodationGross, commissionPercent).commissionAmount;
  }

  const invoiceTotal = toFiniteNumber(params.invoiceTotal);
  const netPayable = toFiniteNumber(params.netPayable);
  if (invoiceTotal != null && netPayable != null && invoiceTotal >= netPayable) {
    return roundMoney(invoiceTotal - netPayable);
  }

  return null;
}