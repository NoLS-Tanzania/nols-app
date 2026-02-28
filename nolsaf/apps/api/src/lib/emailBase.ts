/**
 * emailBase.ts
 * ─────────────────────────────────────────────────────────────
 * Single source of truth for ALL NoLSAF transactional emails.
 * Every template file imports from here — change once, updates everywhere.
 */

// ─── Brand tokens ─────────────────────────────────────────────────────────────
export const BRAND_TEAL   = "#02665e";
export const BRAND_DARK   = "#014d47";
export const BODY_BG      = "#f0f4f3";
export const CARD_BG      = "#ffffff";
export const TEXT_MAIN    = "#1a2e2c";
export const TEXT_MUTED   = "#6b7280";
export const BORDER       = "#e2e8e7";

// ─── Social link configuration ────────────────────────────────────────────────
// Update these when the public site footer URLs are confirmed.
const SOCIAL_LINKS = {
  instagram: "https://instagram.com/nolsaf",
  linkedin:  "https://linkedin.com/company/nolsaf",
  whatsapp:  "https://wa.me/255000000000",   // replace with real number
  youtube:   "https://youtube.com/@nolsaf",
};

// ─── Shared footer HTML ───────────────────────────────────────────────────────
function buildFooter(): string {
  const year = new Date().getFullYear();

  const socialBtn = (label: string, url: string, bg: string) =>
    `<a href="${url}" style="display:inline-block;background:${bg};color:#ffffff;font-size:11px;font-weight:700;letter-spacing:0.5px;text-decoration:none;padding:6px 14px;border-radius:20px;margin:0 4px;">${label}</a>`;

  const socialRow = [
    socialBtn("Instagram", SOCIAL_LINKS.instagram, "#e1306c"),
    socialBtn("LinkedIn",  SOCIAL_LINKS.linkedin,  "#0077b5"),
    socialBtn("WhatsApp",  SOCIAL_LINKS.whatsapp,  "#25d366"),
    socialBtn("YouTube",   SOCIAL_LINKS.youtube,   "#ff0000"),
  ].join("");

  return `
    <!-- Divider -->
    <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid ${BORDER};margin:0;"></td></tr>

    <!-- Footer -->
    <tr>
      <td style="padding:28px 40px 32px;text-align:center;">

        <!-- Brand -->
        <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:${BRAND_TEAL};letter-spacing:0.5px;">NoLSAF</p>
        <p style="margin:0 0 16px;font-size:12px;color:${TEXT_MUTED};">Your Africa Travel &amp; Events Partner</p>

        <!-- Social icons -->
        <div style="margin:0 0 20px;">
          ${socialRow}
        </div>

        <!-- Contact -->
        <p style="margin:0 0 6px;font-size:12px;color:${TEXT_MUTED};">
          Dar es Salaam, Tanzania
          &nbsp;&bull;&nbsp;
          <a href="mailto:support@nolsaf.com" style="color:${BRAND_TEAL};text-decoration:none;">support@nolsaf.com</a>
          &nbsp;&bull;&nbsp;
          <a href="https://nolsaf.com" style="color:${BRAND_TEAL};text-decoration:none;">nolsaf.com</a>
        </p>

        <!-- Disclaimer -->
        <p style="margin:12px 0 0;font-size:11px;color:#9ca3af;line-height:1.6;max-width:460px;margin-left:auto;margin-right:auto;">
          This email was sent because you have an account or submitted a request on the NoLSAF platform.
          If you believe you received this in error, please ignore it or contact
          <a href="mailto:support@nolsaf.com" style="color:${BRAND_TEAL};text-decoration:none;">support@nolsaf.com</a>.
        </p>

        <!-- Copyright -->
        <p style="margin:10px 0 0;font-size:11px;color:#d1d5db;">&copy; ${year} NoLSAF. All rights reserved.</p>

      </td>
    </tr>`;
}

