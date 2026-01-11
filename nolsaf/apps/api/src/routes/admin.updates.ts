import { Router, RequestHandler } from "express";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth } from "../middleware/auth.js";
import { requireAdmin } from "../middleware/admin.js";
import multer from "multer";
import { audit } from "../lib/audit.js";
import { getUpdatesStore, setUpdate, deleteUpdate, getAllUpdates, Update } from "../lib/updatesStore.js";

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

/** GET /api/admin/updates - List all updates */
router.get("/", async (_req, res) => {
  try {
    const items = getAllUpdates().sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
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
    const update = getUpdatesStore()[id];
    if (!update) {
      return res.status(404).json({ error: "Update not found" });
    }
    res.json(update);
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
    const now = new Date().toISOString();
    
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

    const update: Update = {
      id,
      title: String(title),
      content: String(content),
      images: imageUrls,
      videos: videoUrls,
      createdAt: now,
      updatedAt: now,
    };

    setUpdate(id, update);

    await audit(req as any, "ADMIN_UPDATE_CREATE", `update:${id}`, null, update);

    res.status(201).json(update);
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
    const existingUpdate = getUpdatesStore()[id];
    
    if (!existingUpdate) {
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

    const updated: Update = {
      ...existingUpdate,
      title: String(title),
      content: String(content),
      images: imageUrls,
      videos: videoUrls,
      updatedAt: new Date().toISOString(),
    };

    setUpdate(id, updated);

    await audit(req as any, "ADMIN_UPDATE_UPDATE", `update:${id}`, existingUpdate, updated);

    res.json(updated);
  } catch (err: any) {
    console.error("Error updating update:", err);
    res.status(500).json({ error: "Failed to update update", message: err?.message });
  }
});

/** DELETE /api/admin/updates/:id - Delete update */
router.delete("/:id", async (req: any, res) => {
  try {
    const { id } = req.params;
    const existingUpdate = getUpdatesStore()[id];
    
    if (!existingUpdate) {
      return res.status(404).json({ error: "Update not found" });
    }

    deleteUpdate(id);

    await audit(req as any, "ADMIN_UPDATE_DELETE", `update:${id}`, existingUpdate, null);

    res.json({ ok: true, message: "Update deleted successfully" });
  } catch (err: any) {
    console.error("Error deleting update:", err);
    res.status(500).json({ error: "Failed to delete update", message: err?.message });
  }
});

export default router;
