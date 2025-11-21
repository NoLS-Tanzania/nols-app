"use client";

import { useState } from "react";
import { AlertCircle, Check, CheckCircle } from 'lucide-react';
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

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full bg-white border-2 border-[#02665e] rounded-lg p-6 shadow">
        <h1 className="text-2xl font-semibold mb-2 text-center">Register Your Account</h1>
        <p className="text-sm text-gray-600 mb-4 text-center">Choose an account type and register with your phone number.</p>

        {error && (
          <div className="mb-4 text-sm text-red-800 bg-red-50 border border-red-100 rounded px-3 py-2 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 text-red-700" aria-hidden />
            <div>{error}</div>
          </div>
        )}

        {success && (
          <div className="mb-4 text-sm text-green-800 bg-green-50 border border-green-100 rounded px-3 py-2 flex items-start gap-2">
            <Check className="w-4 h-4 mt-0.5 text-green-700" aria-hidden />
            <div>{success}</div>
          </div>
        )}

        <div className="space-y-4">

          {step === 'phone' && (
            <>
              <div className="flex flex-col md:flex-row gap-2">
                <div className="w-full md:w-24">
                  <label className="block text-sm font-medium text-gray-700">Country code</label>
                  <select aria-label="Country code" value={countryCode} onChange={e => setCountryCode(e.target.value)} className="mt-1 block w-full border border-gray-200 rounded px-2 py-2 focus:outline-none focus:ring-2 focus:ring-[#02665e]">
                    <option value="+255">+255</option>
                    <option value="+1">+1</option>
                    <option value="+256">+256</option>
                    <option value="+254">+254</option>
                  </select>
                </div>

                <div className="w-full md:w-48">
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone number</label>
                  <input id="phone" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, ''))} className="mt-1 block w-full border border-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#02665e]" placeholder="712345678" />
                </div>
              </div>

              <div>
                <div className="block text-sm font-medium text-gray-700">Registering as</div>
                <div className="mt-2 flex flex-col md:flex-row gap-2">
                  <label className={`inline-flex w-full md:w-auto items-center justify-center gap-2 px-4 py-2 min-w-[96px] rounded cursor-pointer border ${role === 'traveller' ? 'bg-[#02665e] text-white border-[#02665e]' : 'bg-white text-gray-700 border-gray-300'} transition-transform duration-150 hover:scale-105`}>
                    <input type="radio" name="role" value="traveller" checked={role === 'traveller'} onChange={() => setRole('traveller')} className="sr-only" />
                    <Check className={`w-4 h-4 transition-opacity duration-150 ${role === 'traveller' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`} aria-hidden />
                    <span className="text-sm">Traveller</span>
                  </label>
                  <label className={`inline-flex w-full md:w-auto items-center justify-center gap-2 px-4 py-2 min-w-[96px] rounded cursor-pointer border ${role === 'driver' ? 'bg-[#02665e] text-white border-[#02665e]' : 'bg-white text-gray-700 border-gray-300'} transition-transform duration-150 hover:scale-105`}>
                    <input type="radio" name="role" value="driver" checked={role === 'driver'} onChange={() => setRole('driver')} className="sr-only" />
                    <Check className={`w-4 h-4 transition-opacity duration-150 ${role === 'driver' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`} aria-hidden />
                    <span className="text-sm">Driver</span>
                  </label>
                  <label className={`inline-flex w-full md:w-auto items-center justify-center gap-2 px-4 py-2 min-w-[96px] rounded cursor-pointer border ${role === 'owner' ? 'bg-[#02665e] text-white border-[#02665e]' : 'bg-white text-gray-700 border-gray-300'} transition-transform duration-150 hover:scale-105`}>
                    <input type="radio" name="role" value="owner" checked={role === 'owner'} onChange={() => setRole('owner')} className="sr-only" />
                    <Check className={`w-4 h-4 transition-opacity duration-150 ${role === 'owner' ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`} aria-hidden />
                    <span className="text-sm">Owner</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button onClick={sendOtp} disabled={loading} className="px-4 py-2 bg-[#02665e] text-white rounded disabled:opacity-60">{loading ? 'Sending...' : 'Send OTP'}</button>
                <a href="/account/login" className="text-sm text-sky-600 no-underline hover:underline">Already have an account?</a>
              </div>
            </>
          )}

          {step === 'otp' && (
            <>
              <div>
                <label htmlFor="otp" className="block text-sm font-medium text-gray-700">Enter OTP</label>
                <input id="otp" inputMode="numeric" value={otp} onChange={e => setOtp(e.target.value.replace(/[^0-9]/g, ''))} className="mt-1 block w-full border border-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#02665e]" placeholder="123456" />
              </div>

              <div className="flex items-center gap-2">
                <input id="agree" type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="h-4 w-4" />
                <label htmlFor="agree" className="text-sm text-gray-700">By signing up you agree with <a href="/terms" className="text-sky-600">terms and conditions</a> of NoLSAF</label>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">{countdown > 0 ? `Resend available in ${countdown}s` : <button onClick={resend} className="text-sm text-sky-600">Resend OTP</button>}</div>
                <button onClick={verifyOtp} disabled={loading || !agreed} className="px-4 py-2 bg-[#02665e] text-white rounded disabled:opacity-60">{loading ? 'Verifying...' : 'Continue'}</button>
              </div>
            </>
          )}

        </div>
      </div>
    </main>
  );
}
