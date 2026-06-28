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

// Receipt-style palette (mirrors the web "Payout Receipt" template)
const RCPT_BG     = "#f7fbfa";
const RCPT_BORDER = "#edf4f3";
const RCPT_LABEL  = "#8aaca9";
const RCPT_VALUE  = "#1e3a38";
const RCPT_HEAD   = "#0f2e2b";
const RCPT_SUB    = "#5a9990";
const RCPT_OUTER  = "#e2eae9";

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

// ─── Receipt-style helpers (used by the owner Payout Receipt) ─────────────────

type RcptOpts = { accent?: boolean; bold?: boolean };
type RcptRow = [string, string] | [string, string, RcptOpts];

/** A perforated dotted edge, like a real tear-off receipt. */
function drawDottedEdge(doc: PDFKit.PDFDocument, x: number, y: number, w: number, color = TEAL) {
  const step = 9;
  const r = 1.4;
  doc.save().fillColor(color);
  for (let cx = x; cx <= x + w; cx += step) doc.circle(cx, y, r).fill();
  doc.restore();
}

/** One "label … value" line inside a receipt card. */
function drawReceiptDetail(doc: PDFKit.PDFDocument, x: number, y: number, w: number, label: string, value: string, opts: RcptOpts = {}) {
  doc.font("Helvetica").fontSize(7.5).fillColor(RCPT_LABEL)
    .text(label, x, y, { width: w * 0.4, lineBreak: false });
  doc.font(opts.accent || opts.bold ? "Helvetica-Bold" : "Helvetica").fontSize(8)
    .fillColor(opts.accent ? TEAL : RCPT_VALUE)
    .text(value, x + w * 0.4, y, { width: w * 0.6, align: "right", lineBreak: false });
}

