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

// Standard font stack for the "pro" email family. Trebuchet renders on
// Windows/macOS mail clients; the fallbacks cover Android/Linux/Gmail app.
export const FONT_STACK   = "'Trebuchet MS','Segoe UI',Tahoma,sans-serif";

// ─── Shared footer HTML ───────────────────────────────────────────────────────
function buildFooter(): string {
  const year = new Date().getFullYear();

  return `
    <!-- Divider -->
    <tr><td style="padding:0 40px;"><hr style="border:none;border-top:1px solid ${BORDER};margin:0;"></td></tr>

    <!-- Footer -->
    <tr>
      <td style="padding:28px 40px 32px;text-align:center;">

        <!-- Brand -->
        <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:${BRAND_TEAL};letter-spacing:0.5px;">NoLSAF</p>
        <p style="margin:0 0 16px;font-size:12px;color:${TEXT_MUTED};">Your Africa Travel &amp; Events Partner</p>

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

// ─── Plain email wrapper (no coloured banner) ─────────────────────────────────
/**
 * Clean, header-less email shell. No gradient banner — just a quiet plain-text
 * NoLSAF wordmark, a small status label, and the body in a white card.
 * Use for statement-style / financial notices where a loud header feels off.
 *
 * @param badgeLabel - short status label shown at top-right (e.g. "Disbursement Processed")
 * @param body       - inner HTML for the email body
 */
export function plainEmail(badgeLabel: string, body: string): string {
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
        style="max-width:600px;background:${CARD_BG};border-radius:14px;overflow:hidden;border:1px solid ${BORDER};box-shadow:0 2px 10px rgba(0,0,0,0.05);">

        <!-- Plain header: wordmark + status label, no banner -->
        <tr>
          <td style="padding:26px 40px 18px;border-bottom:1px solid ${BORDER};">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="font-size:18px;font-weight:800;letter-spacing:1.5px;color:${BRAND_TEAL};vertical-align:middle;">NoLSAF</td>
                <td align="right" style="font-size:11px;font-weight:600;letter-spacing:1.2px;text-transform:uppercase;color:${TEXT_MUTED};vertical-align:middle;">${badgeLabel}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:30px 40px 28px;color:${TEXT_MAIN};font-size:15px;line-height:1.7;">
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

// ─── Shared "pro" footer (deep teal band — common to all pro emails) ──────────
/**
 * The single shared footer for the modern email family. Deep teal band with the
 * wordmark, a generic support contact, a why-you-got-this note, and copyright.
 * Action-specific contacts (e.g. bookings@) belong in the email body, not here.
 */
function buildProFooter(): string {
  const year = new Date().getFullYear();
  return `
    <tr>
      <td style="padding:28px 32px;text-align:center;background:${BRAND_DARK};font-family:${FONT_STACK};">
        <div style="font-size:17px;font-weight:bold;letter-spacing:1.5px;color:#ffffff;">NoLSAF</div>
        <div style="margin-top:12px;font-size:12px;line-height:1.8;">
          <a href="mailto:support@nolsaf.com" style="color:#b8e0d6;text-decoration:none;">support@nolsaf.com</a>
          &nbsp;&nbsp;&nbsp;
          <a href="https://nolsaf.com" style="color:#b8e0d6;text-decoration:none;">nolsaf.com</a>
        </div>
        <div style="margin-top:16px;font-size:11px;color:rgba(255,255,255,0.62);line-height:1.7;max-width:320px;margin-left:auto;margin-right:auto;">
          You are receiving this email because you have an account or a booking with NoLSAF.
        </div>
        <div style="margin-top:14px;font-size:11px;color:rgba(255,255,255,0.45);">&copy; ${year} NoLSAF. All rights reserved.</div>
      </td>
    </tr>`;
}

// ─── Pro email wrapper (logo-only header + bold headline + teal footer) ───────
/**
 * The modern NoLSAF email shell: a quiet logo-only header, a large bold
 * left-aligned headline, the body, and the shared deep-teal footer. Use with
 * the pro* building blocks below for booking/transactional emails.
 *
 * @param headline - the big bold headline (plain text; <br> allowed)
 * @param body     - inner HTML for the email body
 */
export function proEmail(headline: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${BODY_BG};font-family:${FONT_STACK};-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${BODY_BG};">
    <tr><td align="center" style="padding:28px 12px;">

      <!-- Card -->
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
        style="max-width:600px;background:${CARD_BG};border:1px solid #e8eaea;border-radius:14px;overflow:hidden;font-family:${FONT_STACK};">

        <!-- Logo-only header -->
        <tr>
          <td style="padding:26px 32px 0;">
            <div style="font-size:21px;font-weight:bold;letter-spacing:2px;color:${BRAND_TEAL};line-height:1;">NoLSAF</div>
          </td>
        </tr>

        <!-- Headline -->
        <tr>
          <td style="padding:26px 32px 0;">
            <div style="font-size:25px;font-weight:bold;color:#1a1a1a;line-height:1.25;">${headline}</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:18px 32px 28px;color:#374151;font-size:15px;line-height:1.7;font-family:${FONT_STACK};">
            ${body}
          </td>
        </tr>

        ${buildProFooter()}

      </table>
      <!-- /Card -->

    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Pro building blocks (used inside proEmail bodies) ────────────────────────

/** Quiet full-width hairline used to separate sections in a pro email. */
export function proDivider(): string {
  return `<div style="height:1px;background:#eef0f0;margin:24px 0;font-size:0;line-height:0;">&nbsp;</div>`;
}

/**
 * Tinted reference panel: an uppercase label, a large spaced code, and a note
 * explaining who to show it to and why. The accent colours the code.
 */
export function proReferenceCard(
  label: string,
  code: string,
  note: string,
  accent: string = BRAND_TEAL,
  bg: string = "#f6f8f8"
): string {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${bg};border:1px solid ${accent}22;border-radius:12px;">
      <tr>
        <td style="padding:20px 22px;">
          <div style="font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#8a9290;margin-bottom:9px;">${label}</div>
          <div style="font-size:26px;font-weight:bold;letter-spacing:5px;color:${accent};font-family:${FONT_STACK};">${code}</div>
          <div style="font-size:13px;color:#5f6b69;margin-top:12px;line-height:1.6;">${note}</div>
        </td>
      </tr>
    </table>`;
}

