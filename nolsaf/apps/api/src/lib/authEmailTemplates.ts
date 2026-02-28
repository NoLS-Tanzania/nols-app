/**
 * authEmailTemplates.ts
 * ─────────────────────────────────────────────────────────────
 * Auth-related transactional email templates:
 *   - Email address verification
 *   - Password reset
 *   - Welcome (new account)
 */
import { BRAND_TEAL, BRAND_DARK, TEXT_MUTED, baseEmail, calloutBox, ctaButton } from "./emailBase.js";

// ─── 1. Email verification ────────────────────────────────────────────────────
export function getEmailVerificationEmail(
  name: string,
  verificationUrl: string,
  expiryMinutes = 30
): { subject: string; html: string } {
  const BLUE = "#1d4ed8";

  const body = `
    <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:${BLUE};">Hello ${name},</p>
    <p style="margin:0 0 16px;">To keep your account secure, please verify your email address by clicking the button below.</p>
    ${calloutBox(BLUE, "🔐", "One simple step:", `This link is valid for <strong>${expiryMinutes} minutes</strong>. If you didn't request this, you can safely ignore this email — no changes will be made to your account.`)}
    ${ctaButton(verificationUrl, "Verify Email Address", BLUE)}
    <p style="margin:20px 0 0;font-size:13px;color:${TEXT_MUTED};">
      Or copy and paste this link into your browser:<br>
      <a href="${verificationUrl}" style="color:${BRAND_TEAL};word-break:break-all;text-decoration:none;font-size:12px;">${verificationUrl}</a>
    </p>
    <p style="margin:24px 0 0;">Warm regards,<br><strong style="color:${BRAND_DARK};">The NoLSAF Team</strong></p>
  `;

  return {
    subject: "Verify your email address — NoLSAF",
    html: baseEmail(BLUE, "#1e3a8a", "Email Verification", "✉️", body),
  };
}

// ─── 2. Email change confirmation ────────────────────────────────────────────
export function getEmailChangeConfirmationEmail(
  name: string,
  newEmail: string,
  confirmUrl: string,
  expiryMinutes = 30
): { subject: string; html: string } {
  const INDIGO = "#4f46e5";

  const body = `
    <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:${INDIGO};">Hello ${name},</p>
    <p style="margin:0 0 16px;">We received a request to change your email address to <strong>${newEmail}</strong>.</p>
    ${calloutBox(INDIGO, "⚠️", "Please confirm this change:", `Click the button below to confirm your new email address. This link expires in <strong>${expiryMinutes} minutes</strong>. If you did not request this change, please contact <a href="mailto:support@nolsaf.com" style="color:${BRAND_TEAL};">support@nolsaf.com</a> immediately.`)}
    ${ctaButton(confirmUrl, "Confirm New Email Address", INDIGO)}
    <p style="margin:20px 0 0;font-size:13px;color:${TEXT_MUTED};">
      Or copy and paste this link into your browser:<br>
      <a href="${confirmUrl}" style="color:${BRAND_TEAL};word-break:break-all;text-decoration:none;font-size:12px;">${confirmUrl}</a>
    </p>
    <p style="margin:24px 0 0;">Warm regards,<br><strong style="color:${BRAND_DARK};">The NoLSAF Team</strong></p>
  `;

  return {
    subject: "Confirm your new email address — NoLSAF",
    html: baseEmail(INDIGO, "#4338ca", "Email Change Request", "🔄", body),
  };
}

// ─── 3. Password reset ────────────────────────────────────────────────────────
export function getPasswordResetEmail(
  name: string,
  resetUrl: string,
  expiryMinutes = 60
): { subject: string; html: string } {
  const AMBER = "#d97706";

  const body = `
    <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:${AMBER};">Hello ${name},</p>
    <p style="margin:0 0 16px;">We received a request to reset the password for your NoLSAF account.</p>
    ${calloutBox(AMBER, "🔑", "Reset your password:", `Click the button below to set a new password. This link is valid for <strong>${expiryMinutes} minutes</strong> and can only be used once. If you didn't request a password reset, you can safely ignore this email — your password won't change.`)}
    ${ctaButton(resetUrl, "Reset My Password", AMBER)}
    <p style="margin:20px 0 0;font-size:13px;color:${TEXT_MUTED};">
      Or copy and paste this link into your browser:<br>
      <a href="${resetUrl}" style="color:${BRAND_TEAL};word-break:break-all;text-decoration:none;font-size:12px;">${resetUrl}</a>
    </p>
    <p style="margin:16px 0 0;font-size:13px;color:${TEXT_MUTED};">For your security, this link will expire after one use. If you need to reset your password again, please request a new link.</p>
    <p style="margin:24px 0 0;">Warm regards,<br><strong style="color:${BRAND_DARK};">The NoLSAF Team</strong></p>
  `;

  return {
    subject: "Reset your NoLSAF password",
    html: baseEmail(AMBER, "#b45309", "Password Reset", "🔑", body),
  };
}

// ─── 4. Welcome — new account ─────────────────────────────────────────────────
export function getWelcomeEmail(
  name: string,
  portalUrl: string,
  role: "CUSTOMER" | "OWNER" | "AGENT" | "DRIVER" = "CUSTOMER"
): { subject: string; html: string } {
  const roleConfig = {
    CUSTOMER: { accent: BRAND_TEAL,  to: BRAND_DARK, cta: "Explore NoLSAF",     ctaLabel: "Explore the Platform" },
    OWNER:    { accent: "#0369a1",   to: "#075985",  cta: portalUrl,             ctaLabel: "Go to Owner Dashboard" },
    AGENT:    { accent: "#7c3aed",   to: "#6d28d9",  cta: portalUrl,             ctaLabel: "Open Agent Portal" },
    DRIVER:   { accent: "#ea580c",   to: "#c2410c",  cta: portalUrl,             ctaLabel: "Open Driver Portal" },
  };
  const { accent, to, cta, ctaLabel } = roleConfig[role];

  const roleMessage: Record<typeof role, string> = {
    CUSTOMER: "You can now browse properties, plan events, and book experiences — all in one place.",
    OWNER:    "Your property owner account is ready. You can now list properties, manage bookings, and track performance from your dashboard.",
    AGENT:    "Your agent account has been activated. You can now receive assignments, communicate with clients, and manage travel plans.",
    DRIVER:   "Your driver account is live. You can accept transport requests and manage your schedule from the portal.",
  };

  const body = `
    <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:${accent};">Welcome to NoLSAF, ${name}! 🌍</p>
    <p style="margin:0 0 16px;">Your account has been created successfully. ${roleMessage[role]}</p>
    ${calloutBox(accent, "✅", "You're all set:", `Your account is active and ready to use. Click the button below to get started.`)}
    ${ctaButton(cta, ctaLabel, accent)}
    <p style="margin:24px 0 0;font-size:13px;color:${TEXT_MUTED};">Need help getting started? Contact us at <a href="mailto:support@nolsaf.com" style="color:${BRAND_TEAL};text-decoration:none;">support@nolsaf.com</a>.</p>
    <p style="margin:20px 0 0;">Warm regards,<br><strong style="color:${BRAND_DARK};">The NoLSAF Team</strong></p>
  `;

  return {
    subject: `Welcome to NoLSAF, ${name}! 🌍`,
    html: baseEmail(accent, to, "Welcome to NoLSAF", "🎉", body),
  };
}

// ─── 5. New sign-in alert ─────────────────────────────────────────────────────

export interface LoginAlertEmailData {
  /** Account display name or email */
  name: string;
  /** Date/time of the sign-in (UTC) */
  loginAt: Date;
  /** IP address of the request */
  ipAddress?: string;
  /** Parsed device/browser string */
  device?: string;
  /** Country name or ISO code derived from request headers */
  country?: string;
  /** URL for the password reset page ("wasn't me" action) */
  resetPasswordUrl: string;
}

export function getLoginAlertEmail(data: LoginAlertEmailData): { subject: string; html: string } {
  const SLATE = "#334155";

  const fmtDateTime = (d: Date) =>
    d.toISOString().replace("T", " ").slice(0, 19) + " UTC";

  const rows: [string, string][] = [
    ["Date",       fmtDateTime(data.loginAt)],
    ["IP Address", data.ipAddress || "Unknown"],
    ["Country",    data.country   || "Unknown"],
    ["Device",     data.device    || "Unknown"],
  ];

  const tableRows = rows.map(([label, value]) => `
    <tr>
      <td style="padding:10px 16px;font-size:13px;font-weight:600;color:${SLATE};white-space:nowrap;border-bottom:1px solid #e2e8e7;width:110px;">${label}</td>
      <td style="padding:10px 16px;font-size:13px;color:#374151;border-bottom:1px solid #e2e8e7;word-break:break-all;">${value}</td>
    </tr>`).join("");

  const detailTable = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border:1px solid #e2e8e7;border-radius:8px;overflow:hidden;">
      <tbody>${tableRows}</tbody>
    </table>`;

  const body = `
    <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:${SLATE};">Hello ${data.name},</p>
    <p style="margin:0 0 16px;">We detected a successful sign-in to your NoLSAF account. Here are the details:</p>
    ${detailTable}
    <p style="margin:0 0 8px;font-size:14px;font-weight:600;color:${SLATE};">If this wasn't you:</p>
    <ul style="margin:0 0 20px;padding-left:20px;font-size:14px;color:#374151;line-height:1.8;">
      <li><a href="${data.resetPasswordUrl}" style="color:#dc2626;font-weight:600;text-decoration:none;">Reset your password immediately</a></li>
      <li>Contact us at <a href="mailto:security@nolsaf.com" style="color:${BRAND_TEAL};text-decoration:none;">security@nolsaf.com</a></li>
    </ul>
    <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">If this was you, no action is required.</p>
    ${ctaButton(data.resetPasswordUrl, "Reset My Password", "#dc2626")}
    <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">This is an automated security notification. Please do not reply to this email — contact <a href="mailto:security@nolsaf.com" style="color:${BRAND_TEAL};">security@nolsaf.com</a> for any concerns.</p>
  `;

  return {
    subject: "New sign-in detected on your NoLSAF account",
    html: baseEmail(SLATE, "#1e293b", "New Sign-In Detected 🔐", "🔐", body),
  };
}
