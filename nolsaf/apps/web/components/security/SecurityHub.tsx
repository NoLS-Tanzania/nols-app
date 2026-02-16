"use client"

import React from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { ChevronLeft } from "lucide-react"

export type SecurityHubItem = {
  title: string
  description: string
  href: string
  icon: LucideIcon
  iconBgClassName: string
  iconClassName: string
  actionLabel: string
  actionIcon: LucideIcon
  actionAriaLabel: string
  tone?: "light" | "soft"
}

export type SecurityHubProps = {
  title: string
  description?: string
  headerIcon: LucideIcon
  headerIconBgClassName: string
  headerIconClassName: string
  items: SecurityHubItem[]
  backHref: string
  backLabel: string
  backAriaLabel?: string
  template?: "default" | "settings"
}

export default function SecurityHub({
  title,
  description,
  headerIcon: HeaderIcon,
  headerIconBgClassName,
  headerIconClassName,
  items,
  backHref,
  backLabel,
  backAriaLabel,
  template = "default",
}: SecurityHubProps) {
  if (template === "settings") {
    return (
      <div className="w-full py-6 sm:py-10">
        <div className="w-full">
          <div className="mb-6 sm:mb-8 relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/70 text-slate-900 backdrop-blur shadow-card ring-1 ring-slate-900/5">
            <div className="absolute inset-0 bg-gradient-to-br from-brand/10 via-white/85 to-slate-50" aria-hidden />
            <div className="absolute -top-28 -right-24 h-72 w-72 rounded-full bg-brand/10 blur-3xl motion-safe:animate-pulse" style={{ animationDuration: "5.5s" }} aria-hidden />
            <div className="absolute -bottom-32 -left-28 h-80 w-80 rounded-full bg-slate-200/30 blur-3xl motion-safe:animate-pulse" style={{ animationDuration: "7s" }} aria-hidden />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" aria-hidden />
            <div className="pointer-events-none absolute inset-0 motion-reduce:hidden" aria-hidden>
              <span
                className="absolute left-10 top-10 h-1.5 w-1.5 rounded-full bg-brand/35 motion-safe:animate-ping"
                style={{ animationDuration: "2.6s" }}
              />
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
                  <div className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full ${headerIconBgClassName} ${headerIconClassName}`}>
                    <span
                      className="pointer-events-none absolute inset-0 rounded-full bg-white/35 opacity-0 motion-safe:opacity-100 motion-safe:animate-ping"
                      style={{ animationDuration: "2.4s" }}
                      aria-hidden
                    />
                    <HeaderIcon className="h-5 w-5" aria-hidden />
                  </div>
                </div>
              </div>

              <div className="mt-4 h-px bg-slate-200/60" aria-hidden />
              <div className="mt-3 text-xs sm:text-sm text-slate-500">Manage your security basics first (password + 2FA).</div>
            </div>
          </div>

          <div className="grid grid-cols-1 items-start gap-6 sm:gap-8 md:grid-cols-2">
            {items.map((item) => {
              const ItemIcon = item.icon
              const ActionIcon = item.actionIcon

              const tone = item.tone ?? "light"
              const toneOverlay =
                tone === "soft" ? "from-white/85 via-transparent to-brand/10" : "from-white/85 via-transparent to-slate-50"

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.actionAriaLabel}
                  title={item.actionLabel}
                  className="group relative isolate block w-full overflow-hidden rounded-3xl border border-slate-200/70 bg-white/75 text-left backdrop-blur shadow-card ring-1 ring-slate-900/5 transition-colors no-underline hover:no-underline hover:border-slate-300/70 hover:bg-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/25"
                >
                  <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${toneOverlay} opacity-90`} aria-hidden />
                  <div className={`pointer-events-none absolute inset-0 ${item.iconBgClassName} opacity-[0.22]`} aria-hidden />
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-emerald-500/25 via-brand/15 to-blue-500/25"
                    aria-hidden
                  />
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-white/90" aria-hidden />

                  <div className="relative p-5 sm:p-6">
                    <div className="flex items-start gap-3">
                      <div
                        className={`relative h-11 w-11 shrink-0 rounded-2xl border border-slate-200/70 bg-white/70 flex items-center justify-center shadow-sm ring-1 ring-slate-900/5 ${item.iconBgClassName}`}
                      >
                        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-brand/15 via-white/70 to-transparent" aria-hidden />
                        <ItemIcon className={`relative h-5 w-5 ${item.iconClassName}`} aria-hidden />
                      </div>

                      <div className="min-w-0">
                        <h3 className="text-lg font-semibold tracking-tight text-slate-900">{item.title}</h3>
                        <p className="text-sm mt-1 leading-snug text-slate-600">{item.description}</p>
                      </div>
                    </div>

                    <div className="mt-5 flex justify-start">
                      <span className={`inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold group-hover:border-slate-300 ${item.iconClassName}`}>
                        <ActionIcon className="h-4 w-4" aria-hidden />
                        <span className="whitespace-normal">{item.actionLabel}</span>
                      </span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

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

  return (
    <div className="w-full max-w-full space-y-6 overflow-x-hidden">
      <div className="w-full text-center">
        <div className="flex flex-col items-center mb-6">
          <div className={`inline-flex items-center justify-center h-12 w-12 rounded-full ${headerIconBgClassName} ${headerIconClassName}`}>
            <HeaderIcon className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">{title}</h1>
          {description ? (
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 max-w-2xl">{description}</p>
          ) : null}
        </div>
      </div>

      <section className="w-full max-w-5xl mx-auto rounded-lg p-6 border-2 border-slate-200 bg-white shadow-card overflow-x-hidden dark:bg-slate-950 dark:border-slate-800">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((item) => {
            const ItemIcon = item.icon
            const ActionIcon = item.actionIcon

            const tone = item.tone ?? "light"
            const cardClassName =
              tone === "soft"
                ? "border-slate-200 bg-gradient-to-br from-slate-50 to-white hover:border-emerald-200 dark:border-slate-800 dark:from-slate-950 dark:to-slate-900"
                : "border-slate-200 bg-gradient-to-br from-white to-slate-50 hover:border-emerald-300 dark:border-slate-800 dark:from-slate-950 dark:to-slate-900"

            const titleClassName = "text-slate-900 dark:text-slate-100"
            const descriptionClassName = "text-slate-500 dark:text-slate-300"
            const actionClassName =
              "text-emerald-700 hover:text-emerald-800 bg-white hover:bg-emerald-50 border-slate-200 hover:border-emerald-200 dark:bg-white/5 dark:hover:bg-white/10 dark:text-emerald-200 dark:hover:text-emerald-100 dark:border-white/10 dark:hover:border-white/20"

            const iconWrapClassName = "ring-1 ring-slate-200 dark:ring-white/10"

            return (
              <div
                key={item.href}
                className={`group relative overflow-hidden border-2 rounded-2xl p-6 transition-all shadow-card hover:shadow-md focus-within:ring-2 focus-within:ring-emerald-500/20 ${cardClassName}`}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-emerald-500/30 via-transparent to-blue-500/30"
                />

                <div className="flex h-full flex-col justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${item.iconBgClassName} ${iconWrapClassName}`}>
                      <ItemIcon className={`h-6 w-6 ${item.iconClassName}`} aria-hidden />
                    </div>
                    <div>
                      <h3 className={`text-lg font-semibold tracking-tight ${titleClassName}`}>{item.title}</h3>
                      <p className={`text-sm mt-1 leading-snug ${descriptionClassName}`}>{item.description}</p>
                    </div>
                  </div>
                  <Link
                    href={item.href}
                    title={item.actionLabel}
                    className={`inline-flex w-fit items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full transition-colors border no-underline ${actionClassName}`}
                    aria-label={item.actionAriaLabel}
                  >
                    <ActionIcon className="h-4 w-4" aria-hidden />
                    <span>{item.actionLabel}</span>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-6 flex justify-start">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-700 hover:bg-slate-50 rounded-md transition-colors border border-slate-200 hover:border-slate-300 no-underline dark:text-slate-300 dark:hover:text-slate-200 dark:hover:bg-white/5 dark:border-slate-800 dark:hover:border-slate-700"
            aria-label={backAriaLabel || backLabel}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            <span>{backLabel}</span>
          </Link>
        </div>
      </section>
    </div>
  )
}
