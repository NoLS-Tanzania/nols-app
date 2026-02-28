/**
 * pdfDocuments.ts
 * ─────────────────────────────────────────────────────────────
 * Generates branded PDF documents using pdfkit (pure Node.js, no browser needed):
 *   1. generateBookingTicketPdf   — guest booking reservation ticket
 *   2. generatePaymentReceiptPdf  — customer payment receipt (invoice PAID)
 *   3. generateOwnerDisbursementPdf — owner disbursement notice
 */
import PDFDocument from "pdfkit";

// ─── Brand constants ──────────────────────────────────────────
const TEAL        = "#02665e";
const DARK        = "#014d47";
const LIGHT_TEAL  = "#e6f2f1";
const TEXT_MAIN   = "#1a2e2c";
const TEXT_MUTED  = "#6b7280";
const BORDER      = "#d1e8e6";
const RED         = "#dc2626";
const AMBER       = "#d97706";
const PAGE_W      = 595.28; // A4 pt width
const MARGIN      = 50;
const COL_W       = PAGE_W - MARGIN * 2;

// ─── Shared helpers ───────────────────────────────────────────

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "long", year: "numeric",
  });
}

function fmtMoney(amount: number | string | null | undefined, currency = "TZS"): string {
  const n = Number(amount ?? 0);
  return `${currency} ${n.toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function buildBuffer(fn: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: MARGIN, size: "A4", compress: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    try {
      fn(doc);
      doc.end();
    } catch (e) {
      reject(e);
    }
  });
}

function drawTealHeader(doc: PDFKit.PDFDocument, title: string, subtitle: string) {
  // Teal header band
  doc.rect(0, 0, PAGE_W, 90).fill(TEAL);

  // NoLSAF wordmark
  doc.font("Helvetica-Bold").fontSize(22).fillColor("#ffffff")
    .text("NoLSAF", MARGIN, 22, { lineBreak: false });

  // Document title
  doc.font("Helvetica").fontSize(10).fillColor("rgba(255,255,255,0.75)")
    .text(title.toUpperCase(), MARGIN + 90, 28, { lineBreak: false });

  // Subtitle right-aligned
  doc.font("Helvetica").fontSize(9).fillColor("rgba(255,255,255,0.65)")
    .text(subtitle, MARGIN, 55, { align: "right", width: COL_W });

  doc.moveDown(0);
  doc.y = 110;
}

function drawSectionLabel(doc: PDFKit.PDFDocument, label: string) {
  doc.moveDown(0.4);
  const y = doc.y;
  doc.rect(MARGIN, y, COL_W, 20).fill(LIGHT_TEAL);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(DARK)
    .text(label.toUpperCase(), MARGIN + 8, y + 6);
  doc.y = y + 26;
}

function drawRow(doc: PDFKit.PDFDocument, label: string, value: string, accentValue = false) {
  const y = doc.y;
  // subtle alternating not needed — just draw two columns
  doc.font("Helvetica").fontSize(9).fillColor(TEXT_MUTED)
    .text(label, MARGIN, y, { width: 160, lineBreak: false });
  doc.font(accentValue ? "Helvetica-Bold" : "Helvetica")
    .fillColor(accentValue ? DARK : TEXT_MAIN)
    .text(value, MARGIN + 170, y, { width: COL_W - 170 });
  doc.moveDown(0.15);
}

function drawDivider(doc: PDFKit.PDFDocument) {
  doc.moveDown(0.3);
  doc.strokeColor(BORDER).lineWidth(0.5)
    .moveTo(MARGIN, doc.y).lineTo(MARGIN + COL_W, doc.y).stroke();
  doc.moveDown(0.3);
}

function drawFooter(doc: PDFKit.PDFDocument) {
  const footerY = doc.page.height - 45;
  doc.strokeColor(BORDER).lineWidth(0.5)
    .moveTo(MARGIN, footerY).lineTo(MARGIN + COL_W, footerY).stroke();
  doc.font("Helvetica").fontSize(7.5).fillColor(TEXT_MUTED)
    .text(
      `NoLSAF · Dar es Salaam, Tanzania · support@nolsaf.com · nolsaf.com`,
      MARGIN, footerY + 8, { align: "center", width: COL_W }
    )
    .text(
      `This document was generated automatically. For queries contact support@nolsaf.com`,
      MARGIN, footerY + 20, { align: "center", width: COL_W }
    );
}

// ─── 1. Booking Ticket ────────────────────────────────────────────────────────

export interface BookingTicketData {
  bookingId: number;
  bookingCode: string;
  guestName: string;
  guestPhone?: string | null;
  propertyName: string;
  propertyLocation?: string | null;
  checkIn: Date | string;
  checkOut: Date | string;
  rooms: number;
  totalAmount: number | string;
  currency?: string;
  includeTransport?: boolean;
  transportDate?: Date | string | null;
  transportOrigin?: string | null;
  confirmedAt?: Date | null;
}

export async function generateBookingTicketPdf(data: BookingTicketData): Promise<Buffer> {
  return buildBuffer((doc) => {
    drawTealHeader(doc, "Booking Confirmation", `Issued: ${fmtDate(data.confirmedAt || new Date())}`);

    // Large booking code block
    const codeBoxY = doc.y;
    doc.rect(MARGIN, codeBoxY, COL_W, 56).fill("#f0fdf4");
    doc.rect(MARGIN, codeBoxY, COL_W, 56).strokeColor("#16a34a").lineWidth(1.5).stroke();
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#166534")
      .text("CHECK-IN CODE", MARGIN, codeBoxY + 8, { align: "center", width: COL_W });
    doc.font("Helvetica-Bold").fontSize(30).fillColor("#14532d")
      .text(data.bookingCode, MARGIN, codeBoxY + 22, { align: "center", width: COL_W, characterSpacing: 6 });
    doc.y = codeBoxY + 68;

    doc.font("Helvetica").fontSize(8).fillColor(TEXT_MUTED)
      .text("Present this code to property staff on arrival", MARGIN, doc.y, { align: "center", width: COL_W });
    doc.moveDown(0.8);

    drawSectionLabel(doc, "Guest Details");
    drawRow(doc, "Guest Name", data.guestName, true);
    if (data.guestPhone) drawRow(doc, "Phone", data.guestPhone);
    drawDivider(doc);

    drawSectionLabel(doc, "Booking Details");
    drawRow(doc, "Booking Reference", `#${data.bookingId}`);
    drawRow(doc, "Property", data.propertyName, true);
    if (data.propertyLocation) drawRow(doc, "Location", data.propertyLocation);
    drawRow(doc, "Check-In", fmtDate(data.checkIn), true);
    drawRow(doc, "Check-Out", fmtDate(data.checkOut), true);
    const nights = Math.max(1, Math.ceil(
      (new Date(data.checkOut).getTime() - new Date(data.checkIn).getTime()) / 86400000
    ));
    drawRow(doc, "Duration", `${nights} night${nights !== 1 ? "s" : ""}`);
    drawRow(doc, "Rooms", String(data.rooms));
    drawRow(doc, "Total Amount", fmtMoney(data.totalAmount, data.currency), true);
    drawDivider(doc);

    if (data.includeTransport) {
      drawSectionLabel(doc, "Transport");
      if (data.transportDate) drawRow(doc, "Pickup Date", fmtDate(data.transportDate));
      if (data.transportOrigin) drawRow(doc, "Pickup Address", data.transportOrigin);
      drawDivider(doc);
    }

    // Important notice
    doc.moveDown(0.3);
    doc.rect(MARGIN, doc.y, COL_W, 36).fill("#fff7ed");
    const noticeY = doc.y + 6;
    doc.font("Helvetica-Bold").fontSize(8).fillColor(AMBER)
      .text("IMPORTANT: ", MARGIN + 10, noticeY, { lineBreak: false });
    doc.font("Helvetica").fontSize(8).fillColor("#92400e")
      .text("Keep this confirmation safe. Present the check-in code to property staff on arrival.", MARGIN + 70, noticeY, { width: COL_W - 80 });
    doc.y += 44;

    drawFooter(doc);
  });
}

