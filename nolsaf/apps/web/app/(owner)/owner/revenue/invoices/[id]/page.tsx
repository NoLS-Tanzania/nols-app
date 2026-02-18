"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";

// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

export default function OwnerRevenueInvoiceView() {
  const routeParams = useParams<{ id?: string | string[] }>();
  const idParam = Array.isArray(routeParams?.id) ? routeParams?.id?.[0] : routeParams?.id;

  const [loading, setLoading] = useState(true);
  const [inv, setInv] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

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
      .get(`/api/owner/revenue/invoices/${idParam}`)
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
                href="/owner/revenue"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all active:scale-[0.98] no-underline"
                title="Back"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Back
              </Link>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">{err}</div>
          </div>
        </div>
      </div>
    );
  }

  const invoiceNumber = String(inv?.invoiceNumber ?? "—");
  const status = String(inv?.status ?? "—");
  const issuedAt = inv?.issuedAt ? new Date(inv.issuedAt).toLocaleString() : "—";
  const paidAt = inv?.paidAt ? new Date(inv.paidAt).toLocaleString() : null;
  const propertyTitle = inv?.booking?.property?.title ?? "Property";
  const guestName = inv?.booking?.user?.fullName ?? inv?.booking?.user?.name ?? "—";
  const phone = inv?.booking?.user?.phone ?? "—";
  const codeVisible = inv?.booking?.code?.codeVisible ?? inv?.booking?.code?.code ?? "—";
  const total = inv?.total ?? 0;

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
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 truncate">{invoiceNumber}</h1>
                <div className="text-sm text-slate-600 truncate">{propertyTitle}</div>
              </div>
            </div>
            <Link
              href="/owner/revenue"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all active:scale-[0.98] no-underline"
              title="Back"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back
            </Link>
          </div>

          <div className="bg-white/90 backdrop-blur border border-slate-200 rounded-3xl shadow-sm overflow-hidden nols-entrance nols-delay-2">
            <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-slate-50 to-white border-b border-slate-200 flex items-center justify-between gap-3">
              <div className="text-xs font-bold tracking-wide text-slate-600 uppercase">Summary</div>
              <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">{status}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 sm:p-6">
              <Card title="Booking">
                <Row label="Issued" value={issuedAt} />
                {paidAt ? <Row label="Paid" value={paidAt} /> : null}
                <Row label="NoLSAF Code" value={codeVisible} />
              </Card>
              <Card title="Guest">
                <Row label="Name" value={guestName} />
                <Row label="Phone" value={phone} />
              </Card>
            </div>

            <div className="border-t border-slate-200 p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">Owner payout</div>
                <div className="text-lg font-bold text-emerald-700">TZS {String(total)}</div>
              </div>
            </div>
          </div>

          {status === "PAID" ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5 nols-entrance nols-delay-3">
              <div className="text-sm text-emerald-800 font-semibold">This invoice is PAID. You can open the receipt from the Paid list.</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="text-sm text-slate-800 text-right break-words">{value}</div>
    </div>
  );
}
