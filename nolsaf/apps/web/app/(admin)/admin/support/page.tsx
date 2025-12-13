"use client";

// AdminPageHeader intentionally not used here; using a centered custom header for Support page
import { LifeBuoy, Mail, MessageCircle, ChevronDown, Send, CheckCircle, AlertCircle } from "lucide-react";
import React, { useState } from "react";

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
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

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
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Header Section with Animation */}
        <div className="max-w-3xl mx-auto text-center mb-12 animate-[fadeIn_0.5s_ease-out]">
          <div className="inline-flex items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-4 shadow-lg transform transition-all duration-300 hover:scale-110 hover:shadow-xl">
            <LifeBuoy className="h-8 w-8 text-white" />
          </div>
          <h1 className="mt-6 text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 tracking-tight">
            Support
          </h1>
          <p className="mt-3 text-base sm:text-lg text-gray-600">
            Help center, FAQs, and contact options
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content - Knowledge Base */}
          <main className="lg:col-span-2 space-y-6">
            {/* Knowledge Base Section */}
            <section className="bg-white rounded-xl border border-gray-100 p-6 sm:p-8 transition-all duration-300 overflow-hidden">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Knowledge base & FAQs</h2>
                <p className="text-sm text-gray-600">Browse curated help articles and frequently asked questions.</p>
              </div>

              <div className="space-y-0">
                {DEFAULT_FAQS.map((f, idx) => {
                    const isOpen = openFaq === idx;
                    return (
                      <div
                        key={idx}
                        className="overflow-hidden transition-all duration-300"
                      >
                        <button
                          onClick={() => setOpenFaq(isOpen ? null : idx)}
                          className="w-full flex items-center justify-between py-4 text-left transition-colors duration-200 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-900 flex-1">{f.q}</span>
                            {f.category && (
                              <span className="text-xs bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
                                {f.category}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            <span className="text-xs text-gray-400 whitespace-nowrap">{f.updated}</span>
                            <ChevronDown
                              className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${
                                isOpen ? 'transform rotate-180' : ''
                              }`}
                            />
                          </div>
                        </button>
                        <div
                          className={`overflow-hidden transition-all duration-300 ease-in-out ${
                            isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                          }`}
                        >
                          <div className="pb-4 pt-2">
                            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                              {f.a}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          </main>

          {/* Sidebar - Contact Information */}
          <aside className="space-y-6 w-full lg:max-w-sm">
            {/* Email Card */}
            <div 
              className="bg-white rounded-xl border border-gray-100 p-6 transition-all duration-300 ease-in-out hover:-translate-y-1 group cursor-pointer"
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#02665e'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 transition-transform duration-300 ease-in-out group-hover:scale-110">
                  <Mail className="h-6 w-6 transition-colors duration-300 ease-in-out" style={{ color: '#02665e' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 mb-1 transition-colors duration-300 ease-in-out group-hover:text-gray-800">Email</div>
                  <a
                    href="mailto:support@nolsapp.com"
                    className="text-sm transition-all duration-300 ease-in-out break-all no-underline hover:tracking-wide"
                    style={{ color: '#02665e' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#024a44'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#02665e'}
                  >
                    support@nolsapp.com
                  </a>
                </div>
              </div>
            </div>

            {/* WhatsApp Card */}
            <div 
              className="bg-white rounded-xl border border-gray-100 p-6 transition-all duration-300 ease-in-out hover:-translate-y-1 group cursor-pointer"
              onMouseEnter={(e) => e.currentTarget.style.borderColor = '#02665e'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 transition-transform duration-300 ease-in-out group-hover:scale-110">
                  <MessageCircle className="h-6 w-6 transition-colors duration-300 ease-in-out" style={{ color: '#02665e' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 mb-1 transition-colors duration-300 ease-in-out group-hover:text-gray-800">WhatsApp</div>
                  <a
                    href="https://wa.me/255736766726"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm transition-all duration-300 ease-in-out no-underline hover:tracking-wide"
                    style={{ color: '#02665e' }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#024a44'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#02665e'}
                  >
                    +255 736 766 726
                  </a>
                </div>
              </div>
            </div>

            {/* Contact Form Card */}
            <div className="bg-white rounded-xl border border-gray-100 p-5 sm:p-6 transition-all duration-300 overflow-hidden">
              <h4 className="text-lg font-bold text-gray-900 mb-4">Contact support</h4>
              <form className="space-y-3.5" onSubmit={submitContact}>
                <div className="w-full">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Your name <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    className="w-full box-border border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    placeholder="Your name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                  />
                </div>

                <div className="w-full">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Your email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    className="w-full box-border border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                    placeholder="you@company.com"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                  />
                </div>

                <div className="w-full">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    className="w-full box-border border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 overflow-y-auto"
                    placeholder="How can we help?"
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    style={{ maxHeight: '120px' }}
                  />
                </div>

                <div className="flex flex-col gap-2.5 w-full box-border">
                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full box-border inline-flex items-center justify-center gap-2 text-white px-4 py-2.5 rounded-lg text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 transform hover:-translate-y-0.5"
                    style={{ 
                      background: 'linear-gradient(to right, #02665e, #024a44)',
                    }}
                    onMouseEnter={(e) => {
                      if (!sending) e.currentTarget.style.background = 'linear-gradient(to right, #024a44, #013a35)';
                    }}
                    onMouseLeave={(e) => {
                      if (!sending) e.currentTarget.style.background = 'linear-gradient(to right, #02665e, #024a44)';
                    }}
                  >
                    {sending ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sending…</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Send message</span>
                      </>
                    )}
                  </button>
                  <a
                    href={`mailto:support@nolsapp.com?subject=${encodeURIComponent('Support request')}`}
                    className="w-full box-border inline-flex items-center justify-center gap-2 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5 no-underline"
                    style={{ 
                      background: 'linear-gradient(to right, #02665e, #024a44)',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #024a44, #013a35)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(to right, #02665e, #024a44)'}
                  >
                    Email directly
                  </a>
                </div>

                {/* Success Message */}
                {sent && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 w-full box-border animate-[fadeIn_0.3s_ease-out]">
                    <CheckCircle className="h-5 w-5 flex-shrink-0" />
                    <span className="break-words">{sent}</span>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 w-full box-border animate-[fadeIn_0.3s_ease-out]">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <span className="break-words">{error}</span>
                  </div>
                )}
              </form>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
