"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Coins, Lock, Unlock, ShieldCheck, AlertTriangle, RefreshCw, Info } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import apiClient from "@/lib/apiClient";

const api = apiClient;

interface CurrencyMeta {
  code: string;
  name: string;
  symbol: string;
  decimals: number;
}

interface FxState {
  base: string;
  tzsPerUnit: Record<string, number>;
  locked: Record<string, boolean>;
  updatedAt: string | null;
  source: "fallback" | "manual" | "auto";
  stale: boolean;
  bounds: Record<string, { min: number; max: number }>;
  currencies: CurrencyMeta[];
}

interface FxAuditEntry {
  id: string;
  actorId: number | null;
  actorRole: string | null;
  actor: { id: number; email?: string | null; name?: string | null; role?: string | null } | null;
  ip: string | null;
  createdAt: string;
  before: { tzsPerUnit?: Record<string, number>; locked?: Record<string, boolean>; source?: string } | null;
  after: { tzsPerUnit?: Record<string, number>; locked?: Record<string, boolean>; source?: string } | null;
}

export default function CurrencyRatesPage() {
  const [fx, setFx] = useState<FxState | null>(null);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [locked, setLocked] = useState<Record<string, boolean>>({});
  // Pristine snapshots so we can highlight exactly what the admin has changed.
  const [original, setOriginal] = useState<Record<string, string>>({});
  const [originalLocked, setOriginalLocked] = useState<Record<string, boolean>>({});
  const [audit, setAudit] = useState<FxAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [savedCard, setSavedCard] = useState(false);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3800);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!savedCard) return;
    const t = window.setTimeout(() => setSavedCard(false), 5000);
    return () => window.clearTimeout(t);
  }, [savedCard]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await api.get<FxState>("/api/admin/fx");
      const data = r.data;
      setFx(data);
      const nextDraft: Record<string, string> = {};
      for (const c of data.currencies) {
        if (c.code === data.base) continue;
        nextDraft[c.code] = String(data.tzsPerUnit?.[c.code] ?? "");
      }
      setDraft(nextDraft);
      setOriginal({ ...nextDraft });
      setLocked({ ...(data.locked || {}) });
      setOriginalLocked({ ...(data.locked || {}) });
    } catch {
      setToast("Failed to load currency rates");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAudit = useCallback(async () => {
    try {
      const r = await api.get<FxAuditEntry[]>("/api/admin/fx/audit", {
        headers: { "Cache-Control": "no-cache" },
        params: { _t: Date.now() },
      });
      setAudit(Array.isArray(r.data) ? r.data : []);
    } catch {
      // non-fatal
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadAudit(); }, [loadAudit]);

  const editable = useMemo(
    () => (fx?.currencies || []).filter((c) => c.code !== (fx?.base || "TZS")),
    [fx]
  );

  // Distinct visual identity per currency so cards are instantly recognisable.
  const THEME: Record<string, { ring: string; badge: string; flag: string }> = {
    USD: { ring: "ring-emerald-200", badge: "bg-emerald-100 text-emerald-700", flag: "🇺🇸" },
    EUR: { ring: "ring-indigo-200", badge: "bg-indigo-100 text-indigo-700", flag: "🇪🇺" },
    KES: { ring: "ring-rose-200", badge: "bg-rose-100 text-rose-700", flag: "🇰🇪" },
    GBP: { ring: "ring-violet-200", badge: "bg-violet-100 text-violet-700", flag: "🇬🇧" },
    AED: { ring: "ring-amber-200", badge: "bg-amber-100 text-amber-700", flag: "🇦🇪" },
  };
  const themeFor = (code: string) =>
    THEME[code] || { ring: "ring-slate-200", badge: "bg-slate-100 text-slate-700", flag: "💱" };

  const isDirty = (code: string) =>
    (draft[code] ?? "") !== (original[code] ?? "") || !!locked[code] !== !!originalLocked[code];

  const dirtyCount = useMemo(
    () => editable.filter((c) => isDirty(c.code)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editable, draft, original, locked, originalLocked]
  );

  const resetChanges = () => {
    setDraft({ ...original });
    setLocked({ ...originalLocked });
  };

  const save = async () => {
    if (!fx) return;
    const tzsPerUnit: Record<string, number> = {};
    const errs: string[] = [];
    for (const c of editable) {
      const raw = (draft[c.code] ?? "").trim();
      if (raw === "") continue; // unspecified → keep current
      const n = Number(raw);
      const b = fx.bounds[c.code];
      if (!Number.isFinite(n) || n <= 0) {
        errs.push(`${c.code}: enter a positive number`);
        continue;
      }
      if (b && (n < b.min || n > b.max)) {
        errs.push(`${c.code}: must be between ${b.min.toLocaleString()} and ${b.max.toLocaleString()} TZS`);
        continue;
      }
      tzsPerUnit[c.code] = n;
    }
    if (errs.length) {
      setToast(errs[0] + (errs.length > 1 ? ` (+${errs.length - 1} more)` : ""));
      return;
    }
    if (Object.keys(tzsPerUnit).length === 0) {
      setToast("No changes to save");
      return;
    }
    setSaving(true);
    try {
      const r = await api.put("/api/admin/fx", { tzsPerUnit, locked });
      const rejected = (r.data as any)?.rejected as { code: string; reason: string }[] | undefined;
      if (rejected && rejected.length > 0) {
        setToast(`Some rates were rejected: ${rejected.map((x) => `${x.code} (${x.reason})`).join(", ")}`);
      } else {
        setSavedCard(true);
      }
      await load();
      await loadAudit();
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Failed to save currency rates";
      setToast(msg);
    } finally {
      setSaving(false);
    }
  };

  const sourceBadge = (() => {
    if (!fx) return null;
    const map: Record<string, { label: string; cls: string }> = {
      manual: { label: "Manual", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" },
      auto: { label: "Automated", cls: "border-sky-200 bg-sky-50 text-sky-700" },
      fallback: { label: "Built-in fallback", cls: "border-amber-200 bg-amber-50 text-amber-700" },
    };
    const m = map[fx.source] || map.fallback;
    return (
      <span className={`inline-flex items-center rounded-xl border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.10em] ${m.cls}`}>
        {m.label}
      </span>
    );
  })();

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-[#02665e]/[0.07] to-transparent" />
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="fixed top-4 z-50 left-4 right-4 sm:left-auto sm:right-4 sm:w-[28rem]"
          >
            <div className="w-full max-w-full break-words rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl ring-1 ring-white/10">
              {toast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved card */}
      <AnimatePresence>
        {savedCard && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4"
            onClick={() => setSavedCard(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 16 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="w-full max-w-sm rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200/60 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col items-center gap-4 px-8 py-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#02665e]/10">
                  <ShieldCheck className="h-8 w-8 text-[#02665e]" />
                </div>
                <div>
                  <p className="text-lg font-bold text-slate-900">Rates Saved</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Display rates updated. This change has been recorded in the audit trail with your account and time.
                  </p>
                </div>
                <button
                  onClick={() => setSavedCard(false)}
                  className="mt-1 w-full rounded-xl bg-[#02665e] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#015b54] transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative mx-auto w-full max-w-4xl px-4 py-6 pb-28 sm:px-6 lg:px-8">
        <div className="space-y-5">
          {/* Header */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white/70 shadow-sm backdrop-blur">
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-slate-50 pointer-events-none" />
            <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#02665e]/10 to-slate-50 border border-slate-200/60 flex items-center justify-center shrink-0 shadow-sm">
                  <Coins className="h-7 w-7 text-[#02665e]" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900">Currency Rates</h1>
                  <p className="mt-0.5 text-sm text-slate-600">Manual display-currency rates. Every change is audited.</p>
                  {loading && <p className="mt-1 text-xs text-[#02665e] animate-pulse">Loading rates…</p>}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.10em] text-slate-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#02665e]" />
                  Base {fx?.base || "TZS"}
                </span>
                {sourceBadge}
                {fx?.stale && (
                  <span className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.10em] text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" /> Stale
                  </span>
                )}
                {dirtyCount > 0 && (
                  <button
                    onClick={resetChanges}
                    disabled={saving}
                    type="button"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
                  >
                    Reset
                  </button>
                )}
                <button
                  onClick={save}
                  disabled={loading || saving || dirtyCount === 0}
                  className="relative inline-flex items-center gap-2 rounded-xl bg-[#02665e] px-5 py-2.5 text-sm font-bold text-white shadow-[0_4px_16px_-4px_rgba(2,102,94,0.45)] transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30 disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none"
                  type="button"
                >
                  <Coins className="h-4 w-4" />
                  {saving ? "Saving…" : dirtyCount > 0 ? `Save ${dirtyCount} change${dirtyCount > 1 ? "s" : ""}` : "Saved"}
                  {dirtyCount > 0 && !saving && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-3 w-3">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-500" />
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Foundation notice */}
          <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50/70 p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
            <p className="text-sm text-sky-900">
              <span className="font-semibold">TZS is the money of record.</span> These rates only change how prices are
              <span className="font-semibold"> displayed</span> to users. They never affect what anyone is charged, what
              drivers and owners are paid, or any invoice total. Everything always settles in TZS.
            </p>
          </div>

          {/* Rate editor */}
          <section className="bg-white rounded-[20px] border border-slate-200 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="p-6 sm:p-8">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#02665e]/10 flex items-center justify-center shrink-0">
                    <Coins className="h-5 w-5 text-[#02665e]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Exchange Rates</h3>
                    <p className="text-sm text-slate-500">How many TZS equal 1 unit of each display currency.</p>
                  </div>
                </div>
              </div>

              {/* Base currency reference — the anchor everything converts from */}
              <div className="mb-4 flex items-center gap-3 rounded-[14px] border border-[#02665e]/20 bg-gradient-to-r from-[#02665e]/[0.06] to-transparent p-3.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#02665e] text-sm font-bold text-white shadow-sm">
                  ₸
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">{fx?.base || "TZS"} base currency</p>
                  <p className="text-[11px] text-slate-500">Fixed at 1. All display currencies are priced against this.</p>
                </div>
                <span className="ml-auto rounded-lg bg-white px-2.5 py-1 text-[11px] font-bold text-[#02665e] ring-1 ring-[#02665e]/15">
                  1.00
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {editable.map((c) => {
                  const b = fx?.bounds?.[c.code];
                  const val = draft[c.code] ?? "";
                  const n = Number(val);
                  const valid = val === "" || (Number.isFinite(n) && n > 0 && (!b || (n >= b.min && n <= b.max)));
                  const isLocked = !!locked[c.code];
                  const dirty = isDirty(c.code);
                  const t = themeFor(c.code);
                  return (
                    <div
                      key={c.code}
                      className={`group rounded-2xl border bg-white p-4 shadow-sm transition hover:shadow-md ${
                        dirty ? `ring-2 ${t.ring} border-transparent` : "border-slate-200/80"
                      }`}
                    >
                      <div className="mb-3 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`flex h-9 w-9 items-center justify-center rounded-full text-base ${t.badge}`}>
                            <span aria-hidden>{t.flag}</span>
                          </div>
                          <div>
                            <p className="text-sm font-bold tracking-tight text-slate-900">
                              {c.code} <span className="font-medium text-slate-400">{c.symbol}</span>
                            </p>
                            <p className="text-[11px] text-slate-400">{c.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {dirty && (
                            <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                              Edited
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => setLocked((p) => ({ ...p, [c.code]: !p[c.code] }))}
                            title={isLocked ? "Pinned so the auto feed will not change this" : "Unpinned"}
                            className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wide transition ${
                              isLocked
                                ? "border-[#02665e]/30 bg-[#02665e]/10 text-[#02665e]"
                                : "border-slate-200 bg-white text-slate-400 hover:text-slate-600"
                            }`}
                          >
                            {isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                            {isLocked ? "Pinned" : "Pin"}
                          </button>
                        </div>
                      </div>
                      <div
                        className={`flex overflow-hidden rounded-xl border bg-white shadow-sm focus-within:ring-2 ${
                          valid
                            ? "border-slate-200 focus-within:border-[#02665e]/50 focus-within:ring-[#02665e]/15"
                            : "border-red-300 focus-within:ring-red-200"
                        }`}
                      >
                        <div className="flex shrink-0 items-center border-r border-slate-100 bg-slate-50 px-2.5 text-[11px] font-bold text-slate-500">
                          1 {c.code} =
                        </div>
                        <input
                          type="number"
                          min={b?.min}
                          max={b?.max}
                          step="0.01"
                          inputMode="decimal"
                          value={val}
                          onChange={(e) => setDraft((p) => ({ ...p, [c.code]: e.target.value }))}
                          className="min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm font-medium text-slate-900 outline-none placeholder:text-slate-300"
                          placeholder={String(fx?.tzsPerUnit?.[c.code] ?? "")}
                        />
                        <div className="flex shrink-0 items-center border-l border-slate-100 bg-[#02665e]/8 px-2.5 text-xs font-bold text-[#02665e]">
                          TZS
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span className={valid ? "text-slate-400" : "font-semibold text-red-500"}>
                          {!valid
                            ? `Must be between ${b?.min.toLocaleString()} and ${b?.max.toLocaleString()} TZS`
                            : b
                              ? `Allowed ${b.min.toLocaleString()} to ${b.max.toLocaleString()}`
                              : ""}
                        </span>
                        {val !== "" && valid && Number.isFinite(n) && n > 0 && (
                          <span className="rounded-md bg-slate-50 px-1.5 py-0.5 font-medium text-slate-500 ring-1 ring-slate-100">
                            10,000 TZS ≈ {(10000 / n).toLocaleString(undefined, { maximumFractionDigits: c.decimals })} {c.code}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {fx?.updatedAt && (
                <p className="mt-4 text-xs text-slate-400">
                  Last updated {new Date(fx.updatedAt).toLocaleString()}.
                </p>
              )}
            </div>
          </section>

          {/* Audit trail */}
          <section className="bg-white rounded-[20px] border border-slate-200 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] overflow-hidden">
            <div className="p-6 sm:p-8">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Change History</h3>
                    <p className="text-sm text-slate-500">Every rate change, with who and when.</p>
                  </div>
                </div>
                <button
                  onClick={loadAudit}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold uppercase tracking-[0.10em] text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-95"
                  type="button"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Refresh
                </button>
              </div>

              {audit.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/60 py-8 text-center">
                  <p className="text-sm font-semibold text-slate-400">No changes recorded yet.</p>
                  <p className="mt-1 text-xs text-slate-300">Save rates above to start the trail.</p>
                </div>
              ) : (
                <div className="rounded-[14px] border border-slate-100 overflow-hidden divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
                  {audit.map((row, idx) => {
                    const isLatest = idx === 0;
                    const actorName = row.actor?.name || row.actor?.email || row.actorRole || "Admin";
                    const beforeR = row.before?.tzsPerUnit || {};
                    const afterR = row.after?.tzsPerUnit || {};
                    const codes = Array.from(new Set([...Object.keys(beforeR), ...Object.keys(afterR)]));
                    const changed = codes.filter((k) => k !== "TZS" && String(beforeR[k] ?? "") !== String(afterR[k] ?? ""));
                    return (
                      <div key={row.id} className={`px-4 py-3 ${isLatest ? "bg-violet-50/50" : "bg-white hover:bg-slate-50/60"} transition-colors`}>
                        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                          <div className="flex flex-wrap items-center gap-2 min-w-0">
                            {isLatest && (
                              <span className="shrink-0 rounded bg-violet-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                Latest
                              </span>
                            )}
                            <span className="text-xs font-semibold text-slate-700 tabular-nums">
                              {new Date(row.createdAt).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-slate-500">
                              {actorName}
                              {row.actorId ? <span className="text-slate-400"> #{row.actorId}</span> : null}
                            </span>
                            {row.ip && <span className="hidden sm:inline text-[10px] text-slate-300 tabular-nums">{row.ip}</span>}
                          </div>
                        </div>

                        {changed.length > 0 ? (
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            {changed.map((k) => (
                              <span key={k} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-0.5 font-mono text-[11px] text-slate-600">
                                <span className={`font-semibold ${isLatest ? "text-violet-600" : "text-[#02665e]"}`}>{k}</span>
                                <span className="text-slate-300 mx-0.5">·</span>
                                <span className="text-red-400 line-through">{String(beforeR[k] ?? "—")}</span>
                                <span className="text-slate-300 mx-0.5">→</span>
                                <span className="text-emerald-600 font-semibold">{String(afterR[k] ?? "—")}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-1.5 text-[11px] text-slate-400">No rate values changed (pin/metadata update).</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
