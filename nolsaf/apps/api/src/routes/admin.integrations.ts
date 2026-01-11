import { Router, type Request, type Response } from "express";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";

const router = Router();

router.use(requireAuth as any, requireRole("ADMIN") as any);

/**
 * GET /api/admin/integrations/status
 * Returns read-only integration status (checks env vars, never exposes secrets)
 */
router.get("/status", async (_req: Request, res: Response) => {
  try {
    // Email provider status
    const emailStatus = {
      configured: false,
      provider: undefined as string | undefined,
      details: undefined as string | undefined,
    };

    if (process.env.RESEND_API_KEY) {
      emailStatus.configured = true;
      emailStatus.provider = "Resend";
      emailStatus.details = process.env.RESEND_FROM_DOMAIN 
        ? `Using domain: ${process.env.RESEND_FROM_DOMAIN}`
        : "Using default Resend domain";
    } else if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      emailStatus.configured = true;
      emailStatus.provider = "SMTP";
      emailStatus.details = `Host: ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 587}`;
    }

    // SMS provider status
    const smsStatus = {
      configured: false,
      provider: undefined as string | undefined,
      details: undefined as string | undefined,
    };

    if (process.env.AFRICASTALKING_API_KEY && process.env.AFRICASTALKING_USERNAME) {
      smsStatus.configured = true;
      smsStatus.provider = "Africa's Talking";
      smsStatus.details = `Username: ${process.env.AFRICASTALKING_USERNAME}, Sender ID: ${process.env.AFRICASTALKING_SENDER_ID || "NoLSAF"}`;
    } else if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      smsStatus.configured = true;
      smsStatus.provider = "Twilio";
      smsStatus.details = process.env.TWILIO_PHONE_NUMBER 
        ? `Phone: ${process.env.TWILIO_PHONE_NUMBER}`
        : "Phone number not configured";
    }

    // Cloudinary status
    const cloudinaryStatus = {
      configured: false,
      provider: "Cloudinary",
      details: undefined as string | undefined,
    };

    if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY) {
      cloudinaryStatus.configured = true;
      cloudinaryStatus.details = `Cloud: ${process.env.CLOUDINARY_CLOUD_NAME}`;
    }

    res.json({
      email: emailStatus,
      sms: smsStatus,
      cloudinary: cloudinaryStatus,
    });
  } catch (err: any) {
    console.error("Error fetching integration status:", err);
    res.status(500).json({ error: "Failed to fetch integration status" });
  }
});

export default router;




