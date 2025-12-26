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

  // Logo: use a configured image URL if provided; otherwise embed a print-safe SVG logo.
  const inlineLogoSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96" role="img" aria-label="NoLSAF logo"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#02665e"/><stop offset="1" stop-color="#014d47"/></linearGradient></defs><rect x="6" y="6" width="84" height="84" rx="22" fill="url(#g)"/><path d="M28 63V33h7l19 20V33h7v30h-7L35 43v20h-7z" fill="#fff" opacity="0.98"/></svg>`;
  const inlineLogoDataUri = `data:image/svg+xml;base64,${Buffer.from(inlineLogoSvg, "utf8").toString("base64")}`;
  // Prefer your real logo from apps/web/public/assets when WEB_ORIGIN/APP_ORIGIN is configured.
  const origin = (process.env.WEB_ORIGIN || process.env.APP_ORIGIN || "").replace(/\/+$/, "");
  const defaultLogoUrl = origin ? `${origin}/assets/NoLS2025-04.png` : "";
  const logoSrc = process.env.PDF_LOGO_URL || process.env.BRAND_LOGO_URL || defaultLogoUrl || inlineLogoDataUri;
  const supportEmail = process.env.SUPPORT_EMAIL || "support@nolsapp.com";
  const supportPhone = process.env.SUPPORT_PHONE || process.env.SUPPORT_TEL || "";
  const supportWebsite = (process.env.WEB_ORIGIN || process.env.APP_ORIGIN || "https://nolsaf.com").replace(/\/+$/, "");
  const generatedAt = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const checkIn = new Date(details.checkIn).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const checkOut = new Date(details.checkOut).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const nights = details.nights || Math.ceil(
    (new Date(details.checkOut).getTime() - new Date(details.checkIn).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const amount = Number(details.totalAmount || 0).toLocaleString("en-US");
  const paidAt = details.invoice?.paidAt
    ? new Date(details.invoice.paidAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Booking Reservation - ${details.bookingCode}</title>
  <style>
    @media print {
      @page {
        size: A5;
        margin: 20mm;
      }
      body { margin: 0; }
    }
    body {
      font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Arial, "Noto Sans", "Helvetica Neue", sans-serif;
      line-height: 1.45;
      color: #0f172a;
      background: #f8fafc;
      margin: 0;
      padding: 0;
    }
    .sheet {
      position: relative;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 18px 18px 16px;
      max-width: 560px;
      margin: 0 auto;
      overflow: hidden;
    }
    .sheet::before {
      content: "NoLSAF";
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 84px;
      letter-spacing: 6px;
      color: rgba(2, 102, 94, 0.06);
      transform: rotate(-18deg);
      pointer-events: none;
      z-index: 0;
    }
    .content { position: relative; z-index: 1; }
    .header {
      text-align: center;
      border-bottom: 2px solid rgba(2, 102, 94, 0.25);
      padding-bottom: 14px;
      margin-bottom: 16px;
    }
    .logo {
      width: 54px;
      height: 54px;
      display: block;
      margin: 0 auto 10px;
      object-fit: contain;
    }
    .header h1 {
      color: #02665e;
      margin: 0;
      font-size: 22px;
      letter-spacing: 0.2px;
    }
    .header .subtitle {
      color: #475569;
      font-size: 12px;
      margin-top: 3px;
    }
    .code-box {
      position: relative;
      background: linear-gradient(135deg, rgba(2, 102, 94, 0.10), rgba(2, 102, 94, 0.04));
      border: 2px solid rgba(2, 102, 94, 0.55);
      padding: 16px 16px 14px;
      text-align: center;
      margin: 14px 0 16px;
      border-radius: 16px;
    }
    .verified-stamp {
      position: absolute;
      top: 12px;
      right: 12px;
      border: 2px solid rgba(2, 102, 94, 0.7);
      color: #02665e;
      border-radius: 9999px;
      padding: 6px 10px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      transform: rotate(-10deg);
      background: rgba(255, 255, 255, 0.75);
    }
    .code {
      font-size: 38px;
      font-weight: 800;
      color: #02665e;
      letter-spacing: 4px;
      margin: 8px 0 6px;
    }
    .section {
      margin: 12px 0;
      page-break-inside: avoid;
    }
    .section-title {
      background: rgba(2, 102, 94, 0.08);
      color: #02665e;
      padding: 10px 12px;
      font-weight: 800;
      margin-bottom: 0;
      border-radius: 12px 12px 0 0;
      border: 1px solid rgba(2, 102, 94, 0.18);
      border-bottom: none;
    }
    .section-content {
      border: 1px solid rgba(148, 163, 184, 0.55);
      border-top: none;
      padding: 12px;
      border-radius: 0 0 12px 12px;
      background: rgba(248, 250, 252, 0.6);
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid rgba(148, 163, 184, 0.35);
      gap: 12px;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: 700;
      color: #64748b;
      width: 40%;
    }
    .detail-value {
      color: #0f172a;
      width: 60%;
      text-align: right;
    }
    .footer {
      margin-top: 14px;
      padding-top: 14px;
      border-top: 1px solid rgba(148, 163, 184, 0.45);
      color: #475569;
      font-size: 11px;
    }
    .footer-grid {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 14px;
    }
    .footer-left { flex: 1; min-width: 0; }
    .footer-title {
      font-size: 12px;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }
    .footer-meta {
      margin-top: 6px;
      font-size: 11px;
      color: #64748b;
      line-height: 1.35;
    }
    .contact {
      margin-top: 8px;
      display: grid;
      gap: 4px;
      font-size: 11px;
      color: #475569;
    }
    .contact span { color: #0f172a; font-weight: 700; }
    .important {
      background: rgba(2, 102, 94, 0.06);
      border: 1px solid rgba(2, 102, 94, 0.22);
      padding: 12px 12px 10px;
      margin: 12px 0;
      border-radius: 12px;
    }
    .qr-code {
      width: 120px;
      height: 120px;
      margin: 0 auto;
      display: block;
    }
    .qr-placeholder {
      width: 120px;
      height: 120px;
      border: 2px dashed rgba(148, 163, 184, 0.7);
      margin: 0 auto;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #64748b;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="content">
      <div class="header">
        <img class="logo" src="${logoSrc}" alt="NoLSAF logo" />
        <h1>NoLSAF</h1>
        <div class="subtitle">Booking Reservation Confirmation</div>
      </div>

      <div class="code-box">
        <div class="verified-stamp">Verified</div>
        <div style="font-size: 12px; color: #475569; margin-bottom: 6px; font-weight: 700;">Booking code</div>
        <div class="code">${details.bookingCode}</div>
        <div style="font-size: 11px; color: #64748b; margin-top: 2px;">
          Present this code or scan the QR at check‑in
        </div>
      </div>

  <div class="section">
    <div class="section-title">Personal Information</div>
    <div class="section-content">
      <div class="detail-row">
        <span class="detail-label">Full Name:</span>
        <span class="detail-value">${details.guestName}</span>
      </div>
      ${details.guestPhone ? `
      <div class="detail-row">
        <span class="detail-label">Phone:</span>
        <span class="detail-value">${details.guestPhone}</span>
      </div>
      ` : ""}
      ${details.nationality ? `
      <div class="detail-row">
        <span class="detail-label">Nationality:</span>
        <span class="detail-value">${details.nationality}</span>
      </div>
      ` : ""}
    </div>
  </div>

  <div class="section">
    <div class="section-title">Booking Details</div>
    <div class="section-content">
      <div class="detail-row">
        <span class="detail-label">Booking ID:</span>
        <span class="detail-value">#${details.bookingId}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Property:</span>
        <span class="detail-value">${details.property.title}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Property Type:</span>
        <span class="detail-value">${details.property.type}</span>
      </div>
      ${details.property.regionName ? `
      <div class="detail-row">
        <span class="detail-label">Location:</span>
        <span class="detail-value">${[details.property.regionName, details.property.district, details.property.city].filter(Boolean).join(", ")}</span>
      </div>
      ` : ""}
      ${details.roomType ? `
      <div class="detail-row">
        <span class="detail-label">Room Type:</span>
        <span class="detail-value">${details.roomType}</span>
      </div>
      ` : ""}
      ${details.rooms ? `
      <div class="detail-row">
        <span class="detail-label">Number of Rooms:</span>
        <span class="detail-value">${details.rooms}</span>
      </div>
      ` : ""}
      <div class="detail-row">
        <span class="detail-label">Check-in Date:</span>
        <span class="detail-value">${checkIn}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Check-out Date:</span>
        <span class="detail-value">${checkOut}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Number of Nights:</span>
        <span class="detail-value">${nights}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Total Amount:</span>
        <span class="detail-value"><strong>${amount} TZS</strong></span>
      </div>
      ${details.invoice?.receiptNumber ? `
      <div class="detail-row">
        <span class="detail-label">Receipt Number:</span>
        <span class="detail-value">${details.invoice.receiptNumber}</span>
      </div>
      ` : ""}
      ${paidAt ? `
      <div class="detail-row">
        <span class="detail-label">Payment Date:</span>
        <span class="detail-value">${paidAt}</span>
      </div>
      ` : ""}
    </div>
  </div>

  ${details.services ? `
  <div class="section">
    <div class="section-title">Inclusive Services</div>
    <div class="section-content">
      <div style="color: #333;">${typeof details.services === 'string' ? details.services : JSON.stringify(details.services, null, 2)}</div>
    </div>
  </div>
  ` : ""}

  <div class="important">
    <strong>Important Instructions:</strong>
    <ul style="margin: 10px 0; padding-left: 20px;">
      <li>Please present this booking code at the property during check-in</li>
      <li>This code is unique to your booking and will be used to verify your reservation</li>
      <li>Keep this document safe and bring it with you on your travel date</li>
      <li>For any inquiries, contact: ${supportEmail}${supportPhone ? ` • ${supportPhone}` : ""}</li>
    </ul>
  </div>

  <div class="footer">
    <div class="footer-grid">
      <div class="footer-left">
        <p class="footer-title">NoLSAF — Your Stay, Our Promise</p>
        <div class="footer-meta">
          Official booking confirmation • Generated on ${generatedAt}
        </div>
        <div class="contact">
          <div><span>Support:</span> ${supportEmail}</div>
          ${supportPhone ? `<div><span>Phone:</span> ${supportPhone}</div>` : ""}
          <div><span>Website:</span> ${supportWebsite}</div>
        </div>
      </div>
      <div style="text-align: center;">
        ${qrCodeDataUrl ? `
        <img src="${qrCodeDataUrl}" alt="Booking QR Code" class="qr-code" />
        <div style="font-size: 10px; margin-top: 6px; color: #64748b; font-weight: 700;">Scan to verify</div>
        ` : `
        <div class="qr-placeholder">QR Code<br/>Unavailable</div>
        `}
      </div>
    </div>
  </div>
    </div>
  </div>
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
