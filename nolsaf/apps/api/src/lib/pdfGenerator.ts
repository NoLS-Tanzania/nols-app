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
    // Create public URL that can be scanned to view booking details
    // This URL will display all booking information when accessed
    const webUrl = process.env.WEB_ORIGIN || process.env.APP_ORIGIN || "http://localhost:3000";
    const publicBookingUrl = `${webUrl}/public/booking/${details.bookingCode}`;

    // QR code contains the URL - when scanned, it opens the booking details page
    // The URL endpoint returns all booking information (booking code, guest details, property, dates, amount, etc.)
    const qrPayload = publicBookingUrl;

    // Generate QR code as data URL (base64 PNG)
    const QRCode = (await import("qrcode")).default;
    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: "M",
      type: "image/png",
      margin: 2,
      scale: 4,
      width: 200,
    });

    return qrDataUrl;
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
        size: A4;
        margin: 20mm;
      }
      body { margin: 0; }
    }
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #02665e;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #02665e;
      margin: 0;
      font-size: 28px;
    }
    .header .subtitle {
      color: #666;
      font-size: 14px;
      margin-top: 5px;
    }
    .code-box {
      background: #f0f9f8;
      border: 3px solid #02665e;
      padding: 25px;
      text-align: center;
      margin: 30px 0;
      border-radius: 8px;
    }
    .code {
      font-size: 48px;
      font-weight: bold;
      color: #02665e;
      letter-spacing: 6px;
      margin: 10px 0;
    }
    .section {
      margin: 25px 0;
      page-break-inside: avoid;
    }
    .section-title {
      background: #02665e;
      color: white;
      padding: 10px 15px;
      font-weight: bold;
      margin-bottom: 10px;
      border-radius: 4px 4px 0 0;
    }
    .section-content {
      border: 1px solid #ddd;
      border-top: none;
      padding: 15px;
      border-radius: 0 0 4px 4px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: bold;
      color: #666;
      width: 40%;
    }
    .detail-value {
      color: #333;
      width: 60%;
      text-align: right;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #eee;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    .important {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .qr-code {
      width: 150px;
      height: 150px;
      margin: 20px auto;
      display: block;
    }
    .qr-placeholder {
      width: 150px;
      height: 150px;
      border: 2px dashed #ccc;
      margin: 20px auto;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #999;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>NoLSAF</h1>
    <div class="subtitle">Booking Reservation Confirmation</div>
  </div>

  <div class="code-box">
    <div style="font-size: 16px; color: #666; margin-bottom: 10px;">Your Booking Code</div>
    <div class="code">${details.bookingCode}</div>
    <div style="font-size: 14px; color: #666; margin-top: 10px;">
      Present this code at check-in
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
      <li>For any inquiries, contact: ${process.env.SUPPORT_EMAIL || "support@nolsapp.com"}</li>
    </ul>
  </div>

  <div class="footer">
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
      <div style="flex: 1;">
        <p><strong>NoLSAF - Your Stay, Our Promise</strong></p>
        <p style="font-size: 11px; margin-top: 5px;">This is an official booking confirmation document.</p>
        <p style="font-size: 11px; margin-top: 5px;">Generated on ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
      </div>
      <div style="text-align: center; margin-left: 20px;">
        ${qrCodeDataUrl ? `
        <img src="${qrCodeDataUrl}" alt="Booking QR Code" class="qr-code" />
        <p style="font-size: 10px; margin-top: 5px; color: #666;">Scan to view booking details</p>
        ` : `
        <div class="qr-placeholder">QR Code<br/>Unavailable</div>
        `}
      </div>
    </div>
    <div style="text-align: center; padding-top: 15px; border-top: 1px solid #eee; font-size: 11px; color: #666;">
      <p><strong>Important:</strong> This QR code contains all your booking information. Scan it with any QR code reader to access your booking details instantly.</p>
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
