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
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { prisma } from '@nolsaf/prisma';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { sanitizeText } from '../lib/sanitize.js';

export const router = Router();
router.use(requireAuth as any, requireRole('ADMIN') as any);

// ─── RATE LIMITING ────────────────────────────────────────────────────────────
const adminRateKey = (req: any): string => {
  const id = req?.user?.id;
  return id ? `nolscope-admin:${String(id)}` : req.ip || req.socket?.remoteAddress || 'unknown';
};

// Admin UI can be chatty (polling, tab switching). Permissive but not unlimited.
const limitNolscopeRead = rateLimit({
  windowMs: 60_000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: adminRateKey,
  message: { error: 'Too many requests. Please wait a moment and try again.' },
});

// Write operations are significantly tighter.
const limitNolscopeWrite = rateLimit({
  windowMs: 15 * 60_000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: adminRateKey,
  message: { error: 'Too many write operations. Please wait and try again.' },
});

// ─── VALIDATION HELPER ────────────────────────────────────────────────────────
function validate<T extends z.ZodTypeAny>(schema: T) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.body);
    if (!result.success)
      return res.status(400).json({ error: 'Invalid request', details: result.error.issues });
    req.validatedBody = result.data;
    next();
  };
}

// ─── ZOD SCHEMAS ─────────────────────────────────────────────────────────────
const visaFeePutSchema = z.object({
  amount:         z.coerce.number().positive().max(10_000).optional(),
  entries:        z.enum(['single', 'double', 'multiple']).optional(),
  durationDays:   z.coerce.number().int().min(1).max(3650).optional(),
  processingTime: z.string().min(1).max(100).optional(),
  description:    z.string().max(1000).nullish(),
  isActive:       z.coerce.boolean().optional(),
  requirements:   z.unknown().optional(),
}).strict();

const visaFeePostSchema = z.object({
  nationality:    z.string().regex(/^[A-Z]{2}$/, 'Must be a 2-letter ISO country code'),
  amount:         z.coerce.number().nonnegative().max(10_000),
  visaType:       z.enum(['tourist', 'business', 'multiple-entry', 'transit', 'visa-free']).default('tourist'),
  entries:        z.enum(['single', 'double', 'multiple']).default('single'),
  durationDays:   z.coerce.number().int().min(0).max(3650).default(90),
  processingTime: z.string().min(1).max(100).default('on-arrival'),
  description:    z.string().max(1000).nullish(),
  requirements:   z.unknown().optional(),
}).strict();

const parkFeePutSchema = z.object({
  adultForeignerFee: z.coerce.number().nonnegative().max(1_000_000).optional(),
  adultResidentFee:  z.coerce.number().nonnegative().max(1_000_000).optional(),
  childForeignerFee: z.coerce.number().nonnegative().max(1_000_000).nullish(),
  childResidentFee:  z.coerce.number().nonnegative().max(1_000_000).nullish(),
  vehicleFee:        z.coerce.number().nonnegative().max(1_000_000).nullish(),
  guideFee:          z.coerce.number().nonnegative().max(1_000_000).nullish(),
  campingFee:        z.coerce.number().nonnegative().max(1_000_000).nullish(),
  requiresGuide:     z.coerce.boolean().optional(),
  minimumDays:       z.coerce.number().int().min(1).max(365).nullish(),
  description:       z.string().max(2000).nullish(),
  officialWebsite:   z.string().url().max(500).nullish(),
  isActive:          z.coerce.boolean().optional(),
}).strict();

