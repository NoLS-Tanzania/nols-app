/**
 * authEmailTemplates.ts
 * ─────────────────────────────────────────────────────────────
 * Auth-related transactional email templates:
 *   - Email address verification
 *   - Password reset
 *   - Welcome (new account)
 */
import { BRAND_TEAL, BRAND_DARK, TEXT_MUTED, baseEmail, securityEmail, calloutBox, ctaButton, careersEmail, infoCard } from "./emailBase.js";

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
  const body = `
    <p style="margin:0 0 14px;font-size:15px;font-weight:600;color:#1e3d72;">Hello ${name},</p>
    <p style="margin:0 0 14px;color:#374151;">We received a request to reset the password for your NoLSAF account. If this was you, click the button below to set a new password.</p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;background:#f0f4ff;border-left:3px solid #1e3d72;border-radius:4px;">
      <tr><td style="padding:14px 16px;">
        <p style="margin:0;font-size:13px;color:#374151;line-height:1.7;">
          &#8226; This link is valid for <strong>${expiryMinutes} minutes</strong> and can only be used <strong>once</strong>.<br>
          &#8226; If you did not request this, your password has not been changed you can safely ignore this email.
        </p>
      </td></tr>
    </table>

    ${ctaButton(resetUrl, "Reset My Password", "#1e3d72")}

    <p style="margin:18px 0 0;font-size:12px;color:#6b7280;">
      Or copy and paste this URL into your browser:<br>
      <a href="${resetUrl}" style="color:#1e3d72;word-break:break-all;text-decoration:none;font-size:11px;">${resetUrl}</a>
    </p>
    <p style="margin:20px 0 0;font-size:13px;color:#374151;">Warm regards,<br><strong style="color:#1e3d72;">The NoLSAF Security Team</strong></p>
  `;

  return {
    subject: "Reset your NoLSAF password",
    html: securityEmail("Password Reset", body),
  };
}

// ─── 3b. Password changed confirmation ───────────────────────────────────────
export interface PasswordChangedEmailData {
  name: string;
  email: string;
  changedAt: Date;
  ipAddress?: string;
  device?: string;
  securityUrl: string;
}

