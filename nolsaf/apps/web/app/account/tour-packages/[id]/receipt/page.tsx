"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import JsBarcode from "jsbarcode";
import apiClient from "@/lib/apiClient";
import LogoSpinner from "@/components/LogoSpinner";

const api = apiClient;

type TourReceipt = {
  bookingId: number;
  bookingCode: string | null;
  title: string | null;
  currency: string | null;
  amount: number;
  paymentStatus: string | null;
  paymentProvider: string | null;
  paymentRef: string | null;
  paidAt: string | null;
  travelerCount: number | null;
  guestName: string | null;
};

function formatCurrencyParts(currency: string | null | undefined, amount: number | null | undefined) {
  return {
    code: String(currency || "USD"),
    value: Number(amount || 0).toLocaleString(),
  };
}

function formatFullDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function buildReceiptReference(receipt: TourReceipt) {
  const suffix = String(receipt.bookingCode || receipt.bookingId || "0").replace(/[^a-zA-Z0-9]/g, "").slice(-8).toUpperCase();
  return `TPR-${String(receipt.bookingId).padStart(6, "0")}-${suffix || "NOLSAF"}`;
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildReceiptPrintHtml(receipt: TourReceipt, barcodeDataUrl: string | null) {
  const amount = formatCurrencyParts(receipt.currency, receipt.amount);
  const paidDate = formatFullDate(receipt.paidAt) || "Payment date pending record";
  const shortDate = formatShortDate(receipt.paidAt);
  const receiptReference = buildReceiptReference(receipt);
  const guestInitial = String(receipt.guestName || "G").charAt(0).toUpperCase();
  const documentTitle = `NoLSAF-Payment-Receipt-${receiptReference}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(documentTitle)}</title>
  <style>
    @page { size: A5 portrait; margin: 8mm 7mm; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      font-family: Inter, Segoe UI, Arial, sans-serif;
      color: #123a37;
    }
    body { padding: 0; }
    .sheet { width: 100%; background: #ffffff; padding: 8px; }
    .card {
      max-width: 470px;
      margin: 0 auto;
      overflow: hidden;
      border-radius: 24px;
      border: 1px solid #dfecea;
      background: #ffffff;
    }
    .top {
      border-bottom: 1px solid #edf4f3;
      padding: 16px 20px;
      background: #ffffff;
    }
    .title-block { text-align: center; margin-bottom: 12px; }
    .eyebrow { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.24em; color: #86a7a4; }
    .title { font-size: 30px; font-weight: 900; letter-spacing: -0.03em; color: #123a37; margin-top: 4px; }
    .subtitle { margin-top: 4px; font-size: 12px; line-height: 1.5; color: #6f8b88; }
    .amount-box {
      border: 1px solid #e5f0ee; border-radius: 18px;
      background: #ffffff;
      padding: 16px 20px; text-align: center;
    }
    .amount-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.22em; color: #7ea4a0; }
    .amount-row { display: flex; justify-content: center; align-items: end; gap: 8px; margin-top: 4px; }
    .amount-code { padding-bottom: 4px; font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; color: #5f8f8a; }
    .amount-value { font-size: 42px; line-height: 1; font-weight: 900; letter-spacing: -0.04em; color: #0a6b64; }
    .amount-date {
      display: inline-block; margin-top: 8px; padding: 4px 12px; border-radius: 999px;
      border: 1px solid #dcecea; background: #ffffff; font-size: 10px; font-weight: 600; color: #6b8b87;
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    .ref-strip {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      border-bottom: 1px solid #edf4f3; background: #ffffff; padding: 12px 20px;
    }
    .ref-divider { width: 1px; height: 32px; background: #d6e8e5; flex-shrink: 0; }
    .ref-label { margin-bottom: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.2em; color: #89aaa6; }
    .ref-value { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; color: #173f3b; }
    .ref-right { text-align: right; }
    .body { padding: 12px 16px 12px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 8px; }
    .cell {
      border: 1px solid #e8f1ef; border-radius: 16px; background: #ffffff; padding: 12px;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);
    }
    .cell-title { margin-bottom: 8px; font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.22em; color: #82a6a2; }
    .row { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; margin-bottom: 6px; }
    .row:last-child { margin-bottom: 0; }
    .label { font-size: 10px; color: #7f9d99; }
    .value { text-align: right; font-size: 11px; font-weight: 600; color: #183f3b; }
    .mono { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
    .accent { color: #0a6b64; font-weight: 700; }
    .identity { display: flex; align-items: flex-start; gap: 8px; margin-top: 4px; }
    .badge-circle, .badge-square {
      width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; background: #0b6e67; color: #ffffff; font-size: 12px; font-weight: 900;
      box-shadow: 0 1px 2px rgba(0,0,0,0.08);
    }
    .badge-circle { border-radius: 999px; }
    .badge-square { border-radius: 12px; }
    .identity-title { font-size: 12px; font-weight: 700; color: #123a37; }
    .identity-sub { margin-top: 4px; font-size: 9.5px; line-height: 1.4; color: #6e9792; }
    .footer {
      margin: 4px 4px 8px; overflow: hidden; border-radius: 18px; border: 1px solid #e8f1ef; background: #ffffff;
    }
    .footer-rule {
      height: 6px; background-image: radial-gradient(circle, rgba(11,110,103,0.55) 1.6px, transparent 1.6px);
      background-size: 14px 6px; background-repeat: repeat-x; background-position: center;
    }
    .footer-body { display: grid; grid-template-columns: 1fr auto; gap: 12px; align-items: center; padding: 12px 16px; }
    .footer-badge { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .footer-dot { width: 16px; height: 16px; border-radius: 999px; background: #0b6e67; }
    .footer-title { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.16em; color: #0b5752; }
    .footer-copy { font-size: 9.5px; line-height: 1.6; color: #6a918c; }
    .footer-copy.small { margin-top: 4px; font-size: 9px; line-height: 1.5; }
    .footer-note { margin-top: 6px; font-size: 8px; text-transform: uppercase; letter-spacing: 0.14em; color: #9bb7b3; }
    .barcode-wrap { text-align: center; flex-shrink: 0; }
    .barcode-label { margin-bottom: 4px; font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.14em; color: #8aaca9; }
    .barcode-box {
      display: inline-flex; flex-direction: column; align-items: center; border: 1px solid #d8e9e6;
      border-radius: 12px; background: #ffffff; padding: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }
    .barcode-box img { display: block; width: 152px; height: 40px; background: #ffffff; }
    .barcode-value { margin-top: 4px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 8px; font-weight: 600; letter-spacing: 0.08em; color: #6c8d89; word-break: break-all; }
    .bottom-rule {
      height: 6px; background-image: radial-gradient(circle, #0b6e67 1.6px, transparent 1.6px);
      background-size: 14px 6px; background-repeat: repeat-x; background-position: center;
    }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="card">
      <div class="top">
        <div class="title-block">
          <div class="eyebrow">Certified Customer Payment Record</div>
          <div class="title">Payment Receipt</div>
          <div class="subtitle">Official confirmation issued for your completed tour package payment.</div>
        </div>
        <div class="amount-box">
          <div class="amount-label">Amount Settled</div>
          <div class="amount-row"><span class="amount-code">${escapeHtml(amount.code)}</span><span class="amount-value">${escapeHtml(amount.value)}</span></div>
          <div class="amount-date">${escapeHtml(paidDate)}</div>
        </div>
      </div>

      <div class="ref-strip">
        <div>
          <div class="ref-label">Receipt Number</div>
          <div class="ref-value">${escapeHtml(receiptReference)}</div>
        </div>
        <div class="ref-divider"></div>
        <div class="ref-right">
          <div class="ref-label">Booking Code</div>
          <div class="ref-value">${escapeHtml(receipt.bookingCode || `#${receipt.bookingId}`)}</div>
        </div>
      </div>

      <div class="body">
        <div class="grid2">
          <div class="cell">
            <div class="cell-title">Payment Details</div>
            <div class="row"><span class="label">Status</span><span class="value">${escapeHtml(receipt.paymentStatus || "-")}</span></div>
            <div class="row"><span class="label">Method</span><span class="value">${escapeHtml(receipt.paymentProvider || "—")}</span></div>
            <div class="row"><span class="label">Date</span><span class="value">${escapeHtml(shortDate)}</span></div>
            <div class="row"><span class="label">Reference</span><span class="value mono">${escapeHtml(receipt.paymentRef || "—")}</span></div>
          </div>
          <div class="cell">
            <div class="cell-title">Booking Details</div>
            <div class="row"><span class="label">Package</span><span class="value">${escapeHtml(receipt.title || "Tour Package")}</span></div>
            <div class="row"><span class="label">Code</span><span class="value mono accent">${escapeHtml(receipt.bookingCode || "-")}</span></div>
            <div class="row"><span class="label">Travelers</span><span class="value">${escapeHtml(Number(receipt.travelerCount || 0))}</span></div>
            <div class="row"><span class="label">Booking ID</span><span class="value">#${escapeHtml(receipt.bookingId)}</span></div>
          </div>
        </div>

        <div class="grid2">
          <div class="cell">
            <div class="cell-title">Customer</div>
            <div class="identity">
              <div class="badge-circle">${escapeHtml(guestInitial)}</div>
              <div>
                <div class="identity-title">${escapeHtml(receipt.guestName || "Guest")}</div>
                <div class="identity-sub">Registered tour package customer</div>
              </div>
            </div>
          </div>
          <div class="cell">
            <div class="cell-title">Service</div>
            <div class="identity">
              <div class="badge-square">T</div>
              <div>
                <div class="identity-title">${escapeHtml(receipt.title || "Tour Package")}</div>
                <div class="identity-sub">Payment captured and recorded by NoLSAF for this tour service.</div>
              </div>
            </div>
          </div>
        </div>

        <div class="footer">
          <div class="footer-rule"></div>
          <div class="footer-body">
            <div>
              <div class="footer-badge"><div class="footer-dot"></div><span class="footer-title">NoLSAF Certified Receipt</span></div>
              <div class="footer-copy">This receipt confirms that payment was accepted and logged under your tour package booking record.</div>
              <div class="footer-copy small">Keep this document for audit, support, and verification use.</div>
              <div class="footer-note">Barcode verification for receipt reference</div>
            </div>
            <div class="barcode-wrap">
              <div class="barcode-label">Barcode</div>
              <div class="barcode-box">
                ${barcodeDataUrl ? `<img src="${barcodeDataUrl}" alt="Receipt barcode" />` : `<div style="width:152px;height:40px;display:flex;align-items:center;justify-content:center;font-size:8px;color:#9ab8b6;">Barcode unavailable</div>`}
                <div class="barcode-value">${escapeHtml(receiptReference)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="bottom-rule"></div>
    </div>
  </div>
</body>
</html>`;
}

function ReceiptSheet({ receipt, barcodeDataUrl }: { receipt: TourReceipt; barcodeDataUrl: string | null }) {
  const amount = formatCurrencyParts(receipt.currency, receipt.amount);
  const paidDate = formatFullDate(receipt.paidAt);
  const receiptReference = buildReceiptReference(receipt);
  const barcodeValue = receiptReference;

  return (
    <div className="sheet w-full max-w-full bg-white p-3 text-slate-900">
      <div className="mx-auto w-full max-w-[470px] overflow-hidden rounded-[24px] border border-[#dfecea] bg-white shadow-[0_8px_24px_rgba(2,102,94,0.08),0_20px_56px_rgba(2,102,94,0.10)]">
        <div className="border-b border-[#edf4f3] bg-white px-5 py-4">
          <div className="mb-3 text-center">
            <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.24em] text-[#86a7a4]">Certified Customer Payment Record</div>
            <div className="text-[30px] font-black tracking-[-0.03em] text-[#123a37]">Payment Receipt</div>
            <div className="mt-1 text-[12px] leading-5 text-[#6f8b88]">Official confirmation issued for your completed tour package payment.</div>
          </div>

          <div className="rounded-[18px] border border-[#e5f0ee] bg-white px-5 py-4 text-center">
            <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.22em] text-[#7ea4a0]">Amount Settled</div>
            <div className="flex items-end justify-center gap-2">
              <span className="pb-1 text-[15px] font-bold uppercase tracking-[0.12em] text-[#5f8f8a]">{amount.code}</span>
              <span className="text-[42px] font-black leading-none tracking-[-0.04em] text-[#0a6b64] tabular-nums">{amount.value}</span>
            </div>
            <div className="mt-2 inline-flex rounded-full border border-[#dcecea] bg-white px-3 py-1 text-[10px] font-semibold text-[#6b8b87] shadow-sm">
              {paidDate || "Payment date pending record"}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-[#edf4f3] bg-white px-5 py-3">
          <div className="min-w-0">
            <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[#89aaa6]">Receipt Number</div>
            <div className="font-mono text-[12px] font-bold tracking-[0.08em] text-[#173f3b]">{receiptReference}</div>
          </div>
          <div className="h-8 w-px shrink-0 bg-[#d6e8e5]" />
          <div className="min-w-0 text-right">
            <div className="mb-1 text-[9px] font-bold uppercase tracking-[0.2em] text-[#89aaa6]">Booking Code</div>
            <div className="font-mono text-[12px] font-bold tracking-[0.08em] text-[#173f3b]">{String(receipt.bookingCode || `#${receipt.bookingId}`)}</div>
          </div>
        </div>

        <div className="px-4 pb-3 pt-3">
          <div className="mb-2 grid grid-cols-2 gap-2">
            <div className="rounded-[16px] border border-[#e8f1ef] bg-white p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <div className="mb-2 text-[9px] font-black uppercase tracking-[0.22em] text-[#82a6a2]">Payment Details</div>
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] text-[#7f9d99]">Status</span>
                  <span className="text-right text-[11px] font-semibold text-[#183f3b]">{String(receipt.paymentStatus || "-")}</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] text-[#7f9d99]">Method</span>
                  <span className="text-right text-[11px] font-semibold text-[#183f3b]">{String(receipt.paymentProvider || "—")}</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] text-[#7f9d99]">Date</span>
                  <span className="text-right text-[11px] font-semibold text-[#183f3b]">{formatShortDate(receipt.paidAt)}</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] text-[#7f9d99]">Reference</span>
                  <span className="break-all text-right font-mono text-[11px] font-semibold text-[#183f3b]">{String(receipt.paymentRef || "—")}</span>
                </div>
              </div>
            </div>

            <div className="rounded-[16px] border border-[#e8f1ef] bg-white p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <div className="mb-2 text-[9px] font-black uppercase tracking-[0.22em] text-[#82a6a2]">Booking Details</div>
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] text-[#7f9d99]">Package</span>
                  <span className="text-right text-[11px] font-semibold text-[#183f3b]">{String(receipt.title || "Tour Package")}</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] text-[#7f9d99]">Code</span>
                  <span className="text-right font-mono text-[11px] font-bold text-[#0a6b64]">{String(receipt.bookingCode || "-")}</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] text-[#7f9d99]">Travelers</span>
                  <span className="text-right text-[11px] font-semibold text-[#183f3b]">{Number(receipt.travelerCount || 0)}</span>
                </div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] text-[#7f9d99]">Booking ID</span>
                  <span className="text-right text-[11px] font-semibold text-[#183f3b]">#{receipt.bookingId}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-2 grid grid-cols-2 gap-2">
            <div className="rounded-[16px] border border-[#e8f1ef] bg-white p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <div className="mb-2 text-[9px] font-black uppercase tracking-[0.22em] text-[#82a6a2]">Customer</div>
              <div className="mt-1 flex items-start gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0b6e67] text-[12px] font-black text-white shadow-sm">
                  {String(receipt.guestName || "G").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="text-[12px] font-bold text-[#123a37]">{String(receipt.guestName || "Guest")}</div>
                  <div className="mt-1 text-[9.5px] text-[#6e9792]">Registered tour package customer</div>
                </div>
              </div>
            </div>

            <div className="rounded-[16px] border border-[#e8f1ef] bg-white p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <div className="mb-2 text-[9px] font-black uppercase tracking-[0.22em] text-[#82a6a2]">Service</div>
              <div className="mt-1 flex items-start gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#0b6e67] text-[12px] font-black text-white shadow-sm">T</div>
                <div>
                  <div className="text-[12px] font-bold text-[#123a37]">{String(receipt.title || "Tour Package")}</div>
                  <div className="mt-1 text-[9.5px] leading-[1.4] text-[#6e9792]">Payment captured and recorded by NoLSAF for this tour service.</div>
                </div>
              </div>
            </div>
          </div>

          <div className="mx-1 mb-2 mt-1 overflow-hidden rounded-[18px] border border-[#e8f1ef] bg-white">
            <div className="h-[6px] bg-[radial-gradient(circle,_rgba(11,110,103,0.55)_1.6px,_transparent_1.6px)] bg-[length:14px_6px] bg-repeat-x bg-center" />
            <div className="grid grid-cols-[1fr_auto] items-center gap-3 px-4 py-3">
              <div>
                <div className="mb-1.5 flex items-center gap-2">
                  <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0b6e67]" />
                  <span className="text-[9px] font-black uppercase tracking-[0.16em] text-[#0b5752]">NoLSAF Certified Receipt</span>
                </div>
                <div className="text-[9.5px] leading-[1.6] text-[#6a918c]">This receipt confirms that payment was accepted and logged under your tour package booking record.</div>
                <div className="mt-1 text-[9px] leading-[1.5] text-[#6a918c]">Keep this document for audit, support, and verification use.</div>
                <div className="mt-1.5 text-[8px] uppercase tracking-[0.14em] text-[#9bb7b3]">Barcode verification for receipt reference</div>
              </div>
              <div className="shrink-0 text-center">
                <div className="mb-1 text-[8px] font-bold uppercase tracking-[0.14em] text-[#8aaca9]">Barcode</div>
                <div className="inline-flex flex-col items-center rounded-[12px] border border-[#d8e9e6] bg-white px-2 py-2 shadow-sm">
                  {barcodeDataUrl ? (
                    <img src={barcodeDataUrl} alt="Receipt barcode" className="block h-[40px] w-[152px] bg-white" />
                  ) : (
                    <div className="flex h-[40px] w-[152px] items-center justify-center text-[8px] text-[#9ab8b6]">Barcode unavailable</div>
                  )}
                  <div className="mt-1 break-all font-mono text-[8px] font-semibold tracking-[0.08em] text-[#6c8d89]">{barcodeValue}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="h-[6px] bg-[radial-gradient(circle,_#0b6e67_1.6px,_transparent_1.6px)] bg-[length:14px_6px] bg-repeat-x bg-center" />
      </div>
    </div>
  );
}

export default function PackageReceiptPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<TourReceipt | null>(null);
  const [barcodeDataUrl, setBarcodeDataUrl] = useState<string | null>(null);

  const backHref = useMemo(() => `/account/tour-packages/${encodeURIComponent(id)}`, [id]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const res = await api.get(`/api/customer/tour-bookings/${encodeURIComponent(id)}/receipt`);
        if (!alive) return;
        const nextReceipt = (res.data || null) as TourReceipt | null;
        setReceipt(nextReceipt);
      } catch (err: any) {
        if (!alive) return;
        setError(err?.response?.data?.message || err?.response?.data?.error || "Failed to load receipt.");
        setReceipt(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    if (!receipt) {
      setBarcodeDataUrl(null);
      return;
    }

    try {
      const svgNode = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      JsBarcode(svgNode, buildReceiptReference(receipt), {
        format: "CODE128",
        displayValue: false,
        margin: 0,
        width: 1.35,
        height: 40,
        background: "#ffffff",
        lineColor: "#123a37",
      });
      const serialized = new XMLSerializer().serializeToString(svgNode);
      const encoded = window.btoa(unescape(encodeURIComponent(serialized)));
      setBarcodeDataUrl(`data:image/svg+xml;base64,${encoded}`);
    } catch {
      setBarcodeDataUrl(null);
    }
  }, [receipt]);

  function handlePrint() {
    const popup = window.open("", "_blank", "width=760,height=980");
    if (!popup) return;

    popup.document.open();
    popup.document.write(buildReceiptPrintHtml(receipt!, barcodeDataUrl));
    popup.document.close();

    const printWhenReady = () => {
      popup.focus();
      popup.print();
    };

    if (popup.document.readyState === "complete") {
      window.setTimeout(printWhenReady, 250);
    } else {
      popup.onload = () => window.setTimeout(printWhenReady, 250);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <LogoSpinner size="md" className="mx-auto mb-3" ariaLabel="Loading receipt" />
          <div className="text-sm text-slate-600">Loading receipt...</div>
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="rounded-2xl border border-amber-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-amber-800">{error || "Receipt not available."}</div>
          <div className="mt-4">
            <Link href={backHref} className="text-teal-700 hover:text-teal-800 underline">
              Back to package
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="w-full max-w-full overflow-x-hidden py-6 min-w-0">
      <div className="space-y-4 min-w-0">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link
            href={backHref}
            className="no-underline inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-800 shadow-sm hover:bg-slate-50 hover:shadow-md transition-all"
            title="Back to package"
            aria-label="Back to package"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-xl bg-[#02665e] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#01514b] hover:shadow-md"
            title="Print receipt"
          >
            <Printer className="w-4 h-4" />
            Print Receipt
          </button>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-5">
          <div id="receipt-root" className="mx-auto max-w-[470px]" data-receipt-ready="true">
            <ReceiptSheet receipt={receipt} barcodeDataUrl={barcodeDataUrl} />
          </div>
        </div>
      </div>
    </main>
  );
}