// ─── Base email wrapper ───────────────────────────────────────────────────────
/**
 * Wraps any email body in the standard NoLSAF card shell.
 *
 * @param accentFrom  - gradient start colour for the header
 * @param accentTo    - gradient end colour for the header
 * @param badgeLabel  - short label shown in the frosted badge, e.g. "Request Received"
 * @param badgeIcon   - emoji/icon prefix for the badge
 * @param body        - inner HTML for the email body (goes inside the white card)
 */
export function baseEmail(
  accentFrom: string,
  accentTo: string,
  badgeLabel: string,
  badgeIcon: string,
  body: string
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${BODY_BG};font-family:'Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${BODY_BG};">
    <tr><td align="center" style="padding:32px 16px 24px;">

      <!-- Card -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
        style="max-width:600px;background:${CARD_BG};border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,${accentFrom} 0%,${accentTo} 100%);padding:36px 40px 32px;text-align:center;">
            <!-- Wordmark pill -->
            <div style="display:inline-block;background:rgba(255,255,255,0.13);border:1px solid rgba(255,255,255,0.28);border-radius:10px;padding:8px 20px;margin-bottom:14px;">
              <span style="color:#ffffff;font-size:21px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">NoLSAF</span>
            </div>
            <!-- Tagline -->
            <div style="color:rgba(255,255,255,0.72);font-size:11px;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:20px;">
              Africa Travel &amp; Events Platform
            </div>
            <!-- Badge -->
            <div style="display:inline-block;background:rgba(255,255,255,0.18);border:1px solid rgba(255,255,255,0.32);border-radius:24px;padding:8px 22px;">
              <span style="color:#ffffff;font-size:14px;font-weight:600;">${badgeIcon}&nbsp; ${badgeLabel}</span>
            </div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px 32px;color:${TEXT_MAIN};font-size:15px;line-height:1.7;">
            ${body}
          </td>
        </tr>

        ${buildFooter()}

      </table>
      <!-- /Card -->

    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Reusable UI blocks ───────────────────────────────────────────────────────

/**
 * Tinted info card with left accent border — for request details, assignment info, etc.
 */
export function infoCard(accentColor: string, rows: Array<[string, string]>): string {
  const rowsHtml = rows.map(([label, value]) => `
    <tr>
      <td style="padding:7px 0;font-size:13px;color:${TEXT_MUTED};width:38%;vertical-align:top;">${label}</td>
      <td style="padding:7px 0;font-size:14px;color:${TEXT_MAIN};font-weight:600;vertical-align:top;">${value}</td>
    </tr>`).join("");
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="16" border="0"
      style="background:#f5faf9;border:1px solid ${accentColor}2a;border-left:4px solid ${accentColor};border-radius:8px;margin:20px 0;">
      <tr><td>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          ${rowsHtml}
        </table>
      </td></tr>
    </table>`;
}

/**
 * Highlighted callout box — for "What's next?", action required, included items, etc.
 */
export function calloutBox(accentColor: string, icon: string, title: string, content: string): string {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="16" border="0"
      style="background:#f5faf9;border:1px solid ${accentColor}2a;border-left:4px solid ${accentColor};border-radius:8px;margin:20px 0;">
      <tr><td>
        <p style="margin:0 0 8px;font-size:14px;font-weight:700;color:${accentColor};">${icon} ${title}</p>
        <div style="font-size:14px;color:${TEXT_MAIN};line-height:1.7;">${content}</div>
      </td></tr>
    </table>`;
}

/**
 * Prominent CTA button — centred, rounded, branded colour.
 */
export function ctaButton(url: string, label: string, bgColor: string): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:28px auto;">
      <tr>
        <td style="border-radius:8px;background:${bgColor};">
          <a href="${url}"
            style="display:inline-block;padding:14px 40px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.3px;border-radius:8px;">
            ${label} &rarr;
          </a>
        </td>
      </tr>
    </table>`;
}
