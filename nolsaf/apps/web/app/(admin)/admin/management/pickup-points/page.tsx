"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import TableRow from "@/components/TableRow";
import {
  Plane,
  Bus,
  Ship,
  TrainFront,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  X,
  Search,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Lock,
  LockOpen,
} from "lucide-react";

const api = axios.create({ baseURL: "" });

type Category = "airport" | "bus_terminal" | "ferry_port" | "train_station";
type ArrivalType = "FLIGHT" | "BUS" | "TRAIN" | "FERRY" | "OTHER";

interface PickupPoint {
  id: number;
  code: string;
  name: string;
  shortLabel: string;
  city: string;
  category: Category;
  arrivalType: ArrivalType;
  latitude: number;
  longitude: number;
  iataCode: string | null;
  verified: boolean;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_META: Record<Category, { label: string; icon: typeof Plane; arrival: ArrivalType }> = {
  airport: { label: "Airport", icon: Plane, arrival: "FLIGHT" },
  bus_terminal: { label: "Bus terminal", icon: Bus, arrival: "BUS" },
  ferry_port: { label: "Ferry port", icon: Ship, arrival: "FERRY" },
  train_station: { label: "Train station", icon: TrainFront, arrival: "TRAIN" },
};

const EMPTY_FORM = {
  code: "",
  name: "",
  shortLabel: "",
  city: "",
  category: "bus_terminal" as Category,
  arrivalType: "BUS" as ArrivalType,
  latitude: "",
  longitude: "",
  iataCode: "",
  verified: false,
  isActive: true,
};

type Filter = "all" | "unverified" | "locked" | Category;

function isCategoryFilter(f: Filter): f is Category {
  return f === "airport" || f === "bus_terminal" || f === "ferry_port" || f === "train_station";
}

export default function PickupPointsAdminPage() {
  const [items, setItems] = useState<PickupPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);