/** A tinted, rounded detail card with a section label and rows. Returns its height. */
function drawReceiptCard(doc: PDFKit.PDFDocument, x: number, y: number, w: number, label: string, rows: RcptRow[]): number {
  const padX = 10, padTop = 9, padBottom = 6, labelH = 13, rowH = 13;
  const h = padTop + labelH + rows.length * rowH + padBottom;
  doc.roundedRect(x, y, w, h, 8).fillAndStroke(RCPT_BG, RCPT_BORDER);
  doc.font("Helvetica-Bold").fontSize(6.5).fillColor(RCPT_LABEL)
    .text(label.toUpperCase(), x + padX, y + padTop, { characterSpacing: 1, lineBreak: false });
  let ry = y + padTop + labelH;
  for (const row of rows) {
    drawReceiptDetail(doc, x + padX, ry, w - padX * 2, row[0], row[1], row[2] ?? {});
    ry += rowH;
  }
  return h;
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
    const cur = data.currency || "TZS";
    const CARD_W = 440;
    const CARD_X = (PAGE_W - CARD_W) / 2;
    const PAD = 18;
    const innerX = CARD_X + PAD;
    const innerW = CARD_W - PAD * 2;
    const colGap = 12;
    const colW = (innerW - colGap) / 2;

    const cardTop = 48;
    let y = cardTop + 16;

    // Perforated top edge
    drawDottedEdge(doc, CARD_X + 8, cardTop + 9, CARD_W - 16);

    // ── Header: wordmark + verified pill ──
    doc.font("Helvetica-Bold").fontSize(13).fillColor(DARK)
      .text("NoLSAF", innerX, y, { lineBreak: false });
    const badgeW = 62, badgeH = 16, badgeX = innerX + innerW - badgeW, badgeY = y - 3;
    doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 8).fillAndStroke("#edf7f6", "#c0dedd");
    doc.font("Helvetica-Bold").fontSize(7).fillColor(TEAL)
      .text("VERIFIED", badgeX, badgeY + 5, { width: badgeW, align: "center", characterSpacing: 1 });
    y += 26;

    // ── Title ──
    doc.font("Helvetica-Bold").fontSize(7).fillColor(RCPT_LABEL)
      .text("OWNER PAYOUT CONFIRMATION", innerX, y, { width: innerW, align: "center", characterSpacing: 1.5 });
    y += 12;
    doc.font("Helvetica-Bold").fontSize(19).fillColor(RCPT_HEAD)
      .text("Payout Receipt", innerX, y, { width: innerW, align: "center" });
    y += 28;

    // ── Amount ──
    doc.font("Helvetica-Bold").fontSize(7).fillColor(RCPT_LABEL)
      .text("NET AMOUNT DISBURSED", innerX, y, { width: innerW, align: "center", characterSpacing: 1.2 });
    y += 13;
    const amtStr = Number(data.netPayable ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 });
    doc.font("Helvetica-Bold").fontSize(28).fillColor(TEAL)
      .text(`${cur} ${amtStr}`, innerX, y, { width: innerW, align: "center" });
    y += 34;
    if (data.paidAt) {
      doc.font("Helvetica").fontSize(9).fillColor(RCPT_LABEL)
        .text(fmtDate(data.paidAt), innerX, y, { width: innerW, align: "center" });
      y += 16;
    }

    // ── Reference strip ──
    const stripH = 32;
    doc.roundedRect(innerX, y, innerW, stripH, 6).fillAndStroke(RCPT_BG, RCPT_BORDER);
    doc.font("Helvetica-Bold").fontSize(6).fillColor(RCPT_LABEL)
      .text("RECEIPT NUMBER", innerX + 10, y + 7, { characterSpacing: 1, lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(9).fillColor(RCPT_VALUE)
      .text(data.receiptNumber, innerX + 10, y + 17, { width: innerW / 2 - 14, lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(6).fillColor(RCPT_LABEL)
      .text("INVOICE", innerX + innerW / 2, y + 7, { width: innerW / 2 - 10, align: "right", characterSpacing: 1, lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(9).fillColor(RCPT_VALUE)
      .text(data.invoiceNumber, innerX + innerW / 2, y + 17, { width: innerW / 2 - 10, align: "right", lineBreak: false });
    y += stripH + 12;

    // ── Detail cards row A: Payment | Booking ──
    const nights = Math.max(1, Math.ceil(
      (new Date(data.checkOut).getTime() - new Date(data.checkIn).getTime()) / 86400000
    ));
    const paymentRows: RcptRow[] = [
      ["Method", (data.paymentMethod || "—").replace(/_/g, " ")],
      ["Date", fmtDate(data.paidAt)],
      ...(data.paymentRef ? ([["Reference", data.paymentRef]] as RcptRow[]) : []),
    ];
    const bookingRows: RcptRow[] = [
      ["Booking", `#${data.bookingId}`, { accent: true }],
      ...(data.bookingCode ? ([["Code", data.bookingCode]] as RcptRow[]) : []),
      ["Check-in", fmtDate(data.checkIn)],
      ["Check-out", fmtDate(data.checkOut)],
      ["Duration", `${nights} night${nights !== 1 ? "s" : ""}`],
    ];
    const hA = Math.max(
      drawReceiptCard(doc, innerX, y, colW, "Payment", paymentRows),
      drawReceiptCard(doc, innerX + colW + colGap, y, colW, "Booking", bookingRows),
    );
    y += hA + 10;

    // ── Detail cards row B: Property | Owner ──
    const propRows: RcptRow[] = [["Name", data.propertyName, { accent: true }]];
    const ownerRows: RcptRow[] = [
      ["Name", data.ownerName, { accent: true }],
      ...(data.ownerEmail ? ([["Email", data.ownerEmail]] as RcptRow[]) : []),
    ];
    const hB = Math.max(
      drawReceiptCard(doc, innerX, y, colW, "Property", propRows),
      drawReceiptCard(doc, innerX + colW + colGap, y, colW, "Owner", ownerRows),
    );
    y += hB + 10;

    // ── Financial breakdown ──
    const finRows: RcptRow[] = [["Gross Booking Revenue", fmtMoney(data.totalRevenue, cur)]];
    if (data.commissionAmount && Number(data.commissionAmount) > 0) {
      const pct = data.commissionPercent ? ` (${Number(data.commissionPercent).toFixed(1)}%)` : "";
      finRows.push([`Platform Commission${pct}`, `- ${fmtMoney(data.commissionAmount, cur)}`]);
    }
    if (data.taxAmount && Number(data.taxAmount) > 0) {
      const pct = data.taxPercent ? ` (${Number(data.taxPercent).toFixed(1)}%)` : "";
      finRows.push([`Tax${pct}`, `- ${fmtMoney(data.taxAmount, cur)}`]);
    }
    y += drawReceiptCard(doc, innerX, y, innerW, "Financial Breakdown", finRows) + 8;

    // Net highlight
    const netH = 26;
    doc.roundedRect(innerX, y, innerW, netH, 6).fill(LIGHT_TEAL);
    doc.font("Helvetica-Bold").fontSize(10).fillColor(DARK)
      .text("Net Amount Disbursed", innerX + 10, y + 8, { lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(10).fillColor(TEAL)
      .text(fmtMoney(data.netPayable, cur), innerX, y + 8, { width: innerW - 10, align: "right", lineBreak: false });
    y += netH + 12;

    // ── Footer seal with QR ──
    const sealH = 70;
    doc.roundedRect(innerX, y, innerW, sealH, 8).fillAndStroke(RCPT_BG, RCPT_BORDER);
    const hasQr = !!(data.qrPng && data.qrPng.length > 0);
    const textW = innerW - (hasQr ? 84 : 24);
    doc.font("Helvetica-Bold").fontSize(8).fillColor(DARK)
      .text("NoLSAF  ·  CERTIFIED RECEIPT", innerX + 12, y + 12, { characterSpacing: 0.5, lineBreak: false });
    doc.font("Helvetica").fontSize(8).fillColor(RCPT_SUB)
      .text(
        "This document confirms your payout has been disbursed to your registered payment method. Please retain it for your records.",
        innerX + 12, y + 26, { width: textW },
      );
    if (hasQr) {
      try {
        doc.image(data.qrPng as Buffer, innerX + innerW - 64, y + 9, { width: 52, height: 52 });
        doc.font("Helvetica").fontSize(6).fillColor(RCPT_LABEL)
          .text("Scan to verify", innerX + innerW - 70, y + 62, { width: 64, align: "center" });
      } catch {
        // skip QR on failure
      }
    }
    y += sealH + 14;

    // Perforated bottom edge + outer card border
    drawDottedEdge(doc, CARD_X + 8, y, CARD_W - 16);
    y += 6;
    doc.roundedRect(CARD_X, cardTop, CARD_W, y - cardTop, 12).lineWidth(1).stroke(RCPT_OUTER);

    drawFooter(doc);
  });
}
