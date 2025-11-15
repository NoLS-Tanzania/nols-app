"use client";

// AdminPageHeader intentionally not used here; using a centered custom header for Support page
import { LifeBuoy, Mail, Phone } from "lucide-react";
import React, { useMemo, useState } from "react";

const DEFAULT_FAQS = [
  {
    category: 'Owners',
    q: 'How do I invite a new owner?',
    a: 'Go to Management → Owners and use the invite flow to add a new owner. Provide the owner name, email and region. The invited owner receives an email with a secure onboarding link that expires after 72 hours. For bulk invites, upload a CSV with the same columns (name,email,region).',
    updated: '2025-10-20'
  },
  {
    category: 'Properties',
    q: 'How do I moderate properties and images?',
    a: 'Open Management → Properties, filter by status=PENDING. Click a property to view details and uploaded images. Use the Approve/Reject controls on each image; rejected images can include a moderation note for the owner. Only APPROVED properties appear in the public listings.',
    updated: '2025-10-18'
  },
  {
    category: 'Finance',
    q: 'How are commissions and taxes configured?',
    a: 'System Settings exposes `commissionPercent` and `taxPercent`. The admin UI enforces a lower bound of 9% and an upper bound of 13% to comply with local policy. Changing these values affects how invoices and owner payouts are calculated; test changes in a staging environment before applying to production.',
    updated: '2025-09-30'
  },
  {
    category: 'Reports',
    q: 'How do I export reports and audit logs to CSV?',
    a: 'Navigate to General Reports or specific management pages and use the Export button. Exports are generated server-side and returned as a single CSV file. For very large datasets we recommend using the scheduled nightly export feature (if enabled) to avoid timeouts.',
    updated: '2025-10-05'
  },
  {
    category: 'Audit',
    q: 'Where can I see audit logs and admin actions?',
    a: 'Management → Audit Log lists all admin actions (approvals, rejections, payouts, settings changes). Logs are searchable and can be exported to CSV. Each entry shows who performed the action, IP, and timestamp (EAT / UTC+3).',
    updated: '2025-10-12'
  },
  {
    category: 'Troubleshooting',
    q: 'API connectivity issues — what should I check?',
    a: 'If the web app shows errors, first verify the API /health endpoint. Confirm `DATABASE_URL` is set and reachable, and check server logs for Prisma errors. For image processing failures, ensure the worker has S3 credentials and the IMAGES_BUCKET environment variable.',
    updated: '2025-10-20'
  },
  {
    category: 'Integrations',
    q: 'How do I configure Cloudinary/S3 for media uploads?',
    a: 'Set provider-specific credentials (e.g., AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, IMAGES_BUCKET) in the API environment. For uploads we use presigned URLs for browser uploads; processed thumbnails are created by the image worker and stored back to the bucket.',
    updated: '2025-09-20'
  },
];

