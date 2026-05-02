"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import axios from 'axios';
import { AlertCircle, Check, UserPlus, Lock, LogIn, User, Truck, Building2, Mail, ArrowLeft, Phone, Eye, EyeOff, Shield, Fingerprint, ShieldX, AlertTriangle, ChevronDown } from 'lucide-react';
import { useRouter, useSearchParams } from "next/navigation";
import LogoSpinner from "@/components/LogoSpinner";

const COUNTRY_CODES = [
  // East Africa — primary markets
  { code: '+255', country: 'TZ', flag: '🇹🇿', label: 'Tanzania' },
  { code: '+254', country: 'KE', flag: '🇰🇪', label: 'Kenya' },
  { code: '+256', country: 'UG', flag: '🇺🇬', label: 'Uganda' },
  { code: '+250', country: 'RW', flag: '🇷🇼', label: 'Rwanda' },
  // East & Central Africa — expansion
  { code: '+251', country: 'ET', flag: '🇪🇹', label: 'Ethiopia' },
  { code: '+257', country: 'BI', flag: '🇧🇮', label: 'Burundi' },
  { code: '+243', country: 'CD', flag: '🇨🇩', label: 'DR Congo' },
  { code: '+252', country: 'SO', flag: '🇸🇴', label: 'Somalia' },
  { code: '+211', country: 'SS', flag: '🇸🇸', label: 'South Sudan' },
  // Southern Africa
  { code: '+265', country: 'MW', flag: '🇲🇼', label: 'Malawi' },
  { code: '+258', country: 'MZ', flag: '🇲🇿', label: 'Mozambique' },
  { code: '+260', country: 'ZM', flag: '🇿🇲', label: 'Zambia' },
  { code: '+263', country: 'ZW', flag: '🇿🇼', label: 'Zimbabwe' },
  { code: '+27',  country: 'ZA', flag: '🇿🇦', label: 'South Africa' },
  // West & North Africa
  { code: '+234', country: 'NG', flag: '🇳🇬', label: 'Nigeria' },
  { code: '+233', country: 'GH', flag: '🇬🇭', label: 'Ghana' },
  { code: '+212', country: 'MA', flag: '🇲🇦', label: 'Morocco' },
  { code: '+20',  country: 'EG', flag: '🇪🇬', label: 'Egypt' },
  // International
  { code: '+1',   country: 'US', flag: '🇺🇸', label: 'United States' },
  { code: '+44',  country: 'GB', flag: '🇬🇧', label: 'United Kingdom' },
  { code: '+971', country: 'AE', flag: '🇦🇪', label: 'UAE' },
  { code: '+91',  country: 'IN', flag: '🇮🇳', label: 'India' },
  { code: '+86',  country: 'CN', flag: '🇨🇳', label: 'China' },
] as const;

const PHONE_RULES: Record<string, { min: number; max: number; example: string }> = {
  '+255': { min: 9, max: 9, example: '712345678' },
  '+254': { min: 9, max: 9, example: '712345678' },
  '+256': { min: 9, max: 9, example: '712345678' },
  '+250': { min: 9, max: 9, example: '788123456' },
  '+251': { min: 9, max: 9, example: '911234567' },
  '+257': { min: 8, max: 8, example: '79123456' },
  '+243': { min: 9, max: 9, example: '991234567' },
  '+252': { min: 8, max: 9, example: '612345678' },
  '+211': { min: 9, max: 9, example: '912345678' },
  '+265': { min: 9, max: 9, example: '991234567' },
  '+258': { min: 9, max: 9, example: '841234567' },
  '+260': { min: 9, max: 9, example: '971234567' },
  '+263': { min: 9, max: 9, example: '771234567' },
  '+27': { min: 9, max: 9, example: '821234567' },
  '+234': { min: 10, max: 10, example: '8012345678' },
  '+233': { min: 9, max: 9, example: '241234567' },
  '+212': { min: 9, max: 9, example: '612345678' },
  '+20': { min: 10, max: 10, example: '1012345678' },
  '+1': { min: 10, max: 10, example: '2015550123' },
  '+44': { min: 10, max: 10, example: '7400123456' },
  '+971': { min: 9, max: 9, example: '501234567' },
  '+91': { min: 10, max: 10, example: '9876543210' },
  '+86': { min: 11, max: 11, example: '13800138000' },
};

const getPhoneRule = (code: string) => PHONE_RULES[code] || { min: 6, max: 12, example: '123456789' };
const getPhonePlaceholder = (code: string) => getPhoneRule(code).example;
const getCountryLabel = (code: string) => COUNTRY_CODES.find((c) => c.code === code)?.label || 'selected country';
const getPhoneMaxLength = (code: string) => getPhoneRule(code).max;
const sanitizePhoneInput = (value: string, code: string) => value.replace(/[^0-9]/g, '').slice(0, getPhoneMaxLength(code));
const isPhoneLengthValid = (value: string, code: string) => {
  const digits = String(value || '').replace(/[^0-9]/g, '');
  const { min, max } = getPhoneRule(code);
  return digits.length >= min && digits.length <= max;
};
const getPhoneLengthHint = (code: string) => {
  const { min, max } = getPhoneRule(code);
  return min === max ? `Enter ${min} digits for ${getCountryLabel(code)}` : `Enter ${min}-${max} digits for ${getCountryLabel(code)}`;
};

function CountryCodePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = COUNTRY_CODES.find((c) => c.code === value) ?? COUNTRY_CODES[0];

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, close]);

  return (
    <div ref={ref} className="relative w-[122px] min-w-[122px] flex-shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-1.5 rounded-xl border-2 border-slate-800 bg-slate-900/50 px-3 py-2.5 text-sm font-medium text-slate-200 transition-all hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e]"
      >
        <span className="text-base leading-none">{selected.flag}</span>
        <span>{selected.code}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 rounded-xl border border-slate-800 bg-slate-950 ring-1 ring-white/10 shadow-2xl overflow-hidden">
          <div className="max-h-[260px] overflow-y-auto overscroll-contain">
            {COUNTRY_CODES.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => { onChange(c.code); close(); }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors whitespace-nowrap ${
                  c.code === value
                    ? 'bg-[#02665e]/15 text-[#02665e]'
                    : 'text-slate-300 hover:bg-slate-900/80 hover:text-slate-100'
                }`}
              >
                <span className="text-base leading-none">{c.flag}</span>
                <span className="font-medium">{c.code}</span>
                {c.code === value && <Check className="w-3.5 h-3.5 text-[#02665e] flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const referralCode = searchParams?.get('ref') || null;
  const roleParam = (searchParams?.get('role') || '').toLowerCase();
  const modeParam = (searchParams?.get('mode') || '').toLowerCase();
  const nextParamRaw = searchParams?.get('next');
  const api = axios.create({ baseURL: "", withCredentials: true });

  const safeNextPath = (raw: unknown): string | undefined => {
    if (typeof raw !== 'string') return undefined;
    const v = raw.trim();
    if (!v) return undefined;
    if (!v.startsWith('/') || v.startsWith('//')) return undefined;
    return v;
  };

  // Register state
  const [role, setRole] = useState<'traveller' | 'driver' | 'owner'>('traveller');
  const [countryCode, setCountryCode] = useState<string>('+255');
  const [phone, setPhone] = useState<string>('');
  const [otp, setOtp] = useState<string>('');
  const [step, setStep] = useState<'phone' | 'otp' | 'done'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [countdown, setCountdown] = useState<number>(0);
  const otpRef = useRef<HTMLInputElement | null>(null);
  
  // Login state
  const [authMode, setAuthMode] = useState<'register' | 'login' | 'forgot'>('register');
  const [loginPhone, setLoginPhone] = useState<string>('');
  const [loginCountryCode, setLoginCountryCode] = useState<string>('+255');
  const [loginIdentifier, setLoginIdentifier] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginOtp, setLoginOtp] = useState<string>('');
  const [loginSent, setLoginSent] = useState<boolean>(false);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [loginMethod, setLoginMethod] = useState<'phone' | 'credentials'>('phone');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lockoutTotalSeconds, setLockoutTotalSeconds] = useState<number>(0);
  const [lockoutRemainingSeconds, setLockoutRemainingSeconds] = useState<number>(0);
  const [lockoutMessage, setLockoutMessage] = useState<string | null>(null);
  const [passkeyLoading, setPasskeyLoading] = useState<boolean>(false);
  const [blockedAccount, setBlockedAccount] = useState<null | { name: string; email?: string | null; caseRef?: string | null; reason: string; nextSteps: string; payoutMessage: string }>(null);
  
  // Passkey sign-in helper
  const handlePasskeySignIn = async () => {
    setPasskeyLoading(true);
    setError(null);
    try {
      if (typeof PublicKeyCredential === 'undefined') {
        throw new Error('Passkeys are not supported in this browser. Try Chrome, Edge, or Safari.');
      }

      const optRes = await fetch('/api/auth/passkeys/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        credentials: 'include',
      });
      if (!optRes.ok) {
        const d = await optRes.json().catch(() => ({}));
        throw new Error((d as any)?.error || 'Failed to get passkey options');
      }
      const { sessionId, publicKey } = await optRes.json();

      const b64urlToUint8 = (s: string): Uint8Array<ArrayBuffer> => {
        let str = s.replace(/-/g, '+').replace(/_/g, '/');
        const pad = (4 - (str.length % 4)) % 4;
        if (pad) str += '='.repeat(pad);
        const bin = atob(str);
        const buf = new ArrayBuffer(bin.length);
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        return bytes;
      };

      const arrToB64Url = (buf: ArrayBuffer): string => {
        const bytes = new Uint8Array(buf);
        let str = '';
        for (let i = 0; i < bytes.byteLength; i++) str += String.fromCharCode(bytes[i]);
        return btoa(str).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
      };

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: b64urlToUint8(publicKey.challenge),
          rpId: publicKey.rpId,
          timeout: publicKey.timeout ?? 60000,
          userVerification: publicKey.userVerification ?? 'preferred',
          allowCredentials: (publicKey.allowCredentials ?? []).map((c: any) => ({
            ...c,
            id: b64urlToUint8(c.id),
          })),
        },
      });

      if (!credential) throw new Error('No credential returned');
      const credAny = credential as any;

      const assertion = {
        id: credAny.id,
        rawId: arrToB64Url(credAny.rawId),
        type: credAny.type,
        response: {
          authenticatorData: arrToB64Url(credAny.response.authenticatorData),
          clientDataJSON: arrToB64Url(credAny.response.clientDataJSON),
          signature: arrToB64Url(credAny.response.signature),
          userHandle: credAny.response.userHandle ? arrToB64Url(credAny.response.userHandle) : null,
        },
        clientExtensionResults: credAny.getClientExtensionResults ? credAny.getClientExtensionResults() : {},
      };

      const verifyRes = await fetch('/api/auth/passkeys/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, response: assertion }),
        credentials: 'include',
      });
      if (!verifyRes.ok) {
        const d = await verifyRes.json().catch(() => ({}));
        throw new Error((d as any)?.error || 'Passkey verification failed');
      }

      await redirectAfterAuth();
    } catch (e: any) {
      if (e?.name === 'NotAllowedError') {
        setError('No passkey found for this device. Log in with phone or email first, then register your fingerprint under Account → Security → Passkeys.');
      } else {
        setError(e?.message || 'Passkey sign-in failed');
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [forgotPhone, setForgotPhone] = useState<string>('');
  const [forgotCountryCode, setForgotCountryCode] = useState<string>('+255');
  const [forgotOtp, setForgotOtp] = useState<string>('');
  const [forgotMethod, setForgotMethod] = useState<'email' | 'otp'>('email');
  const [forgotStep, setForgotStep] = useState<'input' | 'otp' | 'sent'>('input');
  const [forgotLoading, setForgotLoading] = useState<boolean>(false);
  const [forgotSent, setForgotSent] = useState<boolean>(false);
  const [forgotCountdown, setForgotCountdown] = useState<number>(0);
  const [, setForgotResetToken] = useState<string | null>(null);
  const forgotOtpRef = useRef<HTMLInputElement | null>(null);
  
  const router = useRouter();
  const [visible, setVisible] = useState<boolean>(true);

  const normalizeLoginPhone = (raw: string, code: string = '+255') => {
    const v = String(raw || '').trim().replace(/[^0-9]/g, '');
    if (!v) return '';
    if (String(raw || '').trim().startsWith('+')) return String(raw || '').trim();
    if (v.startsWith('0')) return `${code}${v.slice(1)}`;
    return `${code}${v}`;
  };

  const isLockedOut = lockoutRemainingSeconds > 0;

  const formatRemaining = (seconds: number) => {
    const s = Math.max(0, Math.floor(seconds));
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    const mm = String(mins).padStart(2, '0');
    const ss = String(secs).padStart(2, '0');
    if (hrs > 0) return `${hrs}:${mm}:${ss}`;
    return `${mm}:${ss}`;
  };

  const resolveRoleHome = async () => {
    try {
      const meRes = await fetch('/api/account/me', { credentials: 'include' });
      const meJson = await meRes.json().catch(() => ({}));
      const role = String(meJson?.role || meJson?.data?.role || '').toUpperCase();
      if (role === 'ADMIN') return '/admin/home';
      if (role === 'OWNER') return '/owner';
      if (role === 'DRIVER') return '/driver';
      if (role === 'AGENT') return '/account/agent';
      return '/account';
    } catch {
      return '/account';
    }
  };

  const resolvePostAuthDestination = async () => {
    const safeNext = safeNextPath(nextParamRaw);
    if (safeNext) return safeNext;
    return await resolveRoleHome();
  };

  const redirectAfterAuth = async () => {
    // Give the browser a moment to persist the httpOnly cookie
    await new Promise((r) => setTimeout(r, 100));
    const dest = await resolvePostAuthDestination();
    window.location.href = dest;
  };

  useEffect(() => {
    if (modeParam === 'login') setAuthMode('login');
    else if (modeParam === 'forgot') setAuthMode('forgot');
    else if (modeParam === 'register') setAuthMode('register');
  }, [modeParam]);

  useEffect(() => {
    setBlockedAccount(null);
  }, [authMode, loginMethod]);

  useEffect(() => {
    if (!lockoutUntil) {
      setLockoutRemainingSeconds(0);
      return;
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((lockoutUntil - Date.now()) / 1000));
      setLockoutRemainingSeconds(remaining);
      if (remaining <= 0) {
        setLockoutUntil(null);
        setLockoutTotalSeconds(0);
        setLockoutMessage(null);
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [lockoutUntil]);

  useEffect(() => {
    if (roleParam === 'driver') setRole('driver');
    else if (roleParam === 'owner') setRole('owner');
    else if (roleParam === 'traveller' || roleParam === 'customer' || roleParam === 'user') setRole('traveller');
  }, [roleParam]);

  const sendOtp = async () => {
    setError(null);
    if (!isPhoneLengthValid(phone, countryCode)) {
      setError(getPhoneLengthHint(countryCode));
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: `${countryCode}${phone}`, role }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to send OTP');
      }
      setSuccess('OTP sent. Please check your phone.');
      setStep('otp');
      setCountdown(60);
      const iv = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) {
            clearInterval(iv);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError(null);
    if (!otp || otp.trim().length < 3) {
      setError('Enter the OTP you received');
      return;
    }
    if (!agreed) {
      setError('You must agree to the terms and conditions');
      return;
    }
    setLoading(true);
    try {
      // Verify OTP with API
      const resp = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: `${countryCode}${phone}`, otp, role }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.message || 'OTP verification failed');
      }
      setSuccess('Verified. Account created');
      setStep('done');
      // Include referral code in URL if present
      const onboardUrl = referralCode 
        ? `/account/onboard/${role}?ref=${encodeURIComponent(referralCode)}`
        : `/account/onboard/${role}`;
      setTimeout(() => router.push(onboardUrl), 900);
    } catch (err: any) {
      setError(err?.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (countdown > 0) return;
    await sendOtp();
  };

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => {
      setVisible(true);
      if (step === 'otp' && otpRef.current) {
        try { otpRef.current.focus(); } catch (e) {}
      }
    }, 20);
    return () => clearTimeout(t);
  }, [step]);

  // Register Page
  const renderRegisterPage = () => {
    return (
      <div className="w-full flex flex-col bg-slate-950 relative box-border">
        <div className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur border-b border-slate-800">
          <div className="h-1 bg-[#02665e]" />
          
          <div className="px-6 py-4 border-b border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#02665e]/10 flex items-center justify-center">
                <UserPlus className="w-5 h-5 text-[#02665e]" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-slate-50">Create Account</h1>
                <p className="text-xs text-slate-400 mt-0.5">Sign up to get started</p>
              </div>
              {step !== 'phone' && (
                <div className="px-2.5 py-1 rounded-md bg-slate-900 text-xs font-medium text-slate-200 border border-slate-800">
                  {step === 'otp' ? 'Step 2' : 'Done'}
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-2.5 bg-slate-950">
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full bg-[#02665e] rounded-full transition-all duration-500 ${step === 'phone' ? 'w-1/3' : step === 'otp' ? 'w-2/3' : 'w-full'}`} 
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-4">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-sm text-red-200">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="flex-1">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2.5 text-sm text-emerald-200">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="flex-1">{success}</span>
            </div>
          )}

          <div className={`space-y-3 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            {step === 'phone' && (
              <>
                <div className="space-y-3 min-w-0">
                  <label className="block text-sm font-semibold text-slate-200">Phone Number</label>
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-2.5">
                    <div className="flex items-center gap-2 w-full max-w-full box-border">
                      <CountryCodePicker value={countryCode} onChange={setCountryCode} />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(sanitizePhoneInput(e.target.value, countryCode))}
                        placeholder={getPhonePlaceholder(countryCode)}
                        maxLength={getPhoneMaxLength(countryCode)}
                        className="flex-1 min-w-0 px-4 py-2.5 text-sm font-medium bg-slate-950 text-slate-100 border-2 border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] transition-all duration-200 shadow-sm hover:shadow-md placeholder:text-slate-500 box-border"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-slate-400 rounded-full flex-shrink-0" />
                    <span>We&apos;ll send you a verification code</span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Example for {getCountryLabel(countryCode)}: <span className="font-semibold text-slate-300">{getPhonePlaceholder(countryCode)}</span>
                  </p>
                  {phone.length > 0 && !isPhoneLengthValid(phone, countryCode) ? (
                    <p className="text-[11px] text-amber-300">{getPhoneLengthHint(countryCode)}</p>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-slate-200">I am a</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setRole('traveller')}
                      className={`p-3.5 rounded-2xl border-2 transition-all flex items-center sm:flex-col sm:items-center text-left sm:text-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/20 ${
                        role === 'traveller'
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-100'
                          : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <User className={`w-5 h-5 flex-shrink-0 ${role === 'traveller' ? 'text-blue-300' : 'text-slate-400'}`} />
                      <div className="min-w-0 flex-1 sm:flex-none">
                        <div className="text-sm font-semibold">Traveller</div>
                        <div className="text-[11px] text-slate-400">Book stays</div>
                      </div>
                      {role === 'traveller' && <Check className="w-3.5 h-3.5 text-blue-300 sm:mt-1" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('driver')}
                      className={`p-3.5 rounded-2xl border-2 transition-all flex items-center sm:flex-col sm:items-center text-left sm:text-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/20 ${
                        role === 'driver'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100'
                          : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <Truck className={`w-5 h-5 flex-shrink-0 ${role === 'driver' ? 'text-emerald-300' : 'text-slate-400'}`} />
                      <div className="min-w-0 flex-1 sm:flex-none">
                        <div className="text-sm font-semibold">Driver</div>
                        <div className="text-[11px] text-slate-400">Drive and earn</div>
                      </div>
                      {role === 'driver' && <Check className="w-3.5 h-3.5 text-emerald-300 sm:mt-1" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('owner')}
                      className={`p-3.5 rounded-2xl border-2 transition-all flex items-center sm:flex-col sm:items-center text-left sm:text-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/20 ${
                        role === 'owner'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-100'
                          : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <Building2 className={`w-5 h-5 flex-shrink-0 ${role === 'owner' ? 'text-amber-300' : 'text-slate-400'}`} />
                      <div className="min-w-0 flex-1 sm:flex-none">
                        <div className="text-sm font-semibold">Owner</div>
                        <div className="text-[11px] text-slate-400">List property</div>
                      </div>
                      {role === 'owner' && <Check className="w-3.5 h-3.5 text-amber-300 sm:mt-1" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={sendOtp}
                  disabled={loading || !isPhoneLengthValid(phone, countryCode)}
                  className="w-full mt-5 px-4 py-2.5 bg-[#02665e] text-white text-sm font-medium rounded-lg hover:bg-[#014e47] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <LogoSpinner size="xs" ariaLabel="Sending" className="text-white/90" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    'Send OTP'
                  )}
                </button>
              </>
            )}

            {step === 'otp' && (
              <>
                <div className="space-y-2 min-w-0">
                  <label className="block text-sm font-semibold text-slate-100">Enter OTP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    ref={otpRef}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full max-w-full px-4 py-3 text-xl tracking-[0.35em] text-center font-mono bg-slate-950 text-slate-50 border-2 border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#02665e]/25 focus:border-[#14b8a6] box-border placeholder:text-slate-500 shadow-sm"
                  />
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border-2 border-slate-700 hover:border-slate-600 transition-colors min-w-0 shadow-sm">
                  <label className="flex items-center gap-3 cursor-pointer min-w-0 group">
                    <div className="relative flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(e) => setAgreed(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center ${
                        agreed 
                          ? 'bg-[#02665e] border-[#02665e] shadow-sm' 
                          : 'bg-slate-950 border-slate-600 group-hover:border-[#02665e] shadow-sm ring-1 ring-slate-800'
                      }`}>
                        {agreed && (
                          <Check className="w-3.5 h-3.5 text-white" />
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-slate-200 leading-relaxed min-w-0 break-words flex-1">
                      I agree to the{' '}
                      <a 
                        href="/terms" 
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#02665e] hover:underline font-semibold transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Terms and Conditions
                      </a>
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-between gap-3 min-w-0">
                  <div className="text-xs text-slate-400 min-w-0 flex-shrink-0">
                    {countdown > 0 ? (
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-pulse flex-shrink-0" />
                        <span className="whitespace-nowrap">Resend in {countdown}s</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={resend}
                        className="text-[#02665e] hover:underline font-medium whitespace-nowrap"
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>
                  <button
                    onClick={verifyOtp}
                    disabled={loading || !agreed}
                    className="px-4 py-2.5 bg-[#02665e] text-white text-sm font-semibold rounded-lg hover:bg-[#014e47] transition-colors shadow-[0_0_0_1px_rgba(20,184,166,0.18)] disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 box-border"
                  >
                    {loading ? 'Verifying...' : 'Continue'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    );
  };

  const renderBlockedAccountCard = () => {
    if (!blockedAccount) return null;

    return (
      <div className="mb-4 overflow-hidden rounded-2xl border border-red-200 bg-white shadow-lg">
        <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-5 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
            <ShieldX className="h-9 w-9 text-white" />
          </div>
          <h2 className="text-xl font-bold text-white">Driver Access Revoked</h2>
          <p className="mt-1 text-sm text-red-100">This account cannot access the NoLSAF driver portal right now.</p>
        </div>
        <div className="space-y-4 p-6">
          <div className="rounded-xl border border-red-100 bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-red-500">Account holder</p>
            <p className="mt-1 text-base font-bold text-slate-900">{blockedAccount.name}</p>
            {blockedAccount.email ? <p className="mt-1 text-xs text-slate-500">{blockedAccount.email}</p> : null}
            {blockedAccount.caseRef ? (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-red-500">Reference Number</p>
                <p className="mt-1 font-mono text-xs font-bold text-red-800">{blockedAccount.caseRef}</p>
              </div>
            ) : null}
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
            <div>
              <p className="mb-1 text-sm font-medium text-red-800">Why you cannot access this account</p>
              <p className="text-xs leading-relaxed text-red-700">{blockedAccount.reason}</p>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="mb-2 text-sm font-medium text-slate-800">What to do next</p>
            <p className="text-xs leading-relaxed text-slate-600">
              {blockedAccount.nextSteps}
              {blockedAccount.caseRef ? ` Use reference number ${blockedAccount.caseRef} when contacting support.` : ''}
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="mb-1 text-sm font-medium text-amber-900">Payout handling</p>
            <p className="text-xs leading-relaxed text-amber-800">{blockedAccount.payoutMessage}</p>
          </div>
          <a
            href="mailto:support@nolsaf.com"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-sm font-medium text-white no-underline transition-colors hover:bg-red-700 animate-pulse hover:animate-none"
          >
            Contact Support
          </a>
        </div>
      </div>
    );
  };

  // Login Page
  const renderLoginPage = () => {
    return (
      <div className="w-full flex flex-col bg-slate-950 relative box-border">
        {/* subtle background decoration */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#02665e]/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-[#02b4f5]/10 blur-3xl" />
        <div className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur border-b border-slate-800">
          <div className="h-1 bg-[#02665e]" />
          
          <div className="px-6 py-5 border-b border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#02665e] flex items-center justify-center">
                <LogIn className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-xl font-bold text-slate-50">Sign In</h1>
              </div>
              {loginSent && (
                <div className="px-2.5 py-1 rounded-md bg-slate-900 text-xs font-medium text-slate-200 border border-slate-800">
                  Enter OTP
                </div>
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-200 px-2.5 py-1 text-[11px] font-semibold border border-emerald-500/20">
                <Shield className="h-3.5 w-3.5" />
                <span>Secure sign-in · we never share your details</span>
              </div>
              {!!roleParam && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-900/60 text-slate-200 px-2.5 py-1 text-[11px] font-semibold border border-slate-800">
                  {roleParam === 'driver' ? (
                    <Truck className="h-3.5 w-3.5" />
                  ) : roleParam === 'owner' ? (
                    <Building2 className="h-3.5 w-3.5" />
                  ) : (
                    <User className="h-3.5 w-3.5" />
                  )}
                  <span className="capitalize">{roleParam}</span>
                </div>
              )}

            </div>
          </div>

          <div className="px-6 py-3 bg-slate-950">
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full bg-[#02665e] rounded-full transition-all duration-500 ${loginSent ? 'w-2/3' : 'w-1/3'}`} 
              />
            </div>
          </div>
        </div>

        <div className="px-6 py-5 min-w-0">
          {renderBlockedAccountCard()}

          {isLockedOut && (
            <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-amber-300" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-50">Account temporarily locked</div>
                  <div className="mt-1 text-xs text-slate-300 leading-relaxed">
                    {lockoutMessage ?? 'Too many failed login attempts. Please wait before trying again.'}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="text-xs text-slate-400">Time remaining</div>
                    <div className="font-mono text-sm font-semibold text-amber-300 tabular-nums">
                      {formatRemaining(lockoutRemainingSeconds)}
                    </div>
                  </div>

                  <div className="mt-2 h-2 rounded-full bg-amber-900/40 overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-500"
                      style={{
                        width:
                          lockoutTotalSeconds > 0
                            ? `${Math.max(0, Math.min(100, (lockoutRemainingSeconds / lockoutTotalSeconds) * 100))}%`
                            : '100%',
                      }}
                    />
                  </div>

                  <div className="mt-2 text-[11px] text-slate-500">
                    Tip: If you forgot your password, use “Forgot password?” below.
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-sm text-red-200">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="flex-1 min-w-0 break-words">{error}</span>
            </div>
          )}

          <div className={`space-y-4 transition-opacity duration-300 min-w-0 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            {!loginSent ? (
              <>
                <div className="flex gap-1.5 p-1.5 bg-slate-900/60 ring-1 ring-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setLoginSent(false);
                      setLoginMethod('phone');
                    }}
                    disabled={isLockedOut}
                    className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/20 ${
                      loginMethod === 'phone'
                        ? 'bg-[#02665e] text-white shadow-sm'
                        : 'bg-slate-950 text-slate-200 hover:text-slate-50 border border-slate-800'
                    }`}
                  >
                    Phone
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setLoginSent(false);
                      setLoginMethod('credentials');
                    }}
                    disabled={isLockedOut}
                    className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/20 ${
                      loginMethod === 'credentials'
                        ? 'bg-[#02665e] text-white shadow-sm'
                        : 'bg-slate-950 text-slate-200 hover:text-slate-50 border border-slate-800'
                    }`}
                  >
                    Email
                  </button>
                </div>

                {loginMethod === 'phone' ? (
                  <>
                    <div className="space-y-2.5 min-w-0">
                      <label className="block text-sm font-semibold text-slate-200">Phone Number</label>
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <CountryCodePicker value={loginCountryCode} onChange={setLoginCountryCode} />
                          <input
                            type="tel"
                            value={loginPhone}
                            onChange={(e) => setLoginPhone(sanitizePhoneInput(e.target.value, loginCountryCode))}
                            placeholder={getPhonePlaceholder(loginCountryCode)}
                            maxLength={getPhoneMaxLength(loginCountryCode)}
                            className="flex-1 min-w-0 px-4 py-2.5 text-sm font-medium bg-slate-950 text-slate-100 border-2 border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] transition-all duration-200 shadow-sm hover:shadow-md placeholder:text-slate-500 box-border"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5">
                        <span className="w-1 h-1 bg-slate-400 rounded-full flex-shrink-0" />
                        <span>We&apos;ll send you a verification code</span>
                      </p>
                      {loginPhone.length > 0 && !isPhoneLengthValid(loginPhone, loginCountryCode) ? (
                        <p className="text-[11px] text-amber-300">{getPhoneLengthHint(loginCountryCode)}</p>
                      ) : null}
                    </div>

                    <button
                      onClick={async () => {
                        setLoginLoading(true);
                        try {
                          if (!isPhoneLengthValid(loginPhone, loginCountryCode)) {
                            setError(getPhoneLengthHint(loginCountryCode));
                            return;
                          }

                          const response = await api.post('/api/auth/send-otp', {
                            phone: normalizeLoginPhone(loginPhone, loginCountryCode),
                          });
                          if (response.status === 200) {
                            setSuccess('OTP sent to your phone. Please check and enter the code.');
                            setLoginSent(true);
                          }
                        } catch (err: any) {
                          setError(err?.response?.data?.message || err?.response?.data?.error || 'Failed to send OTP. Please try again.');
                        } finally {
                          setLoginLoading(false);
                        }
                      }}
                      disabled={loginLoading || !isPhoneLengthValid(loginPhone, loginCountryCode)}
                      className="w-full px-4 py-2.5 bg-[#02665e] text-white text-sm font-medium rounded-lg hover:bg-[#014e47] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loginLoading ? 'Sending...' : 'Send OTP'}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="space-y-3 min-w-0">
                      <div className="space-y-2 min-w-0">
                        <label className="block text-sm font-semibold text-slate-200">Email</label>
                        <input
                          type="email"
                          value={loginIdentifier}
                          onChange={(e) => setLoginIdentifier(e.target.value)}
                          placeholder="you@example.com"
                          disabled={isLockedOut}
                          className="w-full max-w-full px-4 py-2.5 text-sm font-medium bg-slate-950 text-slate-100 border-2 border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] transition-all duration-200 shadow-sm hover:shadow-md placeholder:text-slate-500 box-border"
                        />
                      </div>
                      <div className="space-y-2 min-w-0">
                        <label className="block text-sm font-semibold text-slate-200">Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            placeholder="••••••••"
                            disabled={isLockedOut}
                            className="w-full max-w-full px-4 pr-11 py-2.5 text-sm font-medium bg-slate-950 text-slate-100 border-2 border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] transition-all duration-200 shadow-sm hover:shadow-md placeholder:text-slate-500 box-border"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            disabled={isLockedOut}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/20 rounded-md border-none bg-transparent p-1"
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        if (isLockedOut) return;
                        setLoginLoading(true);
                        setError(null);
                        setBlockedAccount(null);
                        try {
                          const email = loginIdentifier.trim();
                          if (!email || !loginPassword) {
                            setError('Please enter your email and password');
                            return;
                          }

                          const r = await fetch('/api/auth/login-password', {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email, password: loginPassword }),
                          });
                          const data = await r.json().catch(() => ({}));
                          if (!r.ok) {
                            const lockedUntil = Number((data as any)?.lockedUntil);
                            const code = String((data as any)?.code || '');
                            if (r.status === 423 || code === 'ACCOUNT_LOCKED' || (Number.isFinite(lockedUntil) && lockedUntil > Date.now())) {
                              const until = Number.isFinite(lockedUntil) ? lockedUntil : Date.now() + 5 * 60 * 1000;
                              const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
                              setLockoutUntil(until);
                              setLockoutTotalSeconds(remaining);
                              setLockoutMessage(String((data as any)?.message || (data as any)?.error || 'Too many failed login attempts.'));
                              setError(null);
                              return;
                            }

                            if (r.status === 403 && code === 'ACCOUNT_SUSPENDED' && (data as any)?.blockedAccount) {
                              setBlockedAccount((data as any).blockedAccount);
                              setError(null);
                              return;
                            }

                            const errorCode = String((data as any)?.error || '');
                            const errorMsg = String((data as any)?.message || '');

                            // DB / service unavailable
                            if (r.status === 503 || errorCode === 'database_unavailable' || (data as any)?.code === 'DATABASE_UNAVAILABLE') {
                              setError('Service temporarily unavailable. Please try again in a moment.');
                              return;
                            }

                            const remainingAttempts = (data as any)?.remainingAttempts;
                            if (r.status === 401 && typeof remainingAttempts === 'number') {
                              const attemptsText = remainingAttempts > 0
                                ? ` ${remainingAttempts} attempt${remainingAttempts !== 1 ? 's' : ''} remaining before temporary lock.`
                                : '';
                              setError(`Incorrect email or password.${attemptsText}`);
                              return;
                            }

                            // Always prefer human message over error code
                            const msg = errorMsg || (errorCode.includes(' ') ? errorCode : null) || `Login failed. Please try again.`;
                            setError(msg);
                            return;
                          }
                          setLockoutUntil(null);
                          setLockoutTotalSeconds(0);
                          setLockoutMessage(null);
                          await redirectAfterAuth();
                        } catch (e: any) {
                          setError(e?.message || 'Failed to sign in');
                        } finally {
                          setLoginLoading(false);
                        }
                      }}
                      disabled={loginLoading || isLockedOut}
                      className="w-full px-4 py-2.5 bg-[#02665e] text-white text-sm font-medium rounded-lg hover:bg-[#014e47] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLockedOut ? `Locked (${formatRemaining(lockoutRemainingSeconds)})` : loginLoading ? 'Signing in...' : 'Sign In'}
                    </button>
                  </>
                )}

                  <button
                  type="button"
                  onClick={() => setAuthMode('forgot')}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900/40 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-900/60 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Forgot password?</span>
                </button>

                <div className="relative flex items-center gap-3 my-1">
                  <div className="flex-1 h-px bg-slate-800" />
                  <span className="text-[11px] text-slate-500 font-medium">or</span>
                  <div className="flex-1 h-px bg-slate-800" />
                </div>

                <div className="flex flex-col items-center gap-2 py-2">
                  <button
                    type="button"
                    onClick={handlePasskeySignIn}
                    disabled={passkeyLoading || isLockedOut}
                    className="w-24 h-24 rounded-2xl bg-slate-100/5 border border-slate-700/60 flex items-center justify-center hover:bg-slate-100/10 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                    aria-label="Tap to login with biometrics"
                  >
                    {passkeyLoading ? (
                      <LogoSpinner size="sm" ariaLabel="Authenticating" className="text-slate-300" />
                    ) : (
                      <Fingerprint className="w-12 h-12 text-slate-300" strokeWidth={1.25} />
                    )}
                  </button>
                  <span className="text-[13px] text-slate-400 font-medium">
                    {passkeyLoading ? 'Authenticating...' : 'Tap to login with biometrics'}
                  </span>
                  <p className="text-center text-[11px] text-slate-600 leading-relaxed px-4">
                    First time?{' '}
                    <span className="text-slate-500">Log in then go to Account → Security → Passkeys to register.</span>
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2 min-w-0">
                  <label className="block text-sm font-semibold text-slate-200">Enter OTP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={loginOtp}
                    onChange={(e) => setLoginOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full max-w-full px-4 py-3 text-lg tracking-widest text-center font-mono bg-slate-950 text-slate-100 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] box-border"
                  />
                </div>
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setLoginSent(false)}
                    className="flex-1 min-w-0 px-3 py-2 text-sm font-semibold text-slate-200 border border-slate-800 rounded-xl hover:bg-slate-900/40 transition-colors box-border"
                  >
                    Edit phone
                  </button>
                    <button
                      onClick={async () => {
                        setLoginLoading(true);
                        setBlockedAccount(null);
                        // Verify login OTP with API
                        try {
                          const response = await api.post('/api/auth/verify-otp', {
                            phone: normalizeLoginPhone(loginPhone, loginCountryCode),
                            otp: loginOtp.trim(),
                          });
                          
                          if (response.status === 200) {
                            // Auth cookie is set httpOnly by the API; redirect to authenticated area.
                            await redirectAfterAuth();
                          }
                        } catch (err: any) {
                          const data = err?.response?.data;
                          if (err?.response?.status === 403 && data?.code === 'ACCOUNT_SUSPENDED' && data?.blockedAccount) {
                            setBlockedAccount(data.blockedAccount);
                            setError(null);
                          } else {
                            setError(data?.error || 'Invalid OTP. Please try again.');
                          }
                      } finally {
                        setLoginLoading(false);
                      }
                      }}
                      disabled={loginLoading || !loginOtp}
                      className="flex-1 min-w-0 px-4 py-2.5 bg-[#02665e] text-white text-sm font-medium rounded-lg hover:bg-[#014e47] transition-colors disabled:opacity-50 disabled:cursor-not-allowed box-border"
                    >
                      {loginLoading ? 'Verifying...' : 'Verify & Sign in'}
                    </button>
                </div>
              </>
            )}
          </div>
        </div>

      </div>
    );
  };

  const renderModeToggleFooter = () => {
    if (authMode === 'register') {
      return (
        <div className="shrink-0 border-t border-slate-800 bg-slate-950/95 px-6 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-slate-100">
            <span className="font-medium text-slate-200">Already have an account?</span>
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-800/90 px-3 py-1.5 font-semibold text-[#14b8a6] shadow-sm transition-colors hover:bg-slate-800"
            >
              <span>Sign in</span>
              <LogIn className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      );
    }

    if (authMode === 'login') {
      return (
        <div className="shrink-0 border-t border-slate-800 bg-slate-950/95 px-6 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-slate-100">
            <span className="font-medium text-slate-200">Don&apos;t have an account?</span>
            <button
              type="button"
              onClick={() => setAuthMode('register')}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-800/90 px-3 py-1.5 font-semibold text-[#14b8a6] shadow-sm transition-colors hover:bg-slate-800"
            >
              <span>Register</span>
              <UserPlus className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  // Email validation helper
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValidEmail = (email: string) => {
    return email.trim().length > 0 && email.includes('@') && emailRe.test(email.trim());
  };

  // Forgot Password Helper Functions
  const sendForgotOtp = async () => {
    setError(null);
    if (!isPhoneLengthValid(forgotPhone, forgotCountryCode)) {
      setError(getPhoneLengthHint(forgotCountryCode));
      return;
    }
    setForgotLoading(true);
    try {
      // Send OTP code (not reset link) for phone-based password reset
      const resp = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: `${forgotCountryCode}${forgotPhone}` }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to send OTP');
      }
      setSuccess('OTP sent to your phone. Please check and enter the code.');
      setForgotStep('otp');
      setForgotCountdown(60);
      const iv = setInterval(() => {
        setForgotCountdown(c => {
          if (c <= 1) {
            clearInterval(iv);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      setTimeout(() => {
        if (forgotOtpRef.current) {
          try { forgotOtpRef.current.focus(); } catch (e) {}
        }
      }, 200);
    } catch (err: any) {
      setError(err?.message || 'Failed to send OTP');
    } finally {
      setForgotLoading(false);
    }
  };

  const verifyForgotOtp = async () => {
    setError(null);
    if (!forgotOtp || forgotOtp.trim().length < 3) {
      setError('Enter the OTP you received');
      return;
    }
    setForgotLoading(true);
    try {

      const resp = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: `${forgotCountryCode}${forgotPhone}`, otp: forgotOtp, role: 'RESET' }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.message || 'Invalid OTP');
      }
      const data = await resp.json();
      // The API returns a link with both token and id, or we can extract from the response
      if (data.link) {
        setForgotResetToken(data.resetToken || '');
        setForgotStep('sent');
        // Use the link from API which includes both token and id
        router.push(data.link);
      } else if (data.resetToken && data.user && data.user.id) {
        // Fallback: construct the link ourselves if API doesn't provide it
        router.push(`/account/reset-password?token=${data.resetToken}&id=${data.user.id}&method=otp`);
      } else {
        throw new Error('Failed to get reset token');
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid OTP');
    } finally {
      setForgotLoading(false);
    }
  };

  const sendForgotEmail = async () => {
    setError(null);
    if (!isValidEmail(forgotEmail)) {
      setError('Please enter a valid email address');
      return;
    }
    setForgotLoading(true);
    try {
      const resp = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to send reset email');
      }
      const data = await resp.json().catch(() => ({}));
      const msg = data?.message || 'If an account exists, an email has been sent.';
      setForgotSent(true);
      setSuccess(msg);
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset email');
    } finally {
      setForgotLoading(false);
    }
  };

  // Forgot Password Page
  const renderForgotPasswordPage = () => {
    return (
      <div className="w-full flex flex-col bg-slate-950 relative box-border">
        <div className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur border-b border-slate-800">
          <div className="h-1 bg-[#02665e]" />
          
          <div className="px-6 py-4 border-b border-slate-800">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  setAuthMode('login');
                  setForgotStep('input');
                  setForgotMethod('email');
                  setForgotEmail('');
                  setForgotPhone('');
                  setForgotOtp('');
                  setForgotSent(false);
                }}
                className="w-10 h-10 rounded-xl border border-slate-800 bg-slate-900/30 flex items-center justify-center hover:bg-slate-900/50 transition-colors flex-shrink-0"
              >
                <ArrowLeft className="w-5 h-5 text-slate-200" />
              </button>
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold text-slate-50">Reset Password</h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  {forgotMethod === 'email' ? 'Enter your email to reset' : 'Enter your phone to reset'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 min-w-0">
          {error && (
            <div className="mb-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2.5 text-sm text-red-200">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="flex-1 min-w-0 break-words">{error}</span>
            </div>
          )}

          {success && !error && (
            <div className="mb-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-2.5 text-sm text-emerald-200">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="flex-1 min-w-0 break-words">{success}</span>
            </div>
          )}

          {/* Method Selection */}
          {forgotStep === 'input' && !forgotSent && (
            <div className="mb-4 flex gap-1.5 p-1.5 bg-slate-900/60 ring-1 ring-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setForgotMethod('email')}
                className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/20 ${
                  forgotMethod === 'email'
                    ? 'bg-[#02665e] text-white shadow-sm'
                    : 'bg-slate-950 text-slate-200 hover:text-slate-50 border border-slate-800'
                }`}
              >
                <Mail className="w-3.5 h-3.5 inline-block mr-1.5" />
                Email
              </button>
              <button
                type="button"
                onClick={() => setForgotMethod('otp')}
                className={`flex-1 px-3 py-2 text-xs font-semibold rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/20 ${
                  forgotMethod === 'otp'
                    ? 'bg-[#02665e] text-white shadow-sm'
                    : 'bg-slate-950 text-slate-200 hover:text-slate-50 border border-slate-800'
                }`}
              >
                <Phone className="w-3.5 h-3.5 inline-block mr-1.5" />
                OTP
              </button>
            </div>
          )}

          {forgotStep === 'sent' && forgotMethod === 'email' ? (
            <div className="space-y-3 min-w-0">
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center min-w-0">
                <Mail className="w-8 h-8 text-emerald-200 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-emerald-100 mb-1">Check your email</h3>
                <p className="text-xs text-emerald-200/90 break-words">
                  If an account with <span className="font-semibold">{forgotEmail}</span> exists, a reset link has been sent.
                </p>
              </div>
              <button
                onClick={() => {
                  setForgotSent(false);
                  setForgotEmail('');
                  setForgotStep('input');
                }}
                className="w-full max-w-full px-4 py-2.5 bg-[#02665e] text-white text-sm font-medium rounded-lg hover:bg-[#014e47] transition-colors box-border"
              >
                Resend Email
              </button>
            </div>
          ) : forgotStep === 'otp' ? (
            <div className="space-y-3 min-w-0">
              <div className="space-y-2 min-w-0">
                <label className="block text-sm font-semibold text-slate-200">Enter OTP</label>
                <input
                  ref={forgotOtpRef}
                  type="text"
                  inputMode="numeric"
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full max-w-full px-4 py-3 text-lg tracking-widest text-center font-mono bg-slate-950 text-slate-100 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] box-border"
                />
                <p className="text-xs text-slate-400 text-center">
                  Code sent to <span className="font-semibold text-slate-300">{forgotCountryCode}{forgotPhone}</span>
                </p>
              </div>
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => {
                    setForgotStep('input');
                    setForgotOtp('');
                  }}
                  className="flex-1 min-w-0 px-3 py-2 text-sm font-semibold text-slate-200 border border-slate-800 rounded-xl hover:bg-slate-900/40 transition-colors box-border"
                >
                  Edit phone
                </button>
                <button
                  onClick={verifyForgotOtp}
                  disabled={forgotLoading || !forgotOtp || forgotOtp.length < 6}
                  className="flex-1 min-w-0 px-4 py-2.5 bg-[#02665e] text-white text-sm font-medium rounded-lg hover:bg-[#014e47] transition-colors disabled:opacity-50 disabled:cursor-not-allowed box-border"
                >
                  {forgotLoading ? 'Verifying...' : 'Verify OTP'}
                </button>
              </div>
              {forgotCountdown > 0 && (
                <button
                  type="button"
                  disabled={true}
                  className="w-full text-xs text-slate-500 py-1"
                >
                  Resend OTP in {forgotCountdown}s
                </button>
              )}
              {forgotCountdown === 0 && forgotStep === 'otp' && (
                <button
                  type="button"
                  onClick={sendForgotOtp}
                  className="w-full text-xs font-semibold text-[#02665e] hover:underline py-1"
                >
                  Resend OTP
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3 min-w-0">
              {forgotMethod === 'email' ? (
                <>
                  <div className="space-y-2 min-w-0">
                    <label className="block text-sm font-semibold text-slate-200">Email Address</label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => {
                        setForgotEmail(e.target.value);
                        setError(null); // Clear error on input change
                      }}
                      placeholder="your@email.com"
                        className={`w-full max-w-full px-4 py-2.5 text-sm font-medium bg-slate-950 text-slate-100 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 box-border transition-all shadow-sm hover:shadow-md placeholder:text-slate-500 ${
                        forgotEmail && !isValidEmail(forgotEmail)
                            ? 'border-red-500/40 focus:border-red-500'
                            : 'border-slate-800 focus:border-[#02665e]'
                      }`}
                    />
                    {forgotEmail && !isValidEmail(forgotEmail) && (
                      <p className="text-xs text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        Please enter a valid email address
                      </p>
                    )}
                  </div>
                  <button
                    onClick={sendForgotEmail}
                    disabled={forgotLoading || !isValidEmail(forgotEmail)}
                    className={`w-full max-w-full px-4 py-2.5 text-white text-sm font-medium rounded-lg transition-colors box-border ${
                      forgotLoading || !isValidEmail(forgotEmail)
                        ? 'bg-slate-800 cursor-not-allowed opacity-60'
                        : 'bg-[#02665e] hover:bg-[#014e47]'
                    }`}
                  >
                    {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </>
              ) : (
                <>
                  <div className="space-y-2.5 min-w-0">
                    <label className="block text-sm font-semibold text-slate-200">Phone Number</label>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <CountryCodePicker value={forgotCountryCode} onChange={setForgotCountryCode} />
                        <input
                          type="tel"
                          value={forgotPhone}
                          onChange={(e) => setForgotPhone(sanitizePhoneInput(e.target.value, forgotCountryCode))}
                          placeholder={getPhonePlaceholder(forgotCountryCode)}
                          maxLength={getPhoneMaxLength(forgotCountryCode)}
                          className="flex-1 min-w-0 px-4 py-2.5 text-sm font-medium bg-slate-950 text-slate-100 border-2 border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] shadow-sm hover:shadow-md placeholder:text-slate-500 box-border"
                        />
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Example for {getCountryLabel(forgotCountryCode)}: <span className="font-semibold text-slate-300">{getPhonePlaceholder(forgotCountryCode)}</span>
                    </p>
                    {forgotPhone.length > 0 && !isPhoneLengthValid(forgotPhone, forgotCountryCode) ? (
                      <p className="text-[11px] text-amber-300">{getPhoneLengthHint(forgotCountryCode)}</p>
                    ) : null}
                  </div>
                  <button
                    onClick={sendForgotOtp}
                    disabled={forgotLoading || !isPhoneLengthValid(forgotPhone, forgotCountryCode)}
                    className="w-full max-w-full px-4 py-2.5 bg-[#02665e] text-white text-sm font-medium rounded-lg hover:bg-[#014e47] transition-colors disabled:opacity-50 disabled:cursor-not-allowed box-border"
                  >
                    {forgotLoading ? 'Sending...' : 'Send OTP'}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setForgotStep('input');
                  setForgotMethod('email');
                  setForgotEmail('');
                  setForgotPhone('');
                  setForgotOtp('');
                  setForgotSent(false);
                }}
                className="w-full max-w-full text-sm font-semibold text-slate-300 hover:text-slate-50 py-2.5 flex items-center justify-center gap-2 transition-colors box-border"
              >
                <ArrowLeft className="w-4 h-4 flex-shrink-0" />
                <span>Back to Sign In</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

    return (
    <main className="min-h-screen flex items-start sm:items-center justify-center bg-gradient-to-br from-slate-100 to-white py-8 px-4">
      <div className="w-full flex items-center justify-center">
          <div className="w-full max-w-[460px]">
            <div className="rounded-[28px] bg-gradient-to-b from-slate-700/30 via-slate-800/20 to-transparent p-px shadow-2xl">
              <div
                style={{ colorScheme: 'dark' }}
                className="flex flex-col rounded-[28px] overflow-hidden bg-slate-950 ring-1 ring-white/10"
              >
                <div className="flex-1">
                  {authMode === 'register'
                    ? renderRegisterPage()
                    : authMode === 'login'
                      ? renderLoginPage()
                      : renderForgotPasswordPage()}
                </div>
                {renderModeToggleFooter()}
              </div>
            </div>
          </div>
      </div>
    </main>
  );
}
