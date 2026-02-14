"use client";

import { useState, useEffect, useRef } from "react";
import axios from 'axios';
import { AlertCircle, Check, UserPlus, Lock, LogIn, User, Truck, Building2, Mail, ArrowLeft, Phone, Eye, EyeOff, Shield } from 'lucide-react';
import { useRouter, useSearchParams } from "next/navigation";
import LogoSpinner from "@/components/LogoSpinner";

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

  const normalizeLoginPhone = (raw: string) => {
    const v = String(raw || '').trim();
    if (!v) return '';
    if (v.startsWith('+')) return v;
    // Tanzania-friendly default for local numbers
    if (v.startsWith('0')) return `+255${v.slice(1)}`;
    if (/^\d+$/.test(v) && v.length <= 12) return `+255${v}`;
    return v;
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
    if (!phone || phone.trim().length < 5) {
      setError('Please enter a valid phone number');
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
      setSuccess('Verified — account created');
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
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-sm text-red-800">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="flex-1">{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2.5 text-sm text-emerald-800">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="flex-1">{success}</span>
            </div>
          )}

          <div className={`space-y-3 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            {step === 'phone' && (
              <>
                <div className="space-y-2.5 min-w-0">
                  <label className="block text-sm font-semibold text-slate-200">Phone Number</label>
                  <div className="relative flex items-center border-2 border-slate-800 rounded-xl overflow-hidden focus-within:border-[#02665e] focus-within:ring-2 focus-within:ring-[#02665e]/20 transition-all duration-200 shadow-sm hover:shadow-md w-full max-w-full box-border bg-slate-950">
                    <div className="flex items-center px-3 py-2.5 bg-slate-900/50 border-r-2 border-slate-800 relative flex-shrink-0">
                      <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="country-code-select text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer text-slate-200 pr-0"
                      >
                        <option value="+255">+255</option>
                        <option value="+1">+1</option>
                        <option value="+256">+256</option>
                        <option value="+254">+254</option>
                      </select>
                    </div>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                      placeholder="712345678"
                      className="flex-1 min-w-0 px-4 py-2.5 text-sm font-medium focus:outline-none placeholder:text-slate-500 bg-transparent text-slate-100 box-border"
                    />
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1.5">
                    <span className="w-1 h-1 bg-slate-400 rounded-full flex-shrink-0" />
                    <span>We&apos;ll send you a verification code</span>
                  </p>
                </div>

                <div className="space-y-2.5">
                  <label className="block text-sm font-medium text-slate-200">I am a</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setRole('traveller')}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/20 ${
                        role === 'traveller'
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-100'
                          : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <User className={`w-5 h-5 mb-1.5 ${role === 'traveller' ? 'text-blue-300' : 'text-slate-400'}`} />
                      <div className="text-xs font-semibold">Traveller</div>
                      {role === 'traveller' && (
                        <Check className="w-3.5 h-3.5 mt-1.5 text-blue-300" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('driver')}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/20 ${
                        role === 'driver'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100'
                          : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <Truck className={`w-5 h-5 mb-1.5 ${role === 'driver' ? 'text-emerald-300' : 'text-slate-400'}`} />
                      <div className="text-xs font-semibold">Driver</div>
                      {role === 'driver' && (
                        <Check className="w-3.5 h-3.5 mt-1.5 text-emerald-300" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('owner')}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/20 ${
                        role === 'owner'
                          ? 'bg-amber-500/10 border-amber-500/30 text-amber-100'
                          : 'bg-slate-950 border-slate-800 text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <Building2 className={`w-5 h-5 mb-1.5 ${role === 'owner' ? 'text-amber-300' : 'text-slate-400'}`} />
                      <div className="text-xs font-semibold">Owner</div>
                      {role === 'owner' && (
                        <Check className="w-3.5 h-3.5 mt-1.5 text-amber-300" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  onClick={sendOtp}
                  disabled={loading}
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
                  <label className="block text-sm font-semibold text-slate-200">Enter OTP</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    ref={otpRef}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full max-w-full px-4 py-3 text-xl tracking-widest text-center font-mono bg-slate-950 text-slate-100 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] box-border"
                  />
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border-2 border-slate-800 hover:border-slate-700 transition-colors min-w-0">
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
                    <span className="text-xs text-slate-300 leading-relaxed min-w-0 break-words flex-1">
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
                  <div className="text-xs text-slate-600 min-w-0 flex-shrink-0">
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
                    className="px-4 py-2.5 bg-[#02665e] text-white text-sm font-medium rounded-lg hover:bg-[#014e47] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 box-border"
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

  // Login Page
  const renderLoginPage = () => {
    return (
      <div className="w-full flex flex-col bg-slate-950 relative box-border">
        {/* subtle background decoration */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-[#02665e]/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-slate-900/5 blur-3xl" />
        <div className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur border-b border-slate-800">
          <div className="h-1 bg-[#02665e]" />
          
          <div className="px-6 py-5 border-b border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-[#02665e]/10 flex items-center justify-center">
                <LogIn className="w-5 h-5 text-[#02665e]" />
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
                <span>Secure sign-in</span>
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
              <div className="text-[11px] text-slate-400">We never share your details.</div>
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
          {isLockedOut && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-amber-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-50">Account temporarily locked</div>
                  <div className="mt-1 text-xs text-slate-700 leading-relaxed">
                    {lockoutMessage ?? 'Too many failed login attempts. Please wait before trying again.'}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="text-xs text-slate-600">Time remaining</div>
                    <div className="font-mono text-sm font-semibold text-amber-800 tabular-nums">
                      {formatRemaining(lockoutRemainingSeconds)}
                    </div>
                  </div>

                  <div className="mt-2 h-2 rounded-full bg-amber-100 overflow-hidden">
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
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-sm text-red-800">
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
                      <div className="relative w-full">
                        <input
                          type="tel"
                          value={loginPhone}
                          onChange={(e) => setLoginPhone(e.target.value.replace(/[^0-9]/g, ''))}
                          placeholder="712345678"
                          className="w-full max-w-full px-4 py-2.5 text-sm font-medium bg-slate-950 text-slate-100 border-2 border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] transition-all duration-200 shadow-sm hover:shadow-md placeholder:text-slate-500 box-border"
                        />
                      </div>
                      <p className="text-xs text-slate-400 flex items-center gap-1.5">
                        <span className="w-1 h-1 bg-slate-400 rounded-full flex-shrink-0" />
                        <span>We&apos;ll send you a verification code</span>
                      </p>
                    </div>

                    <button
                      onClick={async () => {
                        setLoginLoading(true);
                        try {
                          const response = await api.post('/api/auth/send-otp', {
                            phone: normalizeLoginPhone(loginPhone),
                          });
                          if (response.status === 200) {
                            setSuccess('OTP sent to your phone. Please check and enter the code.');
                            setLoginSent(true);
                          }
                        } catch (err: any) {
                          setError(err?.response?.data?.error || 'Failed to send OTP. Please try again.');
                        } finally {
                          setLoginLoading(false);
                        }
                      }}
                      disabled={loginLoading}
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

                            const remainingAttempts = (data as any)?.remainingAttempts;
                            if (r.status === 401 && typeof remainingAttempts === 'number') {
                              setError(`Incorrect email or password. ${remainingAttempts} attempt(s) remaining before temporary lock.`);
                              return;
                            }

                            const msg = data?.error || data?.message || `Login failed (${r.status})`;
                            setError(String(msg));
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
                        // Verify login OTP with API
                        try {
                          const response = await api.post('/api/auth/verify-otp', {
                            phone: normalizeLoginPhone(loginPhone),
                            otp: loginOtp.trim(),
                          });
                          
                          if (response.status === 200) {
                            // Auth cookie is set httpOnly by the API; redirect to authenticated area.
                            await redirectAfterAuth();
                          }
                        } catch (err: any) {
                          setError(err?.response?.data?.error || 'Invalid OTP. Please try again.');
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
        <div className="shrink-0 px-6 py-3 border-t border-slate-800 bg-slate-950/90 backdrop-blur">
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-slate-300">
            <span className="whitespace-nowrap">Already have an account?</span>
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className="whitespace-nowrap font-semibold text-[#02665e] hover:underline transition-colors inline-flex items-center gap-1"
            >
              <span>Sign in</span>
              <LogIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      );
    }

    if (authMode === 'login') {
      return (
        <div className="shrink-0 px-6 py-3 border-t border-slate-800 bg-slate-950/90 backdrop-blur">
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-slate-300">
            <span className="whitespace-nowrap">Don&apos;t have an account?</span>
            <button
              type="button"
              onClick={() => setAuthMode('register')}
              className="whitespace-nowrap font-semibold text-[#02665e] hover:underline transition-colors inline-flex items-center gap-1"
            >
              <span>Register</span>
              <UserPlus className="w-3.5 h-3.5" />
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
    if (!forgotPhone || forgotPhone.trim().length < 5) {
      setError('Please enter a valid phone number');
      return;
    }
    setForgotLoading(true);
    try {
      // Call API to send password reset OTP
      const response = await api.post('/api/auth/forgot-password', {
        phone: forgotPhone.trim(),
      });
      
      if (response.status === 200) {
        setSuccess('OTP sent to your phone. Please check and enter the code.');
        setForgotStep('otp');
        setForgotCountdown(300); // 5 minutes countdown
        setForgotLoading(false);
        setTimeout(() => {
          if (forgotOtpRef.current) {
            try { forgotOtpRef.current.focus(); } catch (e) {}
          }
        }, 200);
        return;
      }

      const resp = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: `${forgotCountryCode}${forgotPhone}`, role: 'RESET' }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to send OTP');
      }
      setSuccess('OTP sent. Please check your phone.');
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
      setForgotSent(true);
      setSuccess('Reset link sent. Please check your email.');
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
                  We&apos;ve sent a password reset link to {forgotEmail}
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
                  OTP sent to {forgotCountryCode}{forgotPhone}
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
                  <div className="space-y-2 min-w-0">
                    <label className="block text-sm font-semibold text-slate-200">Phone Number</label>
                    <div className="flex gap-2 min-w-0">
                      <select
                        value={forgotCountryCode}
                        onChange={(e) => setForgotCountryCode(e.target.value)}
                        className="px-3 py-2.5 text-sm font-medium border-2 border-slate-800 rounded-xl bg-slate-900/50 text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] country-code-select flex-shrink-0"
                      >
                        <option value="+255">+255</option>
                        <option value="+256">+256</option>
                        <option value="+254">+254</option>
                        <option value="+250">+250</option>
                        <option value="+251">+251</option>
                      </select>
                      <input
                        type="tel"
                        value={forgotPhone}
                        onChange={(e) => setForgotPhone(e.target.value.replace(/[^0-9]/g, ''))}
                        placeholder="7XX XXX XXX"
                        className="flex-1 min-w-0 px-4 py-2.5 text-sm font-medium bg-slate-950 text-slate-100 border-2 border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] shadow-sm hover:shadow-md placeholder:text-slate-500 box-border"
                      />
                    </div>
                  </div>
                  <button
                    onClick={sendForgotOtp}
                    disabled={forgotLoading || !forgotPhone || forgotPhone.length < 5}
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
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 to-slate-900 py-8 px-4 text-slate-100">
      <div className="w-full flex items-center justify-center">
          <div className="w-full max-w-[460px]">
            <div className="rounded-3xl bg-gradient-to-b from-white/14 via-white/8 to-transparent p-px shadow-2xl">
              <div
                style={{ colorScheme: 'dark' }}
                className="max-h-[calc(100vh-4rem)] overflow-hidden flex flex-col rounded-3xl bg-slate-950 ring-1 ring-white/10"
              >
                <div className="flex-1 min-h-0 overflow-auto scrollbar-hide">
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
