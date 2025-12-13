import { Router } from "express";
import { getAllUpdates } from "../lib/updatesStore.js";

const router = Router();

/** GET /api/public/updates - Get public updates */
router.get("/", async (_req, res) => {
  try {
    const items = getAllUpdates()
      .sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 20); // Limit to latest 20 updates
    res.json({ items, total: items.length });
  } catch (err: any) {
    console.error("Error fetching public updates:", err);
    res.status(500).json({ error: "Failed to fetch updates", message: err?.message });
  }
});

export default router;
