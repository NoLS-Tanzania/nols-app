"use client";
import React, { useState, useEffect } from 'react';

export default function PrivacyPage() {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const v = localStorage.getItem('privacyAccepted');
    setAccepted(v === 'true');
  }, []);

  const handleAccept = () => {
    localStorage.setItem('privacyAccepted', 'true');
    setAccepted(true);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow p-0 overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-semibold mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-600 mb-4">Please read the privacy policy below and accept to continue.</p>
          <div className="prose max-h-64 overflow-auto mb-4">
            <p>We respect your privacy and collect data only to provide and improve our service.</p>
            <h2>Data We Collect</h2>
            <p>We collect contact details, usage data, and any information you provide.</p>
          </div>
        </div>

        <div className="border-t px-6 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-700">{accepted ? 'You have accepted this policy.' : 'You have not accepted this policy.'}</div>
          <div className="flex items-center gap-3">
            <button className="btn btn-ghost" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Top</button>
            <button className="btn btn-brand" onClick={handleAccept} disabled={accepted}>{accepted ? 'Accepted' : 'Accept Privacy Policy'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
