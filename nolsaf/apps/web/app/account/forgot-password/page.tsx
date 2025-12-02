"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'email'|'phone'>('email');

  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'start'|'otp-sent'|'done'>('start');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sendEmail = async () => {
    setError(null); setMessage(null); setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const data = await res.json();
      if (res.ok) {
        setMessage('If an account exists, a reset link has been sent to the provided email.');
        if (data && data.debug && data.debug.link) setMessage((m) => (m ? m + '\n' : '') + `Debug link: ${data.debug.link}`);
        setStep('done');
      } else {
        setError(data?.message || 'Failed to send');
      }
    } catch (e) {
      setError('Network error');
    } finally { setLoading(false); }
  };

  const sendOtp = async () => {
    setError(null); setMessage(null); setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, role: 'RESET' }) });
      const data = await res.json();
      if (res.ok) {
        setMessage('OTP sent. Please enter the code you received.');
        if (data && data.otp) setMessage((m) => (m ? m + '\n' : '') + `Dev OTP: ${data.otp}`);
        setStep('otp-sent');
      } else {
        setError(data?.message || 'Failed to send OTP');
      }
    } catch (e) {
      setError('Network error');
    } finally { setLoading(false); }
  };

  const verifyOtp = async () => {
    setError(null); setMessage(null); setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, otp, role: 'RESET' }) });
      const data = await res.json();
      if (res.ok && data) {
        // if server returned a reset link/token, navigate to it
        if (data.link) {
          // open link
          window.location.href = data.link;
          return;
        }
        if (data.resetToken && data.user && data.user.id) {
          router.push(`/account/reset-password?token=${data.resetToken}&id=${data.user.id}`);
          return;
        }
        setMessage('Verified. Please check your email for a link.');
        setStep('done');
      } else {
        setError(data?.message || 'Invalid code');
      }
    } catch (e) {
      setError('Network error');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4">
      <div className="w-full max-w-md bg-white shadow-md rounded-lg p-6">
        <h1 className="text-2xl font-semibold text-slate-800 mb-4">Password reset</h1>
        <p className="text-sm text-slate-500 mb-4">Choose how you&apos;d like to reset your password.</p>

        <div className="flex gap-2 mb-4">
          <button className={`px-3 py-1 rounded ${mode==='email' ? 'bg-slate-800 text-white' : 'bg-slate-100'}`} onClick={() => { setMode('email'); setStep('start'); setMessage(null); setError(null); }}>By email</button>
          <button className={`px-3 py-1 rounded ${mode==='phone' ? 'bg-slate-800 text-white' : 'bg-slate-100'}`} onClick={() => { setMode('phone'); setStep('start'); setMessage(null); setError(null); }}>By phone (OTP)</button>
        </div>

        {error && <div className="mb-3 text-sm text-red-700 bg-red-50 p-3 rounded">{error}</div>}
        {message && <div className="mb-3 text-sm text-slate-700 bg-slate-50 p-3 rounded whitespace-pre-wrap">{message}</div>}

        {mode === 'email' ? (
          <div>
            <label className="block text-sm font-medium text-slate-700">Please enter your registered email address</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 block w-full rounded-md border-slate-200 shadow-sm p-2" placeholder="you@example.com" />
            <div className="mt-4 flex justify-end">
              <button disabled={loading} onClick={sendEmail} className="rounded bg-slate-800 text-white px-4 py-2 text-sm">Send reset link</button>
            </div>
          </div>
        ) : (
          <div>
            {step === 'start' && (
              <>
                <label className="block text-sm font-medium text-slate-700">Please enter your registered phone number</label>
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2 block w-full rounded-md border-slate-200 shadow-sm p-2" placeholder="+2557XXXXXXXX" />
                <div className="mt-4 flex justify-end">
                  <button disabled={loading} onClick={sendOtp} className="rounded bg-slate-800 text-white px-4 py-2 text-sm">Send OTP</button>
                </div>
              </>
            )}

            {step === 'otp-sent' && (
              <>
                <label className="block text-sm font-medium text-slate-700">Enter OTP</label>
                <input value={otp} onChange={(e) => setOtp(e.target.value)} className="mt-2 block w-full rounded-md border-slate-200 shadow-sm p-2" placeholder="123456" />
                <div className="mt-4 flex justify-between">
                  <button disabled={loading} onClick={() => { setStep('start'); setMessage(null); setError(null); }} className="rounded bg-slate-100 text-slate-700 px-4 py-2 text-sm">Change number</button>
                  <button disabled={loading} onClick={verifyOtp} className="rounded bg-slate-800 text-white px-4 py-2 text-sm">Verify</button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
