import { Router, type RequestHandler, type Response } from "express";
import { z } from "zod";
import { prisma } from "@nolsaf/prisma";
import { AuthedRequest, requireAuth, requireRole } from "../middleware/auth.js";
import crypto from "crypto";
import { sendMail } from "../lib/mailer.js";
import { audit } from "../lib/audit.js";
import { sanitizeText } from "../lib/sanitize.js";
import rateLimit from "express-rate-limit";

export const router = Router();
router.use(
  requireAuth as RequestHandler,
  requireRole("ADMIN") as unknown as RequestHandler
);

// Constants
const TOKEN_EXPIRY_MINUTES = 30;
const TOKEN_EXPIRY_MS = TOKEN_EXPIRY_MINUTES * 60 * 1000;
const TOKEN_BYTES = 24;
const MAX_ACTIVE_TOKENS_PER_USER = 3;
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

// Rate limiters
const limitEmailSend = rateLimit({
  windowMs: 15 * 60_000, // 15 minutes
  max: 3, // 3 requests per user per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many email verification requests. Please wait 15 minutes before requesting another." },
  keyGenerator: (req) => {
    const userId = (req as AuthedRequest).user?.id;
    return userId ? `email-send:${userId}` : req.ip || req.socket.remoteAddress || "unknown";
  },
});

const limitEmailVerify = rateLimit({
  windowMs: 15 * 60_000, // 15 minutes
  max: 10, // 10 verification attempts per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many verification attempts. Please wait 15 minutes before trying again." },
});

// Helper: Generate secure random token
function generateToken(): string {
  return crypto.randomBytes(TOKEN_BYTES).toString("base64url");
}

// Helper: Standardized error response
function sendError(res: Response, status: number, message: string, details?: any) {
  res.status(status).json({ 
    error: message, 
    ...(details && { details }) 
  });
}

// Helper: Standardized success response
function sendSuccess(res: Response, data?: any, message?: string) {
  res.json({ 
    ok: true, 
    ...(message && { message }),
    ...(data && { data })
  });
}

// Helper: Get authenticated user ID
function getUserId(req: AuthedRequest): number {
  if (!req.user?.id) {
    throw new Error("User not authenticated");
  }
  return req.user.id;
}

// Helper: Get greeting name from user
function getGreetingName(user: { name?: string | null; email?: string | null }): string {
  return sanitizeText(user.name || user.email || "there");
}

// Helper: Generate email verification URL
function getVerificationUrl(token: string): string {
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  return `${appUrl}/api/admin/email/verify?token=${token}`;
}

