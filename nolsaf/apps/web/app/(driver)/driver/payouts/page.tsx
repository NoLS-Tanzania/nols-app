"use client";
import React, { useEffect, useState } from "react";
// DriverPageHeader intentionally omitted here so the payouts header (icon + label)
// appears at the top of the page without the extra route-based icon.
import { Wallet, CreditCard, Eye, Download, X, RefreshCcw, Clock, AlertTriangle, TrendingUp } from "lucide-react";
import TableRow from "@/components/TableRow"

function RevenueVisualization({ amounts }: { amounts: number[] }) {
  const raw = amounts.length >= 4 ? amounts.slice(-18) : [40, 65, 50, 80, 55, 90, 70, 60, 85, 75, 95, 65, 78, 88, 60, 72, 55, 82]
  const max = Math.max(...raw, 1)
  const W = 480; const H = 110; const count = raw.length; const slot = W / count; const barW = Math.max(8, slot - 6)
  const pts = raw.map((v, i) => [i * slot + slot / 2, H - Math.max(8, (v / max) * (H - 16)) - 4] as [number, number])
  let linePath = ""
  if (pts.length >= 2) {
    linePath = `M ${pts[0][0]} ${pts[0][1]}`
    for (let i = 1; i < pts.length; i++) { const cpx = (pts[i-1][0]+pts[i][0])/2; linePath += ` C ${cpx} ${pts[i-1][1]} ${cpx} ${pts[i][1]} ${pts[i][0]} ${pts[i][1]}` }
  }
  const areaPath = linePath + ` L ${pts[pts.length-1][0]} ${H} L ${pts[0][0]} ${H} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMax slice" className="absolute inset-0 w-full h-full" aria-hidden>
      <defs><linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="white" stopOpacity="0.25" /><stop offset="100%" stopColor="white" stopOpacity="0.03" /></linearGradient></defs>
      {raw.map((v,i) => { const h=Math.max(8,(v/max)*(H-16)); return <rect key={i} x={i*slot+(slot-barW)/2} y={H-h} width={barW} height={h} rx={4} fill="white" fillOpacity={0.08} /> })}
      {pts.length>=2 && <path d={areaPath} fill="url(#pvGrad)" />}
      {pts.length>=2 && <path d={linePath} fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.45" strokeLinecap="round" strokeLinejoin="round" />}
      {pts.map(([x,y],i) => <circle key={i} cx={x} cy={y} r={3} fill="white" fillOpacity="0.5" />)}
    </svg>
  )
}
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
  const [refreshTick, setRefreshTick] = useState(0);
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
  }, [refreshTick]);

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
          <div>PSSSF Tower Floor 23 | info@nolsaf.com | +255736766726</div>
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
              <div style="font-size:11px;">PSSSF Tower Floor 23 | info@nolsaf.com | +255736766726</div>
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
  const payoutAmounts = payouts.map((p: any) => Number(p.netPaid ?? p.amount ?? p.net ?? 0)).filter((n: number) => n > 0)
  const totalPaidOut = payouts.reduce((s: number, p: any) => s + (Number(p.netPaid ?? p.amount ?? p.net ?? 0) || 0), 0)
  const avgPayout = payouts.length > 0 ? totalPaidOut / payouts.length : 0
  const fmtTZS = (n: number) => new Intl.NumberFormat(undefined, { style: "currency", currency: "TZS", maximumFractionDigits: 0 }).format(n)
  const thisMonthSum = (() => { const now = new Date(); const m = now.getMonth(); const y = now.getFullYear(); return payouts.filter((p: any) => { const d = new Date(p.paidAt || p.date || 0); return d.getMonth()===m && d.getFullYear()===y }).reduce((s: number, p: any) => s + (Number(p.netPaid ?? p.amount ?? p.net ?? 0) || 0), 0) })()
  const lastPayoutAmt = payouts.length > 0 ? Number(payouts[0]?.netPaid ?? payouts[0]?.amount ?? payouts[0]?.net ?? 0) || 0 : null
  const lastPayoutDate = payouts.length > 0 ? new Date(payouts[0]?.paidAt || payouts[0]?.date || 0).toLocaleDateString() : null

  return (
    <div className="w-full max-w-full space-y-5 pb-8">

      {/* Hero header with revenue visualization */}
      <div className="relative rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, #02665e 0%, #014e47 55%, #013d38 100%)", minHeight: 210 }}>
        <RevenueVisualization amounts={payoutAmounts} />
        <div className="relative z-10 px-5 pt-6 pb-5">
          <div className="flex items-start gap-3 mb-5">
            <div className="h-11 w-11 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0 backdrop-blur-sm border border-white/20">
              <Wallet className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white tracking-tight">Payouts</h1>
              <p className="text-white/55 text-sm">Your payment history &amp; earnings</p>
            </div>
            <button onClick={() => setRefreshTick(t => t + 1)} disabled={loading} className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-colors flex-shrink-0" title="Refresh">
              <RefreshCcw className={`h-4 w-4 text-white ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/15">
              <p className="text-white/55 text-xs font-medium mb-1">Total Paid Out</p>
              <p className="text-white font-bold text-base leading-tight">{fmtTZS(totalPaidOut)}</p>
              <p className="text-white/45 text-xs mt-0.5">{payouts.length} payout{payouts.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/15">
              <p className="text-white/55 text-xs font-medium mb-1 flex items-center gap-1"><TrendingUp className="h-3 w-3" /> This Month</p>
              <p className="text-emerald-300 font-bold text-base leading-tight">{fmtTZS(thisMonthSum)}</p>
              <p className="text-white/45 text-xs mt-0.5">current month</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/15">
              <p className="text-white/55 text-xs font-medium mb-1 flex items-center gap-1"><Clock className="h-3 w-3" /> Avg Payout</p>
              <p className="text-amber-300 font-bold text-base leading-tight">{fmtTZS(avgPayout)}</p>
              <p className="text-white/45 text-xs mt-0.5">per payout</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/15">
              <p className="text-white/55 text-xs font-medium mb-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Last Payout</p>
              <p className="text-rose-300 font-bold text-base leading-tight">{lastPayoutAmt !== null ? fmtTZS(lastPayoutAmt) : "—"}</p>
              <p className="text-white/45 text-xs mt-0.5">{lastPayoutDate ?? "no data"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Payouts table card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-50 flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-[#02665e]/10 text-[#02665e] flex items-center justify-center flex-shrink-0">
            <Wallet className="h-4 w-4" />
          </div>
          <span className="font-semibold text-slate-800">Payout Records</span>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-500">Rows:</span>
            <select id="payout-page-size" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-[#02665e]/30">
              {[5,10,25,50].map(n => (<option key={n} value={n}>{n}</option>))}
            </select>
          </div>
          {loading && (
            <span aria-hidden className="dot-spinner dot-sm" aria-live="polite">
              <span className="dot dot-blue" /><span className="dot dot-black" /><span className="dot dot-yellow" /><span className="dot dot-green" />
            </span>
          )}
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-slate-500">
            <span aria-hidden className="dot-spinner dot-sm" aria-live="polite">
              <span className="dot dot-blue" /><span className="dot dot-black" /><span className="dot dot-yellow" /><span className="dot dot-green" />
            </span>
            <span className="text-sm">Loading payouts…</span>
          </div>
        ) : (
          <div>
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
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] table-auto">
                          <thead>
                            <tr className="bg-[#02665e]/5 border-b border-[#02665e]/10">
                              {PAYOUT_COLUMNS.map(col => (
                                <th key={col.key} className={`px-5 py-3 whitespace-nowrap text-${col.align === 'right' ? 'right' : 'left'} text-xs font-semibold text-[#02665e] uppercase tracking-wider ${col.sortable === false ? '' : 'cursor-pointer select-none hover:bg-[#02665e]/10'}`}
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
                          <tbody className="divide-y divide-slate-100">
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
                              <TableRow key={payout.id || invoice || `payout-${idx}`}>
                                <td className="px-5 py-3.5 text-sm text-slate-700 whitespace-nowrap">{fmt(date)}</td>
                                <td className="px-5 py-3.5 text-sm font-medium text-slate-800">{invoice}</td>
                                <td className="px-5 py-3.5 text-xs font-mono text-slate-600 whitespace-nowrap">{trip}</td>
                                <td className="px-5 py-3.5 text-sm text-slate-700 whitespace-nowrap">{timeFmt(paidAt)}</td>
                                <td className="px-5 py-3.5 text-sm text-slate-700">{renderPaidTo(payout)}</td>
                                <td className="px-5 py-3.5 text-sm font-semibold text-slate-900 text-right whitespace-nowrap">{typeof net === "number" ? net.toFixed(2) : net}</td>
                                <td className="px-5 py-3.5 text-sm text-right relative whitespace-nowrap">
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
                                            className="p-1.5 rounded-lg hover:bg-[#02665e]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/30 transition-colors"
                                            title="Actions"
                                          >
                                            <Eye className="h-5 w-5 text-[#02665e] cursor-pointer" aria-hidden />
                                          </button>

                                          {openMenuId === idKey && (
                                            <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-xl shadow-lg z-10 payout-actions-popover">
                                              <div className="py-1">
                                                <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); if (payout.invoiceId) { window.location.href = `/driver/invoices/${payout.invoiceId}` } else { window.location.href = invoiceHref } }} className="w-full text-left px-4 py-2 text-sm text-[#02665e] hover:bg-slate-50 flex items-center gap-2 transition-colors">
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
                      <div className="px-5 py-4 flex items-center justify-between border-t border-slate-50">
                        <div className="text-xs text-slate-500">Page {current} of {totalPages}</div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={current===1} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Prev</button>
                          <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={current===totalPages} className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Next</button>
                        </div>
                      </div>
                    </>
                  );
              })()
            }
          </div>
        )}
      </div>
    </div>
  );
}
