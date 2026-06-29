"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AlertTriangle, BadgeCheck, CalendarCheck, Loader2, Lock, MapPin, ShieldCheck, UserCheck } from "lucide-react";

type Certificate = {
  issuer: string;
  property: {
    id: number;
    title: string;
    type: string;
    location: string;
  };
  verification: {
    status: "VERIFIED";
    verifiedAt: string | null;
    verifiedBy: string;
    verifiedByRole: string;
    method: string;
    note: string;
    checklist: string[];
    lastRefreshedAt: string | null;
  };
};

type State =
  | { status: "loading" }
  | { status: "valid"; certificate: Certificate }
  | { status: "invalid"; reason: string };

const BRAND = "#02665e";

function formatDate(value?: string | null) {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function PropertyVerificationPage() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = (params.get("t") || params.get("token") || "").trim();
    if (!token) {
      setState({ status: "invalid", reason: "No property verification token was provided." });
      return;
    }

    let alive = true;
    fetch(`/api/public/properties/verification?token=${encodeURIComponent(token)}`, { credentials: "omit" })
      .then(async (res) => {
        const data = await res.json().catch(() => null);
        if (!alive) return;
        if (data?.ok && data?.valid && data?.certificate) {
          setState({ status: "valid", certificate: data.certificate as Certificate });
        } else {
          setState({
            status: "invalid",
            reason: "This property certificate could not be verified. The link may be altered, expired, or the property is no longer publicly approved.",
          });
        }
      })
      .catch(() => {
        if (!alive) return;
        setState({ status: "invalid", reason: "We could not reach the verification service. Please try again." });
      });

    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#f6faf9] px-4 py-6 text-slate-950 sm:py-10" style={{ fontFamily: '"Trebuchet MS", "Lucida Sans Unicode", "Lucida Grande", Arial, sans-serif' }}>
      <section className="mx-auto max-w-xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_28px_90px_-42px_rgba(2,102,94,0.65)]">
        <div className="relative overflow-hidden px-5 py-5 text-white sm:px-6 sm:py-6" style={{ background: `linear-gradient(135deg, ${BRAND}, #01443f)` }}>
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.16]"
            style={{ backgroundImage: "radial-gradient(#ffffff 1.1px, transparent 1.1px)", backgroundSize: "18px 18px" }}
            aria-hidden
          />
          <div className="relative flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]">
              <Image src="/assets/NoLS2025-04.png" alt="NoLSAF" width={30} height={30} className="h-7 w-7 object-contain" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.22em] text-white/60">NoLSAF Verify</p>
              <h1 className="text-xl font-black">Property certificate</h1>
            </div>
          </div>
        </div>

        {state.status === "loading" ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin text-[#02665e]" aria-hidden />
            <span className="text-sm font-semibold">Verifying property certificate</span>
          </div>
        ) : state.status === "invalid" ? (
          <InvalidView reason={state.reason} />
        ) : (
          <ValidView certificate={state.certificate} />
        )}
      </section>
      <div className="mx-auto mt-5 flex max-w-xl items-center justify-center gap-2 text-center text-[11px] text-slate-400">
        <Lock className="h-3 w-3" aria-hidden />
        <span>Verification by NoLS Africa Co Ltd. No login is required to view this page.</span>
      </div>
    </main>
  );
}

function InvalidView({ reason }: { reason: string }) {
  return (
    <div className="p-6">
      <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-rose-600" />
          <p className="text-sm font-black text-rose-800">Property could not be verified</p>
        </div>
        <p className="mt-2 text-sm leading-6 text-rose-700">{reason}</p>
      </div>
    </div>
  );
}

