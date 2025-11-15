"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { io, Socket } from "socket.io-client";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });
function authify() {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (t) api.defaults.headers.common["Authorization"] = `Bearer ${t}`;
}

type TabKey = "overview" | "rooms" | "services" | "layout" | "history";

export default function AdminPropertyDetail({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<TabKey>("overview");
  const [busy, setBusy] = useState(false);
  const [rejectReasons, setRejectReasons] = useState<string>("");

  async function load() {
    const r = await api.get(`/admin/properties/${id}`);
    setData(r.data);
  }

  useEffect(() => {
    authify();
    load();
    // socket live refresh (status changes from other admins)
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "";
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const s: Socket = io(url, { auth: token ? { token } : undefined });
    const refreshIfMatch = (evt: any) => {
      if (evt?.id === id) load();
    };
    s.on("admin:property:status", refreshIfMatch);
    return () => {
      s.off("admin:property:status", refreshIfMatch);
      s.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function approve() {
    try {
      setBusy(true);
      await api.post(`/admin/properties/${id}/approve`, { note: "" });
      await load();
      alert("Approved");
    } finally {
      setBusy(false);
    }
  }
  async function reject() {
    if (!rejectReasons.trim()) {
      alert("Enter at least one reason");
      return;
    }
    try {
      setBusy(true);
      const reasons = rejectReasons.split(",").map((s) => s.trim()).filter(Boolean);
      await api.post(`/admin/properties/${id}/reject`, { reasons, note: "" });
      await load();
      alert("Rejected");
      setRejectReasons("");
    } finally {
      setBusy(false);
    }
  }
  async function suspend() {
    const reason = prompt("Reason for suspension?");
    if (!reason) return;
    try {
      setBusy(true);
      await api.post(`/admin/properties/${id}/suspend`, { reason });
      await load();
      alert("Suspended");
    } finally {
      setBusy(false);
    }
  }
  async function unsuspend() {
    try {
      setBusy(true);
      await api.post(`/admin/properties/${id}/unsuspend`);
      await load();
      alert("Unsuspended");
    } finally {
      setBusy(false);
    }
  }

  if (!data) return <div className="p-6">Loading…</div>;

  const chip =
    "px-2 py-1 rounded text-xs border";
  const chipByStatus: Record<string, string> = {
    PENDING: "border-amber-300 text-amber-700 bg-amber-50",
    APPROVED: "border-emerald-300 text-emerald-700 bg-emerald-50",
    REJECTED: "border-rose-300 text-rose-700 bg-rose-50",
    SUSPENDED: "border-gray-300 text-gray-700 bg-gray-50",
    DRAFT: "border-slate-300 text-slate-700 bg-slate-50",
    NEEDS_FIXES: "border-orange-300 text-orange-700 bg-orange-50",
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{data.title}</h1>
          <div className="text-sm opacity-70">
            {data.type} • {data.location?.regionName} • {data.location?.district}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`${chip} ${chipByStatus[data.status] ?? ""}`}>{data.status}</span>
          {data.status === "PENDING" && (
            <>
              <button disabled={busy} onClick={approve} className="px-3 py-1 rounded bg-emerald-600 text-white">
                Approve
              </button>
              <div className="flex items-center gap-2">
                <input
                  className="border rounded px-2 py-1 text-sm"
                  placeholder="Reject reasons (comma-separated)"
                  value={rejectReasons}
                  onChange={(e) => setRejectReasons(e.target.value)}
                />
                <button disabled={busy} onClick={reject} className="px-3 py-1 rounded bg-rose-600 text-white">
                  Reject
                </button>
              </div>
            </>
          )}
          {data.status !== "SUSPENDED" && data.status !== "PENDING" && (
            <button disabled={busy} onClick={suspend} className="px-3 py-1 rounded border">
              Suspend
            </button>
          )}
          {data.status === "SUSPENDED" && (
            <button disabled={busy} onClick={unsuspend} className="px-3 py-1 rounded bg-emerald-600 text-white">
              Unsuspend
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b">
        {([
          ["overview", "Overview"],
          ["rooms", "Rooms & Pricing"],
          ["services", "Services & Nearby"],
          ["layout", "Layout"],
          ["history", "History"],
        ] as [TabKey, string][]).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3 py-2 ${tab === k ? "border-b-2 border-emerald-600 font-medium" : "opacity-70"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              {(data.photos ?? []).map((u: string, i: number) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={u} className="w-full h-32 object-cover rounded border" alt="" />
              ))}
            </div>
            <div className="text-sm">
              <div className="font-medium mb-1">Location</div>
              <div>
                {data.location?.street ?? "-"}, {data.location?.city ?? "-"},{" "}
                {data.location?.regionName ?? "-"} — {data.location?.district ?? "-"}
              </div>
              <div className="opacity-70">
                Lat/Lng: {data.location?.lat ?? "-"}, {data.location?.lng ?? "-"}
              </div>
            </div>
            <div className="text-sm">
              <div className="font-medium mb-1">Owner</div>
              <div>
                {data.owner?.name} • {data.owner?.email}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="border rounded p-3">
              <div className="font-medium">Base Price</div>
              <div className="text-xl">
                {new Intl.NumberFormat(undefined, {
                  style: "currency",
                  currency: data.currency ?? "TZS",
                }).format(data.basePrice ?? 0)}
              </div>
            </div>
            <div className="border rounded p-3">
              <div className="font-medium">Submission</div>
              <div className="text-sm">
                Last submitted:{" "}
                {data.lastSubmittedAt ? new Date(data.lastSubmittedAt).toLocaleString() : "-"}
              </div>
              {data.rejectionReasons?.length > 0 && (
                <div className="text-sm mt-2">
                  <div className="font-medium">Last rejection reasons</div>
                  <ul className="list-disc ml-5">
                    {data.rejectionReasons.map((r: string, i: number) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "rooms" && (
        <div className="space-y-3">
          {(data.roomsSpec ?? []).map((r: any, idx: number) => (
            <div key={idx} className="border rounded p-3">
              <div className="font-medium">
                {r.roomType} • {r.roomsCount} room(s)
              </div>
              <div className="text-xs opacity-70">
                Beds — T{r.beds?.twin} F{r.beds?.full} Q{r.beds?.queen} K{r.beds?.king}
              </div>
              <div className="text-xs opacity-70">Smoking: {r.smoking}, Private bath: {r.bathPrivate}</div>
              <div className="text-xs opacity-70">Price/night: {r.pricePerNight}</div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {(r.roomImages ?? []).map((u: string, i: number) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={u} className="w-20 h-20 object-cover rounded border" alt="" />
                ))}
              </div>
            </div>
          ))}
          {(!data.roomsSpec || data.roomsSpec.length === 0) && (
            <div className="text-sm opacity-70">No room types.</div>
          )}
        </div>
      )}

      {tab === "services" && (
        <div className="grid md:grid-cols-2 gap-4">
          <pre className="text-xs bg-gray-50 p-3 rounded border overflow-auto">
            {JSON.stringify(data.services, null, 2)}
          </pre>
          <div className="space-y-3">
            <div className="font-medium">Nearby Facilities</div>
            <div className="space-y-2">
              {(data.services?.nearbyFacilities ?? []).map((f: any, i: number) => (
                <div key={i} className="border rounded p-3">
                  <div className="font-medium">
                    {f.type}: {f.name}
                  </div>
                  <div className="text-xs opacity-70">Ownership: {f.ownership ?? "-"}</div>
                  <div className="text-xs opacity-70">Distance: {f.distanceKm ?? "-"} km</div>
                  <div className="text-xs opacity-70">
                    Reachable by: {(f.reachableBy ?? []).join(", ") || "-"}
                  </div>
                  {f.url && (
                    <a className="text-xs text-blue-600" href={f.url} target="_blank" rel="noreferrer">
                      Website
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === "layout" && (
        <div className="space-y-2">
          {!data.layout && <div className="text-sm opacity-70">No layout generated.</div>}
          {data.layout && (
            <iframe
              className="w-full h-[520px] border rounded"
              src={`/owner/properties/${id}/layout`} // reuse owner SVG page for preview
            />
          )}
        </div>
      )}

      {tab === "history" && (
        <div className="text-sm opacity-70">Link to audit log view once ready.</div>
      )}
    </div>
  );
}
