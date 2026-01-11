"use client";
import React, { useEffect, useState } from "react";
// DriverPageHeader intentionally omitted here so the payouts header (icon + label)
// appears at the top of the page without the extra route-based icon.
import { Wallet, CreditCard, Eye, Download, X } from "lucide-react";
import Spinner from "@/components/Spinner";
import TableRow from "@/components/TableRow"
import { escapeAttr, escapeHtml } from "@/utils/html";

type ColDef = { key: string; label: string; sortable?: boolean; align?: "left" | "right" };

const PAYOUT_COLUMNS: ColDef[] = [
  { key: "date", label: "Date", sortable: true },
  { key: "invoice", label: "Invoice #", sortable: true },
  { key: "trip", label: "Trip Code", sortable: true },
  { key: "paidAt", label: "Paid At", sortable: true },
  { key: "paidBy", label: "Paid To", sortable: true },
  { key: "net", label: "Net Paid", sortable: true, align: "right" },
  { key: "actions", label: "Actions", sortable: false, align: "right" },
];

export default function DriverPayoutsPage() {
  const [loading, setLoading] = useState(true);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sortBy, setSortBy] = useState<string | null>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Try to detect existing payouts; if the endpoint isn't available we
    // silently fallback to showing the default message. This keeps the UI
    // consistent with other pages that use the dot-spinner pattern.
  (async () => {
      try {
        const res = await fetch("/api/driver/payouts");
        if (!mounted) return;
        if (!res.ok) {
          setPayouts([]);
          return;
        }
        const data = await res.json();
        // support either an array or an object with items
        const items = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
  setPayouts(items);
      } catch (e) {
        // network or endpoint missing: leave as null so we fall back politely
        if (!mounted) return;
  setPayouts([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // close actions menu when clicking outside or pressing Escape
  useEffect(() => {
    const onDocClick = (ev: MouseEvent) => {
      const t = ev.target as HTMLElement | null
      if (t && t.closest && t.closest('.payout-actions-popover')) return
      if (t && t.closest && t.closest('[aria-label="Payout actions"]')) return
      setOpenMenuId(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenuId(null)
    }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  // (removed sample/demo loader) payouts are loaded only from the real API

    // build a printable receipt HTML and open in a new tab for Print -> Save as PDF
    const openPrintableReceipt = (payout: any) => {
      const receiptNo = payout.receiptNumber || payout.receipt_number || payout.id || payout.invoiceNumber || payout.invoice_number || '—'
      const date = payout.paidAt || payout.date || new Date().toISOString()
      const driverName = payout.driverName || payout.driver_name || '—'
      const driverId = payout.driverId || payout.driver_id || '—'
      const gross = (payout.gross ?? payout.amount ?? payout.total ?? 0).toFixed ? (Number(payout.gross ?? payout.amount ?? payout.total ?? 0)).toFixed(2) : String(payout.gross ?? payout.amount ?? payout.total ?? '—')
      const tax = (payout.taxCommission ?? payout.tax_and_commission ?? payout.tax ?? 0).toFixed ? (Number(payout.taxCommission ?? payout.tax_and_commission ?? payout.tax ?? 0)).toFixed(2) : String(payout.taxCommission ?? payout.tax_and_commission ?? payout.tax ?? '—')
      const net = (payout.netPaid ?? payout.net ?? payout.amountNet ?? 0).toFixed ? (Number(payout.netPaid ?? payout.net ?? payout.amountNet ?? 0)).toFixed(2) : String(payout.netPaid ?? payout.net ?? payout.amountNet ?? '—')
      const invoiceId = payout.invoiceId || payout.invoice_id || ''
      const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : ''
      const qrData = encodeURIComponent(`${origin}/driver/invoices/${invoiceId}`)
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrData}`

      const safeText = (v: unknown) => escapeHtml(v)
      const safeAttr = (v: unknown) => escapeAttr(v)

      const html = `<!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Receipt ${safeText(receiptNo)}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color: #0f172a; padding: 32px; }
          .header { text-align: center; font-size: 12px; color: #0f172a; }
          .company { font-weight: 700; font-size: 14px; }
          .hr { border-top: 2px solid #e6eef6; margin: 12px 0 18px; }
          .row { display:flex; justify-content:space-between; margin:6px 0; }
          .label { font-weight:600 }
          .amounts { width:100%; border-collapse: collapse; margin-top:12px }
          .amounts td, .amounts th { padding:8px 6px; border: 1px solid #eef2f7 }
          .amounts th { background: #f8fafc; text-align:left }
          .footer { display:flex; justify-content:space-between; align-items:center; margin-top:28px; }
          .copyright { font-size:12px; color:#94a3b8 }
          .watermark { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 48px; color: rgba(15,23,42,0.06); pointer-events:none; white-space:nowrap }
          @media print { .watermark { opacity: 0.06 } }
        </style>
      </head>
      <body>
        <div class="watermark">NoLSAF Inc Limited</div>
        <div class="header">
          <div class="company">NoLSAF Inc Limited</div>
          <div>PSSSF Tower Floor 23 | info@nolsapp.com | +255736766726</div>
        </div>
        <div class="hr"></div>

        <div class="row"><div class="label">Receipt No: ${safeText(receiptNo)}</div><div>${safeText(new Date(date).toLocaleDateString())}</div></div>
        <div class="row" style="margin-top:8px"><div>Driver: ${safeText(driverName)} (ID: ${safeText(driverId)})</div></div>

        <table class="amounts">
          <thead>
            <tr>
              <th>Gross</th>
              <th>Tax &amp; Commission</th>
              <th>Net Paid</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${safeText(gross)}</td>
              <td>${safeText(tax)}</td>
              <td>${safeText(net)}</td>
            </tr>
          </tbody>
        </table>

        <div class="footer">
          <div><img src="${safeAttr(qrUrl)}" alt="qr"/></div>
          <div class="copyright">2025 NoLSAF All Rights Reserved</div>
        </div>
      </body>
      </html>`

      try {
        const w = window.open('', '_blank')
        if (!w) {
          window.alert('Unable to open receipt window. Please allow popups for this site.')
          return
        }
        w.document.open()
        w.document.write(html)
        w.document.close()
        w.focus()
      } catch (e) {
        try { window.open(`data:text/html,${encodeURIComponent(html)}`) } catch { window.alert('Unable to open receipt') }
      }
    }

    // generate a PDF from the receipt HTML and trigger download (one-click)
    const generatePdfReceipt = async (payout: any) => {
      try {
        const receiptNo = payout.receiptNumber || payout.receipt_number || payout.id || payout.invoiceNumber || payout.invoice_number || 'receipt'
        const suggested = payout.receiptFilename || payout.receipt_filename || `${receiptNo}.pdf`
        // build same HTML but we will embed the QR image as data URI to avoid CORS canvas tainting
        const invoiceId = payout.invoiceId || payout.invoice_id || ''
        const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : ''
        const qrData = encodeURIComponent(`${origin}/driver/invoices/${invoiceId}`)
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrData}`

        const safeText = (v: unknown) => escapeHtml(v)
        const safeAttr = (v: unknown) => escapeAttr(v)

        // fetch QR image and convert to data URL
        let qrDataUrl = qrUrl
        try {
          const resp = await fetch(qrUrl)
          const blob = await resp.blob()
          const reader = new FileReader()
          qrDataUrl = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
              resolve(String(reader.result))
            }
            reader.onerror = reject
            reader.readAsDataURL(blob)
          })
        } catch (e) {
          // fallback to remote URL (may cause canvas tainting in html2canvas)
          qrDataUrl = qrUrl
        }

        const receiptHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color:#0f172a; padding:12mm; box-sizing:border-box; width:148mm; min-height:210mm; position:relative; font-size:12px;">
            <div style="text-align:center; font-size:12px;">
              <div style="font-weight:700; font-size:16px">NoLSAF Inc Limited</div>
              <div style="font-size:11px;">PSSSF Tower Floor 23 | info@nolsapp.com | +255736766726</div>
            </div>
            <div style="border-top:1.5px solid #e6eef6; margin:10px 0 14px"></div>

            <div style="display:flex; justify-content:space-between; margin-bottom:8px"><div style="font-weight:600; font-size:12px">Receipt No: ${safeText(receiptNo)}</div><div style="font-size:12px">${safeText(new Date(payout.paidAt || payout.date || Date.now()).toLocaleDateString())}</div></div>
            <div style="margin-bottom:10px; font-size:12px">Driver: ${safeText(payout.driverName || payout.driver_name || '—')} (ID: ${safeText(payout.driverId || payout.driver_id || '—')})</div>

            <table style="width:100%; border-collapse:collapse; margin-top:8px">
              <thead>
                <tr>
                  <th style="text-align:left; padding:8px; border:1px solid #eef2f7; background:#f8fafc; font-size:12px">Gross</th>
                  <th style="text-align:left; padding:8px; border:1px solid #eef2f7; background:#f8fafc; font-size:12px">Tax &amp; Commission</th>
                  <th style="text-align:left; padding:8px; border:1px solid #eef2f7; background:#f8fafc; font-size:12px">Net Paid</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding:8px; border:1px solid #eef2f7; font-size:12px">${safeText((payout.gross ?? payout.amount ?? 0).toFixed ? Number(payout.gross ?? payout.amount ?? 0).toFixed(2) : payout.gross ?? payout.amount ?? 0)}</td>
                  <td style="padding:8px; border:1px solid #eef2f7; font-size:12px">${safeText((payout.taxCommission ?? payout.tax_and_commission ?? 0).toFixed ? Number(payout.taxCommission ?? payout.tax_and_commission ?? 0).toFixed(2) : payout.taxCommission ?? payout.tax_and_commission ?? 0)}</td>
                  <td style="padding:8px; border:1px solid #eef2f7; font-size:12px">${safeText((payout.netPaid ?? payout.net ?? 0).toFixed ? Number(payout.netPaid ?? payout.net ?? 0).toFixed(2) : payout.netPaid ?? payout.net ?? 0)}</td>
                </tr>
              </tbody>
            </table>

            <div style="position:absolute; left:0; right:0; bottom:12mm; display:flex; justify-content:center; align-items:center; gap:8px;">
              <div><img src="${safeAttr(qrDataUrl)}" alt="qr" style="width:36px; height:36px;"/></div>
              <div style="text-align:center; color:#94a3b8; font-size:10px">2025 NoLSAF All Rights Reserved</div>
            </div>

            <div style="position:absolute; left:50%; top:50%; transform:translate(-50%,-50%) rotate(-45deg); font-size:26px; color:rgba(15,23,42,0.06); pointer-events:none">NoLSAF Inc Limited</div>
          </div>`

      // create container and append (use mm width to match A5)
      const container = document.createElement('div')
      container.style.width = '148mm'
      container.style.padding = '12mm'
      container.innerHTML = receiptHtml
      document.body.appendChild(container)

      // auto scale-to-fit: measure container height and compute scale against printable A5 height
      try {
        const mmToPx = (mm: number) => mm * (96 / 25.4)
        const pageHeightMm = 210
        const marginMm = 10
        const availablePx = mmToPx(pageHeightMm - 2 * marginMm)
        // measure unscaled height
        const unscaledHeight = container.getBoundingClientRect().height
        const rawScale = unscaledHeight > 0 ? Math.min(1, availablePx / unscaledHeight) : 1
        const scale = Math.max(0.75, rawScale) // don't scale below 0.75 to preserve readability

        if (rawScale < 0.75) {
          // would be too small to read; fallback to printable HTML
          container.remove()
          try { openPrintableReceipt(payout); return } catch { /* ignore */ }
        }

        // apply scale transform
        container.style.transformOrigin = 'top left'
        container.style.transform = `scale(${scale})`
      } catch (e) {
        // ignore scaling errors and continue
        console.warn('scaling failed', e)
      }

      // dynamic import html2pdf
      const html2pdfModule = await import('html2pdf.js')
      const h2p = (html2pdfModule && (html2pdfModule.default || html2pdfModule))
      if (!h2p) throw new Error('html2pdf load failed')

      await h2p().from(container).set({ filename: suggested, margin: 10, jsPDF: { unit: 'mm', format: 'a5', orientation: 'portrait' }, html2canvas: { scale: Math.max(1, window.devicePixelRatio || 1) } }).save()
      container.remove()
      } catch (err) {
        console.error('PDF generation failed', err)
        // fallback to printable HTML
        try { openPrintableReceipt(payout) } catch { window.alert('Unable to generate receipt PDF') }
      }
    }
  return (
    <div className="w-full max-w-full space-y-6 overflow-x-hidden">
      <section className="w-full max-w-full bg-white rounded-lg p-6 border-2 border-slate-200 shadow-sm overflow-x-hidden">
        <div className="flex flex-col items-center mb-6">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-50 text-emerald-600">
            <Wallet className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-gray-900">Payouts</h1>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center space-x-3 text-gray-600 mb-4">
              <Spinner size="sm" className="mx-auto" ariaLabel="Checking for payouts" />
              <span>Loading payouts…</span>
            </div>
          ) : (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium text-slate-700">Showing {payouts.length} payouts</div>
                <div className="flex items-center gap-2">
                  <label htmlFor="payout-page-size" className="text-sm text-slate-600">Rows:</label>
                  <select id="payout-page-size" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="text-sm border-2 border-slate-200 rounded-md px-3 py-1.5 bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
                    {[5,10,25,50].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* sorting and pagination logic */}
              {/** compute sorted and paginated rows */}
              {
                (() => {
                  const getVal = (p: any, key: string) => {
                    switch (key) {
                      case 'date': return new Date(p.date || p.createdAt || p.paidAt || 0).getTime() || 0;
                      case 'invoice': return String(p.invoiceNumber || p.invoiceId || p.invoice || '');
                      case 'trip': return String(p.tripCode || p.trip || p.reference || '');
                      case 'paidAt': return new Date(p.paidAt || p.settledAt || p.createdAt || 0).getTime() || 0;
                      case 'paidBy': return String(p.paidBy || p.method || p.source || '');
                      case 'net': return Number(p.netPaid ?? p.amount ?? p.net ?? 0) || 0;
                      default: return '';
                    }
                  };

                  const sorted = [...payouts].sort((a,b) => {
                    if (!sortBy) return 0;
                    const A = getVal(a, sortBy);
                    const B = getVal(b, sortBy);
                    if (typeof A === 'number' && typeof B === 'number') return sortDir === 'asc' ? A - B : B - A;
                    return sortDir === 'asc' ? String(A).localeCompare(String(B)) : String(B).localeCompare(String(A));
                  });

                  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
                  const current = Math.min(page, totalPages);
                  const start = (current - 1) * pageSize;
                  const pageRows = sorted.slice(start, start + pageSize);

                  const fmt = (iso: any) => {
                    if (!iso) return "-";
                    try { const d = new Date(iso); if (Number.isNaN(d.getTime())) return String(iso); return d.toLocaleDateString(); } catch { return String(iso); }
                  };

                  const timeFmt = (iso: any) => {
                    if (!iso) return "-";
                    try {
                      const d = new Date(iso);
                      if (Number.isNaN(d.getTime())) return String(iso);
                      // show 24-hour time with seconds
                      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
                    } catch {
                      return String(iso);
                    }
                  };

                  // render the "Paid To" cell: prefer explicit phone/payment number or bank account
                  const maskNumber = (s: string | number | null | undefined) => {
                    // show as 4 stars + last 3 digits when available (e.g. ****123)
                    const str = s == null ? "" : String(s).trim();
                    if (!str) return `****`;
                    if (str.length <= 3) return str;
                    const last3 = str.slice(-3);
                    return `****${last3}`;
                  };

                  const renderPaidTo = (p: any) => {
                    // possible fields: payout.paymentNumber, payout.phone, payout.paidTo, payout.accountNumber, payout.bankAccount, payout.bankName
                    const phone = p.paymentNumber || p.phone || p.mobile || p.lipaNumber || p.payment_phone || null;
                    const bankAcct = p.accountNumber || p.bankAccount || p.account || p.bank_account || null;
                    const manual = p.paidTo || p.paid_by || p.paidToName || null;

                    if (phone) {
                      return (
                        <div className="flex items-center justify-end">
                          <CreditCard className="h-4 w-4 text-slate-700 mr-2" />
                          <span className="text-sm">{maskNumber(phone)}</span>
                        </div>
                      );
                    }

                    if (bankAcct) {
                      return (
                        <div className="flex items-center justify-end">
                          <CreditCard className="h-4 w-4 text-slate-700 mr-2" />
                          <span className="text-sm">{maskNumber(bankAcct)}</span>
                        </div>
                      );
                    }

                    if (manual) return <div className="text-sm text-right">{String(manual)}</div>;

                    // If the recorded method says 'stripe', show credit card icon + masked last-4 (if available)
                    const method = String(p.paidBy || p.method || p.source || p.paymentMethod || p.payment_type || '').toLowerCase();
                    if (method.includes('stripe')) {
                      const last4 = p.cardLast4 || p.last4 || p.stripe_last4 || p.payment_last4 || p.paymentLast4 || p.paymentNumber || null;
                      return (
                        <div className="flex items-center justify-end">
                          <CreditCard className="h-4 w-4 text-slate-700 mr-2" />
                          <span className="text-sm">{maskNumber(last4)}</span>
                        </div>
                      );
                    }

                    // If the recorded method says 'bank' or 'transfer', show credit card icon + masked bank account (or dash)
                    if (method.includes('bank') || method.includes('transfer')) {
                      const bankFallback = bankAcct || p.accountName || p.bank || null;
                      return (
                        <div className="flex items-center justify-end">
                          <CreditCard className="h-4 w-4 text-slate-700 mr-2" />
                          <span className="text-sm">{maskNumber(bankFallback)}</span>
                        </div>
                      );
                    }

                    // If the recorded method says 'cash' (we don't show raw 'Cash'), fall back to credit-card view using phone if available
                    if (method.includes('cash')) {
                      const phoneFallback = p.paymentNumber || p.phone || p.mobile || p.lipaNumber || null;
                      return (
                        <div className="flex items-center justify-end">
                          <CreditCard className="h-4 w-4 text-slate-700 mr-2" />
                          <span className="text-sm">{maskNumber(phoneFallback)}</span>
                        </div>
                      );
                    }

                    // default: show method text (if meaningful) right-aligned
                    return <div className="text-sm text-right">{String(p.paidBy || p.method || p.source || '-')}</div>;
                  };

                  // row-level hover shadow is used instead of per-cell hover styles

                  return (
                    <>
                      <div className="overflow-x-auto rounded-lg border border-slate-200 max-w-full">
                        <table className="w-full divide-y divide-slate-200 table-auto">
                          <thead>
                            <tr className="bg-slate-50">
                              {PAYOUT_COLUMNS.map(col => (
                                <th key={col.key} className={`px-6 py-3 text-${col.align === 'right' ? 'right' : 'left'} text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200 ${col.sortable === false ? '' : 'cursor-pointer select-none hover:bg-slate-100'}`}
                                  onClick={() => {
                                    if (col.sortable === false) return;
                                    if (sortBy === col.key) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
                                    else { setSortBy(col.key); setSortDir('asc'); }
                                    setPage(1);
                                  }}
                                >
                                  <div className="flex items-center gap-2">
                                    <span>{col.label}</span>
                                    {col.sortable !== false && sortBy === col.key ? (
                                      <span className="text-xs font-bold">{sortDir === 'asc' ? '▲' : '▼'}</span>
                                    ) : null}
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-slate-100">
                            {pageRows.length === 0 ? (
                              <tr className="bg-white">
                                <td colSpan={PAYOUT_COLUMNS.length} className="px-6 py-12 text-center">
                                  <div className="flex flex-col items-center">
                                    <Wallet className="h-12 w-12 text-slate-300 mb-3" />
                                    <div className="text-sm font-medium text-slate-600 mb-1">No payouts yet</div>
                                    <div className="text-xs text-slate-500">Check back later</div>
                                  </div>
                                </td>
                              </tr>
                            ) : pageRows.map((payout, idx) => {
                            const date = payout.date || payout.createdAt || payout.paidAt || "";
                            const invoice = payout.invoiceNumber || payout.invoiceId || payout.invoice || "-";
                            const trip = payout.tripCode || payout.trip || payout.reference || "-";
                            const paidAt = payout.paidAt || payout.settledAt || date || "-";
                            const net = payout.netPaid ?? payout.amount ?? payout.net ?? "-";
                            const invoiceHref = payout.invoiceId ? `/driver/invoices/${payout.invoiceId}` : `#`;

                            return (
                              <TableRow key={payout.id || invoice || `payout-${idx}`} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-slate-900 whitespace-nowrap">{fmt(date)}</td>
                                <td className="px-6 py-4 text-sm text-slate-700 font-medium">{invoice}</td>
                                <td className="px-6 py-4 text-sm text-slate-700 font-mono font-medium">{trip}</td>
                                <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">{timeFmt(paidAt)}</td>
                                <td className="px-6 py-4 text-sm text-slate-700">{renderPaidTo(payout)}</td>
                                <td className="px-6 py-4 text-sm font-semibold text-slate-900 text-right whitespace-nowrap">{typeof net === "number" ? net.toFixed(2) : net}</td>
                                <td className="px-6 py-4 text-sm text-right relative whitespace-nowrap">
                                  <div className="flex items-center justify-end">
                                      {(() => {
                                      const idKey = String(payout.id || invoice || `payout-${idx}`)
                                      const receiptUrl = payout.receiptUrl || payout.receipt_url || payout.receipt || payout.receiptPdf || payout.receipt_pdf || null
                                      return (
                                        <div className="relative inline-block text-left">
                                          <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === idKey ? null : idKey) }}
                                            aria-haspopup="true"
                                            aria-label="Payout actions"
                                            className="p-1.5 rounded-md hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-200 transition-colors"
                                            title="Actions"
                                          >
                                            <Eye className="h-5 w-5 text-sky-600 cursor-pointer" aria-hidden />
                                          </button>

                                          {openMenuId === idKey && (
                                            <div className="absolute right-0 mt-2 w-44 bg-white border-2 border-slate-200 rounded-lg shadow-lg z-10 payout-actions-popover">
                                              <div className="py-1">
                                                <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); if (payout.invoiceId) { window.location.href = `/driver/invoices/${payout.invoiceId}` } else { window.location.href = invoiceHref } }} className="w-full text-left px-4 py-2 text-sm text-sky-600 hover:bg-slate-50 flex items-center space-x-2 transition-colors">
                                                  <Eye className="h-4 w-4" />
                                                  <span>View invoice</span>
                                                </button>

                                                {receiptUrl ? (
                                                  <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); generatePdfReceipt(payout) }} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center space-x-2 transition-colors">
                                                    <Download className="h-4 w-4" />
                                                    <span>Download PDF</span>
                                                  </button>
                                                ) : (
                                                  <div className="w-full text-left px-4 py-2 text-sm text-slate-400 flex items-center space-x-2">
                                                    <X className="h-4 w-4 text-slate-400" />
                                                    <span>Receipt not available</span>
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      )
                                    })()}
                                  </div>
                                </td>
                              </TableRow>
                            );
                          })}
                        </tbody>
                      </table>
                      </div>

                      {/* pagination controls */}
                      <div className="mt-4 flex items-center justify-between pt-4 border-t border-slate-200">
                        <div className="text-sm font-medium text-slate-700">Page {current} of {totalPages}</div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={current===1} className="px-4 py-2 text-sm font-medium rounded-md border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Prev</button>
                          <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={current===totalPages} className="px-4 py-2 text-sm font-medium rounded-md border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">Next</button>
                        </div>
                      </div>
                    </>
                  );
                })()
              }
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
