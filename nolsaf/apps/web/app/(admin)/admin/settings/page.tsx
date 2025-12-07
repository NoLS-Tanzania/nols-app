"use client";
import AdminPageHeader from "@/components/AdminPageHeader";
import { Settings as SettingsIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import axios from "axios";

// Use same-origin relative paths so Next.js rewrites proxy to the API in dev
const api = axios.create({ baseURL: "" });

export default function AdminSettings() {
  const [s,setS]=useState<any>(null);
  const [tab,setTab]=useState<"financial"|"numbering"|"branding"|"notifications"|"security"|"users">("financial");

  useEffect(()=>{ const t=localStorage.getItem("token"); if(t) api.defaults.headers.common["Authorization"]=`Bearer ${t}`; api.get("/admin/settings").then(r=>setS(r.data)); },[]);
  const save = async () => { await api.put("/admin/settings", s); alert("Saved"); };

  if (!s) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Settings"
        subtitle="Manage platform settings and preferences"
        breadcrumb={[{ label: "Admin", href: "/admin" }, { label: "Settings" }]}
        icon={<SettingsIcon className="h-5 w-5" />}
      />

      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">System Settings</h1>

        <div className="flex gap-2">
          {["financial","numbering","branding","notifications","security","users"].map(t=>(
            <button key={t} className={`px-3 py-2 rounded-xl border ${tab===t?"bg-brand-primary text-white":""}`} onClick={()=>setTab(t as any)}>{t}</button>
          ))}
        </div>

        {tab==="financial" && <Financial s={s} setS={setS} />}
        {tab==="numbering"  && <Numbering  s={s} setS={setS} />}
        {tab==="branding"   && <Branding   s={s} setS={setS} />}
        {tab==="notifications" && <Notifications s={s} setS={setS} />}
        {tab==="security"   && <Security   s={s} setS={setS} />}
        {tab==="users"      && <Users />}

        <button className="px-3 py-2 rounded-xl bg-brand-primary text-white" onClick={save}>Save</button>
      </div>
    </div>
  );
}

