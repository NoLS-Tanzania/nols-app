"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, Send, CheckCircle2 } from "lucide-react";

// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

export default function InvoiceView() {
  const routeParams = useParams<{ id?: string | string[] }>();
  const idParam = Array.isArray(routeParams?.id) ? routeParams?.id?.[0] : routeParams?.id;
  const [inv, setInv] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeDisbursement, setAgreeDisbursement] = useState(false);

  useEffect(() => {
    api.get(`/api/owner/invoices/${idParam}`).then(r => setInv(r.data));
  }, [idParam]);

  const submit = async () => {
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

  if (!inv) return <div>Loading...</div>;

  return (
    <div className="w-full overflow-x-hidden">
      <div className="rounded-[28px] border border-slate-200/70 bg-gradient-to-br from-white via-emerald-50/30 to-slate-50 p-4 sm:p-6 lg:p-8 shadow-sm ring-1 ring-black/5 nols-entrance">
        <div className="max-w-5xl mx-auto space-y-5 sm:space-y-6">
          <div className="flex items-start justify-between gap-4 nols-entrance nols-delay-1">
            <div className="flex items-start gap-3 min-w-0">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-green-600 flex items-center justify-center shadow-sm">
                <FileText className="h-5 w-5 text-white" aria-hidden />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-500">Invoice</div>
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 truncate">
                  {inv.invoiceNumber}
                </h1>
                <div className="text-sm text-slate-600 truncate">{inv.title}</div>
              </div>
            </div>
            <Link
              href="/owner/revenue/requested"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all active:scale-[0.98] no-underline"
              title="Back"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back
            </Link>
          </div>

          <div className="bg-white/90 backdrop-blur border border-slate-200 rounded-3xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md nols-entrance nols-delay-2">
            <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="text-xs font-bold tracking-wide text-slate-600 uppercase">Invoice details</div>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                {inv.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 sm:p-6 border-b border-slate-200">
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
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">{`TZS ${inv.subtotal}`}</td>
                    </tr>
                    {Number(inv.taxAmount) > 0 && (
                      <tr className="bg-slate-50/60">
                        <td className="px-4 py-3 font-semibold text-slate-700">{`Tax (${inv.taxPercent}%)`}</td>
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3" />
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">{`TZS ${inv.taxAmount}`}</td>
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
