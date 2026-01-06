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
          id: { in: approvedOwnerIds },
        },
      })
    : 0;

  // 2. Active & approved properties (status=APPROVED)
  const approvedPropertiesCount = await prisma.property.count({
    where: { status: 'APPROVED' },
  });

  // 3. Net Payable: Sum of netPayable from PAID invoices (owner disbursements)
  const ownerNetPayableAgg = await prisma.invoice.aggregate({
    _sum: { netPayable: true },
    where: { status: 'PAID' },
  });
  const netPayable = Number(ownerNetPayableAgg._sum.netPayable ?? 0);

  // 4. NoLSAF Revenue: Sum of commissionAmount from PAID invoices (commission revenue)
  const revenueAgg = await prisma.invoice.aggregate({
    _sum: { commissionAmount: true },
    where: { status: 'PAID' },
  });
  const nolsRevenue = Number(revenueAgg._sum.commissionAmount ?? 0);

  return {
    ownerCount: activeApprovedOwnersCount,
    propertyCount: approvedPropertiesCount,
    netPayable,
    nolsRevenue,
    lastUpdated: new Date().toISOString(),
  };
}