function ValidView({ certificate }: { certificate: Certificate }) {
  const { property, verification } = certificate;
  return (
    <div className="p-4 sm:p-6">
      <div className="relative overflow-hidden rounded-[24px] border border-[#c8b46b] bg-[#fffdf7] p-5 shadow-[inset_0_0_0_6px_rgba(200,180,107,0.13)] sm:p-7">
        <div className="pointer-events-none absolute inset-3 rounded-[20px] border border-[#d8c886]/70" aria-hidden />
        <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full border-[18px] border-[#02665e]/10" aria-hidden />
        <div className="pointer-events-none absolute -bottom-14 -left-14 h-32 w-32 rounded-full border-[16px] border-[#c8b46b]/15" aria-hidden />

        <div className="relative text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-[#c8b46b] bg-white shadow-[0_14px_34px_-22px_rgba(2,102,94,0.9)]">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-[#02665e] text-white">
              <ShieldCheck className="h-7 w-7" />
            </div>
          </div>
          <p className="mt-4 text-[11px] font-black uppercase tracking-[0.26em] text-[#8a7a36]">Certificate of Verification</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Awarded to this property</h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">{verification.note}</p>
        </div>

        <div className="relative mt-7 rounded-2xl border border-slate-200 bg-white/88 px-4 py-5 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{property.type}</p>
          <p className="mt-2 break-words text-3xl font-black leading-tight text-slate-950">{property.title}</p>
          <div className="mx-auto mt-3 flex max-w-md items-start justify-center gap-2 text-sm leading-6 text-slate-500">
            <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#02665e]" />
            <span>{property.location || "Location not listed"}</span>
          </div>
        </div>

        <dl className="relative mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Fact icon={<BadgeCheck className="h-4 w-4" />} label="Status" value="Verified" className="col-span-2 mx-auto w-[72%] text-center sm:col-span-1 sm:w-auto sm:text-left" centered />
          <Fact icon={<CalendarCheck className="h-4 w-4" />} label="Checked on" value={formatDate(verification.verifiedAt)} />
          <Fact icon={<UserCheck className="h-4 w-4" />} label="Checked by" value={verification.verifiedBy || "NoLSAF Admin"} />
        </dl>

        <div className="relative mt-5 rounded-2xl border border-[#d8c886]/80 bg-[#fffdf7] p-4 shadow-[inset_0_0_0_1px_rgba(2,102,94,0.06)]">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full border border-[#02665e]/15 bg-white text-[#02665e] shadow-sm">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <p className="text-base font-black text-slate-950">Verification marks</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">Official NoLSAF property review record</p>
              </div>
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-2 rounded-2xl border border-[#d8c886]/70 bg-[#fff8dd] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <dt className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7a6826]">Review method</dt>
            <dd className="text-sm font-black text-slate-950 sm:text-right">{verification.method || "Site visit and listing review"}</dd>
          </div>

          <div className="grid overflow-hidden rounded-2xl border border-slate-200 bg-white sm:grid-cols-2">
            {verification.checklist.map((item) => (
              <div key={item} className="flex min-h-14 items-center gap-3 border-b border-slate-100 px-3 py-3 text-sm font-bold text-slate-700 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 sm:[&:nth-child(odd)]:border-r">
                <span className="grid h-8 w-8 flex-shrink-0 place-items-center rounded-full border border-[#bfeee2] bg-[#e8f8f3] text-[#02665e]">
                  <BadgeCheck className="h-4 w-4" />
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-t border-[#d8c886]/70 pt-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Issued by</p>
            <p className="mt-1 text-sm font-black text-slate-900">{certificate.issuer}</p>
          </div>
          <div className="grid h-24 w-24 place-items-center rounded-full bg-white/70 shadow-[0_16px_34px_-26px_rgba(2,102,94,0.75)]">
            <Image src="/assets/NoLS2025-04.png" alt="NoLSAF watermark" width={58} height={58} className="h-14 w-14 object-contain opacity-45" />
          </div>
          <div className="min-w-0 text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Certificate ID</p>
            <p className="mt-1 font-mono text-xs font-black text-slate-900">NLS-P-{property.id}</p>
          </div>
        </div>
      </div>

      <p className="mt-5 text-center text-xs leading-5 text-slate-500">
        If the property details do not match what you are booking, contact NoLSAF support before making payment.
      </p>
    </div>
  );
}

function Fact({ icon, label, value, className = "", centered }: { icon: React.ReactNode; label: string; value: string; className?: string; centered?: boolean }) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-3 ${className}`}>
      <dt className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400 ${centered ? "justify-center sm:justify-start" : ""}`}>
        <span className="text-[#02665e]">{icon}</span>
        {label}
      </dt>
      <dd className="mt-2 text-sm font-bold text-slate-900">{value || "Not available"}</dd>
    </div>
  );
}
