import { Router } from "express";
import { prisma } from "@nolsaf/prisma";

const router = Router();

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === "string") as string[];
}

/** GET /api/public/updates - Get public updates */
router.get("/", async (_req, res) => {
  try {
    // Ensure we always return JSON, even on errors
    res.setHeader('Content-Type', 'application/json');
    
    const rows = await prisma.siteUpdate.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const items = rows.map((row: any) => ({
      id: String(row.id),
      title: String(row.title),
      content: String(row.content),
      images: toStringArray(row.images),
      videos: toStringArray(row.videos),
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    }));

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
