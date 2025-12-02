"use client";

import { useState, useEffect, useRef } from "react";
import { AlertCircle, Check, UserPlus, ChevronLeft, Lock } from 'lucide-react';
import { useRouter } from "next/navigation";

export default function RegisterPage() {
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
  const router = useRouter();
  const [visible, setVisible] = useState<boolean>(true);
  const otpRef = useRef<HTMLInputElement | null>(null);
  // single-card mode: toggle between register and login inside the same card
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  const [loginPhone, setLoginPhone] = useState<string>('');
  const [loginOtp, setLoginOtp] = useState<string>('');
  const [loginSent, setLoginSent] = useState<boolean>(false);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [loginMethod, setLoginMethod] = useState<'phone' | 'credentials'>('phone');

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
      const resp = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: `${countryCode}${phone}`, otp, role } ),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.message || 'OTP verification failed');
      }
      setSuccess('Verified — account created');
      setStep('done');
      setTimeout(() => router.push(`/account/onboard/${role}`), 900);
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

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="w-full flex items-center justify-center px-4">
        <div className="w-full max-w-2xl">
          <div className="auth-card auth-card-enter mx-auto">
            {/* Accent stripe */}
            <div className="h-1 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600" />
            <div className="px-6 py-5 sm:px-8 sm:py-6 flex items-center gap-4 text-slate-900">
              <div className="rounded-full bg-emerald-50 p-3">
                <UserPlus className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-semibold leading-tight">{authMode === 'register' ? 'Register Your Account' : 'Sign in to your account'}</h1>
                <p className="text-sm text-slate-600 mt-0.5">{authMode === 'register' ? 'Choose an account type and register with your phone number.' : 'Enter your number to sign in quickly, or use username and password.'}</p>
              </div>
              <div className="ml-auto text-sm text-slate-500">{authMode === 'register' ? (step === 'phone' ? '' : step === 'otp' ? 'Step 2 of 2' : 'Done') : (loginSent ? 'Enter OTP' : '')}</div>
            </div>

            <div className="px-6 sm:px-8">
              <div className="auth-progress">
                <div className={`bar ${step === 'phone' ? 'w-1/3' : step === 'otp' ? 'w-2/3' : 'w-full'}`} />
              </div>
            </div>

            <div className="auth-card-body">

              {error && (
                <div className="mb-4 text-sm text-red-800 bg-red-50 border border-red-100 rounded px-3 py-2 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 text-red-700" aria-hidden />
                  <div>{error}</div>
                </div>
              )}

              {success && (
                <div className="mb-4 text-sm text-emerald-800 bg-emerald-50 border border-emerald-100 rounded px-3 py-2 flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 text-emerald-700" aria-hidden />
                  <div>{success}</div>
                </div>
              )}

              <div className={`space-y-4 transition-all duration-300 ease-in-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>

                {authMode === 'register' && step === 'phone' && (
                  <>
                    <div className="flex flex-col gap-3 w-full max-w-md mx-auto">
                      <label htmlFor="phone" className="block text-xs font-medium text-gray-600">Phone number</label>
                      <div className="mt-1 flex items-stretch border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-emerald-500">
                        <select aria-label="Country code" value={countryCode} onChange={e => setCountryCode(e.target.value)} className="groupstays-select px-3 py-2 text-sm border-r border-gray-200 focus:outline-none">
                          <option value="+255">+255</option>
                          <option value="+1">+1</option>
                          <option value="+256">+256</option>
                          <option value="+254">+254</option>
                        </select>
                        <input id="phone" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))} className="flex-1 px-4 py-3 text-sm focus:outline-none" placeholder="712345678" />
                      </div>
                    </div>

                    <div>
                      <div className="block text-sm font-medium text-gray-700">Registering as</div>
                      <div className="mt-3 grid grid-cols-3 gap-3">
                        <label role="radio" aria-checked={role === 'traveller'} onClick={() => setRole('traveller')} className={`transition-transform transform duration-150 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl cursor-pointer border ${role === 'traveller' ? 'bg-slate-800 text-white border-slate-800 shadow-lg scale-105' : 'bg-white text-slate-700 border-gray-200 hover:shadow-sm hover:-translate-y-0.5'}`}>
                          <Check className={`w-4 h-4 transition-opacity duration-150 ${role === 'traveller' ? 'opacity-100' : 'opacity-0'}`} />
                          <span className="text-sm">Traveller</span>
                        </label>
                        <label role="radio" aria-checked={role === 'driver'} onClick={() => setRole('driver')} className={`transition-transform transform duration-150 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl cursor-pointer border ${role === 'driver' ? 'bg-slate-800 text-white border-slate-800 shadow-lg scale-105' : 'bg-white text-slate-700 border-gray-200 hover:shadow-sm hover:-translate-y-0.5'}`}>
                          <Check className={`w-4 h-4 transition-opacity duration-150 ${role === 'driver' ? 'opacity-100' : 'opacity-0'}`} />
                          <span className="text-sm">Driver</span>
                        </label>
                        <label role="radio" aria-checked={role === 'owner'} onClick={() => setRole('owner')} className={`transition-transform transform duration-150 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl cursor-pointer border ${role === 'owner' ? 'bg-slate-800 text-white border-slate-800 shadow-lg scale-105' : 'bg-white text-slate-700 border-gray-200 hover:shadow-sm hover:-translate-y-0.5'}`}>
                          <Check className={`w-4 h-4 transition-opacity duration-150 ${role === 'owner' ? 'opacity-100' : 'opacity-0'}`} />
                          <span className="text-sm">Owner</span>
                        </label>
                      </div>
                    </div>

                    <div className="mt-6 flex items-center gap-4">
                      <button onClick={sendOtp} disabled={loading} className="flex-1 auth-cta w-full disabled:opacity-60">{loading ? 'Sending...' : 'Send OTP'}</button>
                      <button onClick={(e) => { e.preventDefault(); setAuthMode('login'); }} className="text-sm text-slate-700 no-underline hover:underline">Already have an account? Sign In</button>
                    </div>
                  </>
                )}

                {authMode === 'register' && step === 'otp' && (
                  <>
                    <div>
                      <label htmlFor="otp" className="block text-sm font-medium text-gray-700">Enter OTP</label>
                      <input id="otp" inputMode="numeric" value={otp} onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))} ref={otpRef} className="mt-2 block w-full border border-gray-200 rounded-xl px-4 py-3 text-lg tracking-widest text-center font-mono focus:outline-none focus:ring-2 focus:ring-slate-400 transition-transform duration-150" placeholder="123456" />
                    </div>

                    <div className="mt-4">
                      <label className="inline-flex items-center gap-2">
                        <input id="agree" type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="h-4 w-4 transition-colors duration-150 focus:ring-2 focus:ring-slate-400" />
                        <span className="text-sm text-gray-700">By signing up you agree with <a href="/terms" className="text-slate-700">terms and conditions</a> of NoLSAF</span>
                      </label>
                    </div>

                    <div className="mt-6 flex items-center justify-between">
                      <div className="text-sm text-gray-600">{countdown > 0 ? `Resend available in ${countdown}s` : <button onClick={resend} className="text-sm text-slate-700">Resend OTP</button>}</div>
                      <button onClick={verifyOtp} disabled={loading || !agreed} className="auth-cta px-4 py-2 disabled:opacity-60">{loading ? 'Verifying...' : 'Continue'}</button>
                    </div>
                  </>
                )}

                {authMode === 'login' && !loginSent && (
                  <>
                    <div className="flex items-center gap-2 mt-3">
                      <button type="button" onClick={() => setLoginMethod('phone')} className={`px-3 py-1 rounded-md text-sm ${loginMethod === 'phone' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-gray-200'}`}>Phone</button>
                      <button type="button" onClick={() => setLoginMethod('credentials')} className={`px-3 py-1 rounded-md text-sm ${loginMethod === 'credentials' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700 border border-gray-200'}`}>Username</button>
                    </div>

                    {loginMethod === 'phone' ? (
                      <>
                          <div className="mt-3 w-full max-w-md mx-auto">
                            <label className="block text-xs font-medium text-gray-600">Phone</label>
                            <div className="mt-2 flex gap-2 w-full">
                              <input value={loginPhone} onChange={e => setLoginPhone(e.target.value.replace(/[^0-9]/g, ''))} placeholder="712345678" className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                            </div>
                          </div>
                        <div className="mt-4 flex items-center gap-2">
                          <button onClick={async () => { setLoginLoading(true); await new Promise(r => setTimeout(r, 600)); setLoginSent(true); setLoginLoading(false); }} className="inline-flex items-center auth-cta">{loginLoading ? 'Sending...' : 'Send OTP'}</button>
                          <button onClick={() => setAuthMode('register')} title="Back to Register" aria-label="Back to Register" className="ml-auto auth-back-btn">
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="mt-3 space-y-3 w-full max-w-md mx-auto">
                            <div>
                              <label className="block text-xs font-medium text-gray-600">Username</label>
                              <input value={loginPhone} onChange={e => setLoginPhone(e.target.value)} placeholder="username" className="auth-input mt-2" />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-600">Password</label>
                              <input type="password" placeholder="••••••••" className="auth-input mt-2" />
                              <div className="mt-2 text-left">
                                <button type="button" onClick={() => { setAuthMode('login'); router.push('/account/forgot-password'); }} className="text-sm text-slate-600 hover:underline flex items-center gap-2">
                                  <Lock className="w-4 h-4" />
                                  <span>Forgot password?</span>
                                </button>
                              </div>
                            </div>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                          <button onClick={async () => { setLoginLoading(true); await new Promise(r => setTimeout(r, 600)); setLoginLoading(false); router.push('/'); }} className="inline-flex items-center auth-cta">{loginLoading ? 'Signing in...' : 'Sign In'}</button>
                          <button onClick={() => setAuthMode('register')} title="Back to Register" aria-label="Back to Register" className="ml-auto auth-back-btn">
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}

                {authMode === 'login' && loginSent && (
                  <>
                    <div className="w-full max-w-md mx-auto">
                      <label className="block text-xs font-medium text-gray-600">Enter OTP</label>
                      <input value={loginOtp} onChange={e => setLoginOtp(e.target.value.replace(/[^0-9]/g, ''))} placeholder="123456" className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400" />
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <button onClick={async () => { setLoginLoading(true); await new Promise(r => setTimeout(r, 600)); setLoginLoading(false); setAuthMode('register'); router.push('/'); }} className="inline-flex items-center px-3 py-2 bg-slate-900 text-white rounded-md">{loginLoading ? 'Signing in...' : 'Verify & Sign in'}</button>
                      <button onClick={() => { setLoginSent(false); }} className="text-sm text-slate-600">Edit phone</button>
                    </div>
                  </>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
