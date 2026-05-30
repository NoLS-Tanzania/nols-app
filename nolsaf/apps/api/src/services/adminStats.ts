import { prisma } from '@nolsaf/prisma';
import { SeriesResponse, BreakdownResponse } from '../types/stats.js';

const TZ_OFFSET_MS = 3 * 60 * 60 * 1000; // EAT UTC+3

const toLocalStartUtc = (d: Date) => {
  const shifted = new Date(d.getTime() + TZ_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - TZ_OFFSET_MS);
};

export async function getRevenueSeries(from?: string, to?: string, region?: string): Promise<SeriesResponse> {
  const toDate = to ? new Date(String(to)) : new Date();
  const fromDate = from ? new Date(String(from)) : new Date(Date.now() - 30 * 24 * 3600 * 1000);

  const where: any = { issuedAt: { gte: fromDate, lte: toDate }, status: { in: ['APPROVED', 'PAID'] } };
  if (region && region !== 'ALL') where.booking = { property: { regionId: String(region) } };

  const invs: Array<{ total?: number; issuedAt: Date }> = await prisma.invoice.findMany({ where, select: { total: true, issuedAt: true } }) as any;

  // bucket by day (UTC ISO labels)
  const labels: string[] = [];
  const dataMap: Record<string, number> = {};
  const cur = new Date(fromDate);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(toDate);
  end.setHours(0, 0, 0, 0);
  while (cur <= end) {
    const key = cur.toISOString().slice(0, 10);
    labels.push(key);
    dataMap[key] = 0;
    cur.setDate(cur.getDate() + 1);
  }

  for (const inv of invs) {
    const k = (inv.issuedAt as Date).toISOString().slice(0, 10);
    if (dataMap[k] === undefined) dataMap[k] = 0;
    dataMap[k] += Number(inv.total ?? 0);
  }

  // Fold in transport (money movement) when not filtering by region. Transport
  // is TZS and not region-scoped in this series. Tours are USD denominated and
  // are intentionally EXCLUDED from this TZS series to avoid mixing currencies.
  if (!region || region === 'ALL') {
    try {
      const payouts = await prisma.transportPayout.findMany({
        where: {
          booking: { paymentStatus: 'PAID' },
          createdAt: { gte: fromDate, lte: toDate },
        },
        select: { grossAmount: true, paidAt: true, createdAt: true },
      });
      for (const p of payouts) {
        const when = ((p as any).paidAt ?? (p as any).createdAt) as Date;
        const k = new Date(when).toISOString().slice(0, 10);
        if (dataMap[k] === undefined) dataMap[k] = 0;
        dataMap[k] += Number((p as any).grossAmount ?? 0);
      }
    } catch (err) {
      console.warn('getRevenueSeries: transport series skipped:', (err as any)?.message || err);
    }
  }

  const data = labels.map(l => Math.round((dataMap[l] || 0) * 100) / 100);
  return { labels, data };
}

export async function getActivePropertiesSeries(from?: string, to?: string, region?: string): Promise<SeriesResponse> {
  const toDate = to ? new Date(String(to)) : new Date();
  const fromDate = from ? new Date(String(from)) : new Date(Date.now() - 30 * 24 * 3600 * 1000);

  // Count all APPROVED properties (active properties)
  const where: any = { status: 'APPROVED' };
  if (region && region !== 'ALL') {
    where.regionId = String(region);
  }
  const totalApprovedCount = await prisma.property.count({ where });

  // Build labels for the date range
  const labels: string[] = [];
  let cur = new Date(fromDate);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(toDate);
  end.setHours(0, 0, 0, 0);
  while (cur <= end) {
    labels.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }

  // Return the same count for all days (all APPROVED properties are "active" throughout the period)
  const data = labels.map(() => totalApprovedCount);

  return { labels, data };
}

export async function getRevenueByType(from?: string, to?: string, region?: string): Promise<SeriesResponse> {
  const toDate = to ? new Date(String(to)) : new Date();
  const fromDate = from ? new Date(String(from)) : new Date(Date.now() - 365 * 24 * 3600 * 1000);

  const invs: Array<any> = await prisma.invoice.findMany({
    where: { issuedAt: { gte: fromDate, lte: toDate }, status: { in: ['APPROVED', 'PAID'] }, ...(region && region !== 'ALL' ? { booking: { property: { regionId: String(region) } } } : {}) },
    select: { total: true, booking: { select: { property: { select: { type: true } } } } },
  }) as any;

  const map: Record<string, number> = {};
  for (const inv of invs) {
    const t = inv.booking?.property?.type || 'Other';
    map[t] = (map[t] || 0) + Number(inv.total ?? 0);
  }
  const labels = Object.keys(map);
  const data = labels.map((l: string) => Math.round((map[l] || 0) * 100) / 100);
  return { labels, data };
}

export async function getActivePropertiesBreakdown(groupBy = 'propertyType', region?: string): Promise<BreakdownResponse> {
  if (groupBy === 'propertyType') {
    const rows: Array<any> = await prisma.property.groupBy({ by: ['type'], where: { status: 'APPROVED', ...(region && region !== 'ALL' ? { regionId: String(region) } : {}) }, _count: { _all: true } }) as any;
    const labels = rows.map((r: any) => r.type || 'Other');
    const data = rows.map((r: any) => r._count._all);
    return { labels, data };
  }
  const rows: Array<any> = await prisma.property.groupBy({ by: ['regionName'], where: { status: 'APPROVED', ...(region && region !== 'ALL' ? { regionId: String(region) } : {}) }, _count: { _all: true } }) as any;
  const labels = rows.map((r: any) => r.regionName || 'Unknown');
  const data = rows.map((r: any) => r._count._all);
  return { labels, data };
}

