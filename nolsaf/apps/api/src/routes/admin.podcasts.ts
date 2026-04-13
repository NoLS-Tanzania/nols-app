import { Router, RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";

export const router = Router();
router.use(requireAuth as RequestHandler, requireAdmin as RequestHandler);

function generateId() {
  return `pod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === "string") as string[];
}

function toApiDto(row: any) {
  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description),
    youtubeUrl: String(row.youtubeUrl),
    thumbnailUrl: row.thumbnailUrl ? String(row.thumbnailUrl) : null,
    guestName: row.guestName ? String(row.guestName) : null,
    guestRole: row.guestRole ? String(row.guestRole) : null,
    tags: toStringArray(row.tags),
    duration: row.duration ? String(row.duration) : null,
    published: Boolean(row.published),
    publishedAt: row.publishedAt ? new Date(row.publishedAt).toISOString() : null,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

/** Extract YouTube video ID from various URL formats */
function extractYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

/** GET /api/admin/podcasts — list all episodes */
router.get("/", async (_req, res) => {
  try {
    const rows = await prisma.podcastEpisode.findMany({
      orderBy: { createdAt: "desc" },
    });
    const items = rows.map(toApiDto);
    res.json({ items, total: items.length });
  } catch (err: any) {
    console.error("Error fetching podcast episodes:", err);
    res.status(500).json({ error: "Failed to fetch episodes" });
  }
});

/** GET /api/admin/podcasts/:id — single episode */
router.get("/:id", async (req, res) => {
  try {
    const row = await prisma.podcastEpisode.findUnique({ where: { id: req.params.id } });
    if (!row) return res.status(404).json({ error: "Episode not found" });
    res.json(toApiDto(row));
  } catch (err: any) {
    console.error("Error fetching podcast episode:", err);
    res.status(500).json({ error: "Failed to fetch episode" });
  }
});

/** POST /api/admin/podcasts — create episode */
router.post("/", async (req, res) => {
  try {
    const { title, description, youtubeUrl, guestName, guestRole, tags, duration, published } = req.body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return res.status(400).json({ error: "Title is required" });
    }
    if (!youtubeUrl || typeof youtubeUrl !== "string") {
      return res.status(400).json({ error: "YouTube URL is required" });
    }

    const videoId = extractYouTubeId(youtubeUrl.trim());
    if (!videoId) {
      return res.status(400).json({ error: "Invalid YouTube URL" });
    }

    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    const isPublished = published === true;

    const row = await prisma.podcastEpisode.create({
      data: {
        id: generateId(),
        title: title.trim().slice(0, 300),
        description: (description || "").trim(),
        youtubeUrl: youtubeUrl.trim(),
        thumbnailUrl,
        guestName: guestName ? String(guestName).trim().slice(0, 200) : null,
        guestRole: guestRole ? String(guestRole).trim().slice(0, 200) : null,
        tags: Array.isArray(tags) ? tags.filter((t: unknown) => typeof t === "string").slice(0, 10) : null,
        duration: duration ? String(duration).trim().slice(0, 20) : null,
        published: isPublished,
        publishedAt: isPublished ? new Date() : null,
      },
    });

    res.status(201).json(toApiDto(row));
  } catch (err: any) {
    console.error("Error creating podcast episode:", err);
    res.status(500).json({ error: "Failed to create episode" });
  }
});

/** PUT /api/admin/podcasts/:id — update episode */
router.put("/:id", async (req, res) => {
  try {
    const existing = await prisma.podcastEpisode.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Episode not found" });

    const { title, description, youtubeUrl, guestName, guestRole, tags, duration, published } = req.body;

    const data: Record<string, any> = {};

    if (title !== undefined) data.title = String(title).trim().slice(0, 300);
    if (description !== undefined) data.description = String(description).trim();
    if (guestName !== undefined) data.guestName = guestName ? String(guestName).trim().slice(0, 200) : null;
    if (guestRole !== undefined) data.guestRole = guestRole ? String(guestRole).trim().slice(0, 200) : null;
    if (duration !== undefined) data.duration = duration ? String(duration).trim().slice(0, 20) : null;
    if (tags !== undefined) data.tags = Array.isArray(tags) ? tags.filter((t: unknown) => typeof t === "string").slice(0, 10) : null;

    if (youtubeUrl !== undefined) {
      const videoId = extractYouTubeId(String(youtubeUrl).trim());
      if (!videoId) return res.status(400).json({ error: "Invalid YouTube URL" });
      data.youtubeUrl = String(youtubeUrl).trim();
      data.thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }

    if (published !== undefined) {
      data.published = Boolean(published);
      if (Boolean(published) && !existing.published) {
        data.publishedAt = new Date();
      }
      if (!Boolean(published)) {
        data.publishedAt = null;
      }
    }

    const row = await prisma.podcastEpisode.update({ where: { id: req.params.id }, data });
    res.json(toApiDto(row));
  } catch (err: any) {
    console.error("Error updating podcast episode:", err);
    res.status(500).json({ error: "Failed to update episode" });
  }
});

/** DELETE /api/admin/podcasts/:id — delete episode */
router.delete("/:id", async (req, res) => {
  try {
    const existing = await prisma.podcastEpisode.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: "Episode not found" });
    await prisma.podcastEpisode.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting podcast episode:", err);
    res.status(500).json({ error: "Failed to delete episode" });
  }
});

export default router;
