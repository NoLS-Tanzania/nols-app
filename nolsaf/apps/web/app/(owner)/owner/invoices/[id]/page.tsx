"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, Send, CheckCircle2, Download, Clock } from "lucide-react";

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

  if (loading) return <div>Loading...</div>;

  if (err && !inv) {
    return (
      <div className="w-full overflow-x-hidden">
        <div className="rounded-[28px] border border-slate-200/70 bg-white p-4 sm:p-6 shadow-sm ring-1 ring-black/5">
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="text-xs text-slate-500">Invoice</div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 truncate">Unable to open invoice</h1>
              </div>
              <Link
                href="/owner/revenue/requested"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 text-slate-700 shadow-sm hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 no-underline"
                title="Back"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                <span className="sr-only">Back</span>
              </Link>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
              {err}
            </div>

            <div className="text-sm text-slate-600">
              If you believe this is incorrect, confirm you are logged in as the correct Owner account.
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!inv) return <div>Loading...</div>;

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

  return (
    <div className="w-full overflow-x-hidden">
      <div className="rounded-[28px] border border-slate-200/70 bg-gradient-to-br from-white via-emerald-50/30 to-slate-50 p-4 sm:p-6 lg:p-8 shadow-sm ring-1 ring-black/5 nols-entrance">
        <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6" id="owner-invoice-pdf">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between nols-entrance nols-delay-1">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-green-600 flex items-center justify-center shadow-sm flex-shrink-0">
                <FileText className="h-5 w-5 text-white" aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-500">Invoice</div>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 truncate">
                  {inv.invoiceNumber}
                </h1>
                <div className="text-sm text-slate-600 truncate">{inv.title}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={downloadPDF}
                disabled={pdfBusy}
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 text-slate-700 shadow-sm hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                title={hasReceipt ? "Download receipt PDF" : "Download PDF"}
                aria-label={hasReceipt ? "Download receipt PDF" : "Download PDF"}
              >
                <Download className="h-4 w-4" aria-hidden />
              </button>
              <Link
                href="/owner/revenue/requested"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white/90 text-slate-700 shadow-sm hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20 no-underline"
                title="Back"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                <span className="sr-only">Back</span>
              </Link>
            </div>
          </div>

          <div className="bg-white/90 backdrop-blur border border-slate-200 rounded-3xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md nols-entrance nols-delay-2">
            <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="text-xs font-bold tracking-wide text-slate-600 uppercase">Invoice details</div>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                {inv.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 p-4 sm:p-6 border-b border-slate-200">
              <Party title="Sender (Owner)" lines={[inv.senderName, inv.senderPhone ?? "", inv.senderAddress ?? ""].filter(Boolean)} />
              <Party title="Receiver (NoLSAF)" lines={[inv.receiverName, inv.receiverPhone ?? "", inv.receiverAddress ?? ""].filter(Boolean)} />
            </div>

            <div className="p-4 sm:p-6">
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left">
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">Description</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">Qty</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-600">Unit</th>
                      <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-600 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {inv.items.map((it: any) => (
                      <tr key={it.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-semibold text-slate-900">{it.description}</td>
                        <td className="px-4 py-3 text-slate-700">x{it.quantity}</td>
                        <td className="px-4 py-3 text-slate-700">{`TZS ${it.unitPrice}`}</td>
                        <td className="px-4 py-3 text-slate-900 font-semibold text-right">{`TZS ${it.amount}`}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50/60">
                      <td className="px-4 py-3 font-semibold text-slate-700">Subtotal</td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">{`TZS ${subtotal}`}</td>
                    </tr>
                    {taxAmount > 0 && (
                      <tr className="bg-slate-50/60">
                        <td className="px-4 py-3 font-semibold text-slate-700">{`Tax (${taxPercent}%)`}</td>
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{`TZS ${taxAmount}`}</td>
                      </tr>
                    )}
                    <tr className="bg-white">
                      <td className="px-4 py-3 font-bold text-slate-900">Total</td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3 text-right font-bold text-slate-900">{`TZS ${inv.total}`}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {err && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700 nols-entrance">
              {err}
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm text-emerald-800 nols-entrance">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-700 flex-shrink-0 mt-0.5" aria-hidden />
                <div className="min-w-0">
                  <div className="font-semibold">Submission received</div>
                  <div className="mt-1 text-emerald-800/90">{successMsg}</div>
                </div>
              </div>
            </div>
          )}

          {/* Receipt + QR (for paid invoices) */}
          {hasReceipt && (
            <div className="bg-white/90 backdrop-blur border border-slate-200 rounded-3xl shadow-sm overflow-hidden nols-entrance">
              <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex items-center justify-between gap-3">
                <div className="text-xs font-bold tracking-wide text-slate-600 uppercase">Receipt</div>
                {inv.receiptNumber ? (
                  <div className="text-xs font-mono font-semibold tracking-[0.12em] tabular-nums text-slate-700 truncate">
                    {inv.receiptNumber}
                  </div>
                ) : null}
              </div>

              <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">Receipt details</div>
                  <div className="mt-2 space-y-2 text-sm text-slate-700">
                    {inv.receiptNumber && (
                      <div className="grid grid-cols-[auto,1fr] items-start gap-3">
                        <span className="text-slate-600">Receipt #</span>
                        <span className="min-w-0 text-right font-mono font-semibold tracking-[0.12em] tabular-nums text-slate-900 truncate">
                          {inv.receiptNumber}
                        </span>
                      </div>
                    )}
                    {inv.paymentRef && (
                      <div className="grid grid-cols-[auto,1fr] items-start gap-3">
                        <span className="text-slate-600">Payment Ref</span>
                        <span className="min-w-0 text-right font-mono font-semibold tabular-nums text-slate-900 break-all">
                          {inv.paymentRef}
                        </span>
                      </div>
                    )}
                    {inv.paidAt && (
                      <div className="grid grid-cols-[auto,1fr] items-start gap-3">
                        <span className="text-slate-600">Paid on</span>
                        <span className="min-w-0 text-right font-semibold">{new Date(inv.paidAt).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">Receipt QR</div>
                  <div className="mt-3 flex items-start gap-4">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/owner/revenue/invoices/${inv.id}/receipt/qr.png`}
                      alt="Receipt QR"
                      className="w-40 h-40 border border-slate-200 rounded-2xl bg-white"
                    />
                    <div className="text-xs text-slate-600">
                      Scan to verify receipt.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Process timeline */}
          <div className="rounded-3xl border border-slate-200 bg-white/90 backdrop-blur p-4 sm:p-5 shadow-sm ring-1 ring-black/5 nols-entrance">
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <Clock className="h-5 w-5 text-slate-700" aria-hidden />
              Process timeline
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3 text-sm">
              <TimelineItem label="Issued" value={inv.issuedAt ? new Date(inv.issuedAt).toLocaleString() : "—"} />
              <TimelineItem label="Verified" value={inv.verifiedAt ? new Date(inv.verifiedAt).toLocaleString() : "—"} />
              <TimelineItem label="Approved" value={inv.approvedAt ? new Date(inv.approvedAt).toLocaleString() : "—"} />
              <TimelineItem label="Paid" value={inv.paidAt ? new Date(inv.paidAt).toLocaleString() : "—"} />
            </div>
            <div className="mt-3 text-xs text-slate-600">
              Current status: <span className="font-semibold text-slate-800">{inv.status}</span>
            </div>
          </div>

          {inv.status === "DRAFT" ? (
            <div className="rounded-3xl border border-slate-200 bg-white/90 backdrop-blur p-4 sm:p-5 shadow-sm ring-1 ring-black/5 nols-entrance nols-delay-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-sm text-slate-600">
                  Send this invoice to NoLSAF for processing.
                </div>
                <button
                  type="button"
                  onClick={() => { setConsentOpen(true); setAgreeTerms(false); setAgreeDisbursement(false); }}
                  disabled={submitting}
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:shadow-emerald-500/25 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 active:scale-[0.98]"
                >
                  {submitting ? (
                    "Submitting…"
                  ) : (
                    <>
                      <Send className="h-4 w-4" aria-hidden />
                      Send to NoLSAF
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5 nols-entrance nols-delay-3">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                <CheckCircle2 className="h-5 w-5" aria-hidden />
                Invoice status: {inv.status}
              </div>
            </div>
          )}

          {/* Consent modal for submission */}
          {consentOpen ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConsentOpen(false)} />
              <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 z-10 animate-in zoom-in-95 duration-300 space-y-4 border border-slate-200">
                <div className="text-lg font-bold text-slate-900">Before you submit</div>
                <p className="text-sm text-slate-600">
                  Please confirm you agree to the Terms &amp; Conditions and the Disbursement Policy.
                </p>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-1 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500/20" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} />
                    <span className="text-sm text-slate-700">
                      I agree to the{" "}
                      <a className="text-emerald-700 font-semibold underline underline-offset-2" href={process.env.NEXT_PUBLIC_TERMS_URL ?? "#"} target="_blank" rel="noreferrer">
                        Terms &amp; Conditions
                      </a>.
                    </span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" className="mt-1 h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500/20" checked={agreeDisbursement} onChange={(e) => setAgreeDisbursement(e.target.checked)} />
                    <span className="text-sm text-slate-700">
                      I agree to the{" "}
                      <a className="text-emerald-700 font-semibold underline underline-offset-2" href={(process.env.NEXT_PUBLIC_DISBURSEMENT_POLICY_URL ?? process.env.NEXT_PUBLIC_PAYOUT_POLICY_URL ?? "#")} target="_blank" rel="noreferrer">
                        Disbursement Policy
                      </a>.
                    </span>
                  </label>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setConsentOpen(false)} className="flex-1 px-4 py-2.5 rounded-2xl border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-all active:scale-[0.98]">
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => { setConsentOpen(false); await submit(); }}
                    disabled={!(agreeTerms && agreeDisbursement) || submitting}
                    className="flex-1 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold disabled:opacity-60 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                  >
                    {submitting ? "Submitting…" : "Agree & Submit"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Party({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-2 space-y-1 text-sm text-slate-700">
        {lines.map((l, i) => (
          <div key={i} className="break-words">{l}</div>
        ))}
      </div>
    </div>
  );
}

function TimelineItem({ label, value }: { label: string; value: string }) {
  const key = label.trim().toLowerCase();
  const theme =
    key === "issued"
      ? {
          card: "border-sky-200 bg-sky-50/60 hover:bg-sky-50 hover:border-sky-300",
          label: "text-sky-700",
        }
      : key === "verified"
        ? {
            card: "border-amber-200 bg-amber-50/60 hover:bg-amber-50 hover:border-amber-300",
            label: "text-amber-700",
          }
        : key === "approved"
          ? {
              card: "border-emerald-200 bg-emerald-50/60 hover:bg-emerald-50 hover:border-emerald-300",
              label: "text-emerald-700",
            }
          : key === "paid"
            ? {
                card: "border-violet-200 bg-violet-50/60 hover:bg-violet-50 hover:border-violet-300",
                label: "text-violet-700",
              }
            : {
                card: "border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300",
                label: "text-slate-600",
              };

  return (
    <div className={`rounded-2xl border p-3 shadow-sm transition-colors duration-200 ${theme.card}`}>
      <div className={`text-xs font-bold uppercase tracking-wide ${theme.label}`}>{label}</div>
      <div className="mt-0.5 font-semibold text-slate-900">{value}</div>
    </div>
  );
}