export async function getInvoiceStatus(from?: string, to?: string): Promise<Record<string, number>> {
  const toDate = to ? new Date(String(to)) : new Date();
  const fromDate = from ? new Date(String(from)) : new Date(Date.now() - 365 * 24 * 3600 * 1000);
  const rows = await prisma.invoice.groupBy({ by: ['status'], where: { issuedAt: { gte: fromDate, lte: toDate } }, _count: { _all: true } });
  const result: Record<string, number> = {};
  for (const r of rows) result[r.status] = r._count._all;
  return result;
}

export async function getOverview() {
  // 1. Active & approved owners (role=OWNER, suspendedAt IS NULL, has at least 1 APPROVED property)
  const ownersWithApprovedProps = await prisma.property.groupBy({
    by: ['ownerId'],
    where: { status: 'APPROVED' },
  });
  const approvedOwnerIds = ownersWithApprovedProps.map((p: { ownerId: number }) => p.ownerId);
  const activeApprovedOwnersCount = approvedOwnerIds.length > 0
    ? await prisma.user.count({
        where: {
          role: 'OWNER',
          suspendedAt: null,
          kycStatus: 'APPROVED_KYC',
          id: { in: approvedOwnerIds },
        },
      })
    : 0;

  // 2. Active & approved properties (status=APPROVED)
  const approvedPropertiesCount = await prisma.property.count({
    where: { status: 'APPROVED' },
  });

  // 3. Total Payment: accommodation revenue from all active (non-cancelled) bookings.
  //    = SUM(booking.totalAmount - transportFare) for CONFIRMED, CHECKED_IN, CHECKED_OUT.
  //    Excludes transport (pass-through) and excludes cancelled bookings.
  const activeBookings = await prisma.booking.findMany({
    where: { status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT'] } },
    select: { totalAmount: true, transportFare: true },
  });
  const totalPayment = activeBookings.reduce(
    (sum, b) => sum + Math.max(0, Number(b.totalAmount ?? 0) - Number(b.transportFare ?? 0)),
    0
  );

  // 4. Net Payable: owner payouts from APPROVED + PAID invoices (committed by NoLSAF).
  const settledInvoices = await prisma.invoice.findMany({
    where: { status: { in: ['APPROVED', 'PAID'] } },
    select: { netPayable: true, commissionAmount: true },
  });
  const ownerPayouts = settledInvoices.reduce(
    (sum, inv) => sum + Number(inv.netPayable ?? 0),
    0
  );

  // 5. NoLSAF Revenue: commission earned across ALL active revenue sources.
  //    Property + Transport are TZS (money of record) and form companyRevenue.
  //    Tours are USD-denominated and are reported SEPARATELY (companyRevenueTour)
  //    so we never sum USD into the TZS figure. Each source recognized when the
  //    customer payment is complete.

  // 5a. Property commission: APPROVED + PAID invoices.
  const companyRevenueProperty = settledInvoices.reduce(
    (sum, inv) => sum + Number(inv.commissionAmount ?? 0),
    0
  );

  // 5b. Tour commission: operator-tour commission, recognized when the customer
  //     has paid (paymentStatus = PAID or paidAt set). Defensive against an
  //     unmigrated DB so the overview never hard-fails.
  let companyRevenueTour = 0;
  let companyRevenueTourCurrency = "USD";
  try {
    const paidTours = await prisma.tourBooking.findMany({
      where: { OR: [{ paymentStatus: "PAID" }, { paidAt: { not: null } }] },
      select: { commissionAmount: true, currency: true },
    });
    companyRevenueTour = paidTours.reduce(
      (sum, t) => sum + Number((t as any).commissionAmount ?? 0),
      0
    );
    // Tours are USD-only in practice; use the first record's currency as the
    // label, falling back to USD.
    const firstCur = paidTours.find((t) => (t as any).currency)?.["currency" as any];
    if (firstCur) companyRevenueTourCurrency = String(firstCur);
  } catch (err) {
    console.warn("getOverview: tour commission skipped:", (err as any)?.message || err);
  }

  // 5c. Transport commission: platform commission on driver trips, recognized
  //     when the customer payment for the trip is complete (booking PAID).
  let companyRevenueTransport = 0;
  try {
    const transportPayouts = await prisma.transportPayout.findMany({
      where: { booking: { paymentStatus: "PAID" } },
      select: { commissionAmount: true },
    });
    companyRevenueTransport = transportPayouts.reduce(
      (sum, p) => sum + Number((p as any).commissionAmount ?? 0),
      0
    );
  } catch (err) {
    console.warn("getOverview: transport commission skipped:", (err as any)?.message || err);
  }

  // TZS company revenue = Property + Transport (both TZS). Tour (USD) is kept
  // separate and never added here.
  const companyRevenue = companyRevenueProperty + companyRevenueTransport;

  // grossAmount kept for compatibility: accommodation settled (netPayable + property commission)
  const grossAmount = ownerPayouts + companyRevenueProperty;

  return {
    ownersCount: activeApprovedOwnersCount,
    propertiesCount: approvedPropertiesCount,
    totalPayment,
    grossAmount,
    ownerPayouts,
    companyRevenue,
    // Per-source breakdown so reports can show where revenue comes from.
    // Property + Transport are TZS; Tour is in its own currency (USD).
    companyRevenueProperty,
    companyRevenueTransport,
    companyRevenueTour,
    companyRevenueTourCurrency,
    lastUpdated: new Date().toISOString(),
  };
}