const parkFeePostSchema = z.object({
  parkCode:          z.string().min(2).max(20).regex(/^[A-Z0-9_-]+$/i, 'Invalid park code format'),
  parkName:          z.string().min(2).max(200),
  category:          z.enum(['national-park', 'conservation-area', 'marine-park', 'game-reserve']),
  region:            z.string().min(2).max(100),
  adultForeignerFee: z.coerce.number().nonnegative().max(1_000_000),
  adultResidentFee:  z.coerce.number().nonnegative().max(1_000_000),
  childForeignerFee: z.coerce.number().nonnegative().max(1_000_000).nullish(),
  childResidentFee:  z.coerce.number().nonnegative().max(1_000_000).nullish(),
  vehicleFee:        z.coerce.number().nonnegative().max(1_000_000).nullish(),
  campingFee:        z.coerce.number().nonnegative().max(1_000_000).nullish(),
  guideFee:          z.coerce.number().nonnegative().max(1_000_000).nullish(),
  requiresGuide:     z.coerce.boolean().default(false),
  minimumDays:       z.coerce.number().int().min(1).max(365).nullish(),
  description:       z.string().max(2000).nullish(),
  officialWebsite:   z.string().url().max(500).nullish(),
}).strict();

const transportPutSchema = z.object({
  minCost:           z.coerce.number().nonnegative().max(1_000_000).optional(),
  maxCost:           z.coerce.number().nonnegative().max(1_000_000).optional(),
  averageCost:       z.coerce.number().nonnegative().max(1_000_000).optional(),
  durationHours:     z.coerce.number().nonnegative().max(500).nullish(),
  distanceKm:        z.coerce.number().int().nonnegative().max(100_000).nullish(),
  frequency:         z.string().max(100).nullish(),
  peakMultiplier:    z.coerce.number().min(0.1).max(10).optional(),
  offPeakMultiplier: z.coerce.number().min(0.1).max(10).optional(),
  description:       z.string().max(2000).nullish(),
  provider:          z.string().max(200).nullish(),
  requiresBooking:   z.coerce.boolean().optional(),
  bookingLeadDays:   z.coerce.number().int().min(0).max(365).nullish(),
  confidence:        z.coerce.number().min(0).max(1).optional(),
  dataSource:        z.string().max(100).optional(),
  isActive:          z.coerce.boolean().optional(),
}).strict();

const transportPostSchema = z.object({
  fromLocation:      z.string().min(2).max(200),
  toLocation:        z.string().min(2).max(200),
  transportType:     z.enum(['flight', 'bus', 'ferry', 'private-car', 'shared-taxi', 'train']),
  minCost:           z.coerce.number().nonnegative().max(1_000_000).default(0),
  maxCost:           z.coerce.number().nonnegative().max(1_000_000).default(0),
  averageCost:       z.coerce.number().nonnegative().max(1_000_000),
  durationHours:     z.coerce.number().nonnegative().max(500).nullish(),
  distanceKm:        z.coerce.number().int().nonnegative().max(100_000).nullish(),
  frequency:         z.string().max(100).nullish(),
  peakMultiplier:    z.coerce.number().min(0.1).max(10).default(1.0),
  offPeakMultiplier: z.coerce.number().min(0.1).max(10).default(1.0),
  description:       z.string().max(2000).nullish(),
  provider:          z.string().max(200).nullish(),
  requiresBooking:   z.coerce.boolean().default(false),
  bookingLeadDays:   z.coerce.number().int().min(0).max(365).nullish(),
  confidence:        z.coerce.number().min(0).max(1).default(0.80),
  dataSource:        z.string().max(100).default('manual-entry'),
}).strict();

const pricingRulePutSchema = z.object({
  priceMultiplier: z.coerce.number().min(0.01).max(100).optional(),
  startMonth:      z.coerce.number().int().min(1).max(12).nullish(),
  endMonth:        z.coerce.number().int().min(1).max(12).nullish(),
  seasonName:      z.string().max(100).optional(),
  destination:     z.string().max(200).optional(),
  category:        z.string().max(100).optional(),
  minTravelers:    z.coerce.number().int().min(1).max(1000).nullish(),
  maxTravelers:    z.coerce.number().int().min(1).max(1000).nullish(),
  daysInAdvance:   z.coerce.number().int().min(0).max(730).nullish(),
  priority:        z.coerce.number().int().min(0).max(1000).optional(),
  isActive:        z.coerce.boolean().optional(),
  description:     z.string().max(2000).nullish(),
  validFrom:       z.string().nullish(),
  validUntil:      z.string().nullish(),
}).strict();

