"use client";
import React, { useEffect, useState, useRef } from 'react';
import Terms, { type TermsSection } from "@/components/Terms";
import AgentContractContent from "@/components/AgentContractContent";
import { TERMS_LAST_UPDATED, TERMS_SECTIONS } from "@/components/termsContent";
import { PRIVACY_LAST_UPDATED, PRIVACY_SECTIONS } from "@/components/privacyContent";
import { COOKIES_LAST_UPDATED, COOKIES_SECTIONS } from "@/components/cookiesContent";

type LegalType = 'terms' | 'privacy' | 'cookies' | 'contract';

const TITLES: Record<LegalType, string> = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  cookies: 'Cookies Policy',
  contract: 'My Contract',
};

const CONTENT: Record<Exclude<LegalType, 'contract'>, { lastUpdated?: string; sections: TermsSection[] }> = {
  terms: { lastUpdated: TERMS_LAST_UPDATED, sections: TERMS_SECTIONS },
  privacy: { lastUpdated: PRIVACY_LAST_UPDATED, sections: PRIVACY_SECTIONS },
  cookies: { lastUpdated: COOKIES_LAST_UPDATED, sections: COOKIES_SECTIONS },
};

export default function LegalModal() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<LegalType>('terms');
  const contentRef = useRef<HTMLDivElement | null>(null);
  const [blockedForPrint, setBlockedForPrint] = useState(false);

  useEffect(() => {
    function handler(e: Event) {
      const ev = e as CustomEvent;
      const t = ev?.detail?.type as LegalType | undefined;
      if (t) {
        setType(t);
        setOpen(true);
      }
    }
    window.addEventListener('open-legal', handler as EventListener);
    return () => window.removeEventListener('open-legal', handler as EventListener);
  }, []);

  const handleClose = () => setOpen(false);

  const isPolicyType = type !== 'contract';
  const doc = isPolicyType ? CONTENT[type] : null;
  const watermarkText = isPolicyType ? `NoLSAF ${TITLES[type]}` : 'CONFIDENTIAL';
  const isConfidential = type === 'contract';

  useEffect(() => {
    if (!open || !isConfidential) return;

    const onKeyDown = (e: KeyboardEvent) => {
      const key = String(e.key || "").toLowerCase();
      const combo = e.ctrlKey || e.metaKey;
      if (!combo) return;

      if (key === "p" || key === "c" || key === "x" || key === "s") {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
    };

    const onBeforePrint = () => {
      setBlockedForPrint(true);
    };

    const onAfterPrint = () => {
      setBlockedForPrint(false);
    };

    window.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("contextmenu", onContextMenu, true);
    window.addEventListener("copy", onCopy, true);
    window.addEventListener("cut", onCopy, true);
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);

    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("contextmenu", onContextMenu, true);
      window.removeEventListener("copy", onCopy, true);
      window.removeEventListener("cut", onCopy, true);
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
    };
  }, [open, isConfidential]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <style>{"@media print { .nolsaf-confidential { display:none !important; } }"}</style>
      <div className="fixed inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative bg-white w-full max-w-3xl rounded-2xl shadow-lg overflow-hidden">
        <div className="p-4 border-b flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">{TITLES[type]}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button className="btn" onClick={handleClose}>Close</button>
          </div>
        </div>

        <div className="relative p-6 bg-slate-50">
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div className="absolute inset-0 grid grid-cols-2 sm:grid-cols-3 place-items-center gap-16">
              {Array.from({ length: 9 }).map((_, idx) => (
                <div
                  key={idx}
                  className="select-none -rotate-12 text-slate-900/10 font-extrabold tracking-widest uppercase text-lg sm:text-xl"
                >
                  {watermarkText}
                </div>
              ))}
            </div>
          </div>

          <div
            className={
              isConfidential
                ? "relative max-h-[60vh] overflow-auto nolsaf-confidential select-none"
                : "relative max-h-[60vh] overflow-auto"
            }
            ref={contentRef}
            onCopy={isConfidential ? (e) => e.preventDefault() : undefined}
            onCut={isConfidential ? (e) => e.preventDefault() : undefined}
          >
            <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-6">
              {blockedForPrint && isConfidential ? (
                <div className="text-sm text-slate-700">Confidential document. Printing is disabled.</div>
              ) : isPolicyType && doc ? (
                <Terms headline="" lastUpdated={doc.lastUpdated} sections={doc.sections} />
              ) : (
                <AgentContractContent />
              )}
            </div>
          </div>
        </div>

        <div className="border-t p-4 flex items-center justify-end">
          <button className="btn btn-ghost" onClick={() => contentRef.current?.scrollTo({ top: 0, behavior: "smooth" })}>
            Top
          </button>
        </div>
      </div>
    </div>
  );
}
