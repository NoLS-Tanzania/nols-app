"use client"

import React from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ChevronLeft } from "lucide-react"

export type SecuritySettingsShellProps = {
  title: string
  description?: string
  icon: LucideIcon
  iconBgClassName: string
  iconClassName: string
  backHref: string
  backLabel?: string
  backAriaLabel?: string
  containerClassName?: string
  children: React.ReactNode
}

export default function SecuritySettingsShell({
  title,
  description,
  icon: Icon,
  iconBgClassName,
  iconClassName,
  backHref,
  backLabel = "Back to Security",
  backAriaLabel,
  containerClassName = "w-full",
  children,
}: SecuritySettingsShellProps) {
  return (
    <div className={`${containerClassName} py-6 sm:py-10`}>
      <div className="w-full">
        <div className="mb-6 sm:mb-8 relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/70 text-slate-900 backdrop-blur shadow-card ring-1 ring-slate-900/5">
          <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-white/85 to-slate-50" aria-hidden />
          <div
            className="absolute -top-28 -right-24 h-72 w-72 rounded-full bg-brand/10 blur-3xl motion-safe:animate-pulse"
            style={{ animationDuration: "5.5s" }}
            aria-hidden
          />
          <div
            className="absolute -bottom-32 -left-28 h-80 w-80 rounded-full bg-slate-200/30 blur-3xl motion-safe:animate-pulse"
            style={{ animationDuration: "7s" }}
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" aria-hidden />
          <div className="pointer-events-none absolute inset-0 motion-reduce:hidden" aria-hidden>
            <span className="absolute left-10 top-10 h-1.5 w-1.5 rounded-full bg-brand/35 motion-safe:animate-ping" style={{ animationDuration: "2.6s" }} />
            <span
              className="absolute right-14 top-16 h-1.5 w-1.5 rounded-full bg-slate-400/35 motion-safe:animate-ping"
              style={{ animationDuration: "3.2s", animationDelay: "0.35s" } as React.CSSProperties}
            />
            <span
              className="absolute left-24 bottom-16 h-1.5 w-1.5 rounded-full bg-slate-400/30 motion-safe:animate-ping"
              style={{ animationDuration: "3.8s", animationDelay: "0.7s" } as React.CSSProperties}
            />
          </div>

          <div className="relative px-5 py-5 sm:px-8 sm:py-7">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
                {description ? <p className="text-sm sm:text-base text-slate-600 mt-1 leading-relaxed">{description}</p> : null}
              </div>

              <div className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200/70 bg-white/75 shadow-card ring-1 ring-slate-900/5">
                <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-brand/10 via-transparent to-transparent" aria-hidden />
                <span
                  className="pointer-events-none absolute inset-1 rounded-2xl bg-brand/10 opacity-0 motion-safe:opacity-100 motion-safe:animate-pulse"
                  style={{ animationDuration: "4.5s" }}
                  aria-hidden
                />
                <div className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full ${iconBgClassName} ${iconClassName}`}>
                  <span
                    className="pointer-events-none absolute inset-0 rounded-full bg-white/35 opacity-0 motion-safe:opacity-100 motion-safe:animate-ping"
                    style={{ animationDuration: "2.4s" }}
                    aria-hidden
                  />
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
              </div>
            </div>
          </div>
        </div>

        {children}

        <div className="mt-8 flex justify-start">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-md transition-colors border border-slate-200 hover:border-slate-300 no-underline"
            aria-label={backAriaLabel || backLabel}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            <span>{backLabel}</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