// ─── 2. Payment Receipt ───────────────────────────────────────────────────────

export interface PaymentReceiptData {
  receiptNumber: string;
  invoiceNumber: string;
  bookingId: number;
  bookingCode?: string | null;
  guestName: string;
  guestEmail?: string | null;
  propertyName: string;
  checkIn: Date | string;
  checkOut: Date | string;
  total: number | string;
  commissionAmount?: number | string | null;
  taxAmount?: number | string | null;
  netPayable?: number | string | null;
  paymentMethod?: string | null;
  paymentRef?: string | null;
  paidAt: Date | string | null;
  currency?: string;
  /** QR code PNG bytes (from invoice.receiptQrPng) */
  qrPng?: Buffer | null;
}

export async function generatePaymentReceiptPdf(data: PaymentReceiptData): Promise<Buffer> {
  return buildBuffer((doc) => {
    drawTealHeader(doc, "Payment Receipt", `Receipt: ${data.receiptNumber}`);

    // Paid badge
    const badgeY = doc.y;
    doc.rect(MARGIN + COL_W - 80, badgeY - 4, 80, 22).fill("#dcfce7");
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#166534")
      .text("PAID ✓", MARGIN + COL_W - 76, badgeY + 2, { width: 72, align: "center" });
    doc.y = badgeY;

    drawSectionLabel(doc, "Receipt Details");
    drawRow(doc, "Receipt Number", data.receiptNumber, true);
    drawRow(doc, "Invoice Number", data.invoiceNumber);
    drawRow(doc, "Date Paid", fmtDate(data.paidAt));
    drawRow(doc, "Payment Method", (data.paymentMethod || "—").replace(/_/g, " "));
    if (data.paymentRef) drawRow(doc, "Transaction Reference", data.paymentRef);
    drawDivider(doc);

    drawSectionLabel(doc, "Customer Details");
    drawRow(doc, "Name", data.guestName, true);
    if (data.guestEmail) drawRow(doc, "Email", data.guestEmail);
    drawDivider(doc);

    drawSectionLabel(doc, "Booking Details");
    drawRow(doc, "Booking Reference", `#${data.bookingId}`);
    if (data.bookingCode) drawRow(doc, "Booking Code", data.bookingCode);
    drawRow(doc, "Property", data.propertyName, true);
    drawRow(doc, "Check-In", fmtDate(data.checkIn));
    drawRow(doc, "Check-Out", fmtDate(data.checkOut));
    const nights = Math.max(1, Math.ceil(
      (new Date(data.checkOut).getTime() - new Date(data.checkIn).getTime()) / 86400000
    ));
    drawRow(doc, "Duration", `${nights} night${nights !== 1 ? "s" : ""}`);
    drawDivider(doc);

    // Amount breakdown
    drawSectionLabel(doc, "Payment Summary");
    drawRow(doc, "Booking Amount",   fmtMoney(data.total, data.currency));
    const totalLine = doc.y;
    doc.rect(MARGIN, totalLine, COL_W, 24).fill(LIGHT_TEAL);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(DARK)
      .text("Total Paid", MARGIN + 8, totalLine + 7, { width: 160, lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(10).fillColor(DARK)
      .text(fmtMoney(data.total, data.currency), MARGIN + 170, totalLine + 7, { width: COL_W - 178 });
    doc.y = totalLine + 32;

    // QR code (right-aligned)
    if (data.qrPng && data.qrPng.length > 0) {
      doc.moveDown(0.4);
      const qrY = doc.y;
      try {
        doc.image(data.qrPng, MARGIN + COL_W - 90, qrY, { width: 80, height: 80 });
        doc.font("Helvetica").fontSize(7.5).fillColor(TEXT_MUTED)
          .text("Scan to verify receipt", MARGIN + COL_W - 90, qrY + 82, { width: 80, align: "center" });
      } catch {
        // QR embed failed — skip silently
      }
      doc.y = qrY + 96;
    }

    drawFooter(doc);
  });
}

// ─── 3. Owner Disbursement Notice ─────────────────────────────────────────────

export interface OwnerDisbursementData {
  ownerName: string;
  ownerEmail?: string | null;
  receiptNumber: string;
  invoiceNumber: string;
  bookingId: number;
  bookingCode?: string | null;
  propertyName: string;
  checkIn: Date | string;
  checkOut: Date | string;
  totalRevenue: number | string;
  commissionPercent?: number | string | null;
  commissionAmount?: number | string | null;
  taxPercent?: number | string | null;
  taxAmount?: number | string | null;
  netPayable: number | string;
  paymentMethod?: string | null;
  paymentRef?: string | null;
  paidAt: Date | string | null;
  currency?: string;
  /** QR code PNG bytes */
  qrPng?: Buffer | null;
}

export async function generateOwnerDisbursementPdf(data: OwnerDisbursementData): Promise<Buffer> {
  return buildBuffer((doc) => {
    drawTealHeader(doc, "Disbursement Receipt", `Receipt: ${data.receiptNumber}`);

    // Disbursed badge
    const badgeY = doc.y;
    doc.rect(MARGIN + COL_W - 100, badgeY - 4, 100, 22).fill("#dcfce7");
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#166534")
      .text("DISBURSED ✓", MARGIN + COL_W - 96, badgeY + 2, { width: 92, align: "center" });
    doc.y = badgeY;

    drawSectionLabel(doc, "Disbursement Details");
    drawRow(doc, "Receipt Number",  data.receiptNumber, true);
    drawRow(doc, "Invoice Number",  data.invoiceNumber);
    drawRow(doc, "Disbursement Date", fmtDate(data.paidAt));
    drawRow(doc, "Payment Method", (data.paymentMethod || "—").replace(/_/g, " "));
    if (data.paymentRef) drawRow(doc, "Transaction Reference", data.paymentRef);
    drawDivider(doc);

    drawSectionLabel(doc, "Owner Details");
    drawRow(doc, "Owner Name", data.ownerName, true);
    if (data.ownerEmail) drawRow(doc, "Email", data.ownerEmail);
    drawDivider(doc);

    drawSectionLabel(doc, "Booking Details");
    drawRow(doc, "Booking Reference", `#${data.bookingId}`);
    if (data.bookingCode) drawRow(doc, "Booking Code", data.bookingCode);
    drawRow(doc, "Property", data.propertyName, true);
    drawRow(doc, "Check-In",  fmtDate(data.checkIn));
    drawRow(doc, "Check-Out", fmtDate(data.checkOut));
    const nights = Math.max(1, Math.ceil(
      (new Date(data.checkOut).getTime() - new Date(data.checkIn).getTime()) / 86400000
    ));
    drawRow(doc, "Duration", `${nights} night${nights !== 1 ? "s" : ""}`);
    drawDivider(doc);

    // Financial breakdown
    drawSectionLabel(doc, "Financial Breakdown");
    drawRow(doc, "Gross Booking Revenue", fmtMoney(data.totalRevenue, data.currency));
    if (data.commissionAmount && Number(data.commissionAmount) > 0) {
      const pct = data.commissionPercent ? ` (${Number(data.commissionPercent).toFixed(1)}%)` : "";
      drawRow(doc, `Platform Commission${pct}`, `– ${fmtMoney(data.commissionAmount, data.currency)}`);
    }
    if (data.taxAmount && Number(data.taxAmount) > 0) {
      const pct = data.taxPercent ? ` (${Number(data.taxPercent).toFixed(1)}%)` : "";
      drawRow(doc, `Tax${pct}`, `– ${fmtMoney(data.taxAmount, data.currency)}`);
    }
    doc.moveDown(0.2);
    const netY = doc.y;
    doc.rect(MARGIN, netY, COL_W, 28).fill(LIGHT_TEAL);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(DARK)
      .text("Net Amount Disbursed", MARGIN + 8, netY + 8, { width: 200, lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(11).fillColor(TEAL)
      .text(fmtMoney(data.netPayable, data.currency), MARGIN + 210, netY + 8, { width: COL_W - 218 });
    doc.y = netY + 36;

    // QR code
    if (data.qrPng && data.qrPng.length > 0) {
      doc.moveDown(0.4);
      const qrY = doc.y;
      try {
        doc.image(data.qrPng, MARGIN + COL_W - 90, qrY, { width: 80, height: 80 });
        doc.font("Helvetica").fontSize(7.5).fillColor(TEXT_MUTED)
          .text("Scan to verify", MARGIN + COL_W - 90, qrY + 82, { width: 80, align: "center" });
      } catch {
        // skip
      }
      doc.y = qrY + 96;
    }

    // Notice
    doc.moveDown(0.5);
    doc.rect(MARGIN, doc.y, COL_W, 30).fill("#f0fdf4");
    const noticeY = doc.y + 8;
    doc.font("Helvetica").fontSize(8).fillColor("#166534")
      .text("This document confirms payment has been disbursed to your registered payment method. Please retain for your records.", MARGIN + 10, noticeY, { width: COL_W - 20 });
    doc.y += 38;

    drawFooter(doc);
  });
}
