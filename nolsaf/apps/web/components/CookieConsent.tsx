"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";

const STORAGE_KEY = "nolsaf_cookie_consent";

type ConsentState = "accepted" | "declined" | null;

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);
  const [managing, setManaging] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const save = (consent: ConsentState, prefs?: { analytics: boolean; marketing: boolean }) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ consent, analytics: prefs?.analytics ?? true, marketing: prefs?.marketing ?? false, at: Date.now() })
      );
    } catch {
      // storage blocked — still dismiss
    }
    setVisible(false);
    setManaging(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label="Cookie preferences"
      className="fixed bottom-4 left-4 z-[99999] w-[min(94vw,32rem)] shadow-xl rounded-2xl border border-blue-100 overflow-hidden"
      style={{ background: "linear-gradient(135deg, #eef3ff 0%, #e8f4ff 60%, #dff0fa 100%)", boxShadow: "0 4px 32px rgba(30,40,120,0.13)" }}
    >
      {/* Close (dismiss without deciding) */}
      <button
        onClick={() => save("declined")}
        aria-label="Dismiss cookie notice"
        className="absolute top-2.5 right-2.5 h-6 w-6 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="px-4 pt-4 pb-3">
        {!managing ? (
          <>
            {/* ── Main notice ── */}
            <p className="text-xs leading-relaxed text-[#1e1e5e] pr-5">
              By clicking <strong>&ldquo;Accept&rdquo;</strong>, you agree to the storing of cookies
              on your device to keep you signed in, enhance your experience, analyze site usage, and
              support our marketing efforts. View our{" "}
              <Link
                href="/cookies-policy"
                className="font-semibold text-[#02665e] underline underline-offset-2 hover:text-[#014e47]"
              >
                Cookies Policy
              </Link>{" "}
              and{" "}
              <Link
                href="/privacy"
                className="font-semibold text-[#02665e] underline underline-offset-2 hover:text-[#014e47]"
              >
                Privacy Policy
              </Link>{" "}
              for more information.
            </p>

            <div className="mt-3.5 flex items-center justify-end gap-3">
              <button
                onClick={() => setManaging(true)}
                className="text-xs text-slate-500 hover:text-slate-700 transition-colors outline-none focus:outline-none"
              >
                Preferences
              </button>
              <button
                onClick={() => save("declined", { analytics: false, marketing: false })}
                className="px-4 py-1.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors outline-none focus:outline-none"
              >
                Reject
              </button>
              <button
                onClick={() => save("accepted")}
                className="px-5 py-1.5 text-xs font-semibold rounded-full bg-[#1a1a4e] text-white hover:bg-[#12123a] active:scale-[0.97] transition-all outline-none focus:outline-none"
              >
                Accept
              </button>
            </div>
          </>
        ) : (
          <>
            {/* ── Preferences panel ── */}
            <h2 className="text-base font-bold text-gray-900 pr-6">Cookie preferences</h2>
            <p className="mt-1 text-xs text-gray-500">
              Choose which categories of cookies you allow. Essential cookies are always on.
            </p>

            <div className="mt-4 space-y-3">
              {/* Essential — always on */}
              <ConsentRow
                label="Essential"
                description="Required for the site to function — sessions, authentication, security."
                checked={true}
                disabled
                onChange={() => {}}
              />
              {/* Analytics */}
              <ConsentRow
                label="Analytics"
                description="Helps us understand how visitors use the site so we can improve it."
                checked={analytics}
                onChange={setAnalytics}
              />
              {/* Marketing */}
              <ConsentRow
                label="Marketing"
                description="Used to show you relevant ads and measure their effectiveness."
                checked={marketing}
                onChange={setMarketing}
              />
            </div>

            <div className="mt-5 flex items-center justify-between gap-2.5">
              <button
                onClick={() => setManaging(false)}
                className="text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
              >
                ← Preferences
              </button>
              <div className="flex gap-2.5">
                <button
                  onClick={() => save("declined", { analytics: false, marketing: false })}
                  className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Essential only
                </button>
                <button
                  onClick={() => save("accepted", { analytics, marketing })}
                  className="px-5 py-2 text-sm font-bold rounded-xl bg-[#02665e] text-white hover:bg-[#014e47] active:scale-[0.97] transition-all shadow-sm"
                >
                  Save &amp; accept
                </button>
              </div>
            </div>
          </>
        )}
      </div>


    </div>
  );
}

function ConsentRow({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-900">{label}</span>
          {disabled && (
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">
              Always on
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">{description}</p>
      </div>
      {/* Toggle */}
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 mt-0.5 h-5 w-9 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e] ${
          checked ? "bg-[#02665e]" : "bg-gray-300"
        } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
