"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { Shield, Lock, Key, CheckCircle, AlertCircle, Smartphone, Monitor } from "lucide-react";
// Use same-origin requests (Next rewrites proxy to API in dev) + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

// Generate example password based on role requirements
function generatePasswordExample(role?: string | null): string {
  const minLength = role && (role.toUpperCase() === 'ADMIN' || role.toUpperCase() === 'OWNER') ? 12 : 10;
  
  // Generate a realistic example password that meets all requirements
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const special = '!@#$%&*';
  
  // Build example: Start with uppercase, add lowercase, numbers, special, then fill to minLength
  let example = '';
  example += uppercase[Math.floor(Math.random() * uppercase.length)]; // 1 uppercase
  example += lowercase[Math.floor(Math.random() * lowercase.length)]; // 1 lowercase
  example += numbers[Math.floor(Math.random() * numbers.length)]; // 1 number
  example += special[Math.floor(Math.random() * special.length)]; // 1 special
  
  // Fill remaining with mix of lowercase and numbers to reach minLength
  const remaining = minLength - 4;
  for (let i = 0; i < remaining; i++) {
    const pool = i % 2 === 0 ? lowercase : numbers;
    example += pool[Math.floor(Math.random() * pool.length)];
  }
  
  // Shuffle the characters (except first 4 to ensure requirements are met)
  const chars = example.split('');
  for (let i = 4; i < chars.length; i++) {
    const j = Math.floor(Math.random() * (chars.length - 4)) + 4;
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  
  return chars.join('');
}

// Password validation function (mirrors backend logic)
function validatePasswordStrength(password: string, role?: string | null) {
  const minLength = role && (role.toUpperCase() === 'ADMIN' || role.toUpperCase() === 'OWNER') ? 12 : 10;
  const requireUpper = true;
  const requireLower = true;
  const requireNumber = true;
  const requireSpecial = true;
  const noSpaces = true;

  const reasons: string[] = [];
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  let score = 0;

  if (typeof password !== 'string' || password.length === 0) {
    return { valid: false, reasons: [], strength: 'weak' as const, score: 0 };
  }

  // Check requirements
  if (noSpaces && /\s/.test(password)) reasons.push('Password must not contain spaces');
  if (password.length < minLength) {
    reasons.push(`Password must be at least ${minLength} characters long`);
  } else {
    score += 2;
  }
  
  if (requireUpper && !/[A-Z]/.test(password)) {
    reasons.push('Password must include at least one uppercase letter');
  } else {
    score += 1;
  }
  
  if (requireLower && !/[a-z]/.test(password)) {
    reasons.push('Password must include at least one lowercase letter');
  } else {
    score += 1;
  }
  
  if (requireNumber && !/[0-9]/.test(password)) {
    reasons.push('Password must include at least one digit');
  } else {
    score += 1;
  }
  
  if (requireSpecial && !/[!@#\$%\^&\*\(\)\-_=+\[\]{};:'"\\|,<.>/?`~]/.test(password)) {
    reasons.push('Password must include at least one special character (e.g. !@#$%)');
  } else {
    score += 1;
  }

  // Additional length bonus
  if (password.length >= minLength + 4) score += 1;

  // Determine strength
  if (reasons.length === 0) {
    strength = score >= 6 ? 'strong' : 'medium';
  } else if (reasons.length <= 2) {
    strength = 'medium';
  } else {
    strength = 'weak';
  }

  return { valid: reasons.length === 0, reasons, strength, score };
}

export default function SecurityTab() {
  const [me, setMe] = useState<any>(null);
  const [pwd, setPwd] = useState({ currentPassword:"", newPassword:"", confirmPassword: "" });
  const [twofa, setTwofa] = useState<any>(null); // setup payload
  const [code, setCode] = useState("");
  const [passwordValidation, setPasswordValidation] = useState<{
    valid: boolean;
    reasons: string[];
    strength: 'weak' | 'medium' | 'strong';
    score: number;
  }>({ valid: false, reasons: [], strength: 'weak', score: 0 });
  const [passwordMatch, setPasswordMatch] = useState<boolean | null>(null);
  const [passwordExample, setPasswordExample] = useState<string>('');

  useEffect(() => {
    api.get("/api/account/me").then((r) => {
      // Handle new response structure: { ok: true, data: {...} }
      const meData = r.data?.data || r.data;
      setMe(meData);
      // Generate password example based on role
      if (meData?.role) {
        setPasswordExample(generatePasswordExample(meData.role));
      }
    }).catch(() => setMe(null));
  }, []);

  // Real-time password validation
  useEffect(() => {
    if (pwd.newPassword) {
      const validation = validatePasswordStrength(pwd.newPassword, me?.role);
      setPasswordValidation(validation);
    } else {
      setPasswordValidation({ valid: false, reasons: [], strength: 'weak', score: 0 });
    }

    // Check password match
    if (pwd.confirmPassword) {
      setPasswordMatch(pwd.newPassword === pwd.confirmPassword);
    } else {
      setPasswordMatch(null);
    }
  }, [pwd.newPassword, pwd.confirmPassword, me?.role]);

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
      // Handle new response structure: { ok: true, data: { otpauthUrl, qrDataUrl, secretMasked } }
      const twofaData = r.data?.data || r.data;
      setTwofa(twofaData);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Failed to start TOTP setup.'
      try { window.dispatchEvent(new CustomEvent('nols:toast', { detail: { type: 'error', title: 'Failed to start TOTP', message: msg, duration: 5000 } })); } catch (e) {}
    }
  };
  const verify2FA = async () => {
    try {
      const r = await api.post("/api/account/2fa/totp/verify", { code });
      // Handle new response structure: { ok: true, data: { backupCodes: [...] } }
      const responseData = r.data?.data || r.data;
      const backupCodes = responseData?.backupCodes || [];
      try { window.dispatchEvent(new CustomEvent('nols:toast', { detail: { type: 'success', title: '2FA enabled', message: 'Authenticator enabled. Save your backup codes.', duration: 8000 } })); } catch (e) {}
      // optionally expose backup codes in console for manual copy if UI not available
      // eslint-disable-next-line no-console
      console.info('Backup codes:', backupCodes);
      setTwofa(null); setCode(""); 
      const me2 = await api.get("/api/account/me");
      const meData = me2.data?.data || me2.data;
      setMe(meData);
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
      const me2 = await api.get("/api/account/me");
      const meData = me2.data?.data || me2.data;
      setMe(meData);
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
                    {twofa?.qrDataUrl ? (
                      <Image src={twofa.qrDataUrl} alt="TOTP QR" width={160} height={160} className="object-contain" />
                    ) : (
                      <div className="w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center text-slate-400 text-sm">Loading QR...</div>
                    )}
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
              <div>
                <label className="text-sm grid gap-1.5 w-full min-w-0 break-words">
                  <span className="font-medium text-slate-700 text-sm break-words">New password</span>
                  <input 
                    className={`border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 transition-all duration-300 ease-out w-full bg-white min-w-0 max-w-full break-words ${
                      !pwd.newPassword ? 'border-slate-200 focus:border-[#02665e]/50 focus:ring-[#02665e]/20' :
                      passwordValidation.strength === 'strong' ? 'border-green-500 focus:border-green-600 focus:ring-green-200' :
                      passwordValidation.strength === 'medium' ? 'border-yellow-500 focus:border-yellow-600 focus:ring-yellow-200' :
                      'border-red-300 focus:border-red-400 focus:ring-red-200'
                    }`}
                    type="password" 
                    value={pwd.newPassword} 
                    onChange={e=>setPwd({...pwd, newPassword:e.target.value})}
                  />
                </label>
                {/* Password Strength Feedback */}
                {pwd.newPassword ? (
                  <div className="mt-2 space-y-1.5">
                    <div className={`text-xs font-medium transition-colors duration-300 ${
                      passwordValidation.strength === 'strong' ? 'text-green-600' :
                      passwordValidation.strength === 'medium' ? 'text-yellow-600' :
                      'text-gray-500'
                    }`}>
                      {passwordValidation.strength === 'strong' && '✓ Strong password'}
                      {passwordValidation.strength === 'medium' && '⚠ Password needs improvement'}
                      {passwordValidation.strength === 'weak' && pwd.newPassword.length > 0 && 'Password is too weak'}
                    </div>
                    {passwordValidation.reasons.length > 0 && (
                      <ul className="text-xs space-y-1 mt-1.5">
                        {passwordValidation.reasons.map((reason, idx) => (
                          <li key={idx} className={`flex items-start gap-1.5 ${
                            passwordValidation.strength === 'medium' ? 'text-yellow-700' : 'text-gray-600'
                          }`}>
                            <span className="mt-0.5">•</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    <div className="text-xs text-slate-600 font-medium">
                      Password requirements:
                    </div>
                    <div className="text-xs text-slate-500 space-y-1">
                      <div className="flex items-center gap-2">
                        <span>•</span>
                        <span>At least {me?.role && (me.role.toUpperCase() === 'ADMIN' || me.role.toUpperCase() === 'OWNER') ? '12' : '10'} characters</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>•</span>
                        <span>One uppercase letter (A-Z)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>•</span>
                        <span>One lowercase letter (a-z)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>•</span>
                        <span>One number (0-9)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>•</span>
                        <span>One special character (!@#$%&*)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>•</span>
                        <span>No spaces</span>
                      </div>
                    </div>
                    {passwordExample && (
                      <div className="mt-2 pt-2 border-t border-slate-200">
                        <div className="text-xs text-slate-600 font-medium mb-1">
                          Example of a strong password:
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono bg-slate-100 px-2 py-1 rounded border border-slate-200 text-slate-700">
                            {passwordExample}
                          </code>
                          <button
                            type="button"
                            onClick={() => setPasswordExample(generatePasswordExample(me?.role))}
                            className="text-xs text-[#02665e] hover:text-[#014d47] font-medium underline transition-colors"
                          >
                            Generate new
                          </button>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 italic">
                          (This is just an example - create your own unique password)
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="min-w-0">
              <div>
                <label className="text-sm grid gap-1.5 w-full min-w-0 break-words">
                  <span className="font-medium text-slate-700 text-sm break-words">Confirm new password</span>
                  <input 
                    className={`border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 transition-all duration-300 ease-out w-full bg-white min-w-0 max-w-full break-words ${
                      !pwd.confirmPassword ? 'border-slate-200 focus:border-[#02665e]/50 focus:ring-[#02665e]/20' :
                      passwordMatch === true ? 'border-green-500 focus:border-green-600 focus:ring-green-200' :
                      passwordMatch === false ? 'border-red-500 focus:border-red-600 focus:ring-red-200' :
                      'border-slate-200 focus:border-[#02665e]/50 focus:ring-[#02665e]/20'
                    }`}
                    type="password" 
                    value={pwd.confirmPassword} 
                    onChange={e=>setPwd({...pwd, confirmPassword:e.target.value})}
                  />
                </label>
                {/* Password Match Feedback */}
                {pwd.confirmPassword && (
                  <div className="mt-2">
                    <div className={`text-xs font-medium transition-colors duration-300 ${
                      passwordMatch === true ? 'text-green-600' :
                      passwordMatch === false ? 'text-red-600' :
                      'text-gray-500'
                    }`}>
                      {passwordMatch === true && '✓ Passwords match'}
                      {passwordMatch === false && '✗ Passwords do not match'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button 
              type="submit" 
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-3 rounded-xl bg-[#02665e] text-white font-semibold text-sm hover:bg-[#014d47] hover:shadow-md active:scale-[0.98] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#02665e]"
              disabled={!pwd.currentPassword || !pwd.newPassword || !pwd.confirmPassword || !passwordValidation.valid || passwordMatch !== true}
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
  
  const loadSessions = async () => {
    try {
      const r = await api.get("/api/account/sessions");
      // Handle new response structure: { ok: true, data: { sessions: [], pagination: {} } }
      // or old structure: array directly
      let sessions: any[] = [];
      if (r.data?.data?.sessions && Array.isArray(r.data.data.sessions)) {
        sessions = r.data.data.sessions;
      } else if (r.data?.sessions && Array.isArray(r.data.sessions)) {
        sessions = r.data.sessions;
      } else if (Array.isArray(r.data)) {
        sessions = r.data;
      }
      setList(sessions);
    } catch {
      setList([]);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const revoke = async (id: string) => {
    try {
      await api.post("/api/account/sessions/revoke", { sessionId: id });
      setList(list.filter((s) => s.id !== id));
    } catch (error) {
      console.error('Failed to revoke session', error);
    }
  };

  const revokeOthers = async () => {
    try {
      await api.post("/api/account/sessions/revoke-others", {});
      await loadSessions();
    } catch (error) {
      console.error('Failed to revoke other sessions', error);
    }
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
