"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";

type SiteOption = {
  value: string;
  label: string;
};

export default function CountryFiltersRow(props: {
  basePath: string;
  hasZones: boolean;
  zones: string[];
  sites: SiteOption[];
  zone: string;
  category: "all" | "major" | "minor";
  site: string;
}) {
  const router = useRouter();

  const selectedSiteLabel = props.site
    ? props.sites.find((s) => s.value === props.site)?.label ?? props.site
    : "";

  const hasAnyFilter = Boolean(props.zone || props.site || props.category !== "all");
  const showGlobalClear = hasAnyFilter && !props.site;

  const navigate = useCallback(
    (next: { zone?: string; category?: "all" | "major" | "minor"; site?: string }) => {
      const params = new URLSearchParams();

      const zone = typeof next.zone === "string" ? next.zone : props.zone;
      const category = typeof next.category === "string" ? next.category : props.category;
      const site = typeof next.site === "string" ? next.site : props.site;

      if (props.hasZones) {
        if (zone) params.set("zone", zone);
      } else {
        if (category && category !== "all") params.set("category", category);
      }

      if (site) params.set("site", site);

      const qs = params.toString();
      router.push(qs ? `${props.basePath}?${qs}` : props.basePath, { scroll: false });
    },
    [router, props.basePath, props.category, props.hasZones, props.site, props.zone],
  );

  const controlClass =
    "w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10 motion-safe:transition duration-200 ease-out hover:bg-slate-50/60 hover:border-slate-300/70 focus-visible:border-slate-300/70";

  return (
    <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_auto] gap-2 items-stretch">
      {props.hasZones ? (
        <div className="min-w-0">
          <label className="sr-only" htmlFor="country-zone">
            Zone
          </label>
          <select
            id="country-zone"
            value={props.zone}
            onChange={(e) => navigate({ zone: e.target.value })}
            className={controlClass}
          >
            <option value="">All zones</option>
            {props.zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="min-w-0">
          <label className="sr-only" htmlFor="country-category">
            Category
          </label>
          <select
            id="country-category"
            value={props.category}
            onChange={(e) => navigate({ category: (e.target.value as "all" | "major" | "minor") || "all" })}
            className={controlClass}
          >
            <option value="all">All</option>
            <option value="major">Major</option>
            <option value="minor">More to explore</option>
          </select>
        </div>
      )}

      <div className="min-w-0">
        {props.site ? (
          <div className="h-11 flex items-center justify-center">
            <div className="max-w-full inline-flex items-center gap-2 rounded-full bg-white ring-1 ring-slate-200 px-4 h-11">
              <span className="min-w-0 truncate text-sm font-medium text-slate-900 max-w-[70vw] sm:max-w-[320px]">
                {selectedSiteLabel}
              </span>
              <button
                type="button"
                onClick={() => navigate({ site: "" })}
                className="shrink-0 inline-flex items-center justify-center h-7 w-7 rounded-full bg-white ring-1 ring-slate-200 text-slate-700 text-sm font-medium motion-safe:transition hover:bg-slate-50"
                aria-label="Clear park/site"
              >
                ×
              </button>
            </div>
          </div>
        ) : (
          <>
            <label className="sr-only" htmlFor="country-site">
              Park / site
            </label>
            <select
              id="country-site"
              value={props.site}
              onChange={(e) => navigate({ site: e.target.value })}
              className={controlClass}
            >
              <option value="">All parks / sites</option>
              {props.sites.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {showGlobalClear ? (
        <button
          type="button"
          onClick={() => router.push(props.basePath, { scroll: false })}
          className="col-span-2 sm:col-auto h-11 inline-flex items-center justify-center rounded-xl bg-white ring-1 ring-slate-200 px-5 text-slate-900 text-sm font-semibold motion-safe:transition duration-200 ease-out hover:bg-slate-50 hover:ring-slate-300/70 hover:shadow-[0_10px_22px_rgba(2,6,23,0.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/10"
        >
          Clear
        </button>
      ) : (
        <div className="hidden sm:block" />
      )}
    </div>
  );
}
