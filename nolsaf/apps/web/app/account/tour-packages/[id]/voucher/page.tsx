"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import apiClient from "@/lib/apiClient";
import JsBarcode from "jsbarcode";

const api = apiClient;

export default function PackageVoucherPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id || "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [voucher, setVoucher] = useState<any>(null);
  const barcodeRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get(`/api/customer/tour-bookings/${encodeURIComponent(id)}/voucher`);
        if (!alive) return;
        setVoucher(res.data || null);
      } catch (err: any) {
        if (!alive) return;
        setError(err?.response?.data?.error || "Failed to load voucher.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id]);
  const voucherIdentity = voucher?.voucherIdentity && typeof voucher.voucherIdentity === "object" ? voucher.voucherIdentity : {};
  const voucherNumber = String(voucherIdentity?.voucherNumber || "NLSAF-TVR-UNDEFINED");
  const securityMark = String(voucherIdentity?.securityMark || "★NLSAF★");
  const machineLine = String(voucherIdentity?.machineLine || "NLSAF|TVR|UNDEFINED");
  const issuedAt = voucherIdentity?.issuedAt ? new Date(voucherIdentity.issuedAt).toLocaleString() : new Date().toLocaleString();

  useEffect(() => {
    if (!barcodeRef.current) return;
    try {
      JsBarcode(barcodeRef.current, voucherNumber, {
        format: "CODE128",
        displayValue: false,
        margin: 0,
        width: 1.8,
        height: 68,
        background: "#ffffff",
        lineColor: "#0f172a",
      });
    } catch {
      // Ignore render failures and keep fallback text visible.
    }
  }, [voucherNumber]);

  return (
    <main className="w-full max-w-full overflow-x-hidden py-2 space-y-4 min-w-0">
      <div className="relative rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
        <Link
          href={`/account/tour-packages/${encodeURIComponent(id)}`}
          aria-label="Back to package"
          className="absolute left-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-900"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
            <path d="M12.5 4.5L7 10l5.5 5.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
        <div className="mx-auto max-w-3xl px-10 sm:px-12 text-center">
          <h1 className="text-3xl font-bold text-slate-900">Official Tour Package Voucher</h1>
          <div className="mt-1 text-base leading-relaxed text-slate-600">Present this voucher to your tour operator, activity desk, or permit checkpoint for quick package verification.</div>
        </div>
      </div>

      {loading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5 shadow-sm animate-pulse" aria-hidden="true">
          <div className="rounded-xl border border-slate-300 bg-slate-100 p-4">
            <div className="h-4 w-40 rounded bg-slate-200" />
            <div className="mt-2 h-6 w-4/5 rounded bg-slate-200" />
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="h-16 rounded-lg border border-slate-200 bg-slate-50" />
              <div className="h-16 rounded-lg border border-slate-200 bg-slate-50" />
            </div>
            <div className="mt-4 h-28 w-full rounded-lg border border-slate-200 bg-slate-50" />
            <div className="mt-3 h-4 w-2/3 rounded bg-slate-200" />
          </div>
        </section>
      ) : null}
      {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-base text-rose-700">{error}</div> : null}

      {voucher ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5 shadow-sm">
          <div className="rounded-xl border border-slate-300 bg-gradient-to-r from-slate-900 to-slate-800 p-4 text-white">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-300">Voucher Identity</div>
                <div className="mt-1 font-mono text-base sm:text-lg break-all">{voucherNumber}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-300">Security Mark</div>
                <div className="font-semibold text-base text-amber-300">{securityMark}</div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border border-slate-700 bg-slate-800/70 px-2.5 py-2">
                <div className="text-slate-400">Issued At</div>
                <div className="text-slate-100 mt-0.5">{issuedAt}</div>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800/70 px-2.5 py-2">
                <div className="text-slate-400">Verification Line</div>
                <div className="font-mono text-slate-100 mt-0.5 break-all">{machineLine}</div>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-slate-700 bg-white/95 p-3 text-slate-900">
              <div className="text-base font-semibold">Boarding Barcode (CODE128)</div>
              <div className="text-sm text-slate-600 mt-1">Present this barcode as your primary voucher proof.</div>
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <canvas ref={barcodeRef} className="w-full bg-white" aria-label="Voucher barcode" />
                <div className="font-mono text-sm text-slate-700 mt-2 break-all">{voucherNumber}</div>
              </div>
            </div>
          </div>
        </section>
      ) : null}
    </main>
  );
}
