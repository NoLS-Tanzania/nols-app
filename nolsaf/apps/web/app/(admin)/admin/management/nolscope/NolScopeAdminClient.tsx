"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronUp,
  Edit2,
  Globe,
  Loader2,
  Mountain,
  Plus,
  RefreshCw,
  Route,
  Save,
  Shield,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  TrendingUp,
  X,
  Clock,
  History,
  User,
} from "lucide-react";

// ─── helpers ──────────────────────────────────────────────────────────────────

const API = "";

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

function fmtUSD(v: number) {
  return `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = "activities" | "park-fees" | "visa-fees" | "transport" | "seasonal";

const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: "activities",  label: "Activities",       Icon: Activity    },
  { id: "park-fees",   label: "Park Fees",         Icon: Mountain    },
  { id: "visa-fees",   label: "Visa Fees",         Icon: Globe       },
  { id: "transport",   label: "Transport",         Icon: Route       },
  { id: "seasonal",    label: "Seasonal Rules",    Icon: TrendingUp  },
];

// ─── Inline edit field ────────────────────────────────────────────────────────

function EditableField({
  label,
  value,
  type = "text",
  prefix,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string | number | null | undefined;
  type?: "text" | "number";
  prefix?: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const safeValue = value ?? (type === "number" ? 0 : "");
  return (
    <div>
      <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">
        {label}
      </label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-xs text-slate-400">{prefix}</span>}
        <input
          type={type}
          value={safeValue}
          onChange={(e) => !disabled && onChange(e.target.value)}
          disabled={disabled}
          className={`w-full text-sm border rounded-lg px-2.5 py-1.5 focus:outline-none ${
            disabled
              ? "border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed"
              : "border-slate-200 focus:ring-2 focus:ring-[#02665e]/30 focus:border-[#02665e]"
          }`}
        />
      </div>
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
        active
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
          : "bg-slate-100 text-slate-500 border border-slate-200"
      }`}
    >
      {active ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3" />}
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function SaveBar({
  saving,
  error,
  onSave,
  onCancel,
}: {
  saving: boolean;
  error: string;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 mt-3">
      {error && (
        <span className="flex items-center gap-1 text-xs text-red-600 flex-1">
          <AlertTriangle className="w-3.5 h-3.5" /> {error}
        </span>
      )}
      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-xs font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-[#02665e] text-white rounded-lg hover:bg-[#015a52] disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Save changes
        </button>
      </div>
    </div>
  );
}

// ─── HISTORY PANEL ────────────────────────────────────────────────────────────

function HistoryPanel({ entity, entityId, label, onClose }: { entity: string; entityId: number; label: string; onClose: () => void }) {
  const [logs, setLogs]       = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    setLoading(true); setError("");
    apiFetch(`/api/admin/nolscope/audit/${entity}/${entityId}`)
      .then((d) => setLogs(d.logs ?? []))
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [entity, entityId]);

  function diffFields(before: any, after: any) {
    if (!before || !after) return [];
    const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
    const changes: { field: string; from: any; to: any }[] = [];
    for (const k of keys) {
      if (k === "updatedAt" || k === "lastVerified" || k === "lastUpdated") continue;
      const bv = before[k]; const av = after[k];
      if (JSON.stringify(bv) !== JSON.stringify(av)) changes.push({ field: k, from: bv, to: av });
    }
    return changes;
  }

  function fmt(v: any): string {
    if (v === null || v === undefined) return "—";
    if (typeof v === "boolean") return v ? "Yes" : "No";
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  }

  return (
    <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#02665e]" />
          <span className="text-sm font-semibold text-slate-800">Change history</span>
          <span className="text-xs text-slate-400 truncate max-w-[160px]">{label}</span>
        </div>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
          <X className="w-4 h-4" />
        </button>
      </div>

      {loading && <Loader2 className="w-4 h-4 animate-spin text-[#02665e] mx-auto my-4" />}
      {error   && <p className="text-xs text-red-500 py-2">{error}</p>}

      {!loading && !error && logs.length === 0 && (
        <p className="text-xs text-slate-400 text-center py-4">No changes recorded yet. Changes will appear here after the first save.</p>
      )}

      {!loading && logs.length > 0 && (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {logs.map((log) => {
            const isCreate = log.action?.endsWith("_CREATE");
            const changes = isCreate ? [] : diffFields(log.beforeJson, log.afterJson);
            const actor = log.actor;
            const after = log.afterJson ?? {};
            const categoryLabel = after.category ?? after.transportType ?? after.seasonName ?? null;
            return (
              <div key={String(log.id)} className={`bg-white border rounded-xl p-3 shadow-sm ${isCreate ? "border-emerald-200" : "border-slate-100"}`}>
                {/* meta row */}
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  {isCreate ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">
                      <Plus className="w-3 h-3" /> Record created
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-[#02665e]/10 text-[#02665e] rounded-full">
                      <Edit2 className="w-3 h-3" /> Updated
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-[10px] text-slate-500 px-2 py-0.5 bg-slate-100 rounded-full">
                    <Clock className="w-3 h-3" />
                    {new Date(log.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                  </span>
                  {actor ? (
                    <span className="flex items-center gap-1 text-[10px] text-slate-600 px-2 py-0.5 bg-slate-100 rounded-full">
                      <User className="w-3 h-3" />
                      {actor.fullName ?? actor.name ?? actor.email} <span className="text-slate-400 ml-0.5">({actor.email})</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 px-2 py-0.5 bg-slate-50 rounded-full">System / seed</span>
                  )}
                  {categoryLabel && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full ml-auto">{categoryLabel}</span>
                  )}
                </div>

                {/* create: show a summary of key initial values */}
                {isCreate && (
                  <div className="space-y-1 mt-1">
                    {Object.entries(after)
                      .filter(([k]) => !["id","createdAt","updatedAt","lastVerified","lastUpdated","isActive"].includes(k))
                      .slice(0, 8)
                      .map(([k, v]) => (
                        <div key={k} className="grid grid-cols-[140px_1fr] gap-1 text-xs">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide truncate">{k}</span>
                          <span className="text-slate-700 truncate font-medium" title={fmt(v)}>{fmt(v)}</span>
                        </div>
                      ))}
                  </div>
                )}

                {/* update: show changed fields */}
                {!isCreate && (
                  changes.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No field changes recorded</p>
                  ) : (
                    <div className="space-y-1">
                      {changes.map((c) => (
                        <div key={c.field} className="grid grid-cols-[120px_1fr_1fr] gap-1 text-xs">
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide truncate">{c.field}</span>
                          <span className="text-red-500 line-through truncate" title={fmt(c.from)}>{fmt(c.from)}</span>
                          <span className="text-emerald-700 font-medium truncate" title={fmt(c.to)}>{fmt(c.to)}</span>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── ACTIVITIES tab ───────────────────────────────────────────────────────────

function ActivitiesTab() {
  const [rows, setRows]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [expanded, setExpanded]   = useState<number | null>(null);
  const [historyId, setHistoryId] = useState<number | null>(null);
  const [draft, setDraft]         = useState<any>(null);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState("");
  const [filter, setFilter]       = useState("");
  const [destFilter, setDestFilter] = useState("");
  const [showAdd, setShowAdd]     = useState(false);
  const [newRow, setNewRow]       = useState({ activityCode: "", activityName: "", category: "safari", destination: "", minCost: "0", maxCost: "0", averageCost: "0", description: "" });
  const [adding, setAdding]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const d = await apiFetch("/api/admin/nolscope/activities");
      setRows(d.activities ?? []);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const destinations = [...new Set(rows.map((r) => r.destination))].sort();

  const visible = rows.filter((r) => {
    const q = filter.toLowerCase();
    const matchQ = !q || r.activityName.toLowerCase().includes(q) || r.activityCode.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q);
    const matchD = !destFilter || r.destination === destFilter;
    return matchQ && matchD;
  });

  function openEdit(row: any) {
    setExpanded(row.id);
    setDraft({ ...row });
    setSaveError("");
  }

  function closeEdit() { setExpanded(null); setDraft(null); }

  async function save() {
    if (!draft) return;
    setSaving(true); setSaveError("");
    try {
      const { id, activityCode, createdAt, updatedAt, ...rest } = draft;
      const d = await apiFetch(`/api/admin/nolscope/activities/${id}`, { method: "PUT", body: JSON.stringify(rest) });
      setRows((prev) => prev.map((r) => r.id === id ? d.updated : r));
      closeEdit();
    } catch (e: any) { setSaveError(e.message); }
    finally { setSaving(false); }
  }

  async function toggleActive(row: any) {
    try {
      const d = await apiFetch(`/api/admin/nolscope/activities/${row.id}`, { method: "PUT", body: JSON.stringify({ isActive: !row.isActive }) });
      setRows((prev) => prev.map((r) => r.id === row.id ? d.updated : r));
    } catch {}
  }

  async function addNew() {
    if (!newRow.activityCode || !newRow.activityName || !newRow.destination) return;
    setAdding(true);
    try {
      const d = await apiFetch("/api/admin/nolscope/activities", { method: "POST", body: JSON.stringify({ ...newRow, minCost: Number(newRow.minCost), maxCost: Number(newRow.maxCost), averageCost: Number(newRow.averageCost) }) });
      setRows((prev) => [...prev, d.created]);
      setShowAdd(false);
      setNewRow({ activityCode: "", activityName: "", category: "safari", destination: "", minCost: "0", maxCost: "0", averageCost: "0", description: "" });
    } catch {}
    finally { setAdding(false); }
  }

  if (loading) return <Loader2 className="w-5 h-5 animate-spin text-[#02665e] mx-auto mt-8" />;
  if (error)   return <p className="text-sm text-red-600 p-4">{error}</p>;

  return (
    <div className="space-y-3">
      {/* filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          placeholder="Search activities…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="flex-1 min-w-[160px] text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30"
        />
        <select
          value={destFilter}
          onChange={(e) => setDestFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30"
        >
          <option value="">All destinations</option>
          {destinations.map((d) => <option key={d}>{d}</option>)}
        </select>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-[#02665e] text-white rounded-xl hover:bg-[#015a52]">
          <Plus className="w-4 h-4" /> Add activity
        </button>
        <button onClick={load} className="p-2 text-slate-400 hover:text-[#02665e] border border-slate-200 rounded-xl">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-slate-400">{visible.length} of {rows.length} activities</p>

      {/* add form */}
      {showAdd && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
          <h4 className="text-sm font-bold text-emerald-900">New Activity</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <EditableField label="Activity Code (unique slug)" value={newRow.activityCode} onChange={(v) => setNewRow((p) => ({ ...p, activityCode: v }))} />
            <EditableField label="Activity Name" value={newRow.activityName} onChange={(v) => setNewRow((p) => ({ ...p, activityName: v }))} />
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Destination</label>
              <div className="flex items-center gap-1">
                <input list="dest-list" value={newRow.destination} onChange={(e) => setNewRow((p) => ({ ...p, destination: e.target.value }))}
                  className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30" />
              </div>
              <datalist id="dest-list">{destinations.map((d) => <option key={d} value={d} />)}</datalist>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Category</label>
              <div className="flex items-center gap-1">
                <select value={newRow.category} onChange={(e) => setNewRow((p) => ({ ...p, category: e.target.value }))}
                  className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30">
                  {["safari","water-sports","cultural","adventure","wellness","dining"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <EditableField label="Min cost (USD)" value={newRow.minCost} type="number" prefix="$" onChange={(v) => setNewRow((p) => { const min = Number(v); const max = Number(p.maxCost); return { ...p, minCost: v, averageCost: String(Math.round((min + max) / 2 * 100) / 100) }; })} />
            <div className="relative">
              <EditableField label="Avg cost (USD)" value={newRow.averageCost} type="number" prefix="$" disabled onChange={(v) => setNewRow((p) => ({ ...p, averageCost: v }))} />
              <span className="absolute top-0 right-0 text-[8px] font-bold text-[#02665e] bg-[#02665e]/10 rounded px-1 py-0.5 leading-none">AUTO</span>
            </div>
            <EditableField label="Max cost (USD)" value={newRow.maxCost} type="number" prefix="$" onChange={(v) => setNewRow((p) => { const max = Number(v); const min = Number(p.minCost); return { ...p, maxCost: v, averageCost: String(Math.round((min + max) / 2 * 100) / 100) }; })} />
            <EditableField label="Description" value={newRow.description} onChange={(v) => setNewRow((p) => ({ ...p, description: v }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button onClick={addNew} disabled={adding} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-[#02665e] text-white rounded-lg hover:bg-[#015a52] disabled:opacity-50">
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Create
            </button>
          </div>
        </div>
      )}

      {/* rows */}
      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Activity</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Category</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Destination</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Min</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Avg</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Max</th>
              <th className="px-4 py-2.5 text-center text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Status</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {visible.map((row) => (
              <React.Fragment key={row.id}>
                <tr className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800 leading-tight">{row.activityName}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{row.activityCode}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] font-medium px-2 py-0.5 bg-[#02665e]/10 text-[#02665e] rounded-full capitalize whitespace-nowrap">{row.category}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{row.destination}</td>
                  <td className="px-4 py-3 text-right text-xs text-slate-500">{fmtUSD(row.minCost)}</td>
                  <td className="px-4 py-3 text-right text-xs font-semibold text-slate-800">{fmtUSD(row.averageCost)}</td>
                  <td className="px-4 py-3 text-right text-xs text-slate-500">{fmtUSD(row.maxCost)}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge active={row.isActive} /></td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => toggleActive(row)} className="p-1.5 text-slate-400 hover:text-[#02665e] rounded-lg hover:bg-[#02665e]/5" title={row.isActive ? "Deactivate" : "Activate"}>
                        {row.isActive ? <ToggleRight className="w-4 h-4 text-emerald-500" /> : <ToggleLeft className="w-4 h-4" />}
                      </button>
                      <button onClick={() => setHistoryId(historyId === row.id ? null : row.id)} className="p-1.5 text-slate-400 hover:text-[#02b4f5] rounded-lg hover:bg-[#02b4f5]/5" title="Change history">
                        <History className="w-4 h-4" />
                      </button>
                      <button onClick={() => expanded === row.id ? closeEdit() : openEdit(row)} className="p-1.5 text-slate-400 hover:text-[#02665e] rounded-lg hover:bg-[#02665e]/5">
                        {expanded === row.id ? <ChevronUp className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
                {expanded === row.id && draft && (
                  <tr>
                    <td colSpan={8} className="p-0 border-t border-slate-100">
                      <div className="px-4 py-4 bg-slate-50/60 overflow-hidden">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          <EditableField label="Activity Name" value={draft.activityName} onChange={(v) => setDraft((p: any) => ({ ...p, activityName: v }))} />
                          <EditableField label="Destination" value={draft.destination} onChange={(v) => setDraft((p: any) => ({ ...p, destination: v }))} />
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Category</label>
                            <div className="flex items-center gap-1">
                              <select value={draft.category} onChange={(e) => setDraft((p: any) => ({ ...p, category: e.target.value }))}
                                className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30 bg-white">
                                {["safari","water-sports","cultural","adventure","wellness","dining"].map((c) => <option key={c}>{c}</option>)}
                              </select>
                            </div>
                          </div>
                          <EditableField label="Min cost (USD)" value={draft.minCost} type="number" prefix="$" onChange={(v) => setDraft((p: any) => { const min = Number(v); const max = Number(p.maxCost); return { ...p, minCost: v, averageCost: String(Math.round((min + max) / 2 * 100) / 100) }; })} />
                          <div className="relative">
                            <EditableField label="Avg cost (USD)" value={draft.averageCost} type="number" prefix="$" disabled onChange={(v) => setDraft((p: any) => ({ ...p, averageCost: v }))} />
                            <span className="absolute top-0 right-0 text-[8px] font-bold text-[#02665e] bg-[#02665e]/10 rounded px-1 py-0.5 leading-none">AUTO</span>
                          </div>
                          <EditableField label="Max cost (USD)" value={draft.maxCost} type="number" prefix="$" onChange={(v) => setDraft((p: any) => { const max = Number(v); const min = Number(p.minCost); return { ...p, maxCost: v, averageCost: String(Math.round((min + max) / 2 * 100) / 100) }; })} />
                          <EditableField label="Peak multiplier" value={draft.peakMultiplier ?? 1} type="number" onChange={(v) => setDraft((p: any) => ({ ...p, peakMultiplier: v }))} />
                          <EditableField label="Off-peak multiplier" value={draft.offPeakMultiplier ?? 1} type="number" onChange={(v) => setDraft((p: any) => ({ ...p, offPeakMultiplier: v }))} />
                          <EditableField label="Duration" value={draft.duration ?? ""} onChange={(v) => setDraft((p: any) => ({ ...p, duration: v }))} />
                          <EditableField label="Group size" value={draft.groupSize ?? ""} onChange={(v) => setDraft((p: any) => ({ ...p, groupSize: v }))} />
                          <EditableField label="Provider" value={draft.provider ?? ""} onChange={(v) => setDraft((p: any) => ({ ...p, provider: v }))} />
                          <EditableField label="Popularity (1–100)" value={draft.popularity ?? 0} type="number" onChange={(v) => setDraft((p: any) => ({ ...p, popularity: v }))} />
                          <div className="md:col-start-2 min-w-0">
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Description</label>
                            <textarea rows={2} value={draft.description ?? ""} onChange={(e) => setDraft((p: any) => ({ ...p, description: e.target.value }))}
                              className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30 resize-none" />
                          </div>
                        </div>
                        <SaveBar saving={saving} error={saveError} onSave={save} onCancel={closeEdit} />
                      </div>
                    </td>
                  </tr>
                )}
                {historyId === row.id && (
                  <tr>
                    <td colSpan={8} className="p-0">
                      <HistoryPanel entity="NOLSCOPE_ACTIVITY" entityId={row.id} label={row.activityName} onClose={() => setHistoryId(null)} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── PARK FEES tab ────────────────────────────────────────────────────────────

function ParkFeesTab() {
  const [rows, setRows]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [expanded, setExpanded]   = useState<number | null>(null);
  const [historyId, setHistoryId] = useState<number | null>(null);
  const [draft, setDraft]         = useState<any>(null);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showAdd, setShowAdd]     = useState(false);
  const [newRow, setNewRow]       = useState({ parkCode: "", parkName: "", category: "national-park", region: "", adultForeignerFee: "0", adultResidentFee: "0", childForeignerFee: "", vehicleFee: "", campingFee: "", description: "" });
  const [adding, setAdding]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const d = await apiFetch("/api/admin/nolscope/park-fees"); setRows(d.parkFees ?? []); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openEdit(row: any) { setExpanded(row.id); setDraft({ ...row }); setSaveError(""); }
  function closeEdit() { setExpanded(null); setDraft(null); }

  async function save() {
    if (!draft) return;
    setSaving(true); setSaveError("");
    try {
      const { id, createdAt, updatedAt, parkCode, parkName, category, region, ...rest } = draft;
      const d = await apiFetch(`/api/admin/nolscope/park-fees/${id}`, { method: "PUT", body: JSON.stringify(rest) });
      setRows((prev) => prev.map((r) => r.id === id ? d.updated : r));
      closeEdit();
    } catch (e: any) { setSaveError(e.message); }
    finally { setSaving(false); }
  }

  async function addNew() {
    if (!newRow.parkCode || !newRow.parkName || !newRow.region) return;
    setAdding(true);
    try {
      const d = await apiFetch("/api/admin/nolscope/park-fees", { method: "POST", body: JSON.stringify({ ...newRow, adultForeignerFee: Number(newRow.adultForeignerFee), adultResidentFee: Number(newRow.adultResidentFee) }) });
      setRows((prev) => [...prev, d.created]);
      setShowAdd(false);
      setNewRow({ parkCode: "", parkName: "", category: "national-park", region: "", adultForeignerFee: "0", adultResidentFee: "0", childForeignerFee: "", vehicleFee: "", campingFee: "", description: "" });
    } catch {}
    finally { setAdding(false); }
  }

  if (loading) return <Loader2 className="w-5 h-5 animate-spin text-[#02665e] mx-auto mt-8" />;
  if (error)   return <p className="text-sm text-red-600 p-4">{error}</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">{rows.length} park fee records</p>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-[#02665e] text-white rounded-xl hover:bg-[#015a52]">
            <Plus className="w-4 h-4" /> Add park
          </button>
          <button onClick={load} className="p-2 text-slate-400 hover:text-[#02665e] border border-slate-200 rounded-xl"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {/* add form */}
      {showAdd && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
          <h4 className="text-sm font-bold text-emerald-900">New Park / Conservation Area</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <EditableField label="Park Code (unique)" value={newRow.parkCode} onChange={(v) => setNewRow((p) => ({ ...p, parkCode: v }))} />
            <EditableField label="Park Name" value={newRow.parkName} onChange={(v) => setNewRow((p) => ({ ...p, parkName: v }))} />
            <EditableField label="Region" value={newRow.region} onChange={(v) => setNewRow((p) => ({ ...p, region: v }))} />
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Category</label>
              <div className="flex items-center gap-1">
                <select value={newRow.category} onChange={(e) => setNewRow((p) => ({ ...p, category: e.target.value }))}
                  className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30">
                  {["national-park","conservation-area","marine-park","game-reserve"].map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <EditableField label="Adult foreigner fee/day (USD)" value={newRow.adultForeignerFee} type="number" prefix="$" onChange={(v) => setNewRow((p) => ({ ...p, adultForeignerFee: v }))} />
            <EditableField label="Adult resident fee/day (USD)" value={newRow.adultResidentFee} type="number" prefix="$" onChange={(v) => setNewRow((p) => ({ ...p, adultResidentFee: v }))} />
            <EditableField label="Child foreigner fee (USD)" value={newRow.childForeignerFee} type="number" prefix="$" onChange={(v) => setNewRow((p) => ({ ...p, childForeignerFee: v }))} />
            <EditableField label="Vehicle fee (USD)" value={newRow.vehicleFee} type="number" prefix="$" onChange={(v) => setNewRow((p) => ({ ...p, vehicleFee: v }))} />
            <EditableField label="Camping fee/night (USD)" value={newRow.campingFee} type="number" prefix="$" onChange={(v) => setNewRow((p) => ({ ...p, campingFee: v }))} />
            <EditableField label="Description" value={newRow.description} onChange={(v) => setNewRow((p) => ({ ...p, description: v }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button onClick={addNew} disabled={adding} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-[#02665e] text-white rounded-lg hover:bg-[#015a52] disabled:opacity-50">
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Create
            </button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Park</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Region</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Adult (intl)</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Adult (res.)</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Vehicle</th>
              <th className="px-4 py-2.5 text-center text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Status</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((row) => (
              <React.Fragment key={row.id}>
                <tr className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800 leading-tight">{row.parkName}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{row.parkCode}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full whitespace-nowrap">{row.region}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs font-semibold text-slate-800 whitespace-nowrap">{fmtUSD(Number(row.adultForeignerFee))}/day</td>
                  <td className="px-4 py-3 text-right text-xs text-slate-500 whitespace-nowrap">{fmtUSD(Number(row.adultResidentFee))}/day</td>
                  <td className="px-4 py-3 text-right text-xs text-slate-500">{row.vehicleFee > 0 ? fmtUSD(Number(row.vehicleFee)) : "—"}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge active={row.isActive} /></td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setHistoryId(historyId === row.id ? null : row.id)} className="p-1.5 text-slate-400 hover:text-[#02b4f5] rounded-lg hover:bg-[#02b4f5]/5" title="Change history">
                        <History className="w-4 h-4" />
                      </button>
                      <button onClick={() => expanded === row.id ? closeEdit() : openEdit(row)} className="p-1.5 text-slate-400 hover:text-[#02665e] rounded-lg hover:bg-[#02665e]/5">
                        {expanded === row.id ? <ChevronUp className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
                {expanded === row.id && draft && (
                  <tr>
                    <td colSpan={7} className="p-0 border-t border-slate-100">
                      <div className="px-4 py-4 bg-slate-50/60 overflow-hidden">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          <EditableField label="Adult foreigner fee/day (USD)" value={draft.adultForeignerFee} type="number" prefix="$" onChange={(v) => setDraft((p: any) => ({ ...p, adultForeignerFee: v }))} />
                          <EditableField label="Adult resident fee/day (USD)" value={draft.adultResidentFee} type="number" prefix="$" onChange={(v) => setDraft((p: any) => ({ ...p, adultResidentFee: v }))} />
                          <EditableField label="Child foreigner fee/day (USD)" value={draft.childForeignerFee ?? 0} type="number" prefix="$" onChange={(v) => setDraft((p: any) => ({ ...p, childForeignerFee: v }))} />
                          <EditableField label="Child resident fee/day (USD)" value={draft.childResidentFee ?? 0} type="number" prefix="$" onChange={(v) => setDraft((p: any) => ({ ...p, childResidentFee: v }))} />
                          <EditableField label="Vehicle fee (USD)" value={draft.vehicleFee ?? 0} type="number" prefix="$" onChange={(v) => setDraft((p: any) => ({ ...p, vehicleFee: v }))} />
                          <EditableField label="Camping fee/night (USD)" value={draft.campingFee ?? 0} type="number" prefix="$" onChange={(v) => setDraft((p: any) => ({ ...p, campingFee: v }))} />
                          <EditableField label="Guide fee (USD)" value={draft.guideFee ?? 0} type="number" prefix="$" onChange={(v) => setDraft((p: any) => ({ ...p, guideFee: v }))} />
                          <EditableField label="Min days" value={draft.minimumDays ?? 1} type="number" onChange={(v) => setDraft((p: any) => ({ ...p, minimumDays: v }))} />
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Active</label>
                            <div className="flex items-center gap-1">
                              <select value={String(draft.isActive)} onChange={(e) => setDraft((p: any) => ({ ...p, isActive: e.target.value === "true" }))}
                                className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30 bg-white">
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                              </select>
                            </div>
                          </div>
                          <div className="md:col-start-2 min-w-0">
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Description</label>
                            <textarea rows={2} value={draft.description ?? ""} onChange={(e) => setDraft((p: any) => ({ ...p, description: e.target.value }))}
                              className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30 resize-none" />
                          </div>
                        </div>
                        <SaveBar saving={saving} error={saveError} onSave={save} onCancel={closeEdit} />
                      </div>
                    </td>
                  </tr>
                )}
                {historyId === row.id && (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <HistoryPanel entity="NOLSCOPE_PARK_FEE" entityId={row.id} label={row.parkName} onClose={() => setHistoryId(null)} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── VISA FEES tab ────────────────────────────────────────────────────────────────

function VisaFeesTab() {
  const [rows, setRows]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [expanded, setExpanded]   = useState<number | null>(null);
  const [historyId, setHistoryId] = useState<number | null>(null);
  const [draft, setDraft]         = useState<any>(null);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState("");
  const [filter, setFilter]       = useState("");
  const [showAdd, setShowAdd]     = useState(false);
  const [newRow, setNewRow]       = useState({ nationality: "", amount: "50", visaType: "tourist", entries: "single", durationDays: "90", processingTime: "on-arrival", description: "" });
  const [adding, setAdding]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const d = await apiFetch("/api/admin/nolscope/visa-fees"); setRows(d.visaFees ?? []); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openEdit(row: any) { setExpanded(row.id); setDraft({ ...row }); setSaveError(""); }
  function closeEdit() { setExpanded(null); setDraft(null); }

  async function save() {
    if (!draft) return;
    setSaving(true); setSaveError("");
    try {
      const { id, nationality, visaType, createdAt, updatedAt, ...rest } = draft;
      const d = await apiFetch(`/api/admin/nolscope/visa-fees/${id}`, { method: "PUT", body: JSON.stringify(rest) });
      setRows((prev) => prev.map((r) => r.id === id ? d.updated : r));
      closeEdit();
    } catch (e: any) { setSaveError(e.message); }
    finally { setSaving(false); }
  }

  async function addNew() {
    if (!newRow.nationality) return;
    setAdding(true);
    try {
      const d = await apiFetch("/api/admin/nolscope/visa-fees", { method: "POST", body: JSON.stringify({ ...newRow, amount: Number(newRow.amount), durationDays: Number(newRow.durationDays) }) });
      setRows((prev) => [...prev, d.created]);
      setShowAdd(false);
      setNewRow({ nationality: "", amount: "50", visaType: "tourist", entries: "single", durationDays: "90", processingTime: "on-arrival", description: "" });
    } catch {}
    finally { setAdding(false); }
  }

  const visible = rows.filter((r) => {
    const q = filter.toLowerCase();
    return !q || r.nationality.toLowerCase().includes(q) || r.description?.toLowerCase().includes(q);
  });

  if (loading) return <Loader2 className="w-5 h-5 animate-spin text-[#02665e] mx-auto mt-8" />;
  if (error)   return <p className="text-sm text-red-600 p-4">{error}</p>;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <input placeholder="Search nationality…" value={filter} onChange={(e) => setFilter(e.target.value)}
          className="flex-1 min-w-[160px] text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30" />
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-[#02665e] text-white rounded-xl hover:bg-[#015a52]">
          <Plus className="w-4 h-4" /> Add country
        </button>
        <button onClick={load} className="p-2 text-slate-400 hover:text-[#02665e] border border-slate-200 rounded-xl"><RefreshCw className="w-4 h-4" /></button>
      </div>
      <p className="text-xs text-slate-400">{visible.length} of {rows.length} visa fee rules</p>

      {/* add form */}
      {showAdd && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
          <h4 className="text-sm font-bold text-emerald-900">New Visa Fee Rule</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Nationality Code (ISO 2)</label>
              <input value={newRow.nationality} onChange={(e) => setNewRow((p) => ({ ...p, nationality: e.target.value.toUpperCase().slice(0,2) }))}
                placeholder="e.g. GB" maxLength={2}
                className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30 font-mono uppercase" />
            </div>
            <EditableField label="Fee (USD)" value={newRow.amount} type="number" prefix="$" onChange={(v) => setNewRow((p) => ({ ...p, amount: v }))} />
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Visa Type</label>
              <select value={newRow.visaType} onChange={(e) => setNewRow((p) => ({ ...p, visaType: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30">
                {["tourist","business","multiple-entry","transit","visa-free"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Entries</label>
              <select value={newRow.entries} onChange={(e) => setNewRow((p) => ({ ...p, entries: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30">
                {["single","double","multiple"].map((e) => <option key={e}>{e}</option>)}
              </select>
            </div>
            <EditableField label="Duration (days)" value={newRow.durationDays} type="number" onChange={(v) => setNewRow((p) => ({ ...p, durationDays: v }))} />
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Processing</label>
              <select value={newRow.processingTime} onChange={(e) => setNewRow((p) => ({ ...p, processingTime: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30">
                {["on-arrival","e-visa","embassy","visa-free"].map((p) => <option key={p}>{p}</option>)}
              </select>
            </div>
            <EditableField label="Description" value={newRow.description} onChange={(v) => setNewRow((p) => ({ ...p, description: v }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button onClick={addNew} disabled={adding || !newRow.nationality} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-[#02665e] text-white rounded-lg hover:bg-[#015a52] disabled:opacity-50">
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Create
            </button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Code</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Fee (USD)</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Type</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Entries</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Processing</th>
              <th className="px-4 py-2.5 text-center text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Status</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {visible.map((row) => (
              <React.Fragment key={row.id}>
                <tr className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-sm font-bold text-slate-800 font-mono">{row.nationality}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-sm font-semibold text-slate-800">{fmtUSD(Number(row.amount))}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{row.visaType}</td>
                  <td className="px-4 py-3 text-xs text-slate-600 capitalize whitespace-nowrap">{row.entries}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{row.processingTime}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge active={row.isActive} /></td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setHistoryId(historyId === row.id ? null : row.id)} className="p-1.5 text-slate-400 hover:text-[#02b4f5] rounded-lg hover:bg-[#02b4f5]/5" title="Change history">
                        <History className="w-4 h-4" />
                      </button>
                      <button onClick={() => expanded === row.id ? closeEdit() : openEdit(row)} className="p-1.5 text-slate-400 hover:text-[#02665e] rounded-lg hover:bg-[#02665e]/5">
                        {expanded === row.id ? <ChevronUp className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
                {expanded === row.id && draft && (
                  <tr>
                    <td colSpan={7} className="p-0 border-t border-slate-100">
                      <div className="px-4 py-4 bg-slate-50/60 overflow-hidden">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          <EditableField label="Fee (USD)" value={draft.amount} type="number" prefix="$" onChange={(v) => setDraft((p: any) => ({ ...p, amount: v }))} />
                          <EditableField label="Entries" value={draft.entries ?? ""} onChange={(v) => setDraft((p: any) => ({ ...p, entries: v }))} />
                          <EditableField label="Duration (days)" value={draft.durationDays ?? 90} type="number" onChange={(v) => setDraft((p: any) => ({ ...p, durationDays: v }))} />
                          <EditableField label="Processing time" value={draft.processingTime ?? ""} onChange={(v) => setDraft((p: any) => ({ ...p, processingTime: v }))} />
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Active</label>
                            <div className="flex items-center gap-1">
                              <select value={String(draft.isActive)} onChange={(e) => setDraft((p: any) => ({ ...p, isActive: e.target.value === "true" }))}
                                className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30 bg-white">
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                              </select>
                            </div>
                          </div>
                          <div className="md:col-start-2 min-w-0">
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Description</label>
                            <textarea rows={2} value={draft.description ?? ""} onChange={(e) => setDraft((p: any) => ({ ...p, description: e.target.value }))}
                              className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30 resize-none" />
                          </div>
                        </div>
                        <SaveBar saving={saving} error={saveError} onSave={save} onCancel={closeEdit} />
                      </div>
                    </td>
                  </tr>
                )}
                {historyId === row.id && (
                  <tr>
                    <td colSpan={7} className="p-0">
                      <HistoryPanel entity="NOLSCOPE_VISA_FEE" entityId={row.id} label={`${row.nationality} – ${row.visaType}`} onClose={() => setHistoryId(null)} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── TRANSPORT tab ────────────────────────────────────────────────────────────────

function TransportTab() {
  const [rows, setRows]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [expanded, setExpanded]   = useState<number | null>(null);
  const [historyId, setHistoryId] = useState<number | null>(null);
  const [draft, setDraft]         = useState<any>(null);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [showAdd, setShowAdd]     = useState(false);
  const [newRow, setNewRow]       = useState({ fromLocation: "", toLocation: "", transportType: "flight", minCost: "0", maxCost: "0", averageCost: "0", provider: "", description: "" });
  const [adding, setAdding]       = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const d = await apiFetch("/api/admin/nolscope/transport-routes"); setRows(d.routes ?? []); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openEdit(row: any) { setExpanded(row.id); setDraft({ ...row }); setSaveError(""); }
  function closeEdit() { setExpanded(null); setDraft(null); }

  async function save() {
    if (!draft) return;
    setSaving(true); setSaveError("");
    try {
      const { id, fromLocation, toLocation, transportType, createdAt, updatedAt, ...rest } = draft;
      const d = await apiFetch(`/api/admin/nolscope/transport-routes/${id}`, { method: "PUT", body: JSON.stringify(rest) });
      setRows((prev) => prev.map((r) => r.id === id ? d.updated : r));
      closeEdit();
    } catch (e: any) { setSaveError(e.message); }
    finally { setSaving(false); }
  }

  async function addNew() {
    if (!newRow.fromLocation || !newRow.toLocation) return;
    setAdding(true);
    try {
      const d = await apiFetch("/api/admin/nolscope/transport-routes", { method: "POST", body: JSON.stringify({ ...newRow, minCost: Number(newRow.minCost), maxCost: Number(newRow.maxCost), averageCost: Number(newRow.averageCost) }) });
      setRows((prev) => [...prev, d.created]);
      setShowAdd(false);
      setNewRow({ fromLocation: "", toLocation: "", transportType: "flight", minCost: "0", maxCost: "0", averageCost: "0", provider: "", description: "" });
    } catch {}
    finally { setAdding(false); }
  }

  const types = [...new Set(rows.map((r) => r.transportType))].sort();
  const visible = typeFilter ? rows.filter((r) => r.transportType === typeFilter) : rows;

  if (loading) return <Loader2 className="w-5 h-5 animate-spin text-[#02665e] mx-auto mt-8" />;
  if (error)   return <p className="text-sm text-red-600 p-4">{error}</p>;

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center flex-wrap">
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30">
          <option value="">All types</option>
          {types.map((t) => <option key={t}>{t}</option>)}
        </select>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-[#02665e] text-white rounded-xl hover:bg-[#015a52]">
          <Plus className="w-4 h-4" /> Add route
        </button>
        <button onClick={load} className="p-2 text-slate-400 hover:text-[#02665e] border border-slate-200 rounded-xl"><RefreshCw className="w-4 h-4" /></button>
        <p className="text-xs text-slate-400">{visible.length} routes</p>
      </div>

      {/* add form */}
      {showAdd && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
          <h4 className="text-sm font-bold text-emerald-900">New Transport Route</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            <EditableField label="From" value={newRow.fromLocation} onChange={(v) => setNewRow((p) => ({ ...p, fromLocation: v }))} />
            <EditableField label="To" value={newRow.toLocation} onChange={(v) => setNewRow((p) => ({ ...p, toLocation: v }))} />
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Transport Type</label>
              <select value={newRow.transportType} onChange={(e) => setNewRow((p) => ({ ...p, transportType: e.target.value }))}
                className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30">
                {["flight","bus","ferry","private-car","shared-taxi","train"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <EditableField label="Min cost (USD)" value={newRow.minCost} type="number" prefix="$" onChange={(v) => setNewRow((p) => { const min = Number(v); const max = Number(p.maxCost); return { ...p, minCost: v, averageCost: String(Math.round((min + max) / 2 * 100) / 100) }; })} />
            <div className="relative">
              <EditableField label="Avg cost (USD)" value={newRow.averageCost} type="number" prefix="$" disabled onChange={(v) => setNewRow((p) => ({ ...p, averageCost: v }))} />
              <span className="absolute top-0 right-0 text-[8px] font-bold text-[#02665e] bg-[#02665e]/10 rounded px-1 py-0.5 leading-none">AUTO</span>
            </div>
            <EditableField label="Max cost (USD)" value={newRow.maxCost} type="number" prefix="$" onChange={(v) => setNewRow((p) => { const max = Number(v); const min = Number(p.minCost); return { ...p, maxCost: v, averageCost: String(Math.round((min + max) / 2 * 100) / 100) }; })} />
            <EditableField label="Provider" value={newRow.provider} onChange={(v) => setNewRow((p) => ({ ...p, provider: v }))} />
            <EditableField label="Description" value={newRow.description} onChange={(v) => setNewRow((p) => ({ ...p, description: v }))} />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
            <button onClick={addNew} disabled={adding || !newRow.fromLocation || !newRow.toLocation} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-[#02665e] text-white rounded-lg hover:bg-[#015a52] disabled:opacity-50">
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Create
            </button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-[#02665e] uppercase tracking-wider">From</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-[#02665e] uppercase tracking-wider">To</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Type</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Min</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Avg</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Max</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Provider</th>
              <th className="px-4 py-2.5 text-center text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Status</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {visible.map((row) => (
              <React.Fragment key={row.id}>
                <tr className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-800 whitespace-nowrap">{row.fromLocation}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-800 whitespace-nowrap">{row.toLocation}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full capitalize whitespace-nowrap">{row.transportType}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-slate-500">{fmtUSD(Number(row.minCost))}</td>
                  <td className="px-4 py-3 text-right text-xs font-semibold text-slate-800">{fmtUSD(Number(row.averageCost))}</td>
                  <td className="px-4 py-3 text-right text-xs text-slate-500">{fmtUSD(Number(row.maxCost))}</td>
                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[180px] truncate">{row.provider ?? "—"}</td>
                  <td className="px-4 py-3 text-center"><StatusBadge active={row.isActive} /></td>
                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setHistoryId(historyId === row.id ? null : row.id)} className="p-1.5 text-slate-400 hover:text-[#02b4f5] rounded-lg hover:bg-[#02b4f5]/5" title="Change history">
                        <History className="w-4 h-4" />
                      </button>
                      <button onClick={() => expanded === row.id ? closeEdit() : openEdit(row)} className="p-1.5 text-slate-400 hover:text-[#02665e] rounded-lg hover:bg-[#02665e]/5">
                        {expanded === row.id ? <ChevronUp className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
                {expanded === row.id && draft && (
                  <tr>
                    <td colSpan={9} className="p-0 border-t border-slate-100">
                      <div className="px-4 py-4 bg-slate-50/60 overflow-hidden">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          <EditableField label="Min cost (USD)" value={draft.minCost} type="number" prefix="$" onChange={(v) => setDraft((p: any) => { const min = Number(v); const max = Number(p.maxCost); return { ...p, minCost: v, averageCost: String(Math.round((min + max) / 2 * 100) / 100) }; })} />
                          <div className="relative">
                            <EditableField label="Avg cost (USD)" value={draft.averageCost} type="number" prefix="$" disabled onChange={(v) => setDraft((p: any) => ({ ...p, averageCost: v }))} />
                            <span className="absolute top-0 right-0 text-[8px] font-bold text-[#02665e] bg-[#02665e]/10 rounded px-1 py-0.5 leading-none">AUTO</span>
                          </div>
                          <EditableField label="Max cost (USD)" value={draft.maxCost} type="number" prefix="$" onChange={(v) => setDraft((p: any) => { const max = Number(v); const min = Number(p.minCost); return { ...p, maxCost: v, averageCost: String(Math.round((min + max) / 2 * 100) / 100) }; })} />
                          <EditableField label="Peak multiplier" value={draft.peakMultiplier ?? 1} type="number" onChange={(v) => setDraft((p: any) => ({ ...p, peakMultiplier: v }))} />
                          <EditableField label="Off-peak multiplier" value={draft.offPeakMultiplier ?? 1} type="number" onChange={(v) => setDraft((p: any) => ({ ...p, offPeakMultiplier: v }))} />
                          <EditableField label="Duration (hours)" value={draft.durationHours ?? ""} type="number" onChange={(v) => setDraft((p: any) => ({ ...p, durationHours: v }))} />
                          <EditableField label="Provider" value={draft.provider ?? ""} onChange={(v) => setDraft((p: any) => ({ ...p, provider: v }))} />
                          <EditableField label="Frequency" value={draft.frequency ?? ""} onChange={(v) => setDraft((p: any) => ({ ...p, frequency: v }))} />
                          <div>
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Active</label>
                            <div className="flex items-center gap-1">
                              <select value={String(draft.isActive)} onChange={(e) => setDraft((p: any) => ({ ...p, isActive: e.target.value === "true" }))}
                                className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30 bg-white">
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                              </select>
                            </div>
                          </div>
                          <div className="md:col-start-2 min-w-0">
                            <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Description</label>
                            <textarea rows={2} value={draft.description ?? ""} onChange={(e) => setDraft((p: any) => ({ ...p, description: e.target.value }))}
                              className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30 resize-none" />
                          </div>
                        </div>
                        <SaveBar saving={saving} error={saveError} onSave={save} onCancel={closeEdit} />
                      </div>
                    </td>
                  </tr>
                )}
                {historyId === row.id && (
                  <tr>
                    <td colSpan={9} className="p-0">
                      <HistoryPanel entity="NOLSCOPE_TRANSPORT" entityId={row.id} label={`${row.fromLocation} → ${row.toLocation}`} onClose={() => setHistoryId(null)} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── SEASONAL RULES tab ───────────────────────────────────────────────────────────────

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function SeasonalTab() {
  const [rows, setRows]           = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [expanded, setExpanded]   = useState<number | null>(null);
  const [historyId, setHistoryId] = useState<number | null>(null);
  const [draft, setDraft]         = useState<any>(null);
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const d = await apiFetch("/api/admin/nolscope/pricing-rules"); setRows(d.pricingRules ?? []); }
    catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function openEdit(row: any) { setExpanded(row.id); setDraft({ ...row }); setSaveError(""); }
  function closeEdit() { setExpanded(null); setDraft(null); }

  async function save() {
    if (!draft) return;
    setSaving(true); setSaveError("");
    try {
      const { id, ruleName, ruleType, createdAt, updatedAt, ...rest } = draft;
      const d = await apiFetch(`/api/admin/nolscope/pricing-rules/${id}`, { method: "PUT", body: JSON.stringify(rest) });
      setRows((prev) => prev.map((r) => r.id === id ? d.updated : r));
      closeEdit();
    } catch (e: any) { setSaveError(e.message); }
    finally { setSaving(false); }
  }

  if (loading) return <Loader2 className="w-5 h-5 animate-spin text-[#02665e] mx-auto mt-8" />;
  if (error)   return <p className="text-sm text-red-600 p-4">{error}</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">{rows.length} pricing rules</p>
        <button onClick={load} className="p-2 text-slate-400 hover:text-[#02665e] border border-slate-200 rounded-xl"><RefreshCw className="w-4 h-4" /></button>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Season</th>
              <th className="px-4 py-2.5 text-right text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Multiplier</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Months</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Destination</th>
              <th className="px-4 py-2.5 text-center text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Status</th>
              <th className="px-3 py-2.5 text-right text-[10px] font-bold text-[#02665e] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((row) => {
              const sm = Number(row.startMonth); const em = Number(row.endMonth);
              const monthRange = sm && em ? `${MONTHS[sm-1]} – ${MONTHS[em-1]}` : "—";
              return (
                <React.Fragment key={row.id}>
                  <tr className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{row.seasonName}</div>
                      {row.description && <div className="text-[10px] text-slate-400 mt-0.5 max-w-[200px] truncate">{row.description}</div>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-full whitespace-nowrap">{Number(row.priceMultiplier)}× rate</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 whitespace-nowrap">{monthRange}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{row.destination ?? <span className="text-slate-300 italic">all</span>}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge active={row.isActive} /></td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setHistoryId(historyId === row.id ? null : row.id)} className="p-1.5 text-slate-400 hover:text-[#02b4f5] rounded-lg hover:bg-[#02b4f5]/5" title="Change history">
                          <History className="w-4 h-4" />
                        </button>
                        <button onClick={() => expanded === row.id ? closeEdit() : openEdit(row)} className="p-1.5 text-slate-400 hover:text-[#02665e] rounded-lg hover:bg-[#02665e]/5">
                          {expanded === row.id ? <ChevronUp className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded === row.id && draft && (
                    <tr>
                      <td colSpan={6} className="p-0 border-t border-slate-100">
                        <div className="px-4 py-4 bg-slate-50/60 overflow-hidden">
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            <EditableField label="Season name" value={draft.seasonName} onChange={(v) => setDraft((p: any) => ({ ...p, seasonName: v }))} />
                            <EditableField label="Price multiplier" value={draft.priceMultiplier} type="number" onChange={(v) => setDraft((p: any) => ({ ...p, priceMultiplier: v }))} />
                            <EditableField label="Priority" value={draft.priority ?? 0} type="number" onChange={(v) => setDraft((p: any) => ({ ...p, priority: v }))} />
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Start month</label>
                              <div className="flex items-center gap-1">
                                <select value={draft.startMonth ?? ""} onChange={(e) => setDraft((p: any) => ({ ...p, startMonth: e.target.value }))}
                                  className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30 bg-white">
                                  <option value="">—</option>
                                  {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">End month</label>
                              <div className="flex items-center gap-1">
                                <select value={draft.endMonth ?? ""} onChange={(e) => setDraft((p: any) => ({ ...p, endMonth: e.target.value }))}
                                  className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30 bg-white">
                                  <option value="">—</option>
                                  {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
                                </select>
                              </div>
                            </div>
                            <EditableField label="Destination (blank = all)" value={draft.destination ?? ""} onChange={(v) => setDraft((p: any) => ({ ...p, destination: v }))} />
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Active</label>
                              <div className="flex items-center gap-1">
                                <select value={String(draft.isActive)} onChange={(e) => setDraft((p: any) => ({ ...p, isActive: e.target.value === "true" }))}
                                  className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30 bg-white">
                                  <option value="true">Active</option>
                                  <option value="false">Inactive</option>
                                </select>
                              </div>
                            </div>
                            <div className="md:col-start-2 min-w-0">
                              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-0.5">Description</label>
                              <textarea rows={2} value={draft.description ?? ""} onChange={(e) => setDraft((p: any) => ({ ...p, description: e.target.value }))}
                                className="w-full text-sm border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#02665e]/30 resize-none" />
                            </div>
                          </div>
                          <SaveBar saving={saving} error={saveError} onSave={save} onCancel={closeEdit} />
                        </div>
                      </td>
                    </tr>
                  )}
                  {historyId === row.id && (
                    <tr>
                      <td colSpan={6} className="p-0">
                        <HistoryPanel entity="NOLSCOPE_PRICING_RULE" entityId={row.id} label={row.seasonName ?? row.ruleName} onClose={() => setHistoryId(null)} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── ROOT component ───────────────────────────────────────────────────────────

export default function NolScopeAdminClient() {
  const [tab, setTab] = useState<Tab>("activities");

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6">
      {/* header */}
      <div className="mb-6 rounded-2xl overflow-hidden shadow-md">
        {/* main banner */}
        <div className="relative bg-gradient-to-r from-[#02665e] via-[#027a71] to-[#02b4f5] px-6 py-6">
          {/* decorative blobs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-8 -right-8 w-48 h-48 rounded-full bg-white/5" />
            <div className="absolute top-4 right-24 w-24 h-24 rounded-full bg-[#02b4f5]/20" />
            <div className="absolute -bottom-10 -left-6 w-36 h-36 rounded-full bg-[#02665e]/40" />
          </div>

          <div className="relative flex items-center gap-4">
            {/* icon */}
            <div className="shrink-0 w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center shadow-lg">
              <Sparkles className="w-7 h-7 text-white" />
            </div>

            {/* text */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-white tracking-tight leading-none mb-1">
                NoLScope Rate Manager
              </h1>
              <p className="text-sm text-white/75 leading-snug">
                Update estimator data. Changes apply immediately to all new estimates
              </p>
            </div>

            {/* stat badge */}
            <div className="hidden sm:flex shrink-0 items-center gap-1.5 bg-white/10 border border-white/20 rounded-xl px-3 py-2 backdrop-blur-sm">
              <TrendingUp className="w-4 h-4 text-white/80" />
              <span className="text-xs font-semibold text-white/90">Live Rates</span>
            </div>
          </div>
        </div>

        {/* notice strip */}
        <div className="flex items-start gap-3 bg-[#02665e]/8 border-t border-[#02665e]/15 px-6 py-3">
          <Shield className="w-4 h-4 text-[#02665e] shrink-0 mt-0.5" />
          <p className="text-xs text-slate-700 leading-relaxed">
            <span className="font-semibold text-[#02665e]">Live pricing:</span>{" "}
            Changes take effect immediately. Deactivating a record removes it from all future estimates. Always verify rates against official sources before saving.
          </p>
        </div>
      </div>

      {/* tabs */}
      <div className="flex flex-wrap gap-1.5 mb-5 bg-white border border-slate-100 rounded-2xl p-1.5 shadow-sm">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              tab === id
                ? "bg-[#02665e] text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
            <span className="sm:hidden">{label.split(" ")[0]}</span>
          </button>
        ))}
      </div>

      {/* tab content */}
      <div>
        {tab === "activities"  && <ActivitiesTab />}
        {tab === "park-fees"   && <ParkFeesTab   />}
        {tab === "visa-fees"   && <VisaFeesTab   />}
        {tab === "transport"   && <TransportTab  />}
        {tab === "seasonal"    && <SeasonalTab   />}
      </div>
    </div>
  );
}
