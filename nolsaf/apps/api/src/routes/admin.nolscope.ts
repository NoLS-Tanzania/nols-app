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

async function writeAudit(
  req: any,
  action: string,
  entity: string,
  entityId: number,
  before: object,
  after: object,
) {
  try {
    await (prisma as any).auditLog.create({
      data: {
        actorId:   req.user?.id   ?? null,
        actorRole: req.user?.role ?? 'ADMIN',
        action,
        entity,
        entityId,
        beforeJson: before,
        afterJson:  after,
        ip: (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
            ?? req.socket?.remoteAddress ?? null,
        ua: (req.headers['user-agent'] as string | undefined)?.slice(0, 255) ?? null,
      },
    });
  } catch { /* audit write failure must not break the main operation */ }
}

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

  const before  = await (prisma as any).visaFee.findUnique({ where: { id } });
  const updated = await (prisma as any).visaFee.update({ where: { id }, data });
  void writeAudit(req, 'NOLSCOPE_VISA_FEE_UPDATE', 'NOLSCOPE_VISA_FEE', id, before ?? {}, updated);
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

  const floatFieldsPF = new Set(['adultForeignerFee', 'adultResidentFee', 'childForeignerFee', 'childResidentFee', 'vehicleFee', 'guideFee', 'campingFee']);
  const intFieldsPF   = new Set(['minimumDays']);
  const allowed = [
    'adultForeignerFee', 'adultResidentFee', 'childForeignerFee', 'childResidentFee',
    'vehicleFee', 'guideFee', 'campingFee', 'requiresGuide', 'minimumDays',
    'description', 'officialWebsite', 'isActive',
  ];
  const data: any = {};
  for (const key of allowed) {
    const val = (req.body ?? {})[key];
    if (val === undefined) continue;
    if (floatFieldsPF.has(key)) data[key] = val === null || val === '' ? null : parseFloat(val);
    else if (intFieldsPF.has(key)) data[key] = val === null || val === '' ? null : parseInt(val, 10);
    else data[key] = val;
  }
  if (Object.keys(data).length === 0) return res.status(400).json({ error: 'no updatable fields provided' });
  data.lastVerified = new Date();

  const before  = await (prisma as any).parkFee.findUnique({ where: { id } });
  const updated = await (prisma as any).parkFee.update({ where: { id }, data });
  void writeAudit(req, 'NOLSCOPE_PARK_FEE_UPDATE', 'NOLSCOPE_PARK_FEE', id, before ?? {}, updated);
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

  const floatFieldsTR = new Set(['minCost', 'maxCost', 'averageCost', 'durationHours', 'peakMultiplier', 'offPeakMultiplier', 'confidence']);
  const intFieldsTR   = new Set(['distanceKm', 'bookingLeadDays']);
  const allowed = [
    'minCost', 'maxCost', 'averageCost', 'durationHours', 'distanceKm',
    'frequency', 'peakMultiplier', 'offPeakMultiplier', 'description',
    'provider', 'requiresBooking', 'bookingLeadDays', 'confidence',
    'dataSource', 'isActive',
  ];
  const data: any = {};
  for (const key of allowed) {
    const val = (req.body ?? {})[key];
    if (val === undefined) continue;
    if (floatFieldsTR.has(key)) data[key] = val === null || val === '' ? null : parseFloat(val);
    else if (intFieldsTR.has(key)) data[key] = val === null || val === '' ? null : parseInt(val, 10);
    else data[key] = val;
  }
  if (Object.keys(data).length === 0) return res.status(400).json({ error: 'no updatable fields provided' });
  data.lastUpdated = new Date();

  const before  = await (prisma as any).transportCostAverage.findUnique({ where: { id } });
  const updated = await (prisma as any).transportCostAverage.update({ where: { id }, data });
  void writeAudit(req, 'NOLSCOPE_TRANSPORT_UPDATE', 'NOLSCOPE_TRANSPORT', id, before ?? {}, updated);
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

  const intFields    = new Set(['startMonth', 'endMonth', 'minTravelers', 'maxTravelers', 'daysInAdvance', 'priority']);
  const floatFields  = new Set(['priceMultiplier']);
  const allowed = [
    'priceMultiplier', 'startMonth', 'endMonth', 'seasonName',
    'destination', 'category', 'minTravelers', 'maxTravelers',
    'daysInAdvance', 'priority', 'isActive', 'description',
    'validFrom', 'validUntil',
  ];
  const data: any = {};
  for (const key of allowed) {
    const val = (req.body ?? {})[key];
    if (val === undefined) continue;
    if (intFields.has(key))   data[key] = val === null || val === '' ? null : parseInt(val, 10);
    else if (floatFields.has(key)) data[key] = val === null || val === '' ? null : parseFloat(val);
    else data[key] = val;
  }
  if (Object.keys(data).length === 0) return res.status(400).json({ error: 'no updatable fields provided' });

  const before  = await (prisma as any).pricingRule.findUnique({ where: { id } });
  const updated = await (prisma as any).pricingRule.update({ where: { id }, data });
  void writeAudit(req, 'NOLSCOPE_PRICING_RULE_UPDATE', 'NOLSCOPE_PRICING_RULE', id, before ?? {}, updated);
  return res.json({ updated });
}));

// ─── ACTIVITIES ───────────────────────────────────────────────────────────────

