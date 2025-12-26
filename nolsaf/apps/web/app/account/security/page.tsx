"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
// Use same-origin requests (Next rewrites proxy to API in dev) + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

export default function SecurityTab() {
  const [me, setMe] = useState<any>(null);
  const [pwd, setPwd] = useState({ currentPassword:"", newPassword:"", confirmPassword: "" });
  const [twofa, setTwofa] = useState<any>(null); // setup payload
  const [code, setCode] = useState("");

  useEffect(() => {
    api.get("/api/account/me").then((r) => setMe(r.data)).catch(() => setMe(null));
  }, []);

  const changePassword = async () => {
    if (pwd.newPassword !== pwd.confirmPassword) { alert('Passwords do not match'); return; }
    try {
      await api.post("/api/account/password/change", { currentPassword: pwd.currentPassword, newPassword: pwd.newPassword });
      alert("Password changed");
      setPwd({ currentPassword:"", newPassword:"", confirmPassword: "" });
    } catch (err: any) {
      const reasons = err?.response?.data?.reasons;
      if (Array.isArray(reasons) && reasons.length) {
        alert('Password change failed:\n' + reasons.join('\n'))
      } else {
        alert(err?.response?.data?.error || err?.message || String(err))
      }
    }
  };
  const start2FA = async () => {
    try {
      const r = await api.post("/api/account/2fa/totp/setup");
      setTwofa(r.data);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to start TOTP setup.'
      try { window.dispatchEvent(new CustomEvent('nols:toast', { detail: { type: 'error', title: 'Failed to start TOTP', message: msg, duration: 5000 } })); } catch (e) {}
    }
  };
  const verify2FA = async () => {
    try {
      const r = await api.post<{ backupCodes: string[] }>("/api/account/2fa/totp/verify", { code });
      try { window.dispatchEvent(new CustomEvent('nols:toast', { detail: { type: 'success', title: '2FA enabled', message: 'Authenticator enabled. Save your backup codes.', duration: 8000 } })); } catch (e) {}
      // optionally expose backup codes in console for manual copy if UI not available
      // eslint-disable-next-line no-console
      console.info('Backup codes:', r.data.backupCodes);
      setTwofa(null); setCode(""); const me2 = await api.get("/api/account/me"); setMe(me2.data);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to enable authenticator.'
      try { window.dispatchEvent(new CustomEvent('nols:toast', { detail: { type: 'error', title: 'Failed to enable authenticator', message: msg, duration: 6000 } })); } catch (e) {}
    }
  };
  const disable2FA = async () => {
    const c = prompt("Enter TOTP code or a backup code to disable:");
    if (!c) return;
    try {
      await api.post("/api/account/2fa/disable", { code: c });
      try { window.dispatchEvent(new CustomEvent('nols:toast', { detail: { type: 'success', title: '2FA disabled', message: 'Two-factor authentication disabled.', duration: 4500 } })); } catch (e) {}
      const me2 = await api.get("/api/account/me"); setMe(me2.data);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to disable 2FA.'
      try { window.dispatchEvent(new CustomEvent('nols:toast', { detail: { type: 'error', title: 'Failed to disable 2FA', message: msg, duration: 4500 } })); } catch (e) {}
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Security</h1>

      {/* 2FA */}
  <section className="bg-white ring-1 ring-gray-100 rounded-2xl p-6 transition-colors">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="font-semibold text-lg text-gray-800">Two-Factor Authentication (TOTP)</div>
            <p className="text-sm text-gray-600 mt-1">Add an extra layer of security to your account using a TOTP app (Google Authenticator, Authy).</p>
          </div>
          <div className="shrink-0">
            <span className={`inline-block text-xs px-3 py-1 rounded-full font-medium ring-1 ${me?.twoFactorEnabled ? "text-green-700 ring-green-100 bg-green-50":"text-yellow-700 ring-yellow-100 bg-yellow-50"}`}>
              {me?.twoFactorEnabled ? "ENABLED" : "DISABLED"}
            </span>
          </div>
        </div>

        <div className="mt-4">
          {!me?.twoFactorEnabled ? (
            !twofa ? (
              <div>
                <button className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" onClick={start2FA}>Enable TOTP</button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6 mt-4 items-start">
                <div>
                  <div className="w-48 h-48 rounded-xl overflow-hidden ring-1 ring-gray-100 bg-white flex items-center justify-center">
                    <Image src={twofa.qrDataUrl} alt="TOTP QR" width={160} height={160} className="object-contain" />
                  </div>
                </div>
                <div>
                  <label className="text-sm block mb-2">
                    <div className="text-gray-700">Enter 6-digit code</div>
                    <input className="mt-1 w-full border rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-100" value={code} onChange={e=>setCode(e.target.value)} />
                  </label>
                  <div className="flex gap-3">
                    <button className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" onClick={verify2FA}>Verify & Enable</button>
                    <button className="px-4 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50" onClick={()=>setTwofa(null)}>Cancel</button>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="mt-3">
              <button className="px-3 py-2 rounded-xl border" onClick={disable2FA}>Disable 2FA</button>
            </div>
          )}
        </div>
      </section>

      {/* Password */}
      <section className="bg-white border rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="font-medium text-lg">Change Password</div>
            <p className="text-sm text-gray-600 mt-1">Update your account password. Choose a strong, unique password.</p>
          </div>
        </div>

        <form className="mt-4 grid md:grid-cols-2 gap-4" onSubmit={e=>{ e.preventDefault(); changePassword(); }}>
          <Input label="Current password" type="password" value={pwd.currentPassword} onChange={v=>setPwd({...pwd, currentPassword:v})}/>
          <Input label="New password" type="password" value={pwd.newPassword} onChange={v=>setPwd({...pwd, newPassword:v})}/>
          <div className="md:col-span-2">
            <Input label="Confirm new password" type="password" value={pwd.confirmPassword} onChange={v=>setPwd({...pwd, confirmPassword:v})}/>
          </div>
          <div className="md:col-span-2 flex justify-end">
            <button type="submit" className="px-3 py-2 rounded-xl bg-brand-primary text-white">Update Password</button>
          </div>
        </form>
      </section>

      {/* Sessions list */}
      <Sessions />
    </div>
  );
}
function Input({label, value, onChange, type="text"}:{label:string;value:string;onChange:(v:string)=>void;type?:string}) {
  return <label className="text-sm grid gap-1">
    <span className="opacity-70">{label}</span>
    <input className="border rounded-xl px-3 py-2" type={type} value={value} onChange={e=>onChange(e.target.value)} />
  </label>;
}
function Sessions(){
  const [list,setList]=useState<any[]>([]);
  useEffect(() => {
    (async () => {
      try {
        const r = await api.get<any[]>("/api/account/sessions");
        setList(r.data);
      } catch {
        setList([]);
      }
    })();
  }, []);
  const revoke = async (id: string) => {
    await api.post("/api/account/sessions/revoke", { sessionId: id });
    setList(list.filter((s) => s.id !== id));
  };
  const revokeOthers = async () => {
    await api.post("/api/account/sessions/revoke-others", {});
    const me = await api.get<any[]>("/api/account/sessions");
    setList(me.data);
  };
  return (
    <div className="bg-white border rounded-2xl p-3">
      <div className="flex items-center justify-between">
        <div className="font-medium">Sessions & Devices</div>
        <button className="px-3 py-1 rounded-xl border" onClick={revokeOthers}>Sign out others</button>
      </div>
      <div className="mt-2 grid gap-2">
        {list.map(s=>(
          <div key={s.id} className="border rounded-xl px-3 py-2 flex items-center justify-between text-sm">
            <div>
              <div>Session: <b>{s.id}</b></div>
              <div className="opacity-70">IP: {s.ip ?? "-"} • {s.userAgent?.slice(0,50) ?? "-"}</div>
            </div>
            <button className="px-2 py-1 rounded-lg border" onClick={()=>revoke(s.id)}>Sign out</button>
          </div>
        ))}
        {list.length===0 && <div className="text-sm opacity-70">No active sessions</div>}
      </div>
    </div>
  );
}
