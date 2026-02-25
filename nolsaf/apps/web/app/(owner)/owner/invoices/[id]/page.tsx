"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, Send, CheckCircle2, Download, Clock, Loader2 } from "lucide-react";

// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

export default function InvoiceView() {
  const routeParams = useParams<{ id?: string | string[] }>();
  const idParam = Array.isArray(routeParams?.id) ? routeParams?.id?.[0] : routeParams?.id;
  const [inv, setInv] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeDisbursement, setAgreeDisbursement] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);

  useEffect(() => {
    let mounted = true;

    if (!idParam) {
      setInv(null);
      setErr("Missing invoice id.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setErr(null);
    setInv(null);

    api
      .get(`/api/owner/invoices/${idParam}`)
      .then((r) => {
        if (!mounted) return;
        setInv(r.data);
      })
      .catch((e: any) => {
        if (!mounted) return;
        const status = Number(e?.response?.status ?? 0);
        if (status === 404) {
          setErr("Invoice not found (or you don’t have access to it).");
        } else {
          setErr(String(e?.response?.data?.error || e?.message || "Failed to load invoice"));
        }
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [idParam]);

  const submit = async () => {
    if (!idParam) {
      setErr("Missing invoice id.");
      return;
    }
    setSubmitting(true);
    setErr(null);
    setSuccessMsg(null);
    try {
      const r = await api.post(`/api/owner/invoices/${idParam}/submit`);
      const alreadySubmitted = Boolean((r as any)?.data?.alreadySubmitted);
      const nextStatus = String((r as any)?.data?.status ?? "REQUESTED");
      const msg = alreadySubmitted
        ? "This invoice was already submitted. No further action is required — you can track updates in My Revenues."
        : "Invoice submitted successfully. Payout processing typically takes 30 minutes to 3 business days. You can track updates (Requested → Verified → Approved → Processing → Paid/Rejected) in My Revenues. If any additional details are needed, NoLSAF will notify you.";
      setSuccessMsg(msg);

      // Ensure UI hides the submit panel immediately after submit (no refresh needed)
      setInv((prev: any) => ({ ...(prev ?? {}), status: nextStatus }));
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || "Could not submit invoice";
      setErr(String(msg));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <div className="relative mb-6">
          <span className="absolute inset-0 rounded-full bg-slate-400/20 animate-ping" />
          <div className="relative inline-flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 shadow-lg">
            <Loader2 className="h-7 w-7 animate-spin text-white" />
          </div>
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Invoice</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-sm">Loading invoice details…</p>
      </div>
    );
  }

  if (err && !inv) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-red-50 border border-red-200 mx-auto">
          <FileText className="h-6 w-6 text-red-400" aria-hidden />
        </div>
        <h1 className="text-2xl font-black text-slate-900">Unable to open invoice</h1>
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">{err}</p>
        <p className="text-xs text-slate-500">If you believe this is incorrect, confirm you are logged in as the correct Owner account.</p>
        <Link href="/owner/revenue/requested" className="no-underline inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to Revenue
        </Link>
      </div>
    );
  }

  if (!inv) return null;

  const invNumber = String(inv?.invoiceNumber ?? "");
  const hasReceipt = Boolean(inv?.receiptNumber) || String(inv?.status ?? "").toUpperCase() === "PAID";
  const subtotal = (() => {
    const s = Number(inv?.subtotal);
    if (Number.isFinite(s) && s > 0) return s;
    const t = Number(inv?.total);
    return Number.isFinite(t) ? t : 0;
  })();
  const taxAmount = (() => {
    const t = Number(inv?.taxAmount);
    return Number.isFinite(t) ? t : 0;
  })();
  const taxPercent = (() => {
    const p = Number(inv?.taxPercent);
    return Number.isFinite(p) ? p : 0;
  })();

  const downloadInvoicePDF = async () => {
    const container = document.getElementById("owner-invoice-pdf");
    if (!container) throw new Error("Missing invoice container");

    const html2pdfModule: any = await import("html2pdf.js");
    const h2p = html2pdfModule?.default || html2pdfModule;
    if (!h2p) throw new Error("html2pdf load failed");

    const filename = `${String(invNumber || `invoice-${String(inv?.id ?? "")}`).replace(/[^a-zA-Z0-9._-]+/g, "-")}.pdf`;
    await h2p()
      .from(container)
      .set({
        filename,
        margin: 10,
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        html2canvas: { scale: Math.max(1, window.devicePixelRatio || 1) },
      })
      .save();
  };

  const downloadReceiptPDF = async () => {
    const html2pdfModule: any = await import("html2pdf.js");
    const h2p = html2pdfModule?.default || html2pdfModule;
    if (!h2p) throw new Error("html2pdf load failed");

    const receiptUrl = `${window.location.origin}/owner/revenue/receipts/${inv.id}`;
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    iframe.style.opacity = "0";
    iframe.src = receiptUrl;

    const waitForLoad = new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("Receipt preview timed out")), 20000);
      iframe.onload = () => {
        window.clearTimeout(timeout);
        resolve();
      };
      iframe.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error("Failed to load receipt preview"));
      };
    });

    document.body.appendChild(iframe);
    try {
      await waitForLoad;

      const start = Date.now();
      while (Date.now() - start < 20000) {
        const doc = iframe.contentDocument;
        const root = doc?.getElementById("receipt-root");
        if (root?.getAttribute("data-receipt-ready") === "true") break;
        await new Promise((r) => setTimeout(r, 150));
      }

      // Give images/fonts a moment to finish painting.
      await new Promise((r) => setTimeout(r, 500));

      const receiptDoc = iframe.contentDocument;
      const receiptCard = receiptDoc?.getElementById("receipt-card") || receiptDoc?.body;
      if (!receiptCard) throw new Error("Receipt content not available");

      const receiptNumber = String(inv?.receiptNumber ?? "");
      const safeBase = receiptNumber || invNumber || `receipt-${String(inv?.id ?? "")}`;
      const filename = `${safeBase.replace(/[^a-zA-Z0-9._-]+/g, "-")}.pdf`;

      await h2p()
        .from(receiptCard)
        .set({
          filename,
          margin: 0,
          image: { type: "jpeg", quality: 0.98 },
          jsPDF: { unit: "mm", format: [148, 210], orientation: "portrait" },
          html2canvas: { scale: 2, useCORS: true, backgroundColor: "#ffffff" },
          pagebreak: { mode: ["avoid-all", "css", "legacy"] },
        })
        .save();
    } finally {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }
  };

  const downloadPDF = async () => {
    if (pdfBusy) return;
    setPdfBusy(true);
    try {
      if (hasReceipt) {
        await downloadReceiptPDF();
      } else {
        await downloadInvoicePDF();
      }
    } catch (e: any) {
      console.error("PDF generation failed", e);
      window.alert("Unable to generate PDF. Please try again.");
    } finally {
      setPdfBusy(false);
    }
  };

  const statusColors: Record<string, string> = {
    PAID: "bg-emerald-50 border-emerald-200 text-emerald-700",
    REQUESTED: "bg-amber-50 border-amber-200 text-amber-700",
    REJECTED: "bg-red-50 border-red-200 text-red-700",
    DRAFT: "bg-slate-100 border-slate-200 text-slate-600",
    PENDING: "bg-blue-50 border-blue-200 text-blue-700",
    VERIFIED: "bg-sky-50 border-sky-200 text-sky-700",
    APPROVED: "bg-violet-50 border-violet-200 text-violet-700",
    PROCESSING: "bg-orange-50 border-orange-200 text-orange-700",
  };
  const statusStyle = statusColors[String(inv.status ?? "").toUpperCase()] ?? "bg-slate-50 border-slate-200 text-slate-600";

  return (
    <div className="space-y-5 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">

      {/* ── Hero ── */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-slate-200 shadow-xl shadow-slate-100/70">
        <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-gradient-to-b from-slate-800 via-slate-400 to-transparent rounded-l-2xl" />
        <div className="pointer-events-none select-none absolute right-0 bottom-0 text-[90px] font-black text-slate-100/80 leading-none tracking-tighter pr-4 pb-1" aria-hidden>INVOICE</div>
        <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 opacity-[0.035]" style={{ backgroundImage: "radial-gradient(circle, #334155 1px, transparent 1px)", backgroundSize: "18px 18px" }} />
        <div className="relative pl-8 pr-6 pt-6 pb-6 sm:pt-7 sm:pb-7 sm:pr-8 lg:pt-8 lg:pb-8 lg:pr-10 lg:pl-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-emerald-600 shadow-sm">
                <FileText className="h-5 w-5 text-white" aria-hidden />
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                Accommodation Invoice
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={downloadPDF} disabled={pdfBusy} className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.97] transition-all duration-150 shadow-sm disabled:opacity-60" aria-label={hasReceipt ? "Download receipt PDF" : "Download PDF"} title={hasReceipt ? "Download receipt PDF" : "Download PDF"}>
                <Download className="h-4 w-4" aria-hidden />
              </button>
              <Link href="/owner/revenue/requested" className="no-underline inline-flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-[0.97] transition-all duration-150 shadow-sm" aria-label="Back" title="Back">
                <ArrowLeft className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
          <div className="mt-5">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-none">{inv.invoiceNumber}</h1>
            <p className="mt-2 text-sm text-slate-500">{inv.title}</p>
          </div>
          <div className="mt-6 h-px bg-gradient-to-r from-slate-200 via-slate-100 to-transparent" />
        </div>
      </div>

      {/* ── Invoice Details (PDF target) ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden" id="owner-invoice-pdf">

        {/* Section header */}
        <div className="px-5 sm:px-6 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Invoice Details</span>
          <span className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest ${statusStyle}`}>{inv.status}</span>
        </div>

        {/* Sender / Receiver */}
        <div className="grid grid-cols-2 divide-x divide-slate-100">
          <div className="p-5 sm:p-6">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Sender (Owner)</div>
            <div className="font-black text-slate-900 text-base leading-snug">{inv.senderName}</div>
            {inv.senderPhone ? <div className="text-sm text-slate-600 mt-1">{inv.senderPhone}</div> : null}
            {inv.senderAddress ? <div className="text-sm text-slate-500 mt-0.5">{inv.senderAddress}</div> : null}
          </div>
          <div className="p-5 sm:p-6">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Receiver (NoLSAF)</div>
            <div className="font-black text-slate-900 text-base leading-snug">{inv.receiverName}</div>
            {inv.receiverPhone ? <div className="text-sm text-slate-600 mt-1">{inv.receiverPhone}</div> : null}
            {inv.receiverAddress ? <div className="text-sm text-slate-500 mt-0.5">{inv.receiverAddress}</div> : null}
          </div>
        </div>

        {/* Line items */}
        <div className="border-t border-slate-100 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Description</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Qty</th>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Unit</th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inv.items.map((it: any) => (
                <tr key={it.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5 font-semibold text-slate-900">{it.description}</td>
                  <td className="px-5 py-3.5 text-slate-600">x{it.quantity}</td>
                  <td className="px-5 py-3.5 text-slate-600">TZS {it.unitPrice}</td>
                  <td className="px-5 py-3.5 text-right font-bold text-slate-900">TZS {it.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t border-slate-100 divide-y divide-slate-100">
          <div className="px-5 sm:px-6 py-3 flex items-center justify-between gap-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Subtotal</span>
            <span className="text-sm font-semibold text-slate-700">TZS {subtotal}</span>
          </div>
          {taxAmount > 0 ? (
            <div className="px-5 sm:px-6 py-3 flex items-center justify-between gap-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tax ({taxPercent}%)</span>
              <span className="text-sm font-semibold text-slate-700">TZS {taxAmount}</span>
            </div>
          ) : null}
          <div className="px-5 sm:px-6 py-4 bg-slate-50 flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total Payout</div>
              <div className="text-xs text-slate-400 mt-0.5">Amount to be released</div>
            </div>
            <div className="text-2xl font-black text-slate-900">TZS {inv.total}</div>
          </div>
        </div>
      </div>

      {/* ── Error / Success ── */}
      {err ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{err}</div>
      ) : null}
      {successMsg ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-700 flex-shrink-0 mt-0.5" aria-hidden />
            <div>
              <div className="text-sm font-black text-emerald-900">Submission received</div>
              <div className="text-sm text-emerald-800/90 mt-1">{successMsg}</div>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Receipt (paid) ── */}
      {hasReceipt ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 sm:px-6 py-3.5 border-b border-slate-100 flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Receipt</span>
            {inv.receiptNumber ? <span className="text-xs font-mono font-bold tracking-widest text-slate-700">{inv.receiptNumber}</span> : null}
          </div>
          <div className="p-5 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="divide-y divide-slate-100">
              {inv.receiptNumber ? (
                <div className="pb-3 flex items-center justify-between gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Receipt #</span>
                  <span className="font-mono font-bold text-xs tracking-widest text-slate-900">{inv.receiptNumber}</span>
                </div>
              ) : null}
              {inv.paymentRef ? (
                <div className="py-3 flex items-center justify-between gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Payment Ref</span>
                  <span className="font-mono font-bold text-xs text-slate-900 break-all text-right max-w-[60%]">{inv.paymentRef}</span>
                </div>
              ) : null}
              {inv.paidAt ? (
                <div className="pt-3 flex items-center justify-between gap-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Paid On</span>
                  <span className="text-sm font-semibold text-slate-900">{new Date(inv.paidAt).toLocaleString()}</span>
                </div>
              ) : null}
            </div>
            <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-slate-50 border border-slate-100">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/owner/revenue/invoices/${inv.id}/receipt/qr.png`} alt="Receipt QR" className="w-36 h-36 rounded-xl border border-slate-200 bg-white" />
              <p className="text-xs text-slate-500 text-center">Scan to verify receipt</p>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Process Timeline ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 sm:px-6 py-3.5 border-b border-slate-100 flex items-center gap-2">
          <Clock className="h-4 w-4 text-slate-400" aria-hidden />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Process Timeline</span>
        </div>
        <div className="p-5 sm:p-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <TimelineItem label="Issued" value={inv.issuedAt ? new Date(inv.issuedAt).toLocaleString() : "—"} />
          <TimelineItem label="Verified" value={inv.verifiedAt ? new Date(inv.verifiedAt).toLocaleString() : "—"} />
          <TimelineItem label="Approved" value={inv.approvedAt ? new Date(inv.approvedAt).toLocaleString() : "—"} />
          <TimelineItem label="Paid" value={inv.paidAt ? new Date(inv.paidAt).toLocaleString() : "—"} />
        </div>
        <div className="px-5 sm:px-6 pb-4">
          <span className="text-xs text-slate-500">Current status: </span>
          <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${statusStyle}`}>{inv.status}</span>
        </div>
      </div>

      {/* ── Submit / Status ── */}
      {inv.status === "DRAFT" ? (
        <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800 p-5 sm:p-6">
          <div className="pointer-events-none select-none absolute right-4 bottom-0 text-[72px] font-black text-slate-800/60 leading-none tracking-tighter" aria-hidden>SUBMIT</div>
          <div className="relative">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Ready to submit?</div>
            <div className="text-sm text-slate-400 mb-4 max-w-sm">Send this invoice to NoLSAF for processing and payout. Typically takes 30 min to 3 business days.</div>
            <button
              type="button"
              onClick={() => { setConsentOpen(true); setAgreeTerms(false); setAgreeDisbursement(false); }}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" aria-hidden />
              {submitting ? "Submitting…" : "Send to NoLSAF"}
            </button>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl bg-emerald-950 border border-emerald-900 p-5">
          <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/70 mb-1">Invoice Status</div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400" aria-hidden />
            <div className="text-sm font-bold text-emerald-300">{inv.status}</div>
          </div>
        </div>
      )}

      {/* ── Consent modal ── */}
      {consentOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConsentOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 z-10 space-y-4 border border-slate-200">
            <div className="text-lg font-black text-slate-900">Before you submit</div>
            <p className="text-sm text-slate-600">Please confirm you agree to the Terms &amp; Conditions and the Disbursement Policy.</p>
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500/20" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
                <span className="text-sm text-slate-700">I agree to the{" "}<a className="text-emerald-700 font-semibold underline underline-offset-2" href={process.env.NEXT_PUBLIC_TERMS_URL ?? "#"} target="_blank" rel="noreferrer">Terms &amp; Conditions</a>.</span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" className="mt-1 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500/20" checked={agreeDisbursement} onChange={(e) => setAgreeDisbursement(e.target.checked)} />
                <span className="text-sm text-slate-700">I agree to the{" "}<a className="text-emerald-700 font-semibold underline underline-offset-2" href={(process.env.NEXT_PUBLIC_DISBURSEMENT_POLICY_URL ?? process.env.NEXT_PUBLIC_PAYOUT_POLICY_URL ?? "#")} target="_blank" rel="noreferrer">Disbursement Policy</a>.</span>
              </label>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => setConsentOpen(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold hover:bg-slate-50 transition-all active:scale-[0.98]">Cancel</button>
              <button
                type="button"
                onClick={async () => { setConsentOpen(false); await submit(); }}
                disabled={!(agreeTerms && agreeDisbursement) || submitting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {submitting ? "Submitting…" : "Agree & Submit"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}

function TimelineItem({ label, value }: { label: string; value: string }) {
  const key = label.trim().toLowerCase();
  const isDone = value !== "—";
  const accent =
    key === "issued" ? "text-sky-600" :
    key === "verified" ? "text-amber-600" :
    key === "approved" ? "text-emerald-600" :
    key === "paid" ? "text-violet-600" : "text-slate-500";

  return (
    <div className={`rounded-xl border p-3 transition-colors duration-200 ${
      isDone ? "border-slate-200 bg-white" : "border-slate-100 bg-slate-50/50"
    }`}>
      <div className={`text-[10px] font-bold uppercase tracking-widest ${
        isDone ? accent : "text-slate-400"
      }`}>{label}</div>
      <div className={`mt-1 text-xs font-semibold leading-snug ${
        isDone ? "text-slate-900" : "text-slate-400"
      }`}>{value}</div>
    </div>
  );
}