export function getPasswordChangedConfirmationEmail(
  data: PasswordChangedEmailData
): { subject: string; html: string } {
  const fmtDateTime = (d: Date) =>
    d.toUTCString().replace(" GMT", " UTC");

  const rows: [string, string][] = [
    ["Account",   data.email],
    ["Changed at", fmtDateTime(data.changedAt)],
    ["IP Address", data.ipAddress || "Unknown"],
    ["Device",     data.device    || "Unknown"],
  ];

  const tableRows = rows.map(([label, value]) => `
    <tr>
      <td style="padding:9px 14px;font-size:12px;font-weight:600;color:#1e3d72;white-space:nowrap;border-bottom:1px solid #e8ecf4;width:110px;font-family:'Poppins','Segoe UI',Arial,sans-serif;">${label}</td>
      <td style="padding:9px 14px;font-size:12px;color:#374151;border-bottom:1px solid #e8ecf4;word-break:break-all;font-family:'Poppins','Segoe UI',Arial,sans-serif;">${value}</td>
    </tr>`).join("");

  const detailTable = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #dce4f0;border-radius:6px;overflow:hidden;">
      <tbody>${tableRows}</tbody>
    </table>`;

  const body = `
    <p style="margin:0 0 14px;font-size:15px;font-weight:600;color:#16a34a;">&#10003;&nbsp; Password changed successfully</p>
    <p style="margin:0 0 14px;color:#374151;">Hello ${data.name}, your NoLSAF account password was just changed. Here are the details:</p>

    ${detailTable}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:#fef2f2;border-left:3px solid #dc2626;border-radius:4px;">
      <tr><td style="padding:13px 16px;">
        <p style="margin:0;font-size:13px;font-weight:600;color:#b91c1c;margin-bottom:5px;">Wasn&apos;t you?</p>
        <p style="margin:0;font-size:12px;color:#7f1d1d;line-height:1.6;">
          If you did not make this change, your account may be compromised. Reset your password immediately and contact
          <a href="mailto:security@nolsaf.com" style="color:#b91c1c;font-weight:600;">security@nolsaf.com</a>.
        </p>
      </td></tr>
    </table>

    ${ctaButton(data.securityUrl, "Reset Password Now", "#dc2626")}

    <p style="margin:20px 0 0;font-size:13px;color:#374151;">If this was you, no further action is needed.<br><strong style="color:#1e3d72;">The NoLSAF Security Team</strong></p>
  `;

  return {
    subject: "Your NoLSAF password was changed",
    html: securityEmail("Password Changed", body),
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
  const fmtDateTime = (d: Date) =>
    d.toUTCString().replace(" GMT", " UTC");

  const rows: [string, string][] = [
    ["Date",       fmtDateTime(data.loginAt)],
    ["IP Address", data.ipAddress || "Unknown"],
    ["Country",    data.country   || "Unknown"],
    ["Device",     data.device    || "Unknown"],
  ];

  const tableRows = rows.map(([label, value]) => `
    <tr>
      <td style="padding:9px 14px;font-size:12px;font-weight:600;color:#1e3d72;white-space:nowrap;border-bottom:1px solid #e8ecf4;width:110px;font-family:'Poppins','Segoe UI',Arial,sans-serif;">${label}</td>
      <td style="padding:9px 14px;font-size:12px;color:#374151;border-bottom:1px solid #e8ecf4;word-break:break-all;font-family:'Poppins','Segoe UI',Arial,sans-serif;">${value}</td>
    </tr>`).join("");

  const detailTable = `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #dce4f0;border-radius:6px;overflow:hidden;">
      <tbody>${tableRows}</tbody>
    </table>`;

  const body = `
    <p style="margin:0 0 14px;font-size:15px;font-weight:600;color:#1e3d72;">Hello ${data.name},</p>
    <p style="margin:0 0 14px;color:#374151;">We detected a new sign-in to your NoLSAF account from a device we haven't seen before. Here are the details:</p>

    ${detailTable}

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background:#fef2f2;border-left:3px solid #dc2626;border-radius:4px;">
      <tr><td style="padding:13px 16px;">
        <p style="margin:0;font-size:13px;font-weight:600;color:#b91c1c;margin-bottom:5px;">Wasn&apos;t you?</p>
        <p style="margin:0;font-size:12px;color:#7f1d1d;line-height:1.6;">
          If you don&apos;t recognise this sign-in, your account may be compromised.
          <a href="${data.resetPasswordUrl}" style="color:#b91c1c;font-weight:600;text-decoration:none;">Reset your password immediately</a>
          and contact <a href="mailto:security@nolsaf.com" style="color:#b91c1c;font-weight:600;">security@nolsaf.com</a>.
        </p>
      </td></tr>
    </table>

    ${ctaButton(data.resetPasswordUrl, "Reset My Password", "#dc2626")}

    <p style="margin:18px 0 0;font-size:13px;color:#374151;">If this was you, no action is needed. Future sign-ins from this device will not trigger another alert.<br><strong style="color:#1e3d72;">The NoLSAF Security Team</strong></p>
  `;

  return {
    subject: "New sign-in detected on your NoLSAF account",
    html: securityEmail("New Sign-In Detected", body),
  };
}

// ─── 6. Agent account suspension ─────────────────────────────────────────────
export function getAgentSuspensionEmail(data: {
  name: string;
  reason: string;
  caseRef: string;
  suspendedAt: string;
  contactEmail?: string;
}): { subject: string; html: string } {
  const AMBER  = "#b45309";
  const AMBER_BG = "#fffbeb";

  const detailRows: Array<[string, string]> = [
    ["Agent name",   data.name],
    ["Case ref",     data.caseRef],
    ["Suspended on", data.suspendedAt],
    ["Contact",      data.contactEmail || "hr@nolsaf.com"],
  ];

  const body = `
    <p style="margin:0 0 14px;font-size:16px;font-weight:700;color:#7c2d12;">Dear ${data.name},</p>

    <p style="margin:0 0 14px;color:#374151;line-height:1.75;">
      We are writing to inform you that your NoLSAF Agent account has been
      <strong style="color:#b91c1c;">temporarily suspended</strong> pending an internal investigation.
      During this period you will not be able to access the Agent Portal.
    </p>

    <!-- Reason block -->
    <table width="100%" cellpadding="0" cellspacing="0"
      style="margin:16px 0;background:${AMBER_BG};border-left:4px solid ${AMBER};border-radius:4px;">
      <tr><td style="padding:14px 18px;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:${AMBER};">Reason for suspension</p>
        <p style="margin:0;font-size:13px;color:#78350f;line-height:1.7;">${data.reason}</p>
      </td></tr>
    </table>

    ${infoCard("#b45309", detailRows)}

    <!-- What to expect -->
    <table width="100%" cellpadding="0" cellspacing="0"
      style="margin:16px 0;background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#111827;">What happens next</p>
          <ul style="margin:0;padding-left:18px;font-size:13px;color:#374151;line-height:1.85;">
            <li>NoLSAF will conduct a thorough and fair investigation.</li>
            <li>You may be contacted for your account of events — please cooperate fully.</li>
            <li>If the investigation concludes that no policy was violated, your access will be reinstated and you will be notified by email.</li>
            <li>If a violation is confirmed, further disciplinary measures may follow in accordance with your employment terms.</li>
          </ul>
        </td>
      </tr>
    </table>

    <p style="margin:14px 0;font-size:13px;color:#374151;line-height:1.75;">
      If you have questions or wish to submit a written response, please contact our HR team:
      <a href="mailto:${data.contactEmail || "hr@nolsaf.com"}" style="color:${BRAND_TEAL};font-weight:600;">${data.contactEmail || "hr@nolsaf.com"}</a>.
      Please quote your case reference <strong>${data.caseRef}</strong> in all correspondence.
    </p>

    <p style="margin:20px 0 0;font-size:13px;color:#374151;">
      Regards,<br>
      <strong style="color:#7c2d12;">NoLSAF Human Resources &amp; Compliance</strong>
    </p>
  `;

  return {
    subject: `[Important] Your NoLSAF Agent account has been temporarily suspended — Ref: ${data.caseRef}`,
    html: careersEmail("⚠️", "Account Suspended", "Temporary Suspension Notice", body, data.contactEmail || "hr@nolsaf.com"),
  };
}

// ─── 7. Agent account restoration ────────────────────────────────────────────
export function getAgentRestorationEmail(data: {
  name: string;
  caseRef: string;
  restoredAt: string;
  notes?: string;
  contactEmail?: string;
}): { subject: string; html: string } {
  const GREEN    = "#059669";
  const GREEN_BG = "#ecfdf5";

  const detailRows: Array<[string, string]> = [
    ["Agent name",  data.name],
    ["Case ref",    data.caseRef],
    ["Restored on", data.restoredAt],
    ["Contact",     data.contactEmail || "hr@nolsaf.com"],
  ];

  const notesBlock = data.notes
    ? `
    <table width="100%" cellpadding="0" cellspacing="0"
      style="margin:16px 0;background:#f0fdf4;border-left:4px solid ${GREEN};border-radius:4px;">
      <tr><td style="padding:14px 18px;">
        <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:${GREEN};">Note from NoLSAF</p>
        <p style="margin:0;font-size:13px;color:#064e3b;line-height:1.7;">${data.notes}</p>
      </td></tr>
    </table>`
    : "";

  const body = `
    <p style="margin:0 0 14px;font-size:16px;font-weight:700;color:#064e3b;">Dear ${data.name},</p>

    <p style="margin:0 0 14px;color:#374151;line-height:1.75;">
      We are pleased to inform you that following the conclusion of our investigation
      (case reference <strong>${data.caseRef}</strong>),
      your NoLSAF Agent account has been <strong style="color:${GREEN};">fully reinstated</strong>.
      You may now log in to the Agent Portal as normal.
    </p>

    <!-- Green success highlight -->
    <table width="100%" cellpadding="0" cellspacing="0"
      style="margin:16px 0;background:${GREEN_BG};border-left:4px solid ${GREEN};border-radius:4px;">
      <tr><td style="padding:14px 18px;">
        <p style="margin:0;font-size:13px;font-weight:700;color:${GREEN};">
          ✔ Access fully restored — no violations were established
        </p>
      </td></tr>
    </table>

    ${notesBlock}
    ${infoCard(GREEN, detailRows)}

    <p style="margin:14px 0;font-size:13px;color:#374151;line-height:1.75;">
      We appreciate your patience during this process. Should you need any
      support or have further questions, please reach out to
      <a href="mailto:${data.contactEmail || "hr@nolsaf.com"}" style="color:${BRAND_TEAL};font-weight:600;">${data.contactEmail || "hr@nolsaf.com"}</a>.
    </p>

    <p style="margin:20px 0 0;font-size:13px;color:#374151;">
      Welcome back,<br>
      <strong style="color:#064e3b;">NoLSAF Human Resources &amp; Compliance</strong>
    </p>
  `;

  return {
    subject: `[Update] Your NoLSAF Agent account has been reinstated — Ref: ${data.caseRef}`,
    html: careersEmail("✅", "Access Reinstated", "Account Restoration Notice", body, data.contactEmail || "hr@nolsaf.com"),
  };
}
