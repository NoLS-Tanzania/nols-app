"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ArrowLeft, TreePine } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";

import PublicApprovedPropertyCard from "./PublicApprovedPropertyCard";

export type TourismSiteProperty = {
  name: string;
  note?: string;
  href?: string;
  imageSrc?: string;
  imageAlt?: string;
  placement?: "INSIDE" | "NEARBY";
};

export type TourismSite = {
  slug?: string;
  name: string;
  note: string;
  details?: string[];
  imageSrc?: string;
  imageAlt?: string;
  properties?: TourismSiteProperty[];
};

type PublicPropertyCard = {
  id: number;
  slug: string;
  title: string;
  type: string;
  location: string;
  primaryImage: string | null;
  parkPlacement: "INSIDE" | "NEARBY" | null;
  services?: any;
  basePrice: number | null;
  currency: string | null;
};

function slugifyTourismSite(input: string) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function CountryTourismSiteList({
  title,
  items,
  hideHeader = false,
  defaultOpenFirst = false,
  propertyGrid = "compact",
  basePath,
}: {
  title: string;
  items: TourismSite[];
  hideHeader?: boolean;
  defaultOpenFirst?: boolean;
  propertyGrid?: "compact" | "wide";
  basePath?: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  const isFocusedSingle = Boolean(basePath) && defaultOpenFirst && items.length === 1;

  const initialOpen = useMemo(() => {
    if (!defaultOpenFirst) return new Set<number>();
    return items.length ? new Set<number>([0]) : new Set<number>();
  }, [defaultOpenFirst, items.length]);
  const [open, setOpen] = useState<Set<number>>(initialOpen);

  useEffect(() => {
    if (!defaultOpenFirst) return;
    if (!items.length) return;
    setOpen((prev) => (prev.size ? prev : new Set<number>([0])));
  }, [defaultOpenFirst, items.length]);

  const [systemCommission, setSystemCommission] = useState<number>(0);
  const [propertiesBySiteSlug, setPropertiesBySiteSlug] = useState<Record<string, PublicPropertyCard[] | undefined>>({});
  const [loadingBySiteSlug, setLoadingBySiteSlug] = useState<Record<string, boolean | undefined>>({});
  const [errorBySiteSlug, setErrorBySiteSlug] = useState<Record<string, string | undefined>>({});
  // Tracks slugs that have been fetched (or are in-flight) so we never loop on empty/error results
  const fetchedSlugs = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch(`/api/public/support/system-settings`, { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (mounted && json?.commissionPercent !== undefined) {
            const commission = Number(json.commissionPercent);
            setSystemCommission(isNaN(commission) ? 0 : commission);
          }
        }
      } catch {
        // Silently fail - will use 0 as default
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const ensurePropertiesLoaded = useCallback(async (siteSlug: string) => {
    if (!siteSlug) return;
    // Use a ref-based guard so this never loops on empty/error results.
    // [] is falsy, so a state-based check would re-fetch endlessly on empty results.
    if (fetchedSlugs.current.has(siteSlug)) return;
    fetchedSlugs.current.add(siteSlug);

    setLoadingBySiteSlug((prev) => ({ ...prev, [siteSlug]: true }));
    setErrorBySiteSlug((prev) => ({ ...prev, [siteSlug]: undefined }));

    try {
      const resp = await fetch(
        `/api/public/properties?tourismSiteSlug=${encodeURIComponent(siteSlug)}`,
        { method: "GET", cache: "no-store", credentials: "include", headers: { Accept: "application/json" } }
      );
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const data = (await resp.json()) as { items?: PublicPropertyCard[] };
      const cards = Array.isArray(data?.items) ? data.items : [];

      setPropertiesBySiteSlug((prev) => ({ ...prev, [siteSlug]: cards }));
    } catch (e: any) {
      console.error("Failed to load park properties", e);
      // Remove from fetched so the user can manually retry
      fetchedSlugs.current.delete(siteSlug);
      const msg = String(e?.message || "");
      const friendly = msg.includes("502") || msg.includes("503") || msg.includes("504")
        ? "Service temporarily unavailable"
        : msg || "Failed to load";
      setErrorBySiteSlug((prev) => ({ ...prev, [siteSlug]: friendly }));
      setPropertiesBySiteSlug((prev) => ({ ...prev, [siteSlug]: [] }));
    } finally {
      setLoadingBySiteSlug((prev) => ({ ...prev, [siteSlug]: false }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Stable — fetchedSlugs ref used for deduplication

  const retryLoad = useCallback((siteSlug: string) => {
    setErrorBySiteSlug((prev) => { const n = { ...prev }; delete n[siteSlug]; return n; });
    setPropertiesBySiteSlug((prev) => { const n = { ...prev }; delete n[siteSlug]; return n; });
    setLoadingBySiteSlug((prev) => ({ ...prev, [siteSlug]: false }));
    void ensurePropertiesLoaded(siteSlug);
  }, [ensurePropertiesLoaded]);

  useEffect(() => {
    if (!defaultOpenFirst) return;
    const first = items[0];
    if (!first) return;
    const siteSlug = first?.slug ? String(first.slug) : slugifyTourismSite(first?.name || "");
    void ensurePropertiesLoaded(siteSlug);
  }, [defaultOpenFirst, ensurePropertiesLoaded, items]);

  const toggle = (index: number) => {
    setOpen((prev) => {
      const next = new Set(prev);
      const willOpen = !next.has(index);
      if (!willOpen) next.delete(index);
      else next.add(index);

      if (willOpen) {
        const site = items[index];
        const siteSlug = site?.slug ? String(site.slug) : slugifyTourismSite(site?.name || "");
        void ensurePropertiesLoaded(siteSlug);
      }

      return next;
    });
  };

  return (
    <section className="rounded-3xl bg-white/55 backdrop-blur-xl overflow-hidden">
      {!hideHeader ? (
        <header className="px-5 sm:px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="text-slate-900 font-semibold text-lg tracking-tight">{title}</div>
            <div className="inline-flex items-center rounded-full bg-white/70 border border-slate-200/70 px-2.5 py-1 text-xs font-semibold text-slate-700 tabular-nums shadow-[inset_0_1px_0_rgba(255,255,255,0.75)]">
              {items.length}
            </div>
          </div>
        </header>
      ) : null}

      <ul
        className={[
          "list-none px-2 sm:px-3 pb-3 grid gap-2",
          isFocusedSingle ? "grid-cols-1" : "grid-cols-2",
        ].join(" ")}
      >
        {items.map((s, i) => {
          const isOpen = isFocusedSingle ? true : open.has(i);

          const siteSlug = s.slug ? String(s.slug) : slugifyTourismSite(s.name);
          const loadedProps = propertiesBySiteSlug[siteSlug];
          const isLoading = !!loadingBySiteSlug[siteSlug];
          const loadError = errorBySiteSlug[siteSlug];
          const allProperties = loadError ? undefined : loadedProps;
          const insideProperties = (allProperties ?? []).filter((p) => p.parkPlacement === "INSIDE");
          const nearbyProperties = (allProperties ?? []).filter((p) => p.parkPlacement === "NEARBY");
          const showCountBadge = (!loadError && loadedProps !== undefined) || isLoading;
          const countLabel = loadedProps !== undefined ? String(loadedProps.length) : "…";

          return (
            <li
              key={siteSlug}
              className={[
                "group rounded-2xl overflow-hidden bg-gradient-to-br from-white/80 via-white/60 to-emerald-50/60 shadow-sm",
                "motion-safe:transition-shadow motion-safe:duration-200",
                "hover:shadow-md",
                !isFocusedSingle && isOpen ? "col-span-2" : "",
              ].join(" ")}
            >
              {isFocusedSingle ? (
                <div className="relative overflow-hidden rounded-t-2xl bg-white border border-emerald-200/80 shadow-sm">
                  {/* Emerald dot-grid decoration */}
                  <div
                    className="absolute inset-0 pointer-events-none opacity-[0.15]"
                    style={{
                      backgroundImage: "radial-gradient(circle, #10b981 1.2px, transparent 1.2px)",
                      backgroundSize: "20px 20px",
                    }}
                    aria-hidden
                  />
                  {/* Fade dots out from the left so text stays clean */}
                  <div className="absolute inset-0 bg-gradient-to-r from-white via-white/60 to-transparent pointer-events-none" aria-hidden />

                  <div className="relative px-5 sm:px-6 pt-4 pb-5">
                    {/* Back navigation — solid small button */}
                    <button
                      type="button"
                      onClick={() => {
                        if (!basePath) return;
                        const qp = new URLSearchParams(sp?.toString() ?? "");
                        qp.delete("site");
                        const qs = qp.toString();
                        router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
                      }}
                      className="group/back inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 px-3 py-1.5 text-[11px] font-semibold text-white shadow-sm transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                      aria-label="Back to all parks"
                    >
                      <ArrowLeft className="h-3 w-3 transition-transform duration-200 group-hover/back:-translate-x-0.5" aria-hidden />
                      All parks
                    </button>

                    {/* Park name + status badge */}
                    <div className="mt-3 flex items-end justify-between gap-4">
                      <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-tight">
                        {s.name}
                      </h2>
                      {showCountBadge ? (
                        <span
                          className={[
                            "shrink-0 inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-0.5 text-[11px] font-semibold tabular-nums",
                            isLoading
                              ? "bg-slate-100 text-slate-400 animate-pulse"
                              : loadedProps && loadedProps.length > 0
                                ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                                : "bg-slate-100 text-slate-400",
                          ].join(" ")}
                          aria-label={isLoading ? "Loading properties" : `${countLabel} properties`}
                        >
                          {!isLoading && (
                            <span
                              className={["h-1.5 w-1.5 rounded-full", loadedProps && loadedProps.length > 0 ? "bg-emerald-500" : "bg-slate-300"].join(" ")}
                              aria-hidden
                            />
                          )}
                          {isLoading ? "loading…" : `${countLabel} listed`}
                        </span>
                      ) : null}
                    </div>

                    {/* Subtitle */}
                    <p className="mt-1 text-sm text-slate-500 leading-relaxed">
                      {s.note
                        ? s.note
                        : isLoading
                          ? "Loading available properties…"
                          : loadedProps && loadedProps.length > 0
                            ? `${loadedProps.length} approved propert${loadedProps.length === 1 ? "y" : "ies"} available to book`
                            : "No listed properties yet — check back soon"}
                    </p>
                  </div>

                  {/* Bottom separator */}
                  <div className="h-px bg-gradient-to-r from-emerald-200/80 via-emerald-100/50 to-transparent" aria-hidden />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (basePath) {
                      const qp = new URLSearchParams(sp?.toString() ?? "");
                      const current = String(qp.get("site") || "").trim();
                      const nextSlug = siteSlug;
                      if (current && current === nextSlug) qp.delete("site");
                      else qp.set("site", nextSlug);

                      const qs = qp.toString();
                      router.push(qs ? `${basePath}?${qs}` : basePath, { scroll: false });
                      return;
                    }
                    toggle(i);
                  }}
                  className={[
                    "w-full border-0 text-left px-3 sm:px-5 py-4 flex items-center justify-between gap-3 sm:gap-4 rounded-2xl",
                    "bg-transparent",
                    "motion-safe:transition motion-safe:duration-200",
                    "hover:bg-white/80",
                    "active:bg-white/90 active:scale-[0.995]",
                    "focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-200/60",
                  ].join(" ")}
                  aria-expanded={isOpen}
                >
                  <div className="min-w-0">
                    <div className="text-slate-900 font-medium leading-snug tracking-tight truncate">{s.name}</div>
                  </div>

                  <div className="shrink-0 flex items-center gap-3">
                    {showCountBadge ? (
                      <div
                        className={[
                          "inline-flex items-center justify-center",
                          "min-w-8 h-6 rounded-full",
                          loadedProps
                            ? "bg-emerald-700/10 text-emerald-900 ring-1 ring-emerald-700/15"
                            : "bg-white/70 text-slate-600 ring-1 ring-slate-200/70",
                          "px-2 text-[11px] font-semibold tabular-nums",
                          "motion-safe:transition-colors motion-safe:duration-200",
                          "group-hover:bg-white/90",
                        ].join(" ")}
                        aria-label={loadedProps ? `Approved properties: ${countLabel}` : "Loading approved properties"}
                      >
                        {countLabel}
                      </div>
                    ) : null}

                    <ChevronDown
                      className={[
                        "h-4 w-4 text-slate-500 transition-transform duration-200",
                        isOpen ? "rotate-180" : "rotate-0",
                      ].join(" ")}
                      aria-hidden
                    />
                  </div>
                </button>
              )}

              {isOpen ? (
                <div className={[
                  "px-4 sm:px-5 pb-6",
                  isFocusedSingle ? "pt-2" : "",
                ].join(" ")}
                >
                  <div className="pt-4">
                    {s.note ? <div className="text-sm text-slate-700 leading-relaxed">{s.note}</div> : null}
                    {Array.isArray(s.details) && s.details.length ? (
                      <div className="mt-3 space-y-2">
                        {s.details.slice(0, 3).map((d) => (
                          <div key={d} className="text-sm text-slate-600 leading-relaxed">
                            <span className="text-emerald-700 font-semibold">•</span> {d}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-5">

                    <div className="mt-3">
                      {isLoading ? (
                        <div className="space-y-3 animate-pulse">
                          {[0, 1].map((i) => (
                            <div key={i} className="h-[88px] rounded-2xl bg-slate-100/90" />
                          ))}
                        </div>
                      ) : loadError ? (
                        <div className="flex flex-col items-start gap-2 rounded-2xl bg-rose-50/70 px-4 py-3">
                          <p className="text-sm text-rose-700">{loadError} — unable to load properties.</p>
                          <button
                            type="button"
                            onClick={() => retryLoad(siteSlug)}
                            className="text-xs font-semibold text-emerald-700 hover:underline underline-offset-2 focus:outline-none"
                          >
                            Try again
                          </button>
                        </div>
                      ) : null}
                    </div>

                    {(allProperties ?? []).length ? (
                      <div className="mt-3 max-h-[520px] overflow-auto pr-1">
                        <div className="space-y-4">
                          {insideProperties.length ? (
                            <div>
                              <div className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase">Inside the park</div>
                              <div
                                className={[
                                  "mt-2 grid gap-5",
                                  propertyGrid === "wide" ? "grid-cols-2 sm:grid-cols-2 lg:grid-cols-5" : "grid-cols-1 lg:grid-cols-2",
                                ].join(" ")}
                              >
                                {insideProperties.map((p) => (
                                  <PublicApprovedPropertyCard key={p.id ?? p.slug} p={p} systemCommission={systemCommission} />
                                ))}
                              </div>
                            </div>
                          ) : null}

                          {nearbyProperties.length ? (
                            <div>
                              <div className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase">Nearby</div>
                              <div
                                className={[
                                  "mt-2 grid gap-5",
                                  propertyGrid === "wide" ? "grid-cols-2 sm:grid-cols-2 lg:grid-cols-5" : "grid-cols-1 lg:grid-cols-2",
                                ].join(" ")}
                              >
                                {nearbyProperties.map((p) => (
                                  <PublicApprovedPropertyCard key={p.id ?? p.slug} p={p} systemCommission={systemCommission} />
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : !isLoading && !loadError && loadedProps !== undefined ? (
                      <div className="mt-4 rounded-2xl bg-emerald-50/60 border border-emerald-100/80 px-5 py-8 flex flex-col items-center text-center gap-3">
                        <span className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-emerald-100/80 text-emerald-700">
                          <TreePine className="h-5 w-5" aria-hidden />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-slate-700">No properties listed yet</p>
                          <p className="mt-1 text-xs text-slate-500 max-w-[22rem] mx-auto leading-relaxed">
                            We&apos;re building up listings for this park. Check back soon — properties are added regularly.
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
