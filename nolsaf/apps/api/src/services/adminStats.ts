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

  const startUtc = toLocalStartUtc(fromDate);
  const endLocalStartUtc = toLocalStartUtc(toDate);
  const sqlFromIso = startUtc.toISOString();
  const sqlToIso = new Date(endLocalStartUtc.getTime() + 24 * 3600 * 1000 - 1).toISOString();

  let dailyRows: Array<any> = [];
  let beforeRows: Array<any> = [];
  if (region && region !== 'ALL') {
    const regionId = String(region);
    dailyRows = await prisma.$queryRaw`
      SELECT DATE(CONVERT_TZ(createdAt, '+00:00', '+03:00')) AS day, COUNT(*) AS cnt
      FROM Property
      WHERE status = 'APPROVED' AND createdAt BETWEEN ${sqlFromIso} AND ${sqlToIso} AND regionId = ${regionId}
      GROUP BY day
      ORDER BY day
    `;
    beforeRows = await prisma.$queryRaw`
      SELECT COUNT(*) AS cnt
      FROM Property
      WHERE status = 'APPROVED' AND createdAt < ${sqlFromIso} AND regionId = ${regionId}
    `;
  } else {
    dailyRows = await prisma.$queryRaw`
      SELECT DATE(CONVERT_TZ(createdAt, '+00:00', '+03:00')) AS day, COUNT(*) AS cnt
      FROM Property
      WHERE status = 'APPROVED' AND createdAt BETWEEN ${sqlFromIso} AND ${sqlToIso}
      GROUP BY day
      ORDER BY day
    `;
    beforeRows = await prisma.$queryRaw`
      SELECT COUNT(*) AS cnt
      FROM Property
      WHERE status = 'APPROVED' AND createdAt < ${sqlFromIso}
    `;
  }

  const base = Number(beforeRows && beforeRows[0] && (beforeRows[0].cnt ?? 0)) || 0;

  // build labels for local days
  const labels: string[] = [];
  let localCur = new Date(startUtc.getTime() + TZ_OFFSET_MS);
  const localEnd = new Date(endLocalStartUtc.getTime() + TZ_OFFSET_MS);
  while (localCur <= localEnd) {
    labels.push(localCur.toISOString().slice(0, 10));
    localCur = new Date(localCur.getTime() + 24 * 3600 * 1000);
  }

  const dailyMap: Record<string, number> = {};
  for (const r of dailyRows) {
    const k = String(r.day);
    dailyMap[k] = Number(r.cnt || 0);
  }

  const data: number[] = [];
  let acc = base;
  for (const d of labels) {
    acc += Number(dailyMap[d] || 0);
    data.push(acc);
  }
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
  const [invoiceAgg, paidAgg, propertiesCount, ownersWithProps] = await Promise.all([
    prisma.invoice.aggregate({
      _sum: { total: true },
      where: { status: { in: ['APPROVED', 'PAID'] } },
    }),
    prisma.invoice.aggregate({
      _sum: { commissionAmount: true },
      where: { status: 'PAID' },
    }),
    prisma.property.count({ where: { status: 'APPROVED' } }),
    prisma.property.groupBy({ by: ['ownerId'], _count: { ownerId: true }, where: { status: 'APPROVED' } }),
  ]);

  return {
    grossAmount: Number(invoiceAgg._sum.total ?? 0),
    companyRevenue: Number(paidAgg._sum.commissionAmount ?? 0),
    propertiesCount,
    ownersCount: ownersWithProps.length,
    lastUpdated: new Date().toISOString(),
  };
}