function Financial({s,setS}:{s:any;setS:any}){
  return <div className="bg-white border rounded-2xl p-3 grid md:grid-cols-3 gap-3">
    <Num label="Commission %" value={s.commissionPercent} onChange={v=>setS({...s, commissionPercent:v})}/>
    <Num label="Tax %" value={s.taxPercent} onChange={v=>setS({...s, taxPercent:v})}/>
    <Input label="Currency" value={s.currency} onChange={v=>setS({...s, currency:v})}/>
  </div>;
}
function Numbering({s,setS}:{s:any;setS:any}){
  return <div className="bg-white border rounded-2xl p-3 grid md:grid-cols-2 gap-3">
    <Input label="Invoice prefix" value={s.invoicePrefix} onChange={v=>setS({...s, invoicePrefix:v})}/>
    <Num label="Invoice next seq" value={s.invoiceSeq} onChange={v=>setS({...s, invoiceSeq:v})}/>
    <Input label="Receipt prefix" value={s.receiptPrefix} onChange={v=>setS({...s, receiptPrefix:v})}/>
    <Num label="Receipt next seq" value={s.receiptSeq} onChange={v=>setS({...s, receiptSeq:v})}/>
  </div>;
}
function Branding({s,setS}:{s:any;setS:any}){
  return <div className="bg-white border rounded-2xl p-3 grid md:grid-cols-2 gap-3">
    <Input label="Brand color primary" value={s.brandColorPrimary||""} onChange={v=>setS({...s, brandColorPrimary:v})}/>
    <Input label="Brand color secondary" value={s.brandColorSecondary||""} onChange={v=>setS({...s, brandColorSecondary:v})}/>
    <Input label="Logo URL" value={s.brandLogoUrl||""} onChange={v=>setS({...s, brandLogoUrl:v})}/>
    <Input label="Logo (dark) URL" value={s.brandLogoDarkUrl||""} onChange={v=>setS({...s, brandLogoDarkUrl:v})}/>
  </div>;
}
function Notifications({s,setS}:{s:any;setS:any}){
  return <div className="bg-white border rounded-2xl p-3 grid md:grid-cols-2 gap-3">
    <Toggle label="Email enabled" value={s.emailEnabled} onChange={v=>setS({...s, emailEnabled:v})}/>
    <Toggle label="SMS enabled" value={s.smsEnabled} onChange={v=>setS({...s, smsEnabled:v})}/>
  </div>;
}
function Security({s,setS}:{s:any;setS:any}){
  return <div className="bg-white border rounded-2xl p-3 grid md:grid-cols-2 gap-3">
    <Toggle label="Require admin 2FA" value={s.requireAdmin2FA} onChange={v=>setS({...s, requireAdmin2FA:v})}/>
    <Num label="Min password length" value={s.minPasswordLength} onChange={v=>setS({...s, minPasswordLength:v})}/>
    <Num label="Session idle minutes" value={s.sessionIdleMinutes} onChange={v=>setS({...s, sessionIdleMinutes:v})}/>
    <Input label="Admin IP allowlist (CSV CIDRs)" value={s.ipAllowlist||""} onChange={v=>setS({...s, ipAllowlist:v})}/>
  </div>;
}
function Users(){
  const [q,setQ]=useState(""); const [list,setList]=useState<any[]>([]);
  const load = useCallback(async ()=>{
    try {
      const r = await api.get<any[]>(`/admin/settings/users`, {
        params:{q}
      });
      setList(r.data || []);
    } catch (err: any) {
      console.error('Failed to load users:', err);
      setList([]);
    }
  }, [q]);
  useEffect(()=>{ load(); },[load]);
  const changeRole=async(id:number,role:string)=>{
    try {
      await api.post(`/admin/settings/users/${id}/role`,{role});
      load();
    } catch (err: any) {
      console.error('Failed to change role:', err);
      alert('Failed to change user role. Please try again.');
    }
  };
  return <div className="bg-white border rounded-2xl p-3">
    <div className="flex gap-2">
      <input className="border rounded-xl px-3 py-2" placeholder="Search users..." value={q} onChange={e=>setQ(e.target.value)} />
      <button className="px-3 py-2 rounded-xl border" onClick={load}>Search</button>
    </div>
    <div className="mt-3 grid gap-2">
      {list.map(u=>(
        <div key={u.id} className="border rounded-xl px-3 py-2 flex items-center justify-between text-sm">
          <div>
            <div className="font-medium">{u.fullName} — {u.email}</div>
            <div className="opacity-70">Role: {u.role} • 2FA: {u.twoFactorEnabled ? "ON":"OFF"}</div>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1 rounded-xl border" onClick={()=>changeRole(u.id, u.role==="ADMIN"?"OWNER":"ADMIN")}>
              Make {u.role==="ADMIN"?"OWNER":"ADMIN"}
            </button>
          </div>
        </div>
      ))}
      {list.length===0 && <div className="text-sm opacity-70">No users</div>}
    </div>
  </div>;
}

function Input({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){ return <label className="text-sm grid gap-1"><span className="opacity-70">{label}</span><input className="border rounded-xl px-3 py-2" value={value} onChange={e=>onChange(e.target.value)} /></label>; }
function Num({label,value,onChange}:{label:string;value:number;onChange:(v:number)=>void}){ return <label className="text-sm grid gap-1"><span className="opacity-70">{label}</span><input type="number" className="border rounded-xl px-3 py-2" value={value} onChange={e=>onChange(Number(e.target.value))} /></label>; }
function Toggle({label,value,onChange}:{label:string;value:boolean;onChange:(v:boolean)=>void}){ return <label className="text-sm grid gap-2 items-center"><span className="opacity-70">{label}</span><input type="checkbox" checked={value} onChange={e=>onChange(e.target.checked)} /></label>; }
