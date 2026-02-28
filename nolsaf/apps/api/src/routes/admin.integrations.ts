import { Router, type Request, type Response } from "express";
import { requireAuth, requireRole, type AuthedRequest } from "../middleware/auth.js";
import { sendMail } from "../lib/mailer.js";

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

/**
 * POST /api/admin/integrations/test-email
 * Send a test email and return the live result (success or Resend/SMTP error)
 * Body: { to: string }
 */
router.post("/test-email", async (req: Request, res: Response) => {
  const { to } = req.body || {};
  if (!to || typeof to !== "string" || !to.includes("@")) {
    return res.status(400).json({ error: "Provide a valid \"to\" email address in the request body" });
  }

  const from = process.env.EMAIL_FROM || process.env.RESEND_FROM_DOMAIN || "no-reply@nolsapp.com";
  const provider = process.env.RESEND_API_KEY ? "resend" : process.env.SMTP_HOST ? "smtp" : "none";
  const nodeEnv = process.env.NODE_ENV || "(not set)";

  try {
    const result = await sendMail(
      to,
      "NoLSAF Email Test",
      `<p>This is a test email from NoLSAF Admin.</p><p>If you received this, email delivery is working correctly.</p><p>Sent at: ${new Date().toISOString()}</p>`
    );
    return res.json({
      success: true,
      messageId: result.messageId,
      provider: result.provider,
      from,
      to,
      nodeEnv,
      configuredProvider: provider,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message,
      from,
      to,
      nodeEnv,
      configuredProvider: provider,
      hint: provider === "resend" && from.includes("nolsapp.com")
        ? "The 'from' domain (nolsapp.com) may not be verified in Resend. Set EMAIL_FROM to an address on your verified Resend domain (e.g. no-reply@nolsaf.com)."
        : provider === "none"
        ? "No email provider is configured. Set RESEND_API_KEY or SMTP_HOST."
        : undefined,
    });
  }
});

export default router;