export default function Page() {
  const [query, setQuery] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const faqs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return DEFAULT_FAQS;
    return DEFAULT_FAQS.filter(f => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q));
  }, [query]);

  async function submitContact(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setSent(null);
    if (!contactEmail || !contactMessage) {
      setError('Please provide your email and a short message.');
      return;
    }
    setSending(true);
    try {
      const base = (process.env.NEXT_PUBLIC_API_URL as string) ?? '';
      const url = base ? base.replace(/\/$/, '') + '/api/admin/support/contact' : '/api/admin/support/contact';
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: contactName, email: contactEmail, message: contactMessage }) });
      if (!r.ok) {
        // fallback to mailto if API not available
        throw new Error(`HTTP ${r.status}`);
      }
      setSent('Message sent. Our support team will reply to your email.');
      setContactName(''); setContactEmail(''); setContactMessage('');
    } catch (err: any) {
      console.error('contact submit failed', err);
      setError('Failed to send via API. You can email support@nolsapp.com directly or try again later.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="max-w-3xl mx-auto text-center">
        <div className="inline-flex items-center justify-center rounded-full bg-indigo-50 p-3">
          <LifeBuoy className="h-6 w-6 text-indigo-600" />
        </div>
        <h1 className="mt-3 text-2xl sm:text-3xl font-semibold text-gray-900">Support</h1>
        <p className="mt-1 text-sm text-gray-600">Help center, FAQs, and contact options</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-4">
        <main className="md:col-span-2 space-y-6">
          <section className="bg-white border border-gray-100 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Knowledge base & FAQs</h2>
                <p className="text-sm text-gray-500">Search common questions or browse curated help articles.</p>
              </div>
              <div className="w-72">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search FAQs, e.g. properties, owners, bookings"
                  className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              {faqs.length === 0 && <div className="text-sm text-gray-500">No results found for your search.</div>}
              {faqs.map((f, idx) => (
                <details key={idx} className="group" open={idx === 0}>
                  <summary className="flex items-center justify-between cursor-pointer bg-gray-50 hover:bg-gray-100 rounded-md px-4 py-3 font-medium text-gray-700">
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-800">{f.q}</span>
                      {f.category && <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">{f.category}</span>}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-gray-400">{(f as any).updated ?? ''}</span>
                      <span className="text-gray-400 group-open:rotate-180 transition-transform">▾</span>
                    </div>
                  </summary>

                  {/* Finance FAQ: render answer in a highlighted info box to distinguish it visually */}
                  {f.category === 'Finance' && f.q.toLowerCase().includes('commission') ? (
                    <div className="mt-3">
                      <div className="bg-white border border-indigo-100 p-4 rounded-md">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">{f.category}</span>
                            <span className="text-xs text-gray-600">{(f as any).updated ?? ''} ▾</span>
                          </div>
                        </div>
                        <div className="text-sm text-gray-800">{f.a}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-2 p-4 bg-white text-sm text-gray-700 border border-t-0 border-gray-100 rounded-b-md">{f.a}</div>
                  )}
                </details>
              ))}
      </div>
          </section>

          <section className="bg-white border border-gray-100 rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-800">Troubleshooting</h3>
            <ul className="mt-3 list-disc ml-5 text-sm text-gray-600 space-y-2">
              <li>Check API status: make sure the backend API is running on the configured host and port.</li>
              <li>Verify your network connection and retry the action.</li>
              <li>When investigating user issues, reproduce with an owner preview session and collect logs where possible.</li>
            </ul>
          </section>
        </main>

        <aside className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-5">
            <div className="flex items-start gap-3">
              <Mail className="w-6 h-6 text-indigo-600" />
              <div>
                <div className="text-sm font-medium text-gray-800">Email</div>
                <div className="text-sm text-gray-500">support@nolsapp.com</div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-5">
            <div className="flex items-start gap-3">
              <Phone className="w-6 h-6 text-indigo-600" />
              <div>
                <div className="text-sm font-medium text-gray-800">Phone</div>
                <div className="text-sm text-gray-500">+255 736 766 726</div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-5">
            <h4 className="text-sm font-semibold text-gray-800">Contact support</h4>
            <form className="mt-3 space-y-3" onSubmit={submitContact}>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Your name (optional)</label>
                <input className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="Your name" value={contactName} onChange={(e) => setContactName(e.target.value)} />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Your email</label>
                <input className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="you@company.com" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
              </div>

              <div>
                <label className="block text-xs text-gray-600 mb-1">Message</label>
                <textarea className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm h-28 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-400" placeholder="How can we help?" value={contactMessage} onChange={(e) => setContactMessage(e.target.value)} />
              </div>

              <div className="flex items-center gap-2">
                <button type="submit" className="inline-flex items-center justify-center bg-indigo-600 text-white px-3 py-1.5 rounded-md text-sm hover:bg-indigo-700 disabled:opacity-60" disabled={sending}>{sending ? 'Sending…' : 'Send message'}</button>
                <a className="inline-flex items-center justify-center bg-white border border-gray-200 px-3 py-1.5 rounded-md text-sm text-gray-700 no-underline hover:shadow-sm" href={`mailto:support@nolsapp.com?subject=${encodeURIComponent('Support request')}`}>Email directly</a>
              </div>

              {sent && <div className="text-sm text-green-600">{sent}</div>}
              {error && <div className="text-sm text-red-600">{error}</div>}
            </form>
          </div>
        </aside>
      </div>
    </div>
  );
}
