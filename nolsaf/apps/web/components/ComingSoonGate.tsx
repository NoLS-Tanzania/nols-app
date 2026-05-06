"use client";

/**
 * ComingSoonGate
 * ──────────────
 * A reusable "coming soon" modal gate that can wrap any action on the site.
 *
 * Usage
 * -----
 *   <ComingSoonGate
 *     enabled          // set to `false` to completely remove the gate and let the action through
 *     open={showModal}
 *     onClose={() => setShowModal(false)}
 *     serviceName="Group Stays"
 *     launchDate={new Date('2026-06-25')}
 *   />
 *
 * To open a service: simply set `enabled={false}` — the modal will never render.
 * To lock   a service: keep `enabled={true}` and manage `open` from the parent.
 *
 * Props
 * -----
 * enabled      boolean   – master switch. false = gate disabled (service is live).
 * open         boolean   – controls visibility while enabled.
 * onClose      () => void
 * serviceName  string    – e.g. "Group Stays", "N-SaT", "Plan With Us"
 * launchDate   Date      – countdown target
 * tagline?     string    – one-line description shown under the service name in the header
 */

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X } from 'lucide-react';

interface ComingSoonGateProps {
  /** Master switch — set false to disable the gate entirely (service is live) */
  enabled: boolean;
  /** Whether the modal is currently visible */
  open: boolean;
  /** Called when the user dismisses the modal */
  onClose: () => void;
  /** Human-readable service name, e.g. "Group Stays" */
  serviceName: string;
  /** The date the service goes live */
  launchDate: Date;
  /** Optional short tagline shown in the header description */
  tagline?: string;
}

interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calcCountdown(target: Date): Countdown {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days:    Math.floor(diff / 86_400_000),
    hours:   Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000)  /    60_000),
    seconds: Math.floor((diff %    60_000)  /     1_000),
  };
}

const LAUNCH_DATE_FMT = (d: Date) =>
  d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export default function ComingSoonGate({
  enabled,
  open,
  onClose,
  serviceName,
  launchDate,
  tagline,
}: ComingSoonGateProps) {
  const [countdown, setCountdown] = useState<Countdown>(() => calcCountdown(launchDate));
  const [mounted, setMounted] = useState(false);

  // Wait for client mount so createPortal has access to document.body
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!enabled || !open) return;
    const id = setInterval(() => setCountdown(calcCountdown(launchDate)), 1_000);
    return () => clearInterval(id);
  }, [enabled, open, launchDate]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    if (!enabled || !open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [enabled, open]);

  // Gate disabled — service is live, render nothing
  if (!enabled) return null;
  // Gate enabled but modal not triggered yet, or not yet mounted on client
  if (!open || !mounted) return null;

  const modal = (
    <div
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-5"
      style={{ backgroundColor: 'rgba(2,26,24,0.65)', backdropFilter: 'blur(8px)', zIndex: 99999 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="csg-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Card — constrained height so it never overflows the viewport */}
      <div
        className="relative w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl bg-white flex flex-col"
        style={{ maxHeight: 'calc(100vh - 24px)' }}
      >
        {/* ── Gradient header ── */}
        <div
          className="relative flex-shrink-0 px-5 pt-6 pb-5 text-center overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #02665e 0%, #034d47 100%)' }}
        >
          {/* Decorative blobs */}
          <div className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #fff, transparent 70%)' }} />
          <div className="pointer-events-none absolute -bottom-4 -left-4 h-16 w-16 rounded-full opacity-10"
            style={{ background: 'radial-gradient(circle, #fff, transparent 70%)' }} />

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-2.5 right-2.5 z-10 h-7 w-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5 text-white" />
          </button>

          <div className="relative inline-flex items-center justify-center h-12 w-12 rounded-xl bg-white/15 border border-white/20 mb-3 mx-auto">
            <Sparkles className="w-6 h-6 text-white" />
          </div>

          <h2 id="csg-title" className="text-base font-bold text-white leading-snug">
            We're Almost Ready for You!
          </h2>
          <p className="mt-1.5 text-xs text-white/70 leading-relaxed">
            {tagline
              ? tagline
              : <>
                  Thank you for your interest in{' '}
                  <span className="font-semibold text-white">NoLSAF {serviceName}</span>.
                  We're thrilled by the excitement. It truly means the world to us.
                </>
            }
          </p>
        </div>

        {/* ── Body — scrollable if content is too tall ── */}
        <div className="overflow-y-auto flex-1 px-5 py-4 text-center">
          <p className="text-xs text-slate-500 leading-relaxed">
            We're putting the final touches in place so your experience is seamless and truly special.
          </p>

          <p className="mt-2 text-xs font-semibold text-slate-700">
            <span className="text-[#02665e]">{serviceName}</span> goes live on{' '}
            <span className="text-[#02665e]">{LAUNCH_DATE_FMT(launchDate)}</span>
          </p>

          {/* Countdown */}
          <div className="mt-3 grid grid-cols-4 gap-1.5">
            {(
              [
                { value: countdown.days,    label: 'Days' },
                { value: countdown.hours,   label: 'Hrs' },
                { value: countdown.minutes, label: 'Mins' },
                { value: countdown.seconds, label: 'Secs' },
              ] as const
            ).map(({ value, label }) => (
              <div
                key={label}
                className="rounded-lg border border-[#02665e]/15 bg-gradient-to-br from-white to-emerald-50/40 py-2 shadow-sm"
              >
                <div className="text-xl font-bold text-[#02665e] tabular-nums leading-none">
                  {String(value).padStart(2, '0')}
                </div>
                <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-widest text-slate-400">
                  {label}
                </div>
              </div>
            ))}
          </div>

          <p className="mt-3 text-[11px] text-slate-400 leading-relaxed">
            Feel free to explore our other services in the meantime. We'll be ready for you very soon.
          </p>
        </div>

        {/* ── Footer button — always visible at the bottom ── */}
        <div className="flex-shrink-0 px-5 pb-4 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#02665e] text-white text-sm font-semibold hover:bg-[#034d47] active:scale-[0.98] transition-all shadow-sm focus:outline-none"
          >
            Got it, I'll come back soon!
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
