"use client";

import { useState, useEffect, useRef } from "react";
import { AlertCircle, Check, UserPlus } from 'lucide-react';
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

  const sendOtp = async () => {
    setError(null);
    if (!phone || phone.trim().length < 5) {
      setError('Please enter a valid phone number');
      return;
    }
    setLoading(true);
    try {
      // stubbed endpoint - replace with real API
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
      // start countdown
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
      // stubbed verification - replace with real API
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
      // proceed to onboarding
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

  // animate content when the step changes
  useEffect(() => {
    // hide briefly then show to trigger transition
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
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center gap-3">
          <div className="rounded-full bg-white/20 p-2">
            <UserPlus className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Register Your Account</h1>
            <p className="text-xs opacity-90">Choose an account type and register with your phone number.</p>
          </div>
          <div className="ml-auto text-sm opacity-90">{step === 'phone' ? 'Step 1 of 2' : step === 'otp' ? 'Step 2 of 2' : 'Done'}</div>
        </div>
        <div className="p-6">

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

          {step === 'phone' && (
            <>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="sm:w-28">
                  <label className="block text-xs font-medium text-gray-600">Country code</label>
                  <select aria-label="Country code" value={countryCode} onChange={e => setCountryCode(e.target.value)} className="mt-1 block w-full bg-white border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                    <option value="+255">+255</option>
                    <option value="+1">+1</option>
                    <option value="+256">+256</option>
                    <option value="+254">+254</option>
                  </select>
                </div>

                <div className="flex-1">
                  <label htmlFor="phone" className="block text-xs font-medium text-gray-600">Phone number</label>
                  <div className="mt-1 relative">
                    <input id="phone" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))} className="block w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="712345678" />
                  </div>
                </div>
              </div>

              <div>
                <div className="block text-sm font-medium text-gray-700">Registering as</div>
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <label role="radio" aria-checked={role === 'traveller'} onClick={() => setRole('traveller')} className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg cursor-pointer border ${role === 'traveller' ? 'bg-emerald-600 text-white border-emerald-600 shadow' : 'bg-white text-gray-700 border-gray-200 hover:shadow-sm'}`}>
                    <Check className={`w-4 h-4 ${role === 'traveller' ? 'opacity-100' : 'opacity-0'}`} />
                    <span className="text-sm">Traveller</span>
                  </label>
                  <label role="radio" aria-checked={role === 'driver'} onClick={() => setRole('driver')} className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg cursor-pointer border ${role === 'driver' ? 'bg-amber-500 text-white border-amber-500 shadow' : 'bg-white text-gray-700 border-gray-200 hover:shadow-sm'}`}>
                    <Check className={`w-4 h-4 ${role === 'driver' ? 'opacity-100' : 'opacity-0'}`} />
                    <span className="text-sm">Driver</span>
                  </label>
                  <label role="radio" aria-checked={role === 'owner'} onClick={() => setRole('owner')} className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg cursor-pointer border ${role === 'owner' ? 'bg-violet-600 text-white border-violet-600 shadow' : 'bg-white text-gray-700 border-gray-200 hover:shadow-sm'}`}>
                    <Check className={`w-4 h-4 ${role === 'owner' ? 'opacity-100' : 'opacity-0'}`} />
                    <span className="text-sm">Owner</span>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex items-center gap-4">
                <button onClick={sendOtp} disabled={loading} className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-md hover:shadow-md disabled:opacity-60">{loading ? 'Sending...' : 'Send OTP'}</button>
                <a href="/account/login" className="text-sm text-sky-600 no-underline hover:underline">Already have an account?</a>
              </div>
            </>
          )}

          {step === 'otp' && (
            <>
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700">Enter OTP</label>
                <input id="otp" inputMode="numeric" value={otp} onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))} className="mt-2 block w-full border border-gray-200 rounded-md px-4 py-3 text-lg tracking-widest text-center font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500" placeholder="123456" />
              </div>

              <div className="mt-4">
                <label className="inline-flex items-center gap-2">
                  <input id="agree" type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="h-4 w-4" />
                  <span className="text-sm text-gray-700">By signing up you agree with <a href="/terms" className="text-sky-600">terms and conditions</a> of NoLSAF</span>
                </label>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-gray-600">{countdown > 0 ? `Resend available in ${countdown}s` : <button onClick={resend} className="text-sm text-sky-600">Resend OTP</button>}</div>
                <button onClick={verifyOtp} disabled={loading || !agreed} className="px-4 py-2 bg-emerald-600 text-white rounded-md hover:shadow-md disabled:opacity-60">{loading ? 'Verifying...' : 'Continue'}</button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
    </main>
  );
}
