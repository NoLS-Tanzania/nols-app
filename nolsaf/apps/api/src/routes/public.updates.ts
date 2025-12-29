import { Router } from "express";
import { getAllUpdates } from "../lib/updatesStore.js";

const router = Router();

/** GET /api/public/updates - Get public updates */
router.get("/", async (_req, res) => {
  try {
    // Ensure we always return JSON, even on errors
    res.setHeader('Content-Type', 'application/json');
    
    const items = getAllUpdates()
      .sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 20); // Limit to latest 20 updates
    res.status(200).json({ items, total: items.length });
  } catch (err: any) {
    console.error("Error fetching public updates:", err);
    console.error("Error details:", {
      code: err?.code,
      message: err?.message,
      stack: err?.stack,
      name: err?.name,
    });
    
    // Ensure JSON response header is set
    res.setHeader('Content-Type', 'application/json');
    
    // Return empty array instead of 500 to prevent UI crash
    res.status(200).json({ items: [], total: 0 });
  }
});

export default router;