const activityPutSchema = z.object({
  activityName:      z.string().min(2).max(200).optional(),
  category:          z.string().max(100).optional(),
  destination:       z.string().max(200).optional(),
  minCost:           z.coerce.number().nonnegative().max(1_000_000).optional(),
  maxCost:           z.coerce.number().nonnegative().max(1_000_000).optional(),
  averageCost:       z.coerce.number().nonnegative().max(1_000_000).optional(),
  priceUnit:         z.string().max(50).optional(),
  duration:          z.string().max(100).nullish(),
  durationHours:     z.coerce.number().nonnegative().max(500).nullish(),
  groupSize:         z.string().max(100).nullish(),
  difficulty:        z.string().max(50).nullish(),
  includes:          z.unknown().optional(),
  excludes:          z.unknown().optional(),
  requirements:      z.unknown().optional(),
  seasonalActivity:  z.coerce.boolean().optional(),
  availableMonths:   z.unknown().optional(),
  requiresBooking:   z.coerce.boolean().optional(),
  bookingLeadDays:   z.coerce.number().int().min(0).max(365).nullish(),
  peakMultiplier:    z.coerce.number().min(0.1).max(10).optional(),
  offPeakMultiplier: z.coerce.number().min(0.1).max(10).optional(),
  description:       z.string().max(2000).nullish(),
  provider:          z.string().max(200).nullish(),
  website:           z.string().url().max(500).nullish(),
  popularity:        z.coerce.number().int().min(0).max(100).optional(),
  isActive:          z.coerce.boolean().optional(),
}).strict();

const activityPostSchema = z.object({
  activityCode:      z.string().min(2).max(50).regex(/^[A-Z0-9_-]+$/i, 'Invalid activity code format'),
  activityName:      z.string().min(2).max(200),
  category:          z.string().min(1).max(100),
  destination:       z.string().min(1).max(200),
  minCost:           z.coerce.number().nonnegative().max(1_000_000).default(0),
  maxCost:           z.coerce.number().nonnegative().max(1_000_000).default(0),
  averageCost:       z.coerce.number().nonnegative().max(1_000_000),
  priceUnit:         z.string().max(50).default('per-person'),
  duration:          z.string().max(100).nullish(),
  durationHours:     z.coerce.number().nonnegative().max(500).nullish(),
  groupSize:         z.string().max(100).nullish(),
  difficulty:        z.string().max(50).nullish(),
  description:       z.string().max(2000).nullish(),
  provider:          z.string().max(200).nullish(),
  peakMultiplier:    z.coerce.number().min(0.1).max(10).default(1.0),
  offPeakMultiplier: z.coerce.number().min(0.1).max(10).default(1.0),
  requiresBooking:   z.coerce.boolean().default(true),
  popularity:        z.coerce.number().int().min(0).max(100).default(50),
  isActive:          z.coerce.boolean().default(true),
}).strict();

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

router.get('/visa-fees', limitNolscopeRead, asyncHandler(async (_req, res) => {
  const rows = await (prisma as any).visaFee.findMany({
    orderBy: [{ nationality: 'asc' }, { visaType: 'asc' }],
  });
  return res.json({ visaFees: rows.map((r: any) => ({ ...r, amount: n(r.amount) })) });
}));

router.put('/visa-fees/:id', limitNolscopeWrite, validate(visaFeePutSchema), asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });

  const {
    amount, entries, durationDays, processingTime,
    description, isActive, requirements,
  } = (req as any).validatedBody;

  const data: any = {};
  if (amount         !== undefined) data.amount        = amount;
  if (entries        !== undefined) data.entries        = entries;
  if (durationDays   !== undefined) data.durationDays   = durationDays;
  if (processingTime !== undefined) data.processingTime = sanitizeText(processingTime);
  if (description    !== undefined) data.description    = description ? sanitizeText(description) : null;
  if (isActive       !== undefined) data.isActive       = isActive;
  if (requirements   !== undefined) data.requirements   = requirements;
  data.lastVerified = new Date();

  const before  = await (prisma as any).visaFee.findUnique({ where: { id } });
  const updated = await (prisma as any).visaFee.update({ where: { id }, data });
  void writeAudit(req, 'NOLSCOPE_VISA_FEE_UPDATE', 'NOLSCOPE_VISA_FEE', id, before ?? {}, updated);
  return res.json({ updated: { ...updated, amount: n(updated.amount) } });
}));