router.get('/activities', asyncHandler(async (req, res) => {
  const dest     = String((req.query as any)?.dest     ?? '').trim();
  const category = String((req.query as any)?.category ?? '').trim();
  const where: any = {};
  if (dest)     where.destination = dest;
  if (category) where.category    = category;
  const rows = await (prisma as any).activityCost.findMany({
    where,
    orderBy: [{ destination: 'asc' }, { category: 'asc' }, { activityName: 'asc' }],
  });
  return res.json({
    activities: rows.map((r: any) => ({
      ...r,
      minCost:           n(r.minCost),
      maxCost:           n(r.maxCost),
      averageCost:       n(r.averageCost),
      peakMultiplier:    n(r.peakMultiplier),
      offPeakMultiplier: n(r.offPeakMultiplier),
      durationHours:     r.durationHours ? n(r.durationHours) : null,
    })),
  });
}));

router.put('/activities/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });

  const floatFieldsAC = new Set(['minCost', 'maxCost', 'averageCost', 'durationHours', 'peakMultiplier', 'offPeakMultiplier']);
  const intFieldsAC   = new Set(['bookingLeadDays', 'popularity']);
  const allowed = [
    'activityName', 'category', 'destination', 'minCost', 'maxCost', 'averageCost',
    'priceUnit', 'duration', 'durationHours', 'groupSize', 'difficulty',
    'includes', 'excludes', 'requirements', 'seasonalActivity', 'availableMonths',
    'requiresBooking', 'bookingLeadDays', 'peakMultiplier', 'offPeakMultiplier',
    'description', 'provider', 'website', 'popularity', 'isActive',
  ];
  const data: any = {};
  for (const key of allowed) {
    const val = (req.body ?? {})[key];
    if (val === undefined) continue;
    if (floatFieldsAC.has(key)) data[key] = val === null || val === '' ? null : parseFloat(val);
    else if (intFieldsAC.has(key)) data[key] = val === null || val === '' ? null : parseInt(val, 10);
    else data[key] = val;
  }
  if (Object.keys(data).length === 0) return res.status(400).json({ error: 'no updatable fields provided' });

  const before  = await (prisma as any).activityCost.findUnique({ where: { id } });
  const updated = await (prisma as any).activityCost.update({ where: { id }, data });
  void writeAudit(req, 'NOLSCOPE_ACTIVITY_UPDATE', 'NOLSCOPE_ACTIVITY', id, before ?? {}, updated);
  return res.json({
    updated: {
      ...updated,
      minCost:           n(updated.minCost),
      maxCost:           n(updated.maxCost),
      averageCost:       n(updated.averageCost),
      peakMultiplier:    n(updated.peakMultiplier),
      offPeakMultiplier: n(updated.offPeakMultiplier),
    },
  });
}));

router.post('/activities', asyncHandler(async (req, res) => {
  const { activityCode, activityName, category, destination, averageCost } = req.body ?? {};
  if (!activityCode || !activityName || !category || !destination || averageCost === undefined)
    return res.status(400).json({ error: 'activityCode, activityName, category, destination, averageCost are required' });

  const created = await (prisma as any).activityCost.create({
    data: {
      activityCode:      String(activityCode),
      activityName:      String(activityName),
      category:          String(category),
      destination:       String(destination),
      minCost:           Number(req.body.minCost     ?? averageCost),
      maxCost:           Number(req.body.maxCost     ?? averageCost),
      averageCost:       Number(averageCost),
      priceUnit:         req.body.priceUnit          ? String(req.body.priceUnit)          : 'per-person',
      duration:          req.body.duration           ? String(req.body.duration)           : null,
      durationHours:     req.body.durationHours      ? Number(req.body.durationHours)      : null,
      groupSize:         req.body.groupSize          ? String(req.body.groupSize)          : null,
      difficulty:        req.body.difficulty         ? String(req.body.difficulty)         : null,
      description:       req.body.description        ? String(req.body.description)        : null,
      provider:          req.body.provider           ? String(req.body.provider)           : null,
      peakMultiplier:    req.body.peakMultiplier    != null ? Number(req.body.peakMultiplier)    : 1.0,
      offPeakMultiplier: req.body.offPeakMultiplier != null ? Number(req.body.offPeakMultiplier) : 1.0,
      requiresBooking:   req.body.requiresBooking   ?? true,
      popularity:        req.body.popularity         ? parseInt(req.body.popularity, 10)   : 50,
      isActive:          req.body.isActive           ?? true,
    },
  });
  return res.status(201).json({
    created: {
      ...created,
      minCost:           n(created.minCost),
      maxCost:           n(created.maxCost),
      averageCost:       n(created.averageCost),
      peakMultiplier:    n(created.peakMultiplier),
      offPeakMultiplier: n(created.offPeakMultiplier),
    },
  });
}));

// ─── AUDIT HISTORY ────────────────────────────────────────────────────────────
//   GET /api/admin/nolscope/audit/:entity/:id
//   Returns the 30 most-recent AuditLog entries for a specific record,
//   with the actor's name + email joined in.

router.get('/audit/:entity/:entityId', asyncHandler(async (req, res) => {
  const entityId = parseId(req.params.entityId);
  if (!entityId) return res.status(400).json({ error: 'invalid id' });

  const entity = String(req.params.entity).toUpperCase().trim();

  const logs = await (prisma as any).auditLog.findMany({
    where:   { entity, entityId },
    orderBy: { createdAt: 'desc' },
    take:    30,
    include: {
      actor: {
        select: { id: true, name: true, fullName: true, email: true },
      },
    },
  });

  const serialized = logs.map((l: any) => ({
    ...l,
    id:       String(l.id),
    entityId: Number(l.entityId),
    actorId:  l.actorId != null ? Number(l.actorId) : null,
  }));

  return res.json({ logs: serialized });
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