  const PAGE_SIZE = 12;

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/api/admin/pickup-points", { withCredentials: true });
      setItems(res.data.items || []);
    } catch {
      setError("Could not load pickup points.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((p) => {
      if (filter === "unverified" && p.verified) return false;
      if (filter === "locked" && p.isActive) return false;
      if (isCategoryFilter(filter) && p.category !== filter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        (p.iataCode?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [items, query, filter]);

  const unverifiedCount = items.filter((p) => !p.verified).length;
  const verifiedCount = items.filter((p) => p.verified).length;
  const lockedCount = items.filter((p) => !p.isActive).length;

  // Reset to the first page whenever the result set changes.
  useEffect(() => {
    setPage(1);
  }, [query, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setFormError(null);
    setModalOpen(true);
  }

  function openEdit(p: PickupPoint) {
    setEditingId(p.id);
    setForm({
      code: p.code,
      name: p.name,
      shortLabel: p.shortLabel,
      city: p.city,
      category: p.category,
      arrivalType: p.arrivalType,
      latitude: String(p.latitude),
      longitude: String(p.longitude),
      iataCode: p.iataCode || "",
      verified: p.verified,
      isActive: p.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  }

  async function save() {
    setFormError(null);
    const lat = Number(form.latitude);
    const lng = Number(form.longitude);
    if (!form.name.trim()) return setFormError("Name is required.");
    if (!form.city.trim()) return setFormError("City is required.");
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) return setFormError("Latitude must be between -90 and 90.");
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) return setFormError("Longitude must be between -180 and 180.");

    const payload = {
      code: form.code.trim() || undefined,
      name: form.name.trim(),
      shortLabel: form.shortLabel.trim() || form.name.trim(),
      city: form.city.trim(),
      category: form.category,
      arrivalType: form.arrivalType,
      latitude: lat,
      longitude: lng,
      iataCode: form.iataCode.trim() || null,
      verified: form.verified,
      isActive: form.isActive,
    };

    setSaving(true);
    try {
      if (editingId) {
        await api.put(`/api/admin/pickup-points/${editingId}`, payload, { withCredentials: true });
      } else {
        await api.post("/api/admin/pickup-points", payload, { withCredentials: true });
      }
      setModalOpen(false);
      await load();
    } catch (err: any) {
      setFormError(err?.response?.data?.error || "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: PickupPoint) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/admin/pickup-points/${p.id}`, { withCredentials: true });
      await load();
    } catch {
      alert("Could not delete this pickup point.");
    }
  }

  async function toggleVerified(p: PickupPoint) {
    try {
      await api.put(`/api/admin/pickup-points/${p.id}`, { verified: !p.verified }, { withCredentials: true });
      await load();
    } catch {
      alert("Could not update.");
    }
  }

  // Lock = take the pickup offline (isActive = false) when an area is hard to
  // operate; unlock to restore it. Locked points never reach the app.
  async function toggleActive(p: PickupPoint) {
    try {
      await api.put(`/api/admin/pickup-points/${p.id}`, { isActive: !p.isActive }, { withCredentials: true });
      await load();
    } catch {
      alert("Could not update.");
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#02665e]/10 text-[#02665e]">
              <MapPin className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">Pickup points</h1>
              <p className="mt-1 max-w-xl text-sm text-slate-500">
                Airports, bus terminals, train stations and ferry ports we collect travellers from. These coordinates
                drive driver navigation, so keep them exact.
              </p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-xl bg-[#02665e] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#014e47] transition"
          >
            <Plus className="w-4 h-4" /> Add pickup point
          </button>
        </div>

        {/* Summary */}
        {!loading && !error && (
          <div className="mt-4 flex flex-wrap gap-2">
            <StatChip label="Total" value={items.length} />
            <StatChip label="Verified" value={verifiedCount} tone="emerald" />
            <StatChip label="Needs verifying" value={unverifiedCount} tone="amber" />
            <StatChip label="Locked" value={lockedCount} tone="slate" />
          </div>
        )}
      </div>

      {unverifiedCount > 0 && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
          <p className="text-sm text-amber-800">
            {unverifiedCount} point{unverifiedCount === 1 ? "" : "s"} still carry approximate coordinates. Open each,
            pin the exact location, then mark it verified.
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, city, code or IATA"
            className="box-border w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#02665e]"
          />
        </div>
        {([
          ["all", "All"],
          ["airport", "Airports"],
          ["bus_terminal", "Bus terminals"],
          ["ferry_port", "Ferry ports"],
          ["train_station", "Train stations"],
          ["unverified", "Needs verifying"],
          ["locked", "Locked"],
        ] as [Filter, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              filter === key ? "bg-[#02665e] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="text-center py-16 text-rose-600">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">No pickup points match.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full min-w-[920px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="w-12 px-4 py-2.5" />
                <th className={thCls}>Destination</th>
                <th className={`${thCls} w-44`}>Coordinate</th>
                <th className={`${thCls} w-40`}>Status</th>
                <th className={`${thCls} w-20`}>Map</th>
                <th className={`${thCls} w-[230px] text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((p) => {
                const Icon = CATEGORY_META[p.category].icon;
                return (
                  <TableRow key={p.id} className={`border-t border-slate-100 ${!p.isActive ? "opacity-60" : ""}`}>
                    <td className={tdCls}>
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#02665e]/10 text-[#02665e]">
                        <Icon className="w-4 h-4" />
                      </span>
                    </td>
                    <td className={tdCls}>
                      <div className="font-semibold text-slate-900 truncate max-w-[360px]">{p.name}</div>
                      <div className="text-xs text-slate-500 truncate max-w-[360px]">
                        {p.city} · {p.code}
                        {p.iataCode ? ` · ${p.iataCode}` : ""}
                      </div>
                    </td>
                    <td className={`${tdCls} font-mono text-xs text-slate-600 whitespace-nowrap`}>
                      {p.latitude.toFixed(5)}, {p.longitude.toFixed(5)}
                    </td>
                    <td className={tdCls}>
                      <div className="flex flex-wrap items-center gap-1">
                        {p.verified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                            <ShieldCheck className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                            <AlertTriangle className="w-3 h-3" /> Approx
                          </span>
                        )}
                        {!p.isActive && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            <Lock className="w-3 h-3" /> Locked
                          </span>
                        )}
                      </div>
                    </td>
                    <td className={tdCls}>
                      <a
                        href={`https://www.google.com/maps?q=${p.latitude},${p.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-[#02665e]"
                        title="View on map"
                      >
                        <MapPin className="w-3.5 h-3.5" /> Map <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className={tdCls}>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => toggleVerified(p)}
                          className="rounded-lg px-2 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                          title={p.verified ? "Mark as approximate" : "Mark as verified"}
                        >
                          {p.verified ? "Unverify" : "Verify"}
                        </button>
                        <button
                          onClick={() => toggleActive(p)}
                          className={`rounded-lg p-2 ${p.isActive ? "text-slate-500 hover:bg-slate-100" : "text-amber-600 hover:bg-amber-50"}`}
                          title={p.isActive ? "Lock (take offline)" : "Unlock (bring back online)"}
                        >
                          {p.isActive ? <LockOpen className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </button>
                        <button onClick={() => openEdit(p)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => remove(p)} className="rounded-lg p-2 text-rose-500 hover:bg-rose-50" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </TableRow>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && filtered.length > PAGE_SIZE && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-xs text-slate-500">
            Showing {(safePage - 1) * PAGE_SIZE + 1}-{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-xs font-semibold text-slate-600">
              Page {safePage} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/40 p-0 sm:p-4">
          <div id="pp-modal" className="w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto overflow-x-hidden">
            {/* Preflight is disabled in this project, so inputs default to content-box
                and overflow their columns. Force border-box for the whole modal. */}
            <style>{`#pp-modal, #pp-modal * { box-sizing: border-box !important; }`}</style>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h2 className="font-bold text-slate-900">{editingId ? "Edit pickup point" : "Add pickup point"}</h2>
              <button onClick={() => setModalOpen(false)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <Field label="Name">
                <input className={inputCls} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="John Magufuli Bus Terminal (Mbezi)" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Short label">
                  <input className={inputCls} value={form.shortLabel} onChange={(e) => setForm({ ...form, shortLabel: e.target.value })} placeholder="Magufuli, Dar es Salaam" />
                </Field>
                <Field label="City / area">
                  <input className={inputCls} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Dar es Salaam" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Category">
                  <select
                    className={inputCls}
                    value={form.category}
                    onChange={(e) => {
                      const category = e.target.value as Category;
                      setForm({ ...form, category, arrivalType: CATEGORY_META[category].arrival });
                    }}
                  >
                    <option value="airport">Airport</option>
                    <option value="bus_terminal">Bus terminal</option>
                    <option value="ferry_port">Ferry port</option>
                    <option value="train_station">Train station</option>
                  </select>
                </Field>
                <Field label="Arrival type">
                  <select className={inputCls} value={form.arrivalType} onChange={(e) => setForm({ ...form, arrivalType: e.target.value as ArrivalType })}>
                    <option value="FLIGHT">Flight</option>
                    <option value="BUS">Bus</option>
                    <option value="TRAIN">Train</option>
                    <option value="FERRY">Ferry</option>
                    <option value="OTHER">Other</option>
                  </select>
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Latitude">
                  <input className={inputCls} value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} placeholder="-6.78463" inputMode="decimal" />
                </Field>
                <Field label="Longitude">
                  <input className={inputCls} value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} placeholder="39.10892" inputMode="decimal" />
                </Field>
              </div>
              {Number.isFinite(Number(form.latitude)) && Number.isFinite(Number(form.longitude)) && form.latitude && form.longitude && (
                <a
                  href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-[#02665e] font-semibold"
                >
                  <MapPin className="w-3.5 h-3.5" /> Check this pin on the map <ExternalLink className="w-3 h-3" />
                </a>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="IATA code (airports)">
                  <input className={inputCls} value={form.iataCode} onChange={(e) => setForm({ ...form, iataCode: e.target.value.toUpperCase() })} placeholder="DAR" maxLength={8} />
                </Field>
                <Field label="Code (optional)">
                  <input className={inputCls} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="auto from name" disabled={!!editingId} />
                </Field>
              </div>
              <div className="flex flex-wrap gap-4 pt-1">
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.verified} onChange={(e) => setForm({ ...form, verified: e.target.checked })} />
                  Coordinates verified
                </label>
                <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                  Active (shown in app)
                </label>
              </div>

              {formError && <p className="text-sm text-rose-600">{formError}</p>}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100 sticky bottom-0 bg-white">
              <button onClick={() => setModalOpen(false)} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-[#02665e] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#014e47] disabled:opacity-60"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingId ? "Save changes" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  "box-border w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:border-[#02665e]";

const thCls = "px-4 py-2.5 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500";
const tdCls = "px-4 py-3 align-middle";

function StatChip({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "emerald" | "amber" | "slate";
}) {
  const toneCls = {
    default: "bg-slate-100 text-slate-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-600",
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${toneCls}`}>
      <span className="text-sm font-bold">{value}</span> {label}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="block text-xs font-semibold text-slate-600 mb-1.5">{label}</span>
      {children}
    </label>
  );
}