router.post('/visa-fees', limitNolscopeWrite, validate(visaFeePostSchema), asyncHandler(async (req, res) => {
  const { nationality, amount, visaType, entries, durationDays, processingTime, description, requirements } = (req as any).validatedBody;

  const created = await (prisma as any).visaFee.create({
    data: {
      nationality:    nationality.toUpperCase().trim(),
      amount,
      visaType:       visaType ?? 'tourist',
      entries:        entries ?? 'single',
      durationDays:   durationDays ?? 90,
      processingTime: sanitizeText(processingTime ?? 'on-arrival'),
      description:    description ? sanitizeText(description) : null,
      requirements:   requirements ?? null,
    },
  });
  void writeAudit(req, 'NOLSCOPE_VISA_FEE_CREATE', 'NOLSCOPE_VISA_FEE', created.id, {}, created);
  return res.status(201).json({ created: { ...created, amount: n(created.amount) } });
}));

// ─── PARK FEES ────────────────────────────────────────────────────────────────

router.get('/park-fees', limitNolscopeRead, asyncHandler(async (_req, res) => {
  const rows = await (prisma as any).parkFee.findMany({
    orderBy: [{ region: 'asc' }, { parkName: 'asc' }],
  });
  return res.json({ parkFees: rows });
}));

router.put('/park-fees/:id', limitNolscopeWrite, validate(parkFeePutSchema), asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });

  const body = (req as any).validatedBody;
  const allowed = [
    'adultForeignerFee', 'adultResidentFee', 'childForeignerFee', 'childResidentFee',
    'vehicleFee', 'guideFee', 'campingFee', 'requiresGuide', 'minimumDays',
    'description', 'officialWebsite', 'isActive',
  ];
  const data: any = {};
  for (const key of allowed) {
    const val = body[key];
    if (val === undefined) continue;
    data[key] = val;
  }
  if (Object.keys(data).length === 0) return res.status(400).json({ error: 'no updatable fields provided' });
  if (data.description)    data.description    = sanitizeText(data.description);
  data.lastVerified = new Date();

  const before  = await (prisma as any).parkFee.findUnique({ where: { id } });
  const updated = await (prisma as any).parkFee.update({ where: { id }, data });
  void writeAudit(req, 'NOLSCOPE_PARK_FEE_UPDATE', 'NOLSCOPE_PARK_FEE', id, before ?? {}, updated);
  return res.json({ updated });
}));

router.post('/park-fees', limitNolscopeWrite, validate(parkFeePostSchema), asyncHandler(async (req, res) => {
  const { parkCode, parkName, category, region, adultForeignerFee, adultResidentFee,
    childForeignerFee, childResidentFee, vehicleFee, campingFee, guideFee,
    requiresGuide, minimumDays, description, officialWebsite } = (req as any).validatedBody;

  const created = await (prisma as any).parkFee.create({
    data: {
      parkCode:          parkCode.toUpperCase().trim(),
      parkName:          sanitizeText(parkName),
      category,
      region:            sanitizeText(region),
      adultForeignerFee,
      adultResidentFee,
      childForeignerFee: childForeignerFee ?? null,
      childResidentFee:  childResidentFee  ?? null,
      vehicleFee:        vehicleFee        ?? null,
      campingFee:        campingFee        ?? null,
      guideFee:          guideFee          ?? null,
      requiresGuide:     requiresGuide     ?? false,
      minimumDays:       minimumDays       ?? null,
      description:       description ? sanitizeText(description) : null,
      officialWebsite:   officialWebsite   ?? null,
    },
  });
  void writeAudit(req, 'NOLSCOPE_PARK_FEE_CREATE', 'NOLSCOPE_PARK_FEE', created.id, {}, created);
  return res.status(201).json({ created });
}));

// ─── TRANSPORT ROUTES ─────────────────────────────────────────────────────────

