"use client";
import React, { useState, useEffect } from 'react';

export default function TermsPage() {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const v = localStorage.getItem('termsAccepted');
    setAccepted(v === 'true');
  }, []);

  const handleAccept = () => {
    localStorage.setItem('termsAccepted', 'true');
    setAccepted(true);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow p-0 overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-semibold mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-600 mb-4">Please read the terms below and accept to continue using the service.</p>
          <div className="prose max-h-64 overflow-auto mb-4">
            <p>Welcome to NoLSAF. These Terms of Service (&quot;Terms&quot;) govern your access to and use of our services.</p>
            <p>By using our services, you agree to these terms. Please read them carefully.</p>
            <h2>Acceptable Use</h2>
            <p>Users must comply with local laws and not misuse the platform.</p>
            <h2>Liability</h2>
            <p>NoLSAF provides services as-is; liability is limited as described.</p>
          </div>
        </div>

        <div className="border-t px-6 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-700">{accepted ? 'You have accepted these terms.' : 'You have not accepted these terms.'}</div>
          <div className="flex items-center gap-3">
            <button className="btn btn-ghost" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Top</button>
            <button className="btn btn-brand" onClick={handleAccept} disabled={accepted}>{accepted ? 'Accepted' : 'Accept Terms'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
