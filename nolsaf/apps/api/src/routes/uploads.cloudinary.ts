import { Router } from "express";
import crypto from "crypto";
import { v2 as cloudinary } from "cloudinary";
import { requireAuth } from "../middleware/auth.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export const router = Router();
router.use(requireAuth);

/** GET /uploads/cloudinary/sign?folder=avatars */
router.get("/sign", (req, res) => {
  const folder = (req.query.folder as string) || "uploads";
  const timestamp = Math.floor(Date.now() / 1000);
  // Cloudinary signature is sensitive to exact param values.
  // Use string values to match what browsers send via FormData.
  const params = { timestamp, folder, overwrite: "true" };
  const signature = cloudinary.utils.api_sign_request(params as any, process.env.CLOUDINARY_API_SECRET!);
  res.json({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    timestamp,
    folder,
    signature,
  });
});