router.get('/transport-routes', limitNolscopeRead, asyncHandler(async (req, res) => {
  const type = String((req.query as any)?.type ?? '').trim().slice(0, 50);
  const where: any = {};
  if (type) where.transportType = type;
  const rows = await (prisma as any).transportCostAverage.findMany({
    where,
    orderBy: [{ fromLocation: 'asc' }, { transportType: 'asc' }],
  });
  return res.json({ routes: rows });
}));

router.put('/transport-routes/:id', limitNolscopeWrite, validate(transportPutSchema), asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });

  const body = (req as any).validatedBody;
  const allowed = [
    'minCost', 'maxCost', 'averageCost', 'durationHours', 'distanceKm',
    'frequency', 'peakMultiplier', 'offPeakMultiplier', 'description',
    'provider', 'requiresBooking', 'bookingLeadDays', 'confidence',
    'dataSource', 'isActive',
  ];
  const data: any = {};
  for (const key of allowed) {
    const val = body[key];
    if (val === undefined) continue;
    data[key] = val;
  }
  if (Object.keys(data).length === 0) return res.status(400).json({ error: 'no updatable fields provided' });
  if (data.description) data.description = sanitizeText(data.description);
  if (data.provider)    data.provider    = sanitizeText(data.provider);
  if (data.frequency)   data.frequency   = sanitizeText(data.frequency);
  data.lastUpdated = new Date();

  const before  = await (prisma as any).transportCostAverage.findUnique({ where: { id } });
  const updated = await (prisma as any).transportCostAverage.update({ where: { id }, data });
  void writeAudit(req, 'NOLSCOPE_TRANSPORT_UPDATE', 'NOLSCOPE_TRANSPORT', id, before ?? {}, updated);
  return res.json({ updated });
}));

router.post('/transport-routes', limitNolscopeWrite, validate(transportPostSchema), asyncHandler(async (req, res) => {
  const { fromLocation, toLocation, transportType, minCost, maxCost, averageCost,
    durationHours, distanceKm, frequency, peakMultiplier, offPeakMultiplier,
    description, provider, requiresBooking, bookingLeadDays, confidence, dataSource } = (req as any).validatedBody;

  const created = await (prisma as any).transportCostAverage.create({
    data: {
      fromLocation:      sanitizeText(fromLocation),
      toLocation:        sanitizeText(toLocation),
      transportType,
      minCost:           minCost ?? averageCost,
      maxCost:           maxCost ?? averageCost,
      averageCost,
      durationHours:     durationHours  ?? null,
      distanceKm:        distanceKm     ?? null,
      frequency:         frequency      ? sanitizeText(frequency)    : null,
      peakMultiplier:    peakMultiplier    ?? 1.0,
      offPeakMultiplier: offPeakMultiplier ?? 1.0,
      description:       description    ? sanitizeText(description)  : null,
      provider:          provider       ? sanitizeText(provider)     : null,
      requiresBooking:   requiresBooking ?? false,
      bookingLeadDays:   bookingLeadDays ?? null,
      confidence:        confidence      ?? 0.80,
      dataSource:        dataSource      ?? 'manual-entry',
    },
  });
  void writeAudit(req, 'NOLSCOPE_TRANSPORT_CREATE', 'NOLSCOPE_TRANSPORT', created.id, {}, created);
  return res.status(201).json({ created });
}));

// ─── PRICING RULES ────────────────────────────────────────────────────────────

router.get('/pricing-rules', limitNolscopeRead, asyncHandler(async (_req, res) => {
  const rules = await (prisma as any).pricingRule.findMany({
    orderBy: [{ priority: 'desc' }, { ruleName: 'asc' }],
  });
  return res.json({ pricingRules: rules });
}));

