"use client";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { io, Socket } from "socket.io-client";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });
function authify(){ const t = typeof window!=="undefined" ? localStorage.getItem("token"):null; if(t) api.defaults.headers.common["Authorization"]=`Bearer ${t}`;}

type Owner = {
  id:number; name:string|null; email:string; phone:string|null;
  suspendedAt:string|null; kycStatus:string; createdAt:string;
  profile?: any;
  _count: { properties:number };
};

type Snapshot = {
  propertiesRecent: { id:number; title:string; status:string; type:string; createdAt:string }[];
  invoicesCount: number;
  revenue: { netSum:number; grossSum:number; commissionSum:number; paidCount:number };
};

type Doc = { id:number; type:string; url:string; status:string; reason?:string|null; createdAt:string };

export default function OwnerDetailPage({ params }: { params: { id: string }}) {
  const ownerId = Number(params.id);
  const [owner, setOwner] = useState<Owner|null>(null);
  const [snap, setSnap] = useState<Snapshot|null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview"|"properties"|"documents"|"notes">("overview");
  const [note, setNote] = useState("");

  async function load() {
    const r = await api.get<{ owner:Owner; snapshot:Snapshot }>(`/admin/owners/${ownerId}`);
    setOwner(r.data.owner); setSnap(r.data.snapshot); setLoading(false);
  }
  async function loadDocs(){
    const r = await api.get<{ items:Doc[] }>(`/admin/owners/${ownerId}/documents`);
    setDocs(r.data.items);
  }

  useEffect(()=>{ authify(); load(); loadDocs(); },[ownerId]);

  // live updates
  useEffect(()=>{
    // Use direct API URL for Socket.IO in browser to ensure WebSocket works in dev
    const url = typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000")
      : (process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "");
    const token = typeof window!=="undefined" ? localStorage.getItem("token"):null;
    const s: Socket = io(url, { auth: token? { token } : undefined });
    const refresh = ()=>{ load(); loadDocs(); };
    s.on("admin:owner:updated", (p:any)=>{ if(p?.ownerId===ownerId) refresh(); });
    s.on("admin:kyc:updated", (p:any)=>{ if(p?.ownerId===ownerId) refresh(); });
    return ()=>{ s.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[ownerId]);

  if (loading || !owner || !snap) return <div className="p-6">Loading…</div>;

  async function suspend(){
    await api.post(`/admin/owners/${ownerId}/suspend`, { reason: "Policy breach" });
    await load();
  }
  async function unsuspend(){
    await api.post(`/admin/owners/${ownerId}/unsuspend`);
    await load();
  }
  async function kycApprove(){
    await api.post(`/admin/owners/${ownerId}/kyc/approve`, { note: "Docs OK" });
    await load();
  }
  async function kycReject(){
    const reason = prompt("Reason for rejection?") || "";
    await api.post(`/admin/owners/${ownerId}/kyc/reject`, { reason });
    await load();
  }
  async function impersonate(){
    const r = await api.post<{token:string; expiresIn:number}>(`/admin/owners/${ownerId}/impersonate`);
    navigator.clipboard.writeText(r.data.token);
    alert("Temporary OWNER token copied to clipboard (10 min). Use in a private tab for support.");
  }
  async function addNote(){
    if(!note.trim()) return;
    await api.post(`/admin/owners/${ownerId}/notes`, { text: note.trim() });
    setNote("");
    alert("Note added.");
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{owner.name ?? `Owner #${owner.id}`}</h1>
          <div className="text-sm opacity-70">{owner.email} • {owner.phone ?? "-"}</div>
        </div>
        <div className="flex gap-2">
          {owner.suspendedAt
            ? <button onClick={unsuspend} className="px-3 py-1 rounded border">Unsuspend</button>
            : <button onClick={suspend} className="px-3 py-1 rounded border">Suspend</button>}
          <button onClick={kycApprove} className="px-3 py-1 rounded border">Approve KYC</button>
          <button onClick={kycReject} className="px-3 py-1 rounded border">Reject KYC</button>
          <button onClick={impersonate} className="px-3 py-1 rounded bg-emerald-600 text-white">Impersonate</button>
        </div>
      </div>

      <div className="flex gap-3 border-b">
        {(["overview","properties","documents","notes"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} className={`px-3 py-2 ${tab===t?"border-b-2 border-emerald-600 font-medium":""}`}>{t[0].toUpperCase()+t.slice(1)}</button>
        ))}
      </div>

      {tab==="overview" && (
        <div className="grid md:grid-cols-3 gap-3">
          <div className="border rounded-xl p-4 bg-white">
            <div className="text-xs opacity-70">KYC</div>
            <div className="text-lg font-semibold">{owner.kycStatus}</div>
            <div className="mt-2 text-xs">{owner.suspendedAt ? "Suspended" : "Active"}</div>
            <div className="mt-2 text-xs">Joined: {new Date(owner.createdAt).toLocaleDateString()}</div>
          </div>
          <div className="border rounded-xl p-4 bg-white">
            <div className="text-xs opacity-70">Invoices (paid)</div>
            <div className="text-lg font-semibold">{snap.revenue.paidCount}</div>
            <div className="mt-2 text-xs">Gross: {fmt(snap.revenue.grossSum)}</div>
            <div className="mt-1 text-xs">Commission: {fmt(snap.revenue.commissionSum)}</div>
            <div className="mt-1 text-xs">Net: <b>{fmt(snap.revenue.netSum)}</b></div>
          </div>
          <div className="border rounded-xl p-4 bg-white">
            <div className="text-xs opacity-70">Recent properties</div>
            <div className="mt-2 space-y-2">
              {snap.propertiesRecent.map(p=>(
                <div key={p.id} className="text-sm">
                  <a href={`/admin/properties/${p.id}`} className="font-medium">{p.title}</a>
                  <div className="opacity-70 text-xs">{p.type} • {p.status}</div>
                </div>
              ))}
              {snap.propertiesRecent.length===0 && <div className="opacity-60 text-sm">None</div>}
            </div>
          </div>
        </div>
      )}

      {tab==="properties" && (
        <div className="text-sm opacity-70">Quick link: <a className="underline" href={`/admin/properties?ownerId=${ownerId}`}>View all properties</a></div>
      )}

      {tab==="documents" && (
        <div className="grid gap-2">
          {docs.map(d=>(
            <div key={d.id} className="border rounded-xl p-3 bg-white flex items-center justify-between">
              <div>
                <div className="font-medium text-sm">{d.type}</div>
                <div className="text-xs opacity-70">{new Date(d.createdAt).toLocaleString()}</div>
                <div className="text-xs opacity-70">Status: {d.status}{d.reason? ` • ${d.reason}`:""}</div>
              </div>
              <div className="flex items-center gap-2">
                <a className="px-3 py-1 rounded border" href={d.url} target="_blank">Open</a>
                <button className="px-3 py-1 rounded border" onClick={()=>docApprove(ownerId, d.id)}>Approve</button>
                <button className="px-3 py-1 rounded border" onClick={()=>docReject(ownerId, d.id)}>Reject</button>
              </div>
            </div>
          ))}
          {docs.length===0 && <div className="opacity-60 text-sm">No documents.</div>}
        </div>
      )}

      {tab==="notes" && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <input className="border rounded px-2 py-1 flex-1" placeholder="Write a private note (visible to admins only)" value={note} onChange={e=>setNote(e.target.value)} />
            <button className="px-3 py-1 rounded bg-emerald-600 text-white" onClick={addNote}>Add</button>
          </div>
          <div className="text-xs opacity-70">Notes are logged with your admin ID and timestamp.</div>
        </div>
      )}
    </div>
  );
}

async function docApprove(ownerId:number, docId:number){
  await api.post(`/admin/owners/${ownerId}/documents/${docId}/approve`);
  alert("Approved.");
  location.reload();
}
async function docReject(ownerId:number, docId:number){
  const reason = prompt("Reason?") || "";
  await api.post(`/admin/owners/${ownerId}/documents/${docId}/reject`, { reason });
  alert("Rejected.");
  location.reload();
}
function fmt(n:any){ return new Intl.NumberFormat(undefined,{ style:"currency", currency:"TZS" }).format(Number(n||0)); }
