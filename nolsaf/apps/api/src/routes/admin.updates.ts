import { Router, RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import multer from "multer";
import { audit } from "../lib/audit.js";

export const router = Router();
router.use(requireAuth as RequestHandler, requireAdmin as RequestHandler);

// Configure multer for file uploads (using memory storage for now)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Helper to generate ID
function generateId() {
  return `update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper to convert buffer to base64 URL (for demo - use proper file storage in production)
function bufferToDataURL(buffer: Buffer, mimeType: string): string {
  const base64 = buffer.toString('base64');
  return `data:${mimeType};base64,${base64}`;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v) => typeof v === "string") as string[];
}

function toApiDto(row: any) {
  return {
    id: String(row.id),
    title: String(row.title),
    content: String(row.content),
    images: toStringArray(row.images),
    videos: toStringArray(row.videos),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

/** GET /api/admin/updates - List all updates */
router.get("/", async (_req, res) => {
  try {
    const rows = await prisma.siteUpdate.findMany({ orderBy: { createdAt: "desc" } });
    const items = rows.map(toApiDto);
    res.json({ items, total: items.length });
  } catch (err: any) {
    console.error("Error fetching updates:", err);
    res.status(500).json({ error: "Failed to fetch updates", message: err?.message });
  }
});

/** GET /api/admin/updates/:id - Get single update */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const row = await prisma.siteUpdate.findUnique({ where: { id } });
    if (!row) {
      return res.status(404).json({ error: "Update not found" });
    }
    res.json(toApiDto(row));
  } catch (err: any) {
    console.error("Error fetching update:", err);
    res.status(500).json({ error: "Failed to fetch update", message: err?.message });
  }
});

/** POST /api/admin/updates - Create new update */
router.post("/", upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'videos', maxCount: 5 }
]), async (req: any, res) => {
  try {
    const { title, content, existingImages, existingVideos } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    const id = generateId();
    
    // Process uploaded images
    const imageUrls: string[] = Array.isArray(existingImages) ? existingImages : [];
    if (req.files?.images) {
      const imageFiles = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      for (const file of imageFiles) {
        const dataUrl = bufferToDataURL(file.buffer, file.mimetype);
        imageUrls.push(dataUrl);
      }
    }

    // Process uploaded videos
    const videoUrls: string[] = Array.isArray(existingVideos) ? existingVideos : [];
    if (req.files?.videos) {
      const videoFiles = Array.isArray(req.files.videos) ? req.files.videos : [req.files.videos];
      for (const file of videoFiles) {
        const dataUrl = bufferToDataURL(file.buffer, file.mimetype);
        videoUrls.push(dataUrl);
      }
    }

    const created = await prisma.siteUpdate.create({
      data: {
        id,
        title: String(title),
        content: String(content),
        images: imageUrls,
        videos: videoUrls,
      },
    });

    const dto = toApiDto(created);
    await audit(req as any, "ADMIN_UPDATE_CREATE", `update:${id}`, null, dto);
    res.status(201).json(dto);
  } catch (err: any) {
    console.error("Error creating update:", err);
    res.status(500).json({ error: "Failed to create update", message: err?.message });
  }
});

/** PUT /api/admin/updates/:id - Update existing update */
router.put("/:id", upload.fields([
  { name: 'images', maxCount: 10 },
  { name: 'videos', maxCount: 5 }
]), async (req: any, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.siteUpdate.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Update not found" });
    }

    const { title, content, existingImages, existingVideos } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: "Title and content are required" });
    }

    // Process uploaded images
    let imageUrls: string[] = Array.isArray(existingImages) ? existingImages : [];
    if (req.files?.images) {
      const imageFiles = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
      for (const file of imageFiles) {
        const dataUrl = bufferToDataURL(file.buffer, file.mimetype);
        imageUrls.push(dataUrl);
      }
    }

    // Process uploaded videos
    let videoUrls: string[] = Array.isArray(existingVideos) ? existingVideos : [];
    if (req.files?.videos) {
      const videoFiles = Array.isArray(req.files.videos) ? req.files.videos : [req.files.videos];
      for (const file of videoFiles) {
        const dataUrl = bufferToDataURL(file.buffer, file.mimetype);
        videoUrls.push(dataUrl);
      }
    }

    const updated = await prisma.siteUpdate.update({
      where: { id },
      data: {
        title: String(title),
        content: String(content),
        images: imageUrls,
        videos: videoUrls,
      },
    });

    const dto = toApiDto(updated);
    await audit(req as any, "ADMIN_UPDATE_UPDATE", `update:${id}`, toApiDto(existing), dto);
    res.json(dto);
  } catch (err: any) {
    console.error("Error updating update:", err);
    res.status(500).json({ error: "Failed to update update", message: err?.message });
  }
});

/** DELETE /api/admin/updates/:id - Delete update */
router.delete("/:id", async (req: any, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.siteUpdate.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: "Update not found" });
    }

    await prisma.siteUpdate.delete({ where: { id } });
    await audit(req as any, "ADMIN_UPDATE_DELETE", `update:${id}`, toApiDto(existing), null);

    res.json({ ok: true, message: "Update deleted successfully" });
  } catch (err: any) {
    console.error("Error deleting update:", err);
    res.status(500).json({ error: "Failed to delete update", message: err?.message });
  }
});

export default router;
