/**
 * NoLScope – Admin Rate Management API
 * ─────────────────────────────────────────────────────────────────────────────
 * Allows admins to update reference data without re-running the seed script.
 *
 * All routes require ADMIN role.
 *
 * Routes:
 *   GET    /api/admin/nolscope/visa-fees                  list all visa fees
 *   PUT    /api/admin/nolscope/visa-fees/:id              update one visa fee
 *   GET    /api/admin/nolscope/park-fees                  list all park fees
 *   PUT    /api/admin/nolscope/park-fees/:id              update one park fee
 *   GET    /api/admin/nolscope/transport-routes           list all transport routes
 *   PUT    /api/admin/nolscope/transport-routes/:id       update one route
 *   POST   /api/admin/nolscope/transport-routes           add a new route
 *   GET    /api/admin/nolscope/pricing-rules              list all pricing rules
 *   PUT    /api/admin/nolscope/pricing-rules/:id          update one rule
 *   GET    /api/admin/nolscope/estimates                  list saved estimates (analytics)
 *   GET    /api/admin/nolscope/estimates/stats            summary stats
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Router } from 'express';
import { prisma } from '@nolsaf/prisma';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const router = Router();
router.use(requireAuth as any, requireRole('ADMIN') as any);

// helpers
const n = (v: unknown) =>
  v !== null && typeof v === 'object' && 'toNumber' in (v as object)
    ? (v as any).toNumber()
    : Number(v ?? 0);

const parseId = (raw: string): number | null => {
  const id = parseInt(raw, 10);
  return isNaN(id) || id < 1 ? null : id;
};

// ─── VISA FEES ────────────────────────────────────────────────────────────────

router.get('/visa-fees', asyncHandler(async (_req, res) => {
  const rows = await (prisma as any).visaFee.findMany({
    orderBy: [{ nationality: 'asc' }, { visaType: 'asc' }],
  });
  return res.json({ visaFees: rows.map((r: any) => ({ ...r, amount: n(r.amount) })) });
}));

router.put('/visa-fees/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });

  const {
    amount, entries, durationDays, processingTime,
    description, isActive, requirements,
  } = req.body ?? {};

  const data: any = {};
  if (amount       !== undefined) data.amount        = Number(amount);
  if (entries      !== undefined) data.entries        = String(entries);
  if (durationDays !== undefined) data.durationDays   = parseInt(durationDays, 10);
  if (processingTime !== undefined) data.processingTime = String(processingTime);
  if (description  !== undefined) data.description    = String(description);
  if (isActive     !== undefined) data.isActive       = Boolean(isActive);
  if (requirements !== undefined) data.requirements   = requirements;
  data.lastVerified = new Date();

  const updated = await (prisma as any).visaFee.update({ where: { id }, data });
  return res.json({ updated: { ...updated, amount: n(updated.amount) } });
}));

// ─── PARK FEES ────────────────────────────────────────────────────────────────

router.get('/park-fees', asyncHandler(async (_req, res) => {
  const rows = await (prisma as any).parkFee.findMany({
    orderBy: [{ region: 'asc' }, { parkName: 'asc' }],
  });
  return res.json({ parkFees: rows });
}));

router.put('/park-fees/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });

  const allowed = [
    'adultForeignerFee', 'adultResidentFee', 'childForeignerFee', 'childResidentFee',
    'vehicleFee', 'guideFee', 'campingFee', 'requiresGuide', 'minimumDays',
    'description', 'officialWebsite', 'isActive',
  ];
  const data: any = {};
  for (const key of allowed) {
    if ((req.body ?? {})[key] !== undefined) data[key] = (req.body ?? {})[key];
  }
  if (Object.keys(data).length === 0) return res.status(400).json({ error: 'no updatable fields provided' });
  data.lastVerified = new Date();

  const updated = await (prisma as any).parkFee.update({ where: { id }, data });
  return res.json({ updated });
}));

// ─── TRANSPORT ROUTES ─────────────────────────────────────────────────────────

router.get('/transport-routes', asyncHandler(async (req, res) => {
  const type = String((req.query as any)?.type ?? '').trim();
  const where: any = {};
  if (type) where.transportType = type;
  const rows = await (prisma as any).transportCostAverage.findMany({
    where,
    orderBy: [{ fromLocation: 'asc' }, { transportType: 'asc' }],
  });
  return res.json({ routes: rows });
}));

router.put('/transport-routes/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });

  const allowed = [
    'minCost', 'maxCost', 'averageCost', 'durationHours', 'distanceKm',
    'frequency', 'peakMultiplier', 'offPeakMultiplier', 'description',
    'provider', 'requiresBooking', 'bookingLeadDays', 'confidence',
    'dataSource', 'isActive',
  ];
  const data: any = {};
  for (const key of allowed) {
    if ((req.body ?? {})[key] !== undefined) data[key] = (req.body ?? {})[key];
  }
  if (Object.keys(data).length === 0) return res.status(400).json({ error: 'no updatable fields provided' });
  data.lastUpdated = new Date();

  const updated = await (prisma as any).transportCostAverage.update({ where: { id }, data });
  return res.json({ updated });
}));

router.post('/transport-routes', asyncHandler(async (req, res) => {
  const { fromLocation, toLocation, transportType, minCost, maxCost, averageCost } = req.body ?? {};
  if (!fromLocation || !toLocation || !transportType || averageCost === undefined)
    return res.status(400).json({ error: 'fromLocation, toLocation, transportType, averageCost are required' });

  const created = await (prisma as any).transportCostAverage.create({
    data: {
      fromLocation:     String(fromLocation),
      toLocation:       String(toLocation),
      transportType:    String(transportType),
      minCost:          Number(minCost ?? averageCost),
      maxCost:          Number(maxCost ?? averageCost),
      averageCost:      Number(averageCost),
      durationHours:    req.body.durationHours  ? Number(req.body.durationHours) : null,
      distanceKm:       req.body.distanceKm     ? parseInt(req.body.distanceKm, 10) : null,
      frequency:        req.body.frequency      ? String(req.body.frequency) : null,
      peakMultiplier:   req.body.peakMultiplier    ? Number(req.body.peakMultiplier)    : 1.0,
      offPeakMultiplier:req.body.offPeakMultiplier ? Number(req.body.offPeakMultiplier) : 1.0,
      description:      req.body.description    ? String(req.body.description)     : null,
      provider:         req.body.provider       ? String(req.body.provider)        : null,
      requiresBooking:  req.body.requiresBooking ?? false,
      bookingLeadDays:  req.body.bookingLeadDays ? parseInt(req.body.bookingLeadDays, 10) : null,
      confidence:       req.body.confidence     ? Number(req.body.confidence)     : 0.80,
      dataSource:       req.body.dataSource     ? String(req.body.dataSource)     : 'manual-entry',
    },
  });
  return res.status(201).json({ created });
}));

// ─── PRICING RULES ────────────────────────────────────────────────────────────

router.get('/pricing-rules', asyncHandler(async (_req, res) => {
  const rules = await (prisma as any).pricingRule.findMany({
    orderBy: [{ priority: 'desc' }, { ruleName: 'asc' }],
  });
  return res.json({ pricingRules: rules });
}));

router.put('/pricing-rules/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });

  const allowed = [
    'priceMultiplier', 'startMonth', 'endMonth', 'seasonName',
    'destination', 'category', 'minTravelers', 'maxTravelers',
    'daysInAdvance', 'priority', 'isActive', 'description',
    'validFrom', 'validUntil',
  ];
  const data: any = {};
  for (const key of allowed) {
    if ((req.body ?? {})[key] !== undefined) data[key] = (req.body ?? {})[key];
  }
  if (Object.keys(data).length === 0) return res.status(400).json({ error: 'no updatable fields provided' });

  const updated = await (prisma as any).pricingRule.update({ where: { id }, data });
  return res.json({ updated });
}));

// ─── ESTIMATES (analytics) ────────────────────────────────────────────────────

router.get('/estimates', asyncHandler(async (req, res) => {
  const page     = Math.max(1, parseInt(String((req.query as any)?.page ?? '1'), 10));
  const limit    = Math.min(100, Math.max(1, parseInt(String((req.query as any)?.limit ?? '25'), 10)));
  const nat      = String((req.query as any)?.nationality ?? '').toUpperCase().trim();
  const dest     = String((req.query as any)?.destination  ?? '').trim();
  const season   = String((req.query as any)?.season       ?? '').trim();
  const converted = (req.query as any)?.converted;

  const where: any = {};
  if (nat)    where.nationality = nat;
  if (dest)   where.destination = { contains: dest };
  if (season) where.currentSeason = season;
  if (converted !== undefined) where.convertedToBooking = converted === 'true';

  const [total, rows] = await Promise.all([
    (prisma as any).tripEstimate.count({ where }),
    (prisma as any).tripEstimate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip:  (page - 1) * limit,
      take:  limit,
      select: {
        id: true,
        destination: true,
        startDate: true,
        travelers: true,
        nationality: true,
        accommodationLevel: true,
        totalCost: true,
        minCost: true,
        maxCost: true,
        confidence: true,
        currentSeason: true,
        convertedToBooking: true,
        viewCount: true,
        createdAt: true,
      },
    }),
  ]);

  return res.json({
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
    estimates: rows.map((r: any) => ({
      ...r,
      totalCost: n(r.totalCost),
      minCost:   r.minCost ? n(r.minCost) : null,
      maxCost:   r.maxCost ? n(r.maxCost) : null,
      confidence: n(r.confidence),
    })),
  });
}));

router.get('/estimates/stats', asyncHandler(async (_req, res) => {
  const [
    totalCount,
    convertedCount,
    byNationality,
    byDestination,
    bySeason,
    avgCost,
  ] = await Promise.all([
    (prisma as any).tripEstimate.count(),
    (prisma as any).tripEstimate.count({ where: { convertedToBooking: true } }),
    (prisma as any).tripEstimate.groupBy({
      by: ['nationality'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
    (prisma as any).tripEstimate.groupBy({
      by: ['destination'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
    (prisma as any).tripEstimate.groupBy({
      by: ['currentSeason'],
      _count: { id: true },
    }),
    (prisma as any).tripEstimate.aggregate({
      _avg: { totalCost: true },
      _min: { totalCost: true },
      _max: { totalCost: true },
    }),
  ]);

  return res.json({
    totalEstimates:     totalCount,
    convertedToBooking: convertedCount,
    conversionRate:     totalCount > 0 ? r2((convertedCount / totalCount) * 100) : 0,
    avgTotalCost:       avgCost._avg.totalCost ? n(avgCost._avg.totalCost) : null,
    minTotalCost:       avgCost._min.totalCost ? n(avgCost._min.totalCost) : null,
    maxTotalCost:       avgCost._max.totalCost ? n(avgCost._max.totalCost) : null,
    topNationalities:   byNationality.map((r: any) => ({ nationality: r.nationality, count: r._count.id })),
    topDestinations:    byDestination.map((r: any) => ({ destination: r.destination,   count: r._count.id })),
    bySeason:           bySeason.map((r: any) => ({ season: r.currentSeason, count: r._count.id })),
  });
}));

function r2(v: number) { return Math.round(v * 100) / 100; }