router.put('/pricing-rules/:id', limitNolscopeWrite, validate(pricingRulePutSchema), asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });

  const body = (req as any).validatedBody;
  const allowed = [
    'priceMultiplier', 'startMonth', 'endMonth', 'seasonName',
    'destination', 'category', 'minTravelers', 'maxTravelers',
    'daysInAdvance', 'priority', 'isActive', 'description',
    'validFrom', 'validUntil',
  ];
  const data: any = {};
  for (const key of allowed) {
    const val = body[key];
    if (val === undefined) continue;
    data[key] = val;
  }
  if (Object.keys(data).length === 0) return res.status(400).json({ error: 'no updatable fields provided' });
  if (data.description) data.description = sanitizeText(data.description);

  const before  = await (prisma as any).pricingRule.findUnique({ where: { id } });
  const updated = await (prisma as any).pricingRule.update({ where: { id }, data });
  void writeAudit(req, 'NOLSCOPE_PRICING_RULE_UPDATE', 'NOLSCOPE_PRICING_RULE', id, before ?? {}, updated);
  return res.json({ updated });
}));

// ─── ACTIVITIES ───────────────────────────────────────────────────────────────

router.get('/activities', limitNolscopeRead, asyncHandler(async (req, res) => {
  const dest     = String((req.query as any)?.dest     ?? '').trim().slice(0, 200);
  const category = String((req.query as any)?.category ?? '').trim().slice(0, 100);
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

router.put('/activities/:id', limitNolscopeWrite, validate(activityPutSchema), asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });

  const body = (req as any).validatedBody;
  const allowed = [
    'activityName', 'category', 'destination', 'minCost', 'maxCost', 'averageCost',
    'priceUnit', 'duration', 'durationHours', 'groupSize', 'difficulty',
    'includes', 'excludes', 'requirements', 'seasonalActivity', 'availableMonths',
    'requiresBooking', 'bookingLeadDays', 'peakMultiplier', 'offPeakMultiplier',
    'description', 'provider', 'website', 'popularity', 'isActive',
  ];
  const data: any = {};
  for (const key of allowed) {
    const val = body[key];
    if (val === undefined) continue;
    data[key] = val;
  }
  if (Object.keys(data).length === 0) return res.status(400).json({ error: 'no updatable fields provided' });
  if (data.activityName) data.activityName = sanitizeText(data.activityName);
  if (data.description)  data.description  = sanitizeText(data.description);
  if (data.provider)     data.provider     = sanitizeText(data.provider);

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

router.post('/activities', limitNolscopeWrite, validate(activityPostSchema), asyncHandler(async (req, res) => {
  const { activityCode, activityName, category, destination, minCost, maxCost, averageCost,
    priceUnit, duration, durationHours, groupSize, difficulty, description, provider,
    peakMultiplier, offPeakMultiplier, requiresBooking, popularity, isActive } = (req as any).validatedBody;

  const created = await (prisma as any).activityCost.create({
    data: {
      activityCode:      activityCode.toUpperCase().trim(),
      activityName:      sanitizeText(activityName),
      category,
      destination:       sanitizeText(destination),
      minCost:           minCost ?? averageCost,
      maxCost:           maxCost ?? averageCost,
      averageCost,
      priceUnit:         priceUnit     ?? 'per-person',
      duration:          duration      ?? null,
      durationHours:     durationHours ?? null,
      groupSize:         groupSize     ?? null,
      difficulty:        difficulty    ?? null,
      description:       description   ? sanitizeText(description)  : null,
      provider:          provider      ? sanitizeText(provider)     : null,
      peakMultiplier:    peakMultiplier    ?? 1.0,
      offPeakMultiplier: offPeakMultiplier ?? 1.0,
      requiresBooking:   requiresBooking   ?? true,
      popularity:        popularity        ?? 50,
      isActive:          isActive          ?? true,
    },
  });
  void writeAudit(req, 'NOLSCOPE_ACTIVITY_CREATE', 'NOLSCOPE_ACTIVITY', created.id, {}, created);
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

// ─── DESTINATIONS ─────────────────────────────────────────────────────────────

const destinationPutSchema = z.object({
  destinationName:         z.string().min(2).max(120).optional(),
  displayName:             z.string().max(200).nullish(),
  destinationType:         z.enum(['national-park', 'conservation-area', 'marine-park', 'game-reserve', 'island', 'city', 'region', 'mountain', 'beach']).optional(),
  country:                 z.string().max(80).optional(),
  region:                  z.string().max(100).optional(),
  nearestCity:             z.string().max(80).nullish(),
  mainAirport:             z.string().max(100).nullish(),
  accessDifficulty:        z.enum(['easy', 'moderate', 'difficult']).optional(),
  description:             z.string().max(5000).nullish(),
  imageUrl:                z.string().url().max(500).nullish(),
  officialWebsite:         z.string().url().max(300).nullish(),
  popularity:              z.coerce.number().int().min(0).max(100).optional(),
  avgStayDays:             z.coerce.number().int().min(0).max(365).nullish(),
  accommodationMultiplier: z.coerce.number().min(0.01).max(20).optional(),
  transportBaseUsd:        z.coerce.number().nonnegative().max(1_000_000).nullish(),
  isActive:                z.coerce.boolean().optional(),
  bestMonths:              z.unknown().optional(),
  peakMonths:              z.unknown().optional(),
  offPeakMonths:           z.unknown().optional(),
  rainyMonths:             z.unknown().optional(),
}).strict();

const destinationPostSchema = z.object({
  destinationCode:         z.string().min(2).max(30).regex(/^[A-Z0-9_-]+$/i, 'Invalid code format'),
  destinationName:         z.string().min(2).max(120),
  displayName:             z.string().max(200).nullish(),
  destinationType:         z.enum(['national-park', 'conservation-area', 'marine-park', 'game-reserve', 'island', 'city', 'region', 'mountain', 'beach']),
  country:                 z.string().max(80).default('Tanzania'),
  region:                  z.string().min(2).max(100),
  nearestCity:             z.string().max(80).nullish(),
  mainAirport:             z.string().max(100).nullish(),
  accessDifficulty:        z.enum(['easy', 'moderate', 'difficult']).default('moderate'),
  description:             z.string().max(5000).nullish(),
  imageUrl:                z.string().url().max(500).nullish(),
  officialWebsite:         z.string().url().max(300).nullish(),
  popularity:              z.coerce.number().int().min(0).max(100).default(50),
  avgStayDays:             z.coerce.number().int().min(0).max(365).nullish(),
  accommodationMultiplier: z.coerce.number().min(0.01).max(20).default(1.0),
  transportBaseUsd:        z.coerce.number().nonnegative().max(1_000_000).nullish(),
  isActive:                z.coerce.boolean().default(true),
  bestMonths:              z.unknown().optional(),
  peakMonths:              z.unknown().optional(),
  offPeakMonths:           z.unknown().optional(),
  rainyMonths:             z.unknown().optional(),
}).strict();

router.get('/destinations', limitNolscopeRead, asyncHandler(async (_req, res) => {
  const rows = await (prisma as any).tripDestination.findMany({
    orderBy: [{ isActive: 'desc' }, { popularity: 'desc' }, { destinationName: 'asc' }],
  });
  return res.json({ destinations: rows.map((r: any) => ({
    ...r,
    accommodationMultiplier: n(r.accommodationMultiplier),
    transportBaseUsd: r.transportBaseUsd ? n(r.transportBaseUsd) : null,
  })) });
}));

router.put('/destinations/:id', limitNolscopeWrite, validate(destinationPutSchema), asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'invalid id' });
  const body = (req as any).validatedBody as z.infer<typeof destinationPutSchema>;
  const before = await (prisma as any).tripDestination.findUnique({ where: { id } });
  if (!before) return res.status(404).json({ error: 'destination not found' });
  const updated = await (prisma as any).tripDestination.update({
    where: { id },
    data: {
      ...( body.destinationName         !== undefined && { destinationName:         sanitizeText(body.destinationName) }),
      ...( body.displayName             !== undefined && { displayName:             body.displayName ? sanitizeText(body.displayName) : null }),
      ...( body.destinationType         !== undefined && { destinationType:         body.destinationType }),
      ...( body.country                 !== undefined && { country:                 sanitizeText(body.country) }),
      ...( body.region                  !== undefined && { region:                  sanitizeText(body.region) }),
      ...( body.nearestCity             !== undefined && { nearestCity:             body.nearestCity ? sanitizeText(body.nearestCity) : null }),
      ...( body.mainAirport             !== undefined && { mainAirport:             body.mainAirport ? sanitizeText(body.mainAirport) : null }),
      ...( body.accessDifficulty        !== undefined && { accessDifficulty:        body.accessDifficulty }),
      ...( body.description             !== undefined && { description:             body.description ? sanitizeText(body.description) : null }),
      ...( body.imageUrl                !== undefined && { imageUrl:                body.imageUrl }),
      ...( body.officialWebsite         !== undefined && { officialWebsite:         body.officialWebsite }),
      ...( body.popularity              !== undefined && { popularity:              body.popularity }),
      ...( body.avgStayDays             !== undefined && { avgStayDays:             body.avgStayDays }),
      ...( body.accommodationMultiplier !== undefined && { accommodationMultiplier: body.accommodationMultiplier }),
      ...( body.transportBaseUsd        !== undefined && { transportBaseUsd:        body.transportBaseUsd }),
      ...( body.isActive                !== undefined && { isActive:                body.isActive }),
      ...( body.bestMonths              !== undefined && { bestMonths:              body.bestMonths }),
      ...( body.peakMonths              !== undefined && { peakMonths:              body.peakMonths }),
      ...( body.offPeakMonths           !== undefined && { offPeakMonths:           body.offPeakMonths }),
      ...( body.rainyMonths             !== undefined && { rainyMonths:             body.rainyMonths }),
    },
  });
  void writeAudit(req, 'NOLSCOPE_DESTINATION_UPDATE', 'NOLSCOPE_DESTINATION', id, before, updated);
  return res.json({ updated });
}));

router.post('/destinations', limitNolscopeWrite, validate(destinationPostSchema), asyncHandler(async (req, res) => {
  const body = (req as any).validatedBody as z.infer<typeof destinationPostSchema>;
  const exists = await (prisma as any).tripDestination.findUnique({ where: { destinationCode: body.destinationCode.toUpperCase() } });
  if (exists) return res.status(409).json({ error: `Destination code ${body.destinationCode.toUpperCase()} already exists` });
  const created = await (prisma as any).tripDestination.create({
    data: {
      destinationCode:         body.destinationCode.toUpperCase(),
      destinationName:         sanitizeText(body.destinationName),
      displayName:             body.displayName ? sanitizeText(body.displayName) : null,
      destinationType:         body.destinationType,
      country:                 sanitizeText(body.country),
      region:                  sanitizeText(body.region),
      nearestCity:             body.nearestCity ? sanitizeText(body.nearestCity) : null,
      mainAirport:             body.mainAirport ? sanitizeText(body.mainAirport) : null,
      accessDifficulty:        body.accessDifficulty,
      description:             body.description ? sanitizeText(body.description) : null,
      imageUrl:                body.imageUrl ?? null,
      officialWebsite:         body.officialWebsite ?? null,
      popularity:              body.popularity,
      avgStayDays:             body.avgStayDays ?? null,
      accommodationMultiplier: body.accommodationMultiplier,
      transportBaseUsd:        body.transportBaseUsd ?? null,
      isActive:                body.isActive,
      bestMonths:              body.bestMonths ?? null,
      peakMonths:              body.peakMonths ?? null,
      offPeakMonths:           body.offPeakMonths ?? null,
      rainyMonths:             body.rainyMonths ?? null,
    },
  });
  void writeAudit(req, 'NOLSCOPE_DESTINATION_CREATE', 'NOLSCOPE_DESTINATION', created.id, {}, created);
  return res.status(201).json({ created });
}));

// ─── AUDIT HISTORY ────────────────────────────────────────────────────────────
//   GET /api/admin/nolscope/audit/:entity/:id
//   Returns the 30 most-recent AuditLog entries for a specific record,
//   with the actor's name + email joined in.

router.get('/audit/:entity/:entityId', limitNolscopeRead, asyncHandler(async (req, res) => {
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

router.get('/estimates', limitNolscopeRead, asyncHandler(async (req, res) => {
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

router.get('/estimates/stats', limitNolscopeRead, asyncHandler(async (_req, res) => {
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
