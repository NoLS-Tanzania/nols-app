import { Router, RequestHandler } from "express";
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import crypto from "crypto";
import { requireAuth } from "../middleware/auth.js";

const s3 = new S3Client({ region: process.env.AWS_REGION });

export const router = Router();
router.use(requireAuth as RequestHandler);

// Allowed MIME types for file uploads
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf', // Only if PDF uploads are needed
];

const allowedFolderPatterns: Array<{ type: "exact"; value: string } | { type: "prefix"; value: string }> = [
  { type: "exact", value: "uploads" },
  { type: "exact", value: "avatars" },
  { type: "exact", value: "agent-documents" },
  { type: "exact", value: "owner-documents" },
  { type: "exact", value: "driver-documents" },
  { type: "prefix", value: "driver-documents/" },
  { type: "exact", value: "properties" },
  { type: "exact", value: "trust-partners" },
];

function isAllowedFolder(folder: string): boolean {
  for (const pattern of allowedFolderPatterns) {
    if (pattern.type === "exact" && folder === pattern.value) return true;
    if (pattern.type === "prefix" && folder.startsWith(pattern.value)) return true;
  }
  return false;
}

/** POST /uploads/s3/presign { folder: "avatars", contentType: "image/png" } */
router.post("/presign", async (req, res) => {
  const { folder = "uploads", contentType = "application/octet-stream" } = req.body ?? {};
  const normalizedFolder = String(folder || "").trim();

  if (!normalizedFolder || !/^[a-z0-9]+(?:[a-z0-9_-]*)(?:\/[a-z0-9]+(?:[a-z0-9_-]*))*$/i.test(normalizedFolder)) {
    return res.status(400).json({ error: "Invalid upload folder" });
  }

  if (!isAllowedFolder(normalizedFolder)) {
    return res.status(400).json({ error: "Invalid upload folder" });
  }
  
  // Validate MIME type - reject invalid types
  if (!ALLOWED_MIME_TYPES.includes(contentType)) {
    return res.status(400).json({ 
      error: "Invalid file type",
      allowedTypes: ALLOWED_MIME_TYPES 
    });
  }

  if (!process.env.S3_BUCKET || !process.env.AWS_REGION) {
    return res.status(500).json({ error: "s3_not_configured" });
  }
  
  const key = `${normalizedFolder}/${Date.now()}-${crypto.randomUUID()}`;
  const { url, fields } = await createPresignedPost(s3, {
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    Conditions: [
      ["content-length-range", 1, 10 * 1024 * 1024], // 10MB max
      ["eq", "$Content-Type", contentType], // Exact MIME type match (strict validation)
      ["starts-with", "$key", normalizedFolder], // Ensure folder structure is maintained
    ],
    Expires: 60,
    Fields: { "Content-Type": contentType },
  });
  res.json({ url, fields, key, publicUrl: `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}` });
});
