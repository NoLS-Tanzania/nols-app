"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { Shield, Lock, Key, CheckCircle, AlertCircle, Smartphone, Monitor } from "lucide-react";
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
    <div className="w-full space-y-6">
      {/* LayoutFrame is provided by account/layout.tsx; no-op here */}
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-[#02665e]/10 to-[#014d47]/10 flex items-center justify-center mb-4">
            <Shield className="h-8 w-8 text-[#02665e]" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Security</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your account security settings</p>
        </div>
      </div>

      {/* 2FA Section */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md p-4 sm:p-6 overflow-hidden break-words">
        <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-4 mb-6">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="h-12 w-12 rounded-xl bg-[#02665e]/10 flex items-center justify-center flex-shrink-0 transition-transform duration-200 hover:scale-110">
              <Smartphone className="h-6 w-6 text-[#02665e]" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-lg text-slate-900">Two-Factor Authentication (TOTP)</div>
              <p className="text-sm text-slate-600 mt-1">Add an extra layer of security to your account using a TOTP app (Google Authenticator, Authy).</p>
            </div>
          </div>
          <div className="shrink-0 self-start sm:self-auto">
            <span className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium ring-1 ${me?.twoFactorEnabled ? "text-green-700 ring-green-200 bg-green-50":"text-amber-700 ring-amber-200 bg-amber-50"}`}>
              {me?.twoFactorEnabled ? (
                <>
                  <CheckCircle className="h-3.5 w-3.5" />
                  ENABLED
                </>
              ) : (
                <>
                  <AlertCircle className="h-3.5 w-3.5" />
                  DISABLED
                </>
              )}
            </span>
          </div>
        </div>

        <div className="mt-4">
          {!me?.twoFactorEnabled ? (
            !twofa ? (
              <button 
                className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl bg-[#02665e] text-white font-semibold text-sm hover:bg-[#014d47] hover:shadow-md active:scale-[0.98] transition-all duration-200" 
                onClick={start2FA}
              >
                <Key className="h-4 w-4" />
                Enable TOTP
              </button>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4 items-start w-full">
                <div className="flex justify-center md:justify-start w-full min-w-0">
                  <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-xl overflow-hidden border border-slate-200 bg-white flex items-center justify-center shadow-sm flex-shrink-0">
                    <Image src={twofa.qrDataUrl} alt="TOTP QR" width={160} height={160} className="object-contain" />
                  </div>
                </div>
                <div className="w-full min-w-0">
                  <label className="text-sm grid gap-2 w-full min-w-0">
                    <span className="font-medium text-slate-700">Enter 6-digit code</span>
                    <input 
                      className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-[#02665e]/50 focus:outline-none focus:ring-1 focus:ring-[#02665e]/20 transition-all duration-200 ease-out w-full bg-white min-w-0 max-w-full" 
                      value={code} 
                      onChange={e=>setCode(e.target.value)} 
                      placeholder="000000"
                    />
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3 mt-4 w-full">
                    <button 
                      className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl bg-[#02665e] text-white font-semibold text-sm hover:bg-[#014d47] hover:shadow-md active:scale-[0.98] transition-all duration-200 w-full sm:w-auto" 
                      onClick={verify2FA}
                    >
                      <CheckCircle className="h-4 w-4" />
                      Verify & Enable
                    </button>
                    <button 
                      className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 hover:border-slate-400 active:scale-[0.98] transition-all duration-200 w-full sm:w-auto" 
                      onClick={()=>setTwofa(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )
          ) : (
            <button 
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl border border-red-300 bg-white text-red-700 font-semibold text-sm hover:bg-red-50 hover:border-red-400 active:scale-[0.98] transition-all duration-200" 
              onClick={disable2FA}
            >
              Disable 2FA
            </button>
          )}
        </div>
      </section>

      {/* Password Section */}
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4 mb-6">
          <div className="h-12 w-12 rounded-xl bg-[#02665e]/10 flex items-center justify-center flex-shrink-0 transition-transform duration-200 hover:scale-110">
            <Lock className="h-6 w-6 text-[#02665e]" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0 break-words">
            <div className="font-semibold text-lg text-slate-900 break-words">Change Password</div>
            <p className="text-sm text-slate-600 mt-1 whitespace-normal break-words">Update your account password. Choose a strong, unique password.</p>
          </div>
        </div>

        <form className="space-y-4 w-full" onSubmit={e=>{ e.preventDefault(); changePassword(); }}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
            <div className="min-w-0">
              <Input label="Current password" type="password" value={pwd.currentPassword} onChange={v=>setPwd({...pwd, currentPassword:v})}/>
            </div>
            <div className="min-w-0">
              <Input label="New password" type="password" value={pwd.newPassword} onChange={v=>setPwd({...pwd, newPassword:v})}/>
            </div>
            <div className="min-w-0">
              <Input label="Confirm new password" type="password" value={pwd.confirmPassword} onChange={v=>setPwd({...pwd, confirmPassword:v})}/>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button 
              type="submit" 
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl bg-[#02665e] text-white font-semibold text-sm hover:bg-[#014d47] hover:shadow-md active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#02665e]"
              disabled={!pwd.currentPassword || !pwd.newPassword || !pwd.confirmPassword}
            >
              <Key className="h-4 w-4" />
              Update Password
            </button>
          </div>
        </form>
      </section>

      {/* Sessions list */}
      <Sessions />
    </div>
  );
}

function Input({label, value, onChange, type="text"}:{label:string;value:string;onChange:(v:string)=>void;type?:string}) {
  return (
    <label className="text-sm grid gap-1.5 w-full min-w-0 break-words">
      <span className="font-medium text-slate-700 text-sm break-words">{label}</span>
      <input 
        className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:border-[#02665e]/50 focus:outline-none focus:ring-1 focus:ring-[#02665e]/20 transition-all duration-200 ease-out w-full bg-white min-w-0 max-w-full break-words" 
        type={type} 
        value={value} 
        onChange={e=>onChange(e.target.value)} 
      />
    </label>
  );
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
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="h-12 w-12 rounded-xl bg-[#02665e]/10 flex items-center justify-center flex-shrink-0 transition-transform duration-200 hover:scale-110">
            <Monitor className="h-6 w-6 text-[#02665e]" strokeWidth={2} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-lg text-slate-900">Sessions & Devices</div>
            <p className="text-sm text-slate-600 mt-1">Manage active sessions and devices signed into your account.</p>
          </div>
        </div>
        {list.length > 1 && (
          <button 
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-50 hover:border-slate-400 active:scale-[0.98] transition-all duration-200 whitespace-nowrap flex-shrink-0 self-start sm:self-auto" 
            onClick={revokeOthers}
          >
            Sign out others
          </button>
        )}
      </div>
      <div className="space-y-3 w-full">
        {list.map(s=>(
          <div key={s.id} className="border border-slate-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 hover:border-slate-300 transition-colors w-full min-w-0">
            <div className="flex-1 min-w-0 w-full sm:w-auto overflow-hidden">
              <div className="text-sm font-medium text-slate-900 truncate">Session: <span className="font-mono text-xs">{s.id.slice(0, 8)}...</span></div>
              <div className="text-xs text-slate-600 mt-1 truncate">IP: {s.ip ?? "-"} • {s.userAgent?.slice(0,50) ?? "-"}</div>
            </div>
            <button 
              className="w-full sm:w-auto px-4 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 hover:border-slate-400 active:scale-[0.98] transition-all duration-200 whitespace-nowrap flex-shrink-0" 
              onClick={()=>revoke(s.id)}
            >
              Sign out
            </button>
          </div>
        ))}
        {list.length===0 && (
          <div className="text-sm text-slate-600 text-center py-4">No active sessions</div>
        )}
      </div>
    </section>
  );
}
