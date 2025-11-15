"use client";
import React, { useState, useEffect } from 'react';

export default function SecurityPage() {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const v = localStorage.getItem('securityAccepted');
    setAccepted(v === 'true');
  }, []);

  const handleAccept = () => {
    localStorage.setItem('securityAccepted', 'true');
    setAccepted(true);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow p-0 overflow-hidden">
        <div className="p-6">
          <h1 className="text-2xl font-semibold mb-2">Security Policy</h1>
          <p className="text-sm text-gray-600 mb-4">Please read the security policy and accept to continue.</p>
          <div className="prose max-h-64 overflow-auto mb-4">
            <p>We take security seriously and employ industry-standard practices.</p>
            <h2>Measures</h2>
            <p>Our measures include encryption at rest and in transit, RBAC, and monitoring.</p>
          </div>
        </div>

        <div className="border-t px-6 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-700">{accepted ? 'You have accepted this policy.' : 'You have not accepted this policy.'}</div>
          <div className="flex items-center gap-3">
            <button className="btn btn-ghost" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Top</button>
            <button className="btn btn-brand" onClick={handleAccept} disabled={accepted}>{accepted ? 'Accepted' : 'Accept Security Policy'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
