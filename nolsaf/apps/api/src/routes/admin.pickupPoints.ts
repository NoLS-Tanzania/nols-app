import { Router, RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

export const router = Router();
router.use(requireAuth as RequestHandler, requireAdmin as RequestHandler);

const CATEGORIES = ["airport", "bus_terminal", "ferry_port", "train_station"];
const ARRIVAL_TYPES = ["FLIGHT", "BUS", "TRAIN", "FERRY", "OTHER"];

function toDto(row: any) {
  return {
    id: row.id,
    code: String(row.code),
    name: String(row.name),
    shortLabel: String(row.shortLabel),
    city: String(row.city),
    category: String(row.category),
    arrivalType: String(row.arrivalType),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    iataCode: row.iataCode ? String(row.iataCode) : null,
    verified: Boolean(row.verified),
    isActive: Boolean(row.isActive),
    sortOrder: Number(row.sortOrder ?? 0),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString()
  };
}

function clampLat(n: unknown): number | null {
  const v = Number(n);
  return Number.isFinite(v) && v >= -90 && v <= 90 ? v : null;
}
function clampLng(n: unknown): number | null {
  const v = Number(n);
  return Number.isFinite(v) && v >= -180 && v <= 180 ? v : null;
}
function slugCode(value: string): string {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

/** GET /api/admin/pickup-points — list all (admins see inactive too). */
router.get("/", async (_req, res) => {
  try {
    const rows = await prisma.transportPickupPoint.findMany({
      orderBy: [{ category: "asc" }, { city: "asc" }, { name: "asc" }]
    });
    const items = rows.map(toDto);
    res.json({ items, total: items.length });
  } catch (err) {
    console.error("GET /api/admin/pickup-points error:", err);
    res.status(500).json({ error: "Failed to load pickup points" });
  }
});

/** POST /api/admin/pickup-points — create. */
router.post("/", async (req, res) => {
  try {
    const b = req.body || {};
    const name = String(b.name || "").trim();
    const shortLabel = String(b.shortLabel || "").trim() || name;
    const city = String(b.city || "").trim();
    const category = String(b.category || "").trim();
    const arrivalType = String(b.arrivalType || "").trim().toUpperCase();
    const lat = clampLat(b.latitude);
    const lng = clampLng(b.longitude);
    const code = slugCode(b.code || name);

    if (!name) return res.status(400).json({ error: "Name is required" });
    if (!city) return res.status(400).json({ error: "City is required" });
    if (!CATEGORIES.includes(category)) return res.status(400).json({ error: "Invalid category" });
    if (!ARRIVAL_TYPES.includes(arrivalType)) return res.status(400).json({ error: "Invalid arrival type" });
    if (lat === null || lng === null) return res.status(400).json({ error: "Valid latitude and longitude are required" });
    if (!code) return res.status(400).json({ error: "Could not derive a code" });

    const exists = await prisma.transportPickupPoint.findUnique({ where: { code } });
    if (exists) return res.status(409).json({ error: `A pickup point with code ${code} already exists` });

    const row = await prisma.transportPickupPoint.create({
      data: {
        code,
        name: name.slice(0, 200),
        shortLabel: shortLabel.slice(0, 120),
        city: city.slice(0, 120),
        category,
        arrivalType,
        latitude: lat,
        longitude: lng,
        iataCode: b.iataCode ? String(b.iataCode).trim().toUpperCase().slice(0, 8) : null,
        verified: b.verified === true,
        isActive: b.isActive !== false,
        sortOrder: Number.isFinite(Number(b.sortOrder)) ? Number(b.sortOrder) : 0
      }
    });
    res.status(201).json(toDto(row));
  } catch (err) {
    console.error("POST /api/admin/pickup-points error:", err);
    res.status(500).json({ error: "Failed to create pickup point" });
  }
});

/** PUT /api/admin/pickup-points/:id — update. */
router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const existing = await prisma.transportPickupPoint.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Pickup point not found" });

    const b = req.body || {};
    const data: Record<string, unknown> = {};

    if (b.name !== undefined) data.name = String(b.name).trim().slice(0, 200);
    if (b.shortLabel !== undefined) data.shortLabel = String(b.shortLabel).trim().slice(0, 120);
    if (b.city !== undefined) data.city = String(b.city).trim().slice(0, 120);
    if (b.category !== undefined) {
      const c = String(b.category).trim();
      if (!CATEGORIES.includes(c)) return res.status(400).json({ error: "Invalid category" });
      data.category = c;
    }
    if (b.arrivalType !== undefined) {
      const a = String(b.arrivalType).trim().toUpperCase();
      if (!ARRIVAL_TYPES.includes(a)) return res.status(400).json({ error: "Invalid arrival type" });
      data.arrivalType = a;
    }
    if (b.latitude !== undefined) {
      const lat = clampLat(b.latitude);
      if (lat === null) return res.status(400).json({ error: "Invalid latitude" });
      data.latitude = lat;
    }
    if (b.longitude !== undefined) {
      const lng = clampLng(b.longitude);
      if (lng === null) return res.status(400).json({ error: "Invalid longitude" });
      data.longitude = lng;
    }
    if (b.iataCode !== undefined) data.iataCode = b.iataCode ? String(b.iataCode).trim().toUpperCase().slice(0, 8) : null;
    if (b.verified !== undefined) data.verified = Boolean(b.verified);
    if (b.isActive !== undefined) data.isActive = Boolean(b.isActive);
    if (b.sortOrder !== undefined && Number.isFinite(Number(b.sortOrder))) data.sortOrder = Number(b.sortOrder);

    const row = await prisma.transportPickupPoint.update({ where: { id }, data });
    res.json(toDto(row));
  } catch (err) {
    console.error("PUT /api/admin/pickup-points/:id error:", err);
    res.status(500).json({ error: "Failed to update pickup point" });
  }
});

/** DELETE /api/admin/pickup-points/:id — remove. */
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });
    const existing = await prisma.transportPickupPoint.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Pickup point not found" });
    await prisma.transportPickupPoint.delete({ where: { id } });
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/admin/pickup-points/:id error:", err);
    res.status(500).json({ error: "Failed to delete pickup point" });
  }
});

export default router;
