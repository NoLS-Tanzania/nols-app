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

// ─── Careers: minimal one-line footer ────────────────────────────────────────
function buildCareersFooter(supportEmail: string): string {
  const year = new Date().getFullYear();
  return `
    <tr>
      <td style="padding:20px 56px 28px;text-align:center;border-top:1px solid #e8eded;">
        <p style="margin:0;font-size:12px;color:#b0b8bf;line-height:1.6;">
          &copy; ${year} NoLSAF &nbsp;&bull;&nbsp;
          <a href="mailto:${supportEmail}" style="color:${BRAND_TEAL};text-decoration:none;">${supportEmail}</a>
          &nbsp;&bull;&nbsp;
          <a href="https://nolsaf.com/careers" style="color:${BRAND_TEAL};text-decoration:none;">nolsaf.com/careers</a>
        </p>
      </td>
    </tr>`;
}

// ─── Careers email wrapper ────────────────────────────────────────────────────
/**
 * Premium careers email shell — Poppins font, CSS-only header with inline SVG
 * graph visualisation + faint watermark. No external images.
 */
export function careersEmail(
  headlineIcon: string,
  headlineText: string,
  jobTitle: string,
  body: string,
  supportEmail = "careers@nolsaf.com"
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <style>@import url('https://fonts.googleapis.com/css2?family=Poppins:ital,wght@0,400;0,600;0,700;0,900;1,400&display=swap');</style>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#dce3e2;font-family:'Poppins','Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#dce3e2;">
    <tr><td align="center" style="padding:24px 12px 20px;">

      <!-- Card -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
        style="max-width:620px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,0.10),0 10px 36px rgba(1,77,71,0.16);">

        <!-- ══ HEADER ══ -->
        <tr>
          <td style="background:linear-gradient(150deg,#011a18 0%,#01352f 42%,#025950 72%,#014d47 100%);padding:30px 40px 0;text-align:center;">

            <!-- Wordmark -->
            <h1 style="margin:0 0 7px;color:#ffffff;font-size:26px;font-weight:900;letter-spacing:7px;text-transform:uppercase;line-height:1.1;font-family:'Poppins','Segoe UI',Arial,sans-serif;">NoLSAF</h1>

            <!-- Italic tagline -->
            <p style="margin:0 0 18px;color:rgba(255,255,255,0.60);font-size:11px;font-style:italic;line-height:1.65;font-family:'Poppins','Segoe UI',Arial,sans-serif;">
              Africa's finest travel experiences &mdash; where every journey matters<br>and every talent shapes the road ahead.
            </p>

            <!-- SVG: faint NOLSAF watermark + dashboard-style graph line -->
            <div style="font-size:0;line-height:0;">
              <svg xmlns="http://www.w3.org/2000/svg" width="580" height="96" viewBox="0 0 580 96" style="display:block;width:100%;max-width:100%;">
                <!-- Watermark text -->
                <text x="290" y="80" font-family="Arial Black,Arial,sans-serif" font-size="86" font-weight="900"
                  fill="rgba(255,255,255,0.032)" text-anchor="middle" letter-spacing="6">NOLSAF</text>
                <!-- Gradient fill under graph line -->
                <defs>
                  <linearGradient id="gFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="rgba(100,210,190,0.13)"/>
                    <stop offset="100%" stop-color="rgba(100,210,190,0.00)"/>
                  </linearGradient>
                </defs>
                <path d="M0 72 C70 62,130 44,200 40 C268 37,315 60,375 50 C430 41,500 22,580 10 L580 96 L0 96 Z"
                  fill="url(#gFill)"/>
                <!-- Graph line -->
                <path d="M0 72 C70 62,130 44,200 40 C268 37,315 60,375 50 C430 41,500 22,580 10"
                  fill="none" stroke="rgba(100,210,190,0.50)" stroke-width="1.8"
                  stroke-linecap="round" stroke-linejoin="round"/>
                <!-- Data point dots -->
                <circle cx="200" cy="40" r="3.5" fill="rgba(100,210,190,0.80)" stroke="rgba(255,255,255,0.45)" stroke-width="1.5"/>
                <circle cx="375" cy="50" r="3.5" fill="rgba(100,210,190,0.80)" stroke="rgba(255,255,255,0.45)" stroke-width="1.5"/>
                <circle cx="578" cy="10" r="5"   fill="#5dcfb8"                stroke="rgba(255,255,255,0.70)" stroke-width="2"/>
              </svg>
            </div>

          </td>
        </tr>

        <!-- Accent line -->
        <tr>
          <td style="background:linear-gradient(90deg,#014d47 0%,#02665e 30%,#059669 50%,#02665e 70%,#014d47 100%);height:3px;font-size:0;line-height:0;">&nbsp;</td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 36px 28px;color:${TEXT_MAIN};font-size:14px;line-height:1.75;font-family:'Poppins','Segoe UI',Arial,sans-serif;">
            ${body}
          </td>
        </tr>

        ${buildCareersFooter(supportEmail)}

      </table>

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
