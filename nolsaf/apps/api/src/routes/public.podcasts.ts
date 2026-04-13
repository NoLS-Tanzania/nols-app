import { Router } from "express";
import { prisma } from "@nolsaf/prisma";

const router = Router();

/** GET /api/public/podcasts — list published episodes */
router.get("/", async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 6, 1), 20);

    const rows = await prisma.podcastEpisode.findMany({
      where: { published: true },
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: {
        id: true,
        title: true,
        description: true,
        youtubeUrl: true,
        thumbnailUrl: true,
        guestName: true,
        guestRole: true,
        tags: true,
        duration: true,
        publishedAt: true,
      },
    });

    const items = rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      youtubeUrl: r.youtubeUrl,
      thumbnailUrl: r.thumbnailUrl,
      guestName: r.guestName,
      guestRole: r.guestRole,
      tags: Array.isArray(r.tags) ? r.tags : [],
      duration: r.duration,
      publishedAt: r.publishedAt ? new Date(r.publishedAt).toISOString() : null,
    }));

    res.json({ items, total: items.length });
  } catch (err: any) {
    console.error("Error fetching public podcast episodes:", err);
    res.status(500).json({ error: "Failed to fetch episodes" });
  }
});

export default router;