// Helper: Generate email HTML template
function generateEmailTemplate(
  greetingName: string,
  action: "verify" | "change",
  verificationUrl: string
): string {
  const title = action === "verify" 
    ? "Verify your email address" 
    : "Confirm your new email address";
  const message = action === "verify"
    ? "Please verify your email address by clicking the link below:"
    : "Please confirm your new email address by clicking the link below:";
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
        <h2 style="color: #02665e; margin-top: 0;">${title}</h2>
        <p>Hello ${greetingName},</p>
        <p>${message}</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="display: inline-block; background-color: #02665e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            ${action === "verify" ? "Verify Email" : "Confirm Email"}
          </a>
        </div>
        <p style="font-size: 14px; color: #666;">
          Or copy and paste this link into your browser:<br>
          <a href="${verificationUrl}" style="color: #02665e; word-break: break-all;">${verificationUrl}</a>
        </p>
        <p style="font-size: 14px; color: #666; margin-top: 30px;">
          This link expires in ${TOKEN_EXPIRY_MINUTES} minutes. If you didn't request this, please ignore this email.
        </p>
      </div>
    </body>
    </html>
  `;
}

// Zod Validation Schemas
const sendVerificationSchema = z.object({}).strict(); // No body needed for verify/send

const changeEmailSchema = z.object({
  newEmail: z.string()
    .email("Invalid email address format")
    .max(190, "Email address is too long")
    .transform((val) => sanitizeText(val).trim().toLowerCase()),
}).strict();

const verifyTokenSchema = z.object({
  token: z.string()
    .min(1, "Token is required")
    .max(200, "Token is too long"),
}).strict();

// Cleanup job: Remove expired tokens
async function cleanupExpiredTokens() {
  try {
    const now = new Date();
    const result = await prisma.emailVerificationToken.deleteMany({
      where: {
        expiresAt: { lt: now },
      },
    });
    if (result.count > 0) {
      console.log(`[EMAIL_VERIFY] Cleaned up ${result.count} expired token(s)`);
    }
  } catch (error) {
    console.error("[EMAIL_VERIFY] Cleanup error:", error);
  }
}

// Start cleanup job
setInterval(cleanupExpiredTokens, CLEANUP_INTERVAL_MS);
// Run cleanup immediately on startup
cleanupExpiredTokens().catch(console.error);

/** POST /admin/email/verify/send - Request verification link for current admin email */
router.post("/verify/send", limitEmailSend, (async (req, res) => {
  try {
    const userId = getUserId(req as AuthedRequest);
    
    // Find user
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      select: { id: true, email: true, name: true }
    });
    
    if (!user) {
      return sendError(res, 404, "User not found");
    }

    if (!user.email) {
      return sendError(res, 400, "No email address associated with this account");
    }

    // Check for existing active tokens (prevent spam)
    const activeTokens = await prisma.emailVerificationToken.count({
      where: {
        userId,
        newEmail: null, // Only count verification tokens, not change-email tokens
        expiresAt: { gt: new Date() },
      },
    });

    if (activeTokens >= MAX_ACTIVE_TOKENS_PER_USER) {
      return sendError(res, 429, `Too many active verification requests. Please wait before requesting another.`);
    }

    // Generate token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

    // Create token record
    await prisma.emailVerificationToken.create({
      data: {
        userId,
        token,
        newEmail: null,
        expiresAt,
      },
    });

    // Send verification email
    const verificationUrl = getVerificationUrl(token);
    const greetingName = getGreetingName(user);
    const emailHtml = generateEmailTemplate(greetingName, "verify", verificationUrl);

    await sendMail(user.email, "Verify your email address", emailHtml);

    // Audit log
    await audit(req as AuthedRequest, "ADMIN_EMAIL_VERIFY_SEND", `user:${userId}`);

    sendSuccess(res, { message: "Verification email sent successfully" });
  } catch (error: any) {
    console.error("[EMAIL_VERIFY_SEND] Error:", error);
    sendError(res, 500, "Failed to send verification email. Please try again later.");
  }
}) as RequestHandler);

/** POST /admin/email/change/send - Start change-email → send verification to NEW address */
router.post("/change/send", limitEmailSend, (async (req, res) => {
  try {
    // Validate request body
    const validationResult = changeEmailSchema.safeParse(req.body);
    if (!validationResult.success) {
      return sendError(res, 400, "Invalid request", {
        errors: validationResult.error.errors,
      });
    }

    const { newEmail } = validationResult.data;
    const userId = getUserId(req as AuthedRequest);

    // Find user
    const user = await prisma.user.findUnique({ 
      where: { id: userId },
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      return sendError(res, 404, "User not found");
    }

    // Prevent changing to the same email
    if (user.email?.toLowerCase() === newEmail.toLowerCase()) {
      return sendError(res, 400, "New email address must be different from your current email");
    }

    // Prevent duplicates
    const existingUser = await prisma.user.findUnique({ 
      where: { email: newEmail },
      select: { id: true }
    });

    if (existingUser) {
      return sendError(res, 400, "This email address is already in use by another account");
    }

    // Check for existing active change-email tokens
    const activeTokens = await prisma.emailVerificationToken.count({
      where: {
        userId,
        newEmail: { not: null }, // Only count change-email tokens
        expiresAt: { gt: new Date() },
      },
    });

    if (activeTokens >= MAX_ACTIVE_TOKENS_PER_USER) {
      return sendError(res, 429, `Too many active email change requests. Please wait before requesting another.`);
    }

    // Generate token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MS);

    // Create token record
    await prisma.emailVerificationToken.create({
      data: {
        userId,
        token,
        newEmail,
        expiresAt,
      },
    });

    // Send verification email to new address
    const verificationUrl = getVerificationUrl(token);
    const greetingName = getGreetingName(user);
    const emailHtml = generateEmailTemplate(greetingName, "change", verificationUrl);

    await sendMail(newEmail, "Confirm your new email address", emailHtml);

    // Audit log
    await audit(
      req as AuthedRequest,
      "ADMIN_EMAIL_CHANGE_SEND",
      `user:${userId}`,
      { old: user.email },
      { new: newEmail }
    );

    sendSuccess(res, { message: "Verification email sent to your new email address" });
  } catch (error: any) {
    console.error("[EMAIL_CHANGE_SEND] Error:", error);
    sendError(res, 500, "Failed to send verification email. Please try again later.");
  }
}) as RequestHandler);

/** GET /admin/email/verify?token=... - Verify email token */
router.get("/verify", limitEmailVerify, (async (req, res) => {
  try {
    // Validate query parameters
    const validationResult = verifyTokenSchema.safeParse(req.query);
    if (!validationResult.success) {
      return sendError(res, 400, "Invalid request", {
        errors: validationResult.error.errors,
      });
    }

    const { token } = validationResult.data;

    // Find token record
    const tokenRecord = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: {
        user: {
          select: { id: true, email: true, emailVerifiedAt: true },
        },
      },
    });

    if (!tokenRecord) {
      return sendError(res, 404, "Invalid or expired verification token");
    }

    // Check if token is expired
    if (tokenRecord.expiresAt < new Date()) {
      // Clean up expired token
      await prisma.emailVerificationToken.delete({ where: { id: tokenRecord.id } });
      return sendError(res, 400, "This verification link has expired. Please request a new one.");
    }

    const user = tokenRecord.user;
    if (!user) {
      return sendError(res, 404, "User associated with this token not found");
    }

    // Use transaction for atomic operations
    await prisma.$transaction(async (tx) => {
      if (tokenRecord.newEmail) {
        // Change-email flow: Update email and mark as verified
        const before = { email: user.email };
        await tx.user.update({
          where: { id: user.id },
          data: {
            email: tokenRecord.newEmail,
            emailVerifiedAt: new Date(),
          },
        });
        await audit(req as AuthedRequest, "ADMIN_EMAIL_CHANGED", `user:${user.id}`, before, { 
          email: tokenRecord.newEmail 
        });
      } else {
        // Verify existing email flow: Only mark as verified
        await tx.user.update({
          where: { id: user.id },
          data: {
            emailVerifiedAt: new Date(),
          },
        });
        await audit(req as AuthedRequest, "ADMIN_EMAIL_VERIFIED", `user:${user.id}`);
      }

      // Delete token after successful verification
      await tx.emailVerificationToken.delete({ where: { id: tokenRecord.id } });
    });

    // Redirect to success page
    const appUrl = process.env.APP_URL || "http://localhost:3000";
    res.redirect(`${appUrl}/admin/settings?email_verified=1`);
  } catch (error: any) {
    console.error("[EMAIL_VERIFY] Error:", error);
    sendError(res, 500, "Failed to verify email. Please try again later.");
  }
}) as RequestHandler);

export default router;
