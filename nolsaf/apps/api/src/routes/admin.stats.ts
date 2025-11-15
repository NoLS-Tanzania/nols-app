import { Router, RequestHandler } from "express";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { getRevenueSeries, getActivePropertiesSeries, getRevenueByType, getActivePropertiesBreakdown, getInvoiceStatus } from "../services/adminStats.js";
import type { SeriesResponse, BreakdownResponse } from "../types/stats.js";

export const router = Router();
router.use(requireAuth as RequestHandler, requireRole("ADMIN") as RequestHandler);

/**
 * GET /admin/stats/overview
 * Returns:
 * - grossAmount: sum of invoice.total for APPROVED|PAID (money billed to owners)
 * - companyRevenue: sum of invoice.commissionAmount for PAID (what NoLS earns)
 * - propertiesCount: APPROVED properties
 * - ownersCount: total owners with at least 1 property
 */
router.get("/overview", async (_req, res) => {
  try {
    const overview = await (await import('../services/adminStats.js')).getOverview();
    res.json(overview);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
});

/**
 * GET /admin/stats/revenue-series?from=&to=&region=
 * Returns daily totals between from/to for invoices with status APPROVED|PAID
 * { labels: ['2025-10-01',...], data: [1234, ...] }
 */
router.get('/revenue-series', async (req, res) => {
  try {
    const { from, to, region } = req.query as any;
    const result: SeriesResponse = await getRevenueSeries(from, to, region);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
});

/**
 * GET /admin/stats/active-properties-series?from=&to=&region=
 * Returns daily counts (cumulative approved properties) to approximate active properties trend
 * { labels: [...], data: [...] }
 */
router.get('/active-properties-series', async (req, res) => {
  try {
    const { from, to, region } = req.query as any;
    const result: SeriesResponse = await getActivePropertiesSeries(from, to, region);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
});

/**
 * GET /admin/stats/revenue-by-type?from=&to=&region=
 * Returns revenue sums grouped by property.type
 * { labels: ['Hotel', ...], data: [1234, ...] }
 */
router.get('/revenue-by-type', async (req, res) => {
  try {
    const { from, to, region } = req.query as any;
    const result: SeriesResponse = await getRevenueByType(from, to, region);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
});

/**
 * GET /admin/stats/active-properties-breakdown?region=&groupBy=propertyType|region
 * Returns counts grouped by property type or region
 */
router.get('/active-properties-breakdown', async (req, res) => {
  try {
    const { groupBy = 'propertyType', region } = req.query as any;
    const result: BreakdownResponse = await getActivePropertiesBreakdown(groupBy, region);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
});

/**
 * GET /admin/stats/invoice-status?from=&to=
 * Returns counts per invoice status in the period
 */
router.get('/invoice-status', async (req, res) => {
  try {
    const { from, to } = req.query as any;
    const result = await getInvoiceStatus(from, to);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed' });
  }
});

export default router;
