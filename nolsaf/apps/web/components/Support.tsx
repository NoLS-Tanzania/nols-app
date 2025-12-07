"use client";
import React, { useEffect, useState } from "react";
import { HelpCircle, Mail, MessageSquare, Phone, BookOpen, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";

export type SupportContact = {
  name?: string;
  email?: string;
  phone?: string;
  whatsapp?: string;
  hours?: string;
};

export type FaqItem = {
  q: string;
  a: string;
  href?: string;
  steps?: string[];
};

export type SupportData = {
  helpCenterUrl?: string;
  faqs?: FaqItem[];
  contact?: SupportContact;
};

type Props = {
  title?: string;
  description?: string;
  showHeader?: boolean;
  showHelpCenter?: boolean;
  showFaqs?: boolean;
  showContact?: boolean;
  compact?: boolean;
  className?: string;
  data?: SupportData;
  showError?: boolean;
};

export default function Support({
  title = "Support",
  description = "Help center, FAQs, and contact options",
  showHeader = true,
  showHelpCenter = true,
  showFaqs = true,
  showContact = true,
  compact = false,
  className = "",
  data,
  showError = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [support, setSupport] = useState<SupportData | undefined>(data);
  const [expandedFaqs, setExpandedFaqs] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (data) return; // external data provided
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch("/api/public/support")
      .then(async (r) => {
        if (!r.ok) throw new Error("Unable to load support.");
        const json = await r.json();
        if (!cancelled) setSupport(json as SupportData);
      })
      .catch(() => !cancelled && setError("Unable to load support."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [data]);

  const hasFaqs = (support?.faqs?.length || 0) > 0;
  const contact = support?.contact;
  const helpUrl = support?.helpCenterUrl;

  return (
    <section className={`rounded-xl border border-gray-200 bg-white/60 shadow-sm ${compact ? "p-4" : "p-6"} ${className}`}>
      {showHeader && (
        <header className="flex items-center gap-2 mb-3">
          <HelpCircle className="h-5 w-5 text-indigo-600" />
          <h2 className="text-lg font-semibold">{title}</h2>
        </header>
      )}
      {showHeader && description && <p className="text-sm text-gray-600 mb-4">{description}</p>}

      {loading && (
        <div className="text-sm text-gray-600">Loading support…</div>
      )}
      {showError && error && (
        <div className="text-sm text-red-600">{error}</div>
      )}

      {!loading && !error && (
        <div className={`grid ${compact ? "grid-cols-1 gap-3" : "md:grid-cols-3 gap-6"}`}>
          {showHelpCenter && (
            <div className="rounded-xl border border-gray-200 p-4 bg-white shadow-sm hover:shadow transition-shadow duration-200 border-l-4 border-brand-primary">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="h-4 w-4 text-indigo-600" />
                <h3 className="font-medium text-gray-900">Help Center</h3>
              </div>
              <p className="text-sm text-gray-700 mb-3">Browse guides and documentation.</p>
              <a
                href={helpUrl || "/owner/docs"}
                aria-label="Open Help Center"
                className="inline-flex items-center justify-center no-underline bg-brand-primary hover:bg-[#02665e] h-8 w-8 rounded-full shadow-sm transition"
              >
                <ExternalLink className="h-4 w-4 text-blue-600" />
              </a>
            </div>
          )}

          {showFaqs && (
            <div className="rounded-lg border border-gray-200 p-4 bg-white">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="h-4 w-4 text-indigo-600" />
                <h3 className="font-medium">FAQs</h3>
              </div>
              {!hasFaqs ? (
                <p className="text-sm text-gray-600">No FAQs yet.</p>
              ) : (
                <ul className="space-y-3 list-none pl-0">
                  {support?.faqs?.slice(0, compact ? 4 : 8).map((f, i) => (
                    <li
                      key={i}
                      className="text-sm rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow transition-shadow duration-200 border-l-4 border-brand-primary"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          {f.href ? (
                            <a href={f.href} className="font-medium text-gray-900 hover:text-[#02665e] no-underline">
                              {f.q}
                            </a>
                          ) : (
                            <span className="font-medium text-gray-900">{f.q}</span>
                          )}
                          {f.steps && f.steps.length > 0 ? (
                            <div className="mt-2">
                              <button
                                type="button"
                                aria-expanded={!!expandedFaqs[i]}
                                onClick={() => setExpandedFaqs((prev) => ({ ...prev, [i]: !prev[i] }))}
                                className="inline-flex items-center gap-2 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-md px-2 py-1 transition"
                              >
                                {expandedFaqs[i] ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                {expandedFaqs[i] ? "Hide steps" : "Show steps"}
                              </button>
                              {expandedFaqs[i] && (
                                <ol className="mt-2 space-y-2">
                                  {f.steps.map((s, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold border border-indigo-200">
                                        {idx + 1}
                                      </span>
                                      <span className="text-gray-700 leading-relaxed">{s}</span>
                                    </li>
                                  ))}
                                </ol>
                              )}
                            </div>
                          ) : (
                            <p className="mt-1 text-gray-700 leading-relaxed">{f.a}</p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {showContact && (
            <div className="rounded-xl border border-gray-200 p-4 bg-white shadow-sm hover:shadow transition-shadow duration-200 border-l-4 border-brand-primary">
              <div className="flex items-center gap-2 mb-2">
                <Phone className="h-4 w-4 text-indigo-600" />
                <h3 className="font-medium text-gray-900">Contact</h3>
              </div>
              {!contact ? (
                <p className="text-sm text-gray-600">Contact options will appear here.</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      className="group inline-flex items-center gap-2 no-underline rounded-md border border-gray-200 bg-white px-3 py-2 text-gray-900 shadow-sm hover:shadow-xl hover:bg-gray-50 hover:scale-[1.03] transition duration-200"
                    >
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 group-hover:bg-emerald-600">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-40 group-hover:opacity-60 animate-ping" />
                      </span>
                      <Phone className="h-4 w-4 text-gray-500 group-hover:text-emerald-600 transition-colors" /> {contact.phone}
                    </a>
                  )}
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      className="group inline-flex items-center gap-2 no-underline rounded-md border border-gray-200 bg-white px-3 py-2 text-gray-900 shadow-sm hover:shadow-xl hover:bg-gray-50 hover:scale-[1.03] transition duration-200"
                    >
                      <Mail className="h-4 w-4 text-gray-500 group-hover:text-indigo-600 transition-colors" /> {contact.email}
                    </a>
                  )}
                  {contact.whatsapp && (
                    <a
                      href={contact.whatsapp}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group inline-flex items-center gap-2 no-underline rounded-md border border-gray-200 bg-white px-3 py-2 text-gray-900 shadow-sm hover:shadow transition"
                    >
                      <MessageSquare className="h-4 w-4 text-gray-500 group-hover:text-green-600 transition" /> WhatsApp
                    </a>
                  )}
                  {contact.hours && (
                    <div className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-gray-700 shadow-sm">
                      <span className="inline-flex h-2 w-2 rounded-full bg-indigo-500" />
                      Hours: {contact.hours}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
