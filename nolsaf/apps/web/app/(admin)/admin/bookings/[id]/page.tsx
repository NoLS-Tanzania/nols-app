"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";

// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

export default function AdminBookingDetail({ params }:{ params:{ id:string }}) {
  const id = Number(params.id);
  const [b, setB] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [roomCode, setRoomCode] = useState("");

  const load = React.useCallback(async () => {
    const r = await api.get<any>(`/admin/bookings/${id}`);
    setB(r.data);
    setRoomCode(r.data.roomCode ?? "");
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function confirmBooking(){
    setBusy(true);
    await api.post(`/admin/bookings/${id}/confirm`, { generateCode: true });
    await load(); setBusy(false);
  }
  async function cancel(){
    const reason = prompt("Cancel reason?");
    if (!reason) return;
    setBusy(true);
    await api.post(`/admin/bookings/${id}/cancel`, { reason });
    await load(); setBusy(false);
  }
  async function reassign(){
    if (!roomCode.trim()) { alert("Enter room code"); return; }
    setBusy(true);
    try {
      await api.post(`/admin/bookings/${id}/reassign-room`, { roomCode });
      await load();
    } catch (e:any) {
      alert(e?.response?.data?.error ?? "Reassign failed");
    }
    setBusy(false);
  }
  async function voidCode(){
    if (!b?.code?.id) return;
    if (!window.confirm("Void active code?")) return;
    setBusy(true);
    await api.post(`/admin/bookings/codes/${b.code.id}/void`, { reason: "Voided from admin detail" });
    await load(); setBusy(false);
  }

  if (!b) return <div className="p-6">Loading…</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Booking #{b.id}</h1>
          <div className="text-sm opacity-70">{b.property?.title} • {new Date(b.checkIn).toLocaleString()} → {new Date(b.checkOut).toLocaleString()}</div>
          <div className="text-sm opacity-70">Guest: {b.guestName ?? "-"}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 rounded border text-xs">{b.status}</span>
          {b.status==="NEW" && <button disabled={busy} onClick={confirmBooking} className="px-3 py-1 rounded bg-emerald-600 text-white">Confirm & Generate Code</button>}
          {b.status!=="CANCELED" && <button disabled={busy} onClick={cancel} className="px-3 py-1 rounded border">Cancel</button>}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="md:col-span-2 space-y-3">
          <div className="border rounded p-3">
            <div className="font-medium mb-2">Room Assignment</div>
            <div className="flex items-center gap-2">
              <input className="border rounded px-2 py-1" value={roomCode} onChange={e=>setRoomCode(e.target.value)} placeholder="e.g., A-101" />
              <button disabled={busy} onClick={reassign} className="px-3 py-1 rounded border">Reassign</button>
            </div>
          </div>

          <div className="border rounded p-3">
            <div className="font-medium mb-2">Financials</div>
            <div className="text-sm">Total: {new Intl.NumberFormat().format(b.totalAmount)} TZS</div>
            {(b as any).notes && <div className="text-xs opacity-70 mt-1">{(b as any).notes}</div>}
          </div>
        </div>

        <div className="space-y-3">
          <div className="border rounded p-3">
            <div className="font-medium">Check-in Code</div>
            {b.code?.code ? (
              <div className="space-y-2">
                <div className="text-sm">Code: <span className="font-mono">{b.code.code}</span> <span className="text-xs opacity-70">({b.code.status})</span></div>
                {b.code.status==="ACTIVE" && <button disabled={busy} onClick={voidCode} className="px-3 py-1 rounded border">Void Code</button>}
              </div>
            ) : (
              <div className="text-sm opacity-70">No active code yet. Confirm booking to generate.</div>
            )}
          </div>

          <div className="border rounded p-3">
            <div className="font-medium">Owner</div>
            <div className="text-sm">{b.property?.owner?.name} • {b.property?.owner?.email}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
