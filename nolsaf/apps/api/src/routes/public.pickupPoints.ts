import { Router } from "express";
import { prisma } from "@nolsaf/prisma";

const router = Router();

/**
 * GET /api/public/pickup-points
 * Active transport pickup points (airports, bus terminals, ferry ports) the
 * customer can be collected from. Shaped to match the mobile PickupPoint type.
 */
router.get("/", async (_req, res) => {
  try {
    // Reference data that admins edit live — never serve a cached/stale copy,
    // so every admin change to a location is reflected on the next fetch.
    res.set("Cache-Control", "no-store");

    const rows = await prisma.transportPickupPoint.findMany({
      where: { isActive: true },
      orderBy: [{ category: "asc" }, { verified: "desc" }, { city: "asc" }, { name: "asc" }]
    });

    const items = rows.map((r: any) => ({
      id: r.code,
      label: r.name,
      shortLabel: r.shortLabel,
      city: r.city,
      lat: Number(r.latitude),
      lng: Number(r.longitude),
      category: r.category,
      arrivalType: r.arrivalType,
      iataCode: r.iataCode || undefined,
      verified: Boolean(r.verified)
    }));

    res.json({ items, total: items.length });
  } catch (err) {
    console.error("GET /api/public/pickup-points error:", err);
    res.status(500).json({ error: "Failed to load pickup points" });
  }
});

export default router;