/**
 * Prominent value panel (e.g. an amount). Like proReferenceCard but without the
 * wide letter-spacing, so currency reads naturally.
 */
export function proHighlight(
  label: string,
  value: string,
  note: string,
  accent: string = BRAND_TEAL,
  bg: string = "#f6f8f8"
): string {
  const noteHtml = note
    ? `<div style="font-size:13px;color:#5f6b69;margin-top:10px;line-height:1.6;">${note}</div>`
    : "";
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${bg};border:1px solid ${accent}22;border-radius:12px;">
      <tr>
        <td style="padding:20px 22px;">
          <div style="font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#8a9290;margin-bottom:8px;">${label}</div>
          <div style="font-size:28px;font-weight:bold;color:${accent};font-family:${FONT_STACK};">${value}</div>
          ${noteHtml}
        </td>
      </tr>
    </table>`;
}

/**
 * Soft note block for a reason, refund detail, or "what happens next". The
 * accent colours the small title; the body stays neutral and readable.
 */
export function proNoteCard(
  accent: string,
  title: string,
  content: string,
  bg: string = "#f6f8f8"
): string {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${bg};border:1px solid ${accent}22;border-radius:12px;">
      <tr>
        <td style="padding:18px 20px;">
          <div style="font-size:12px;font-weight:bold;letter-spacing:0.5px;text-transform:uppercase;color:${accent};margin-bottom:7px;">${title}</div>
          <div style="font-size:14px;color:#374151;line-height:1.7;">${content}</div>
        </td>
      </tr>
    </table>`;
}

/**
 * Solid action button for the pro email family. Use only where the email
 * genuinely requires an action (verify, reset, block) — not on info-only mail.
 */
