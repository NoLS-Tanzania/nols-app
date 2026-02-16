import { Router } from "express";
import { v2 as cloudinary } from "cloudinary";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { limitCloudinarySign } from "../middleware/rateLimit.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export const router = Router();
router.use(requireAuth);

const signQuerySchema = z
  .object({
    folder: z
      .string()
      .trim()
      .min(1)
      .max(80)
      // Cloudinary folder constraints (keep tight to avoid weird injection/abuse)
      .regex(/^[a-z0-9]+(?:[a-z0-9_-]*)(?:\/[a-z0-9]+(?:[a-z0-9_-]*))*$/i)
      .optional(),
  })
  .strict();

const allowedFolderPatterns: Array<{ type: "exact"; value: string } | { type: "prefix"; value: string }> = [
  { type: "exact", value: "uploads" },
  { type: "exact", value: "avatars" },
  { type: "exact", value: "agent-documents" },
  { type: "prefix", value: "driver-documents/" },
  { type: "exact", value: "properties" },
  { type: "exact", value: "trust-partners" },
];

function isAllowedFolder(folder: string): boolean {
  for (const p of allowedFolderPatterns) {
    if (p.type === "exact" && folder === p.value) return true;
    if (p.type === "prefix" && folder.startsWith(p.value)) return true;
  }
  return false;
}

/** GET /uploads/cloudinary/sign?folder=avatars */
router.get("/sign", limitCloudinarySign as any, (req, res) => {
  const parsed = signQuerySchema.safeParse(req.query ?? {});
  if (!parsed.success) return res.status(400).json({ error: "invalid_query" });

  const folder = parsed.data.folder || "uploads";
  if (!isAllowedFolder(folder)) {
    return res.status(400).json({ error: "invalid_folder" });
  }

  if (!process.env.CLOUDINARY_API_SECRET || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_CLOUD_NAME) {
    return res.status(500).json({ error: "cloudinary_not_configured" });
  }

  const timestamp = Math.floor(Date.now() / 1000);
  // Cloudinary signature is sensitive to exact param values.
  // Use string values to match what browsers send via FormData.
  const params = { timestamp, folder, overwrite: "true" };
  const signature = cloudinary.utils.api_sign_request(params as any, process.env.CLOUDINARY_API_SECRET!);
  res.setHeader("Cache-Control", "no-store");
  res.json({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    timestamp,
    folder,
    signature,
  });
});
