"use client";

import React from "react";

type Props = {
  label?: string;
  className?: string;
  variant?: 'line' | 'pill' | 'dots' | 'map';
  pillLabel?: string;
  tone?: 'light' | 'dark';
};

export default function SectionSeparator({ label, className = "", variant = 'line', pillLabel, tone = 'light' }: Props) {
  const isDark = tone === 'dark';

  const lineColor = isDark ? 'bg-white/10' : 'bg-gray-300';
  const circleBg = isDark ? 'bg-slate-950/40' : 'bg-white';
  const circleBorder = isDark ? 'border-white/10' : 'border-gray-300';

  const dotsColor = isDark ? 'bg-white/20' : 'bg-slate-300';
  const dotsLabel = isDark ? 'text-slate-300' : 'text-slate-600';

  const pillLine = isDark ? 'via-white/20' : 'via-sky-300';
  const mapBorder = isDark ? 'border-white/15' : 'border-slate-300';
  const mapIconBg = isDark ? 'bg-white/10' : 'bg-white';
  const mapIconBorder = isDark ? 'border-white/15' : '';
  const mapIconText = isDark ? 'text-slate-100' : 'text-emerald-600';

  return (
    <div className={`w-full ${className}`}>
      <div className="public-container">
        {variant === 'pill' ? (
          <div className="flex items-center justify-center" role="separator" aria-hidden={label ? "false" : "true"}>
            <div className={`flex-1 h-px bg-gradient-to-r from-transparent ${pillLine} to-transparent`} />
            <span className="mx-4 px-3 py-1 bg-gradient-to-r from-emerald-500 to-blue-600 text-white rounded-full text-sm font-medium">{pillLabel ?? 'Explore'}</span>
            <div className={`flex-1 h-px bg-gradient-to-r from-transparent ${pillLine} to-transparent`} />
          </div>
        ) : variant === 'dots' ? (
          <div className="flex items-center justify-center" role="separator" aria-hidden={label ? "false" : "true"}>
            <div className="flex-1 flex items-center justify-end pr-4">
              <div className="flex items-center gap-2">
                {[0,1,2,3].map((i) => (
                  <span key={i} className={`w-1.5 h-1.5 rounded-full ${dotsColor} opacity-80 animate-pulse`} />
                ))}
              </div>
            </div>
            <span className={`mx-2 px-3 py-0.5 bg-white/0 text-sm ${dotsLabel} tracking-wide uppercase`}>{pillLabel ?? 'Explore'}</span>
            <div className="flex-1 flex items-center justify-start pl-4">
              <div className="flex items-center gap-2">
                {[0,1,2,3].map((i) => (
                  <span key={i} className={`w-1.5 h-1.5 rounded-full ${dotsColor} opacity-80 animate-pulse`} />
                ))}
              </div>
            </div>
          </div>
        ) : variant === 'map' ? (
          <div className="flex items-center justify-center" role="separator" aria-hidden={label ? "false" : "true"}>
            <div className="flex-1 flex items-center justify-end pr-4">
              <div className={`w-full h-px border-t border-dashed ${mapBorder}`} />
            </div>
            <div className="mx-4 flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-sm" />
              <div className="relative">
                <div className={`w-10 h-10 ${mapIconBg} ${mapIconBorder ? `border ${mapIconBorder}` : ''} rounded-full flex items-center justify-center shadow-md`}>
                  <svg suppressHydrationWarning className={`w-5 h-5 ${mapIconText}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                    <path d="M12 2C8.686 2 6 4.686 6 8c0 5.25 6 12 6 12s6-6.75 6-12c0-3.314-2.686-6-6-6z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="8" r="2" fill="currentColor" />
                  </svg>
                </div>
                <div className="absolute -right-4 top-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                </div>
              </div>
              <div className="w-3 h-3 rounded-full bg-rose-400 shadow-sm" />
            </div>
            <div className="flex-1 flex items-center justify-start pl-4">
              <div className={`w-full h-px border-t border-dashed ${mapBorder}`} />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3" role="separator" aria-hidden={label ? "false" : "true"}>
            <div className={`flex-1 h-px ${lineColor}`} />
            <div className={`w-7 h-7 flex items-center justify-center ${circleBg} border ${circleBorder} rounded-full`}>
              <svg suppressHydrationWarning className="w-3 h-3 text-gray-500" viewBox="0 0 8 8" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                <circle cx="4" cy="4" r="2" fill="currentColor" />
              </svg>
            </div>
            <div className={`flex-1 h-px ${lineColor}`} />
          </div>
        )}
        {label ? <div className="sr-only">{label}</div> : null}
      </div>
    </div>
  );
}