export function proButton(url: string, label: string, accent: string = BRAND_TEAL): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:4px 0;">
      <tr>
        <td style="border-radius:10px;background:${accent};">
          <a href="${url}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:bold;text-decoration:none;border-radius:10px;font-family:${FONT_STACK};">${label}</a>
        </td>
      </tr>
    </table>`;
}

/**
 * Clean ruled details list (label left / value right) with an optional
 * emphasized total row at the bottom. The accent colours the total value.
 */
export function proDetailRows(
  title: string,
  rows: Array<[string, string]>,
  total?: [string, string],
  accent: string = BRAND_TEAL
): string {
  const lastIdx = rows.length - 1;
  const rowsHtml = rows.map(([label, value], i) => {
    const divider = (i === lastIdx && !total) ? "" : "border-bottom:1px solid #eef1f1;";
    return `
    <tr>
      <td style="padding:12px 16px;font-size:13px;color:#6b7280;background:#f7f9f9;${divider}vertical-align:top;width:40%;">${label}</td>
      <td style="padding:12px 16px;font-size:14px;color:#1a1a1a;font-weight:bold;${divider}vertical-align:top;">${value}</td>
    </tr>`;
  }).join("");
  const totalHtml = total ? `
    <tr>
      <td style="padding:13px 16px;font-size:14px;color:#1a1a1a;font-weight:bold;background:#f7f9f9;">${total[0]}</td>
      <td style="padding:13px 16px;font-size:15px;color:${accent};font-weight:bold;">${total[1]}</td>
    </tr>` : "";
  const heading = title
    ? `<div style="font-size:13px;font-weight:bold;letter-spacing:0.3px;color:#1a1a1a;margin:0 0 10px;">${title}</div>`
    : "";
  return `
    ${heading}
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid #e6eae9;border-radius:12px;border-collapse:separate;border-spacing:0;overflow:hidden;">
      ${rowsHtml}
      ${totalHtml}
    </table>`;
}

// ─── Careers: minimal one-line footer ────────────────────────────────────────
function buildCareersFooter(supportEmail: string): string {
  const year = new Date().getFullYear();
  return `
    <tr>
      <td style="padding:20px 56px 28px;text-align:center;border-top:1px solid #e8eded;">
        <p style="margin:0 0 4px;font-size:12px;color:#b0b8bf;line-height:1.6;">&copy; ${year} NoLSAF</p>
        <p style="margin:0;font-size:12px;line-height:1.6;">
          <a href="mailto:${supportEmail}" style="color:${BRAND_TEAL};text-decoration:none;">${supportEmail}</a>
          &nbsp;&nbsp;
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
          <td style="padding:28px 36px;text-align:center;border-bottom:3px solid ${BRAND_TEAL};">
            <h1 style="margin:0 0 6px;color:${BRAND_DARK};font-size:24px;font-weight:800;letter-spacing:6px;text-transform:uppercase;line-height:1.1;font-family:'Poppins','Segoe UI',Arial,sans-serif;">NoLSAF</h1>
            <p style="margin:0;color:${TEXT_MUTED};font-size:11px;letter-spacing:2px;text-transform:uppercase;font-family:'Poppins','Segoe UI',Arial,sans-serif;">${jobTitle}</p>
          </td>
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

// ─── Reusable UI blocks ──────

/**
 * Clean partner application email shell for operator and travel partner flows.
 * Keeps the header quiet and practical so the message feels like business onboarding.
 */
export function partnershipEmail(
  badgeLabel: string,
  contextLabel: string,
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
  <style>@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap');</style>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#eef4f3;font-family:'Poppins','Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#eef4f3;">
    <tr><td align="center" style="padding:24px 12px 20px;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"
        style="max-width:620px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 16px 42px rgba(1,77,71,0.14);">
        <tr>
          <td style="background:#014d47;padding:30px 36px 28px;text-align:left;">
            <img src="https://nolsaf.com/assets/NoLS2025-04.png" alt="NoLSAF" style="width:40px;height:40px;margin-bottom:20px;display:block;border-radius:8px;background:#ffffff;padding:4px;" />
            <p style="margin:0 0 8px;color:#baf7e9;font-size:12px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;">${badgeLabel}</p>
            <h1 style="margin:0;color:#ffffff;font-size:25px;line-height:1.28;font-weight:800;font-family:'Poppins','Segoe UI',Arial,sans-serif;">${contextLabel}</h1>
          </td>
        </tr>
        <tr>
          <td style="height:4px;background:#02665e;font-size:0;line-height:0;">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:34px 36px 28px;color:${TEXT_MAIN};font-size:14px;line-height:1.75;font-family:'Poppins','Segoe UI',Arial,sans-serif;">
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
