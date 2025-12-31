import { Router, RequestHandler } from "express";
import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
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

/** POST /uploads/s3/presign { folder: "avatars", contentType: "image/png" } */
router.post("/presign", async (req, res) => {
  const { folder = "uploads", contentType = "application/octet-stream" } = req.body ?? {};
  
  // Validate MIME type - reject invalid types
  if (!ALLOWED_MIME_TYPES.includes(contentType)) {
    return res.status(400).json({ 
      error: "Invalid file type",
      allowedTypes: ALLOWED_MIME_TYPES 
    });
  }
  
  const key = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { url, fields } = await createPresignedPost(s3, {
    Bucket: process.env.S3_BUCKET!,
    Key: key,
    Conditions: [
      ["content-length-range", 1, 10 * 1024 * 1024], // 10MB max
      ["eq", "$Content-Type", contentType], // Exact MIME type match (strict validation)
      ["starts-with", "$key", folder], // Ensure folder structure is maintained
    ],
    Expires: 60,
    Fields: { "Content-Type": contentType },
  });
  res.json({ url, fields, key, publicUrl: `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}` });
});
