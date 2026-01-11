"use client";
import React, { useEffect, useState, useRef } from 'react';
import { escapeHtml, sanitizeTrustedHtml } from "@/utils/html";

type LegalType = 'terms' | 'privacy' | 'cookies';

const TITLES: Record<LegalType, string> = {
  terms: 'Admin Terms of Service',
  privacy: 'Privacy Policy',
  cookies: 'Cookies Policy',
};

export default function LegalModal() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<LegalType>('terms');
  const [accepted, setAccepted] = useState(false);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handler(e: Event) {
      const ev = e as CustomEvent;
      const t = ev?.detail?.type as LegalType | undefined;
      if (t) {
        setType(t);
        const v = localStorage.getItem(`${t}Accepted`);
        setAccepted(v === 'true');
        setOpen(true);
      }
    }
    window.addEventListener('open-legal', handler as EventListener);
    return () => window.removeEventListener('open-legal', handler as EventListener);
  }, []);

  const handleClose = () => setOpen(false);
  const handleAccept = () => {
    localStorage.setItem(`${type}Accepted`, 'true');
    setAccepted(true);
  };

  const handlePrint = () => {
    if (!contentRef.current) return;
    const safeBody = sanitizeTrustedHtml(contentRef.current.innerHTML);
    const html = `
      <html>
        <head>
          <title>${escapeHtml(TITLES[type])}</title>
          <style>body{font-family:system-ui, -apple-system, Roboto, Arial; padding:20px}</style>
        </head>
        <body>${safeBody}</body>
      </html>`;
    const w = window.open('', '_blank', 'noopener');
    if (!w) return;
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 200);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative bg-white w-full max-w-3xl rounded-2xl shadow-lg overflow-hidden">
        <div className="p-4 border-b flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">{TITLES[type]}</h2>
            <div className="text-xs text-gray-500">Updated: {new Date().toLocaleDateString()}</div>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn btn-ghost" onClick={handlePrint}>Print</button>
            <button className="btn" onClick={handleClose}>Close</button>
          </div>
        </div>

        <div className="p-6 max-h-[60vh] overflow-auto" ref={contentRef}>
          <p className="mb-2">This is the {TITLES[type].toLowerCase()}. Please read carefully. The content below is a short example — replace with your real policy text or load from CMS.</p>
          <h3>Summary of these {type === 'terms' ? 'Terms' : type === 'privacy' ? 'Privacy' : 'Cookies'}</h3>
          <ul className="list-disc ml-6 mb-4">
            <li>Scope and purpose.</li>
            <li>User obligations.</li>
            <li>Data handling and retention.</li>
          </ul>

          <div className="prose">
            <h4>Details</h4>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam.</p>
            <p>Suspendisse potenti. Integer vitae justo eget magna fermentum iaculis eu non diam.</p>
          </div>
        </div>

        <div className="border-t p-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">{accepted ? 'You accepted this document.' : 'You have not accepted this document.'}</div>
          <div className="flex items-center gap-3">
            <button className="btn btn-ghost" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Top</button>
            <button className="btn btn-brand" onClick={handleAccept} disabled={accepted}>{accepted ? 'Accepted' : `Accept ${TITLES[type]}`}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
