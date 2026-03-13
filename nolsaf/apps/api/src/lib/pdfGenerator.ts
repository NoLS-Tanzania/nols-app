/**
 * PDF Generation Service for Booking Codes and Reservation Forms
 * Uses a simple HTML-to-PDF approach (can be enhanced with libraries like puppeteer, pdfkit, etc.)
 */

import { makeQR } from "./qr.js";

interface BookingDetails {
  bookingId: number;
  bookingCode: string;
  guestName: string;
  guestPhone?: string;
  nationality?: string;
  property: {
    title: string;
    type: string;
    regionName?: string;
    district?: string;
    city?: string;
    country?: string;
  };
  checkIn: Date | string;
  checkOut: Date | string;
  roomType?: string;
  rooms?: number;
  nights?: number;
  totalAmount: number;
  services?: any;
  invoice?: {
    invoiceNumber?: string;
    receiptNumber?: string;
    paidAt?: Date | string;
  };
}

/**
 * Generate QR code data URL for booking details
 */
async function generateBookingQRCode(details: BookingDetails): Promise<string> {
  try {
    // Encode key booking details in the QR itself (offline-friendly).
    // Owners can scan and instantly see/import the booking info without relying on a URL.
    const toISODate = (d: Date | string | undefined) => {
      try {
        if (!d) return undefined;
        return new Date(d).toISOString().slice(0, 10);
      } catch {
        return undefined;
      }
    };

    const origin = process.env.WEB_ORIGIN || process.env.APP_ORIGIN;
    const url = origin ? `${origin.replace(/\/+$/, "")}/public/booking/${encodeURIComponent(details.bookingCode)}` : undefined;

    // Keep payload compact (QR capacity). Use short keys.
    const payloadObj: any = {
      v: 1,
      c: details.bookingCode, // code
      id: details.bookingId, // booking id
      ci: toISODate(details.checkIn), // check-in date
      co: toISODate(details.checkOut), // check-out date
      amt: Number(details.totalAmount || 0), // amount
      rn: details.invoice?.receiptNumber || undefined, // receipt number
      gn: details.guestName || undefined, // guest name
      gp: details.guestPhone || undefined, // guest phone
      nat: details.nationality || undefined, // nationality
      p: details.property?.title || undefined, // property title (optional)
      u: url, // optional web URL for richer view
    };

    const qrPayload = JSON.stringify(payloadObj);
    const { png } = await makeQR(qrPayload);
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch (error: any) {
    console.error("Failed to generate QR code:", error);
    // Return a placeholder if QR generation fails
    return "";
  }
}

/**
 * Generate HTML for booking reservation form
 */
export async function generateBookingReservationHTML(details: BookingDetails): Promise<string> {
  // Generate QR code
  const qrCodeDataUrl = await generateBookingQRCode(details);

  const parseValidDate = (value: Date | string | undefined | null): Date | null => {
    try {
      if (value == null) return null;
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    } catch {
      return null;
    }
  };

  const formatDate = (value: Date | string | undefined | null): string => {
    const d = parseValidDate(value);
    if (!d) return "—";
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (value: Date | string | undefined | null): string => {
    const d = parseValidDate(value);
    if (!d) return "—";
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Logo: use a configured image URL if provided; otherwise embed a print-safe SVG logo.
  const inlineLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="NoLSAF logo"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#02665e"/><stop offset="1" stop-color="#014d47"/></linearGradient></defs><rect x="6" y="6" width="84" height="84" rx="22" fill="url(#g)"/><path d="M28 63V33h7l19 20V33h7v30h-7L35 43v20h-7z" fill="#fff" opacity="0.98"/></svg>`;
  const inlineLogoDataUri = `data:image/svg+xml;base64,${Buffer.from(inlineLogoSvg, "utf8").toString("base64")}`;
  // Prefer your real logo from apps/web/public/assets when WEB_ORIGIN/APP_ORIGIN is configured.
  const origin = (process.env.WEB_ORIGIN || process.env.APP_ORIGIN || "").replace(/\/+$/, "");
  const defaultLogoUrl = origin ? `${origin}/assets/NoLS2025-04.png` : "";
  const logoSrc = process.env.PDF_LOGO_URL || process.env.BRAND_LOGO_URL || defaultLogoUrl || inlineLogoDataUri;
  const supportEmail = process.env.SUPPORT_EMAIL || "support@nolsaf.com";
  const supportPhone = process.env.SUPPORT_PHONE || process.env.SUPPORT_TEL || "";
  const supportWebsite = (process.env.WEB_ORIGIN || process.env.APP_ORIGIN || "https://nolsaf.com").replace(/\/+$/, "");
  const generatedAt = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const checkIn = formatDate(details.checkIn);
  const checkOut = formatDate(details.checkOut);
  const providedNights = typeof details.nights === "number" && Number.isFinite(details.nights) ? details.nights : null;
  const computedNights = (() => {
    const ci = parseValidDate(details.checkIn);
    const co = parseValidDate(details.checkOut);
    if (!ci || !co) return null;
    const diffDays = Math.ceil((co.getTime() - ci.getTime()) / (1000 * 60 * 60 * 24));
    return Number.isFinite(diffDays) && diffDays > 0 ? diffDays : null;
  })();
  const nights = Math.max(1, Math.floor(providedNights ?? computedNights ?? 1));
  const amount = Number(details.totalAmount || 0).toLocaleString("en-US");
  const paidAt = details.invoice?.paidAt ? formatDateTime(details.invoice.paidAt) : null;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Booking Receipt — ${details.bookingCode}</title>
  <style>
    @media print {
      @page { size: A5; margin: 0; }
      body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .sheet { box-shadow: none; border-radius: 0; }
    }
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 12px;
      line-height: 1.5;
      color: #1e293b;
      background: #f1f5f9;
      margin: 0;
      padding: 16px 0 24px;
    }
    .sheet {
      background: #ffffff;
      border-radius: 12px;
      max-width: 558px;
      margin: 0 auto;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06);
      position: relative;
    }
    /* diagonal watermark */
    .sheet::before {
      content: 'NoLSAF';
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 80px;
      font-weight: 900;
      letter-spacing: 10px;
      color: rgba(2,102,94,0.045);
      transform: rotate(-25deg);
      pointer-events: none;
      z-index: 0;
      white-space: nowrap;
    }
    .sheet > * { position: relative; z-index: 1; }

    /* ── Brand header ── */
    .brand-header {
      background: #ffffff;
      border-top: 3px solid #02665e;
      border-bottom: 1px solid #e2e8f0;
      padding: 14px 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .brand-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-logo {
      width: 38px;
      height: 38px;
      border-radius: 8px;
      display: block;
      flex-shrink: 0;
      object-fit: contain;
    }
    .brand-name {
      font-size: 17px;
      font-weight: 800;
      color: #02665e;
      letter-spacing: 0.4px;
      line-height: 1.1;
    }
    .brand-tagline {
      font-size: 9.5px;
      color: #94a3b8;
      letter-spacing: 0.2px;
      margin-top: 2px;
    }
    .brand-right {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 5px;
    }
    .verified-badge {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      border: 1.5px solid #02665e;
      color: #02665e;
      border-radius: 9999px;
      padding: 4px 11px;
      font-size: 10.5px;
      font-weight: 800;
      letter-spacing: 0.6px;
      text-transform: uppercase;
      background: rgba(2,102,94,0.05);
    }
    .verified-check {
      font-size: 11px;
      font-weight: 900;
    }
    .receipt-label {
      font-size: 9px;
      font-weight: 700;
      color: #94a3b8;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }

    /* ── Body padding ── */
    .body-pad { padding: 16px 20px; }

    /* ── Booking code ── */
    .code-block {
      border: 1.5px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 16px 12px;
      margin-bottom: 16px;
      text-align: center;
      background: linear-gradient(180deg, #f8fffe 0%, #ffffff 100%);
      position: relative;
      overflow: hidden;
    }
    .code-block::before {
      content: "";
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: linear-gradient(90deg, #02665e, #4ade80, #02665e);
    }
    .code-label {
      font-size: 10px;
      font-weight: 600;
      color: #64748b;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .code-value {
      font-size: 32px;
      font-weight: 900;
      color: #02665e;
      letter-spacing: 5px;
      line-height: 1;
      margin-bottom: 6px;
    }
    .code-hint {
      font-size: 10px;
      color: #94a3b8;
    }
    .paid-pill {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: #dcfce7;
      color: #166534;
      border-radius: 9999px;
      padding: 3px 10px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    /* ── Two-column guest / property summary ── */
    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 14px;
    }
    .summary-card {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      background: #fafafa;
    }
    .summary-card-label {
      font-size: 9px;
      font-weight: 700;
      color: #94a3b8;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      margin-bottom: 5px;
      padding-bottom: 5px;
      border-bottom: 1px solid #e8ecf0;
    }
    .summary-card-value {
      font-size: 12px;
      font-weight: 700;
      color: #1e293b;
      line-height: 1.35;
    }
    .summary-card-sub {
      font-size: 10px;
      color: #64748b;
      margin-top: 2px;
      line-height: 1.3;
    }

    /* ── Detail table ── */
    .section-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
      margin-top: 14px;
    }
    .section-bar {
      width: 3px;
      height: 14px;
      background: #02665e;
      border-radius: 9999px;
      flex-shrink: 0;
    }
    .section-label {
      font-size: 10px;
      font-weight: 700;
      color: #02665e;
      letter-spacing: 0.8px;
      text-transform: uppercase;
    }
    table.detail-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      font-size: 11.5px;
    }
    table.detail-table tr:nth-child(odd) td { background: #f8fafc; }
    table.detail-table tr:nth-child(even) td { background: #ffffff; }
    table.detail-table td {
      padding: 7px 12px;
      border-bottom: 1px solid #e9edf2;
      vertical-align: top;
    }
    table.detail-table tr:last-child td { border-bottom: none; }
    table.detail-table td:first-child {
      color: #64748b;
      font-weight: 600;
      width: 38%;
      white-space: nowrap;
    }
    table.detail-table td:last-child {
      color: #1e293b;
      font-weight: 500;
    }
    .amount-row td { background: #f0fdf4 !important; }
    .amount-row td:last-child {
      color: #166534 !important;
      font-weight: 800 !important;
      font-size: 13px !important;
    }

    /* ── Check-in/out highlight ── */
    .dates-row {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: 8px;
      align-items: center;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 14px;
      background: #fafafa;
      text-align: center;
    }
    .date-card-label {
      font-size: 9px;
      font-weight: 700;
      color: #94a3b8;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .date-card-value {
      font-size: 11px;
      font-weight: 700;
      color: #1e293b;
      line-height: 1.3;
    }
    .date-nights {
      font-size: 11px;
      font-weight: 800;
      color: #02665e;
      border: 1.5px solid #02665e;
      border-radius: 9999px;
      padding: 4px 10px;
      white-space: nowrap;
      background: rgba(2,102,94,0.05);
    }

    /* ── Note block ── */
    .note-block {
      display: flex;
      gap: 10px;
      border: 1px solid #e2e8f0;
      border-left: 3px solid #02665e;
      border-radius: 0 8px 8px 0;
      padding: 10px 12px;
      background: #f8fffe;
      margin-top: 14px;
      font-size: 10.5px;
      color: #475569;
      line-height: 1.5;
    }

    /* ── Footer ── */
    .doc-footer {
      border-top: 1px solid #e2e8f0;
      padding: 12px 20px;
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
      background: #f8fafc;
    }
    .footer-brand {
      font-size: 11px;
      font-weight: 800;
      color: #02665e;
      margin-bottom: 3px;
    }
    .footer-info {
      font-size: 10px;
      color: #64748b;
      line-height: 1.5;
    }
    .footer-info b { color: #1e293b; }
    .footer-generated {
      font-size: 9.5px;
      color: #94a3b8;
      margin-top: 4px;
    }
    .qr-wrap { text-align: center; flex-shrink: 0; }
    .qr-wrap img { width: 80px; height: 80px; display: block; }
    .qr-wrap .qr-label {
      font-size: 9px;
      color: #94a3b8;
      font-weight: 600;
      margin-top: 4px;
      letter-spacing: 0.5px;
    }
    .qr-empty {
      width: 80px;
      height: 80px;
      border: 1.5px dashed #cbd5e1;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      color: #94a3b8;
      text-align: center;
      line-height: 1.3;
    }
  </style>
</head>
<body>
<div class="sheet">

  <!-- Brand header -->
  <div class="brand-header">
    <div class="brand-left">
      <img class="brand-logo" src="${logoSrc}" alt="NoLSAF" />
      <div>
        <div class="brand-name">NoLSAF</div>
        <div class="brand-tagline">Your Stay, Our Promise</div>
      </div>
    </div>
    <div class="brand-right">
      <div class="verified-badge"><span class="verified-check">&#10003;</span> Verified</div>
      <div class="receipt-label">Receipt&nbsp;#${details.bookingId}</div>
    </div>
  </div>

  <div class="body-pad">

    <!-- Booking code -->
    <div class="code-block">
      <div class="paid-pill">&#10003;&nbsp;Paid &amp; Confirmed</div>
      <div class="code-label">Booking Code</div>
      <div class="code-value">${details.bookingCode}</div>
      <div class="code-hint">Present this code at check&#8209;in or scan the QR below</div>
    </div>

    <!-- Guest + Property summary cards -->
    <div class="summary-grid">
      <div class="summary-card">
        <div class="summary-card-label">Guest</div>
        <div class="summary-card-value">${details.guestName}</div>
        ${details.guestPhone ? `<div class="summary-card-sub">${details.guestPhone}</div>` : ""}
        ${details.nationality ? `<div class="summary-card-sub">${details.nationality}</div>` : ""}
      </div>
      <div class="summary-card">
        <div class="summary-card-label">Property</div>
        <div class="summary-card-value">${details.property.title}</div>
        <div class="summary-card-sub">${details.property.type}${details.property.regionName ? " &bull; " + [details.property.regionName, details.property.city].filter(Boolean).join(", ") : ""}</div>
        ${details.roomType ? `<div class="summary-card-sub">${details.roomType}${details.rooms ? " &times; " + details.rooms : ""}</div>` : ""}
      </div>
    </div>

    <!-- Check-in / Check-out / Nights -->
    <div class="dates-row">
      <div>
        <div class="date-card-label">Check&#8209;in</div>
        <div class="date-card-value">${checkIn}</div>
      </div>
      <div class="date-nights">${nights}&nbsp;night${nights !== 1 ? "s" : ""}</div>
      <div>
        <div class="date-card-label">Check&#8209;out</div>
        <div class="date-card-value">${checkOut}</div>
      </div>
    </div>

    <!-- Payment details -->
    <div class="section-header">
      <div class="section-bar"></div>
      <div class="section-label">Payment</div>
    </div>
    <table class="detail-table">
      <tr class="amount-row">
        <td>Total Amount</td>
        <td>${amount} TZS</td>
      </tr>
      ${details.invoice?.receiptNumber ? `<tr><td>Receipt No.</td><td>${details.invoice.receiptNumber}</td></tr>` : ""}
      ${paidAt ? `<tr><td>Paid On</td><td>${paidAt}</td></tr>` : ""}
      <tr><td>Status</td><td style="color:#166534;font-weight:700;">&#10003; Payment Received</td></tr>
    </table>

    ${details.services ? `
    <div class="section-header" style="margin-top:14px;">
      <div class="section-bar"></div>
      <div class="section-label">Inclusive Services</div>
    </div>
    <table class="detail-table">
      <tr><td colspan="2">${typeof details.services === "string" ? details.services : JSON.stringify(details.services)}</td></tr>
    </table>
    ` : ""}

    <!-- Note -->
    <div class="note-block">
      <div>
        <strong style="color:#02665e;">Important:</strong>&nbsp;
        Present your booking code at the property on arrival. This document is proof of your confirmed reservation.
        For assistance contact&nbsp;<strong>${supportEmail}</strong>${supportPhone ? `&nbsp;&bull;&nbsp;<strong>${supportPhone}</strong>` : ""}.
      </div>
    </div>

  </div><!-- /body-pad -->

  <!-- Footer -->
  <div class="doc-footer">
    <div>
      <div class="footer-brand">NoLSAF</div>
      <div class="footer-info">
        <b>Email:</b> ${supportEmail}<br>
        ${supportPhone ? `<b>Phone:</b> ${supportPhone}<br>` : ""}
        <b>Web:</b> ${supportWebsite}
      </div>
      <div class="footer-generated">Printed: ${generatedAt}</div>
    </div>
    <div class="qr-wrap">
      ${qrCodeDataUrl
        ? `<img src="${qrCodeDataUrl}" alt="QR Code" /><div class="qr-label">Scan to verify</div>`
        : `<div class="qr-empty">QR<br/>unavailable</div>`}
    </div>
  </div>

</div><!-- /sheet -->
</body>
</html>
  `;
}

/**
 * Generate PDF from booking details
 * Note: This returns HTML. For actual PDF generation, you'll need to:
 * 1. Install a PDF library (puppeteer, pdfkit, etc.)
 * 2. Convert HTML to PDF
 * 3. Return the PDF buffer
 * 
 * For now, this returns HTML that can be printed as PDF by the browser
 */
export async function generateBookingPDF(details: BookingDetails): Promise<{
  html: string;
  filename: string;
}> {
  const html = await generateBookingReservationHTML(details);
  const filename = `Booking-${details.bookingCode}-${details.bookingId}.pdf`;
  
  return { html, filename };
}
