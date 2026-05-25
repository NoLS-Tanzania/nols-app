"use client";
import { Shield } from "lucide-react";

export default function SecurityPage() {
  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow p-0 overflow-hidden">
        <div className="relative p-6">
          <div className="pointer-events-none absolute right-4 top-4 opacity-10" aria-hidden>
            <Shield className="h-20 w-20 text-teal-700" strokeWidth={1.2} />
          </div>
          <h1 className="text-2xl font-semibold mb-2 text-center">Security Policy</h1>
          <p className="text-sm text-gray-600 mb-4">
            We appreciate responsible disclosure and review all good-faith reports.
          </p>
          <div className="prose max-h-64 overflow-auto mb-4">
            <p>
              If you identify a potential vulnerability in NoLSAF systems, please report
              it privately to <strong>security@nolsaf.com</strong>.
            </p>
            <h2>How to report</h2>
            <ul>
              <li>Share the affected URL, endpoint, or feature so we can scope the issue quickly.</li>
              <li>Include clear reproduction steps, what you expected, and the actual impact observed.</li>
              <li>To protect users and systems, do not access, modify, or delete data you do not own.</li>
            </ul>
            <h2>Response process</h2>
            <p>
              We acknowledge reports promptly, validate severity, prioritize remediation,
              and follow up with status updates when appropriate.
            </p>
            <h2>Safe harbor</h2>
            <p>
              We support research performed in good faith for defensive purposes.
              Please do not disrupt services, violate privacy, or use social engineering.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
