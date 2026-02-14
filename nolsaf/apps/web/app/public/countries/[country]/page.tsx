import Link from "next/link";
import { ChevronRight } from "lucide-react";
import CountryTourismSiteList, { type TourismSite } from "@/components/CountryTourismSiteList";
import CountryFiltersRow from "@/components/CountryFiltersRow";

type CountryTourism = {
  id: string;
  name: string;
  subtitle: string;
  hero: {
    title: string;
    body: string;
  };
  major?: TourismSite[];
  minor?: TourismSite[];
  zones?: Array<{ title: string; items: TourismSite[] }>;
  highlights?: Array<{ src: string; alt: string }>;
};

type SearchParams = Record<string, string | string[] | undefined>;

function getSearchParam(searchParams: SearchParams, key: string): string {
  const value = searchParams[key];
  if (Array.isArray(value)) return String(value[0] ?? "");
  return String(value ?? "");
}

const COUNTRY_TOURISM: Record<string, CountryTourism> = {
  tanzania: {
    id: "tanzania",
    name: "Tanzania",
    subtitle: "Safaris, parks, mountains, and islands",
    hero: {
      title: "Plan your Tanzania trip by park",
      body: "Choose a park, then review approved stays inside or nearby. NoLSAF keeps booking, payment, and transport coordinated end‑to‑end.",
    },
    highlights: [
      { src: "/assets/Mount Kilimanjaro.jpg", alt: "Mount Kilimanjaro" },
      { src: "/assets/Ngorongoro.jpg", alt: "Ngorongoro" },
      { src: "/assets/Ngrongoro Creator.jpg", alt: "Ngorongoro Crater" },
      { src: "/assets/Serengeti National Park.jpg", alt: "Serengeti National Park" },
      { src: "/assets/Serengeti baloon.jpg", alt: "Serengeti balloon safari" },
      { src: "/assets/Great Migration.jpg", alt: "Great Migration" },
    ],
    zones: [
      {
        title: "Southern Zone",
        items: [
          { slug: "ruaha-national-park", name: "Ruaha National Park", note: "" },
          { slug: "katavi-national-park", name: "Katavi National Park", note: "" },
          { slug: "kitulo-national-park", name: "Kitulo National Park", note: "" },
        ],
      },
      {
        title: "Western Zone",
        items: [
          { slug: "serengeti-national-park", name: "Serengeti National Park", note: "" },
          { slug: "saanane-island-national-park", name: "Saanane Island National Park", note: "" },
          { slug: "burigi-chato-national-park", name: "Burigi-Chato National Park", note: "" },
          { slug: "rubondo-national-park", name: "Rubondo National Park", note: "" },
          { slug: "gombe-national-park", name: "Gombe National Park", note: "" },
          { slug: "mahale-mountains-national-park", name: "Mahale Mountains National Park", note: "" },
          { slug: "ibanda-kyerwa-national-park", name: "Ibanda-Kyerwa National Park", note: "" },
          { slug: "rumanyika-karagwe-national-park", name: "Rumanyika-Karagwe National Park", note: "" },
          { slug: "ugalla-river-national-park", name: "Ugalla River National Park", note: "" },
        ],
      },
      {
        title: "Northern Zone",
        items: [
          { slug: "tarangire-national-park", name: "Tarangire National Park", note: "" },
          { slug: "arusha-national-park", name: "Arusha National Park", note: "" },
          { slug: "mkomazi-national-park", name: "Mkomazi National Park", note: "" },
          { slug: "lake-manyara", name: "Lake Manyara National Park", note: "" },
          { slug: "kilimanjaro-national-park", name: "Kilimanjaro National Park", note: "" },
        ],
      },
      {
        title: "Eastern Zone",
        items: [
          { slug: "saadani-national-park", name: "Saadani National Park", note: "" },
          { slug: "mikumi-national-park", name: "Mikumi National Park", note: "" },
          { slug: "udzungwa-mountains-national-park", name: "Udzungwa Mountains National Park", note: "" },
          { slug: "nyerere-national-park", name: "Nyerere National Park", note: "" },
        ],
      },
    ],
  },

  kenya: {
    id: "kenya",
    name: "Kenya",
    subtitle: "Big Five safaris, lakes, and coast",
    hero: {
      title: "Explore Kenya with confidence",
      body: "Pick your safari regions or coastal escape — then book stays, plan transport, and keep your trip coordinated from one place.",
    },
    highlights: [
      { src: "/assets/Big Five.jpg", alt: "Big Five" },
      { src: "/assets/Lion in the Jangle.jpg", alt: "Lion in the jungle" },
    ],
    major: [
      { slug: "maasai-mara", name: "Maasai Mara", note: "World-class safari and seasonal wildebeest migration.", imageSrc: "/assets/Great Migration.jpg", imageAlt: "Great Migration", details: ["Pick lodging that matches your game drive plans."] },
      { slug: "amboseli-national-park", name: "Amboseli National Park", note: "Elephants with dramatic Mount Kilimanjaro views.", imageSrc: "/assets/Mount Kilimanjaro.jpg", imageAlt: "Mount Kilimanjaro view", details: ["Great for short safaris and photo trips."] },
      { slug: "tsavo", name: "Tsavo (East & West)", note: "One of Kenya’s largest park systems for classic game drives.", imageSrc: "/assets/Big Five.jpg", imageAlt: "Safari wildlife", details: ["Ideal for road-trip style itineraries."] },
      { slug: "diani-beach", name: "Diani Beach", note: "Top beach destination with excursions and water activities.", imageSrc: "/assets/Toursite.jpeg", imageAlt: "Coastal travel", details: ["Combine beach stays with day tours."] },
      { slug: "nairobi-national-park", name: "Nairobi (city + Nairobi National Park)", note: "Gateway hub with a unique park near the city.", imageSrc: "/assets/Lion in the Jangle.jpg", imageAlt: "Wildlife", details: ["Useful for arrivals, departures, and short stays."] },
    ],
    minor: [
      { slug: "lake-nakuru", name: "Lake Nakuru", note: "Rift Valley landscapes and rich birdlife (seasonal).", details: ["Works well as a day trip from nearby towns."] },
      { slug: "samburu", name: "Samburu", note: "Distinct northern scenery and unique wildlife species.", details: ["Strong for travelers seeking something different."] },
      { slug: "mount-kenya", name: "Mount Kenya", note: "Hiking, scenic viewpoints, and highland stays.", details: ["Match your stay to your trail plan."] },
      { slug: "lamu", name: "Lamu", note: "Culture, history, and slow-travel coastal atmosphere.", details: ["Perfect for calm, cultural coastal trips."] },
      { slug: "hells-gate", name: "Hell’s Gate", note: "Gorges, cycling routes, and day-trip adventures.", details: ["Easy add-on near Naivasha."] },
    ],
  },

  uganda: {
    id: "uganda",
    name: "Uganda",
    subtitle: "Gorillas, waterfalls, lakes, and forests",
    hero: {
      title: "Know what you’re booking in Uganda",
      body: "See key tourist sites by country — then choose verified stays nearby and coordinate transport for a smoother, safer trip.",
    },
    highlights: [{ src: "/assets/Lion in the Jangle.jpg", alt: "Wildlife" }],
    major: [
      { slug: "bwindi-impenetrable", name: "Bwindi Impenetrable (Gorilla trekking)", note: "Bucket-list gorilla experience with nearby lodge options.", details: ["Choose lodging close to your permit/trek point."] },
      { slug: "queen-elizabeth-national-park", name: "Queen Elizabeth National Park", note: "Classic safari plus the Kazinga Channel.", details: ["Good mix of game drives and boat activities."] },
      { slug: "murchison-falls-national-park", name: "Murchison Falls National Park", note: "Powerful falls and Nile river safari activities.", details: ["Coordinate river and road plans together."] },
      { slug: "kibale-forest", name: "Kibale Forest (Chimp trekking)", note: "Renowned primate trekking and forest experiences.", details: ["Pick stays that match trek start times."] },
      { slug: "jinja", name: "Jinja (Source of the Nile)", note: "Adventure activities and river-side stays.", details: ["Great for add-on adventure days."] },
    ],
    minor: [
      { slug: "rwenzori-mountains", name: "Rwenzori Mountains", note: "Hiking and alpine scenery for multi-day trips.", details: ["Plan gear, guides, and transport in advance."] },
      { slug: "lake-bunyonyi", name: "Lake Bunyonyi", note: "Relaxed lakeside stays and scenic viewpoints.", details: ["Great rest stop after trekking."] },
      { slug: "kidepo-valley", name: "Kidepo Valley", note: "Remote wilderness and dramatic landscapes.", details: ["Best for longer itineraries."] },
      { slug: "lake-mburo", name: "Lake Mburo", note: "Accessible park for shorter itineraries.", details: ["Easy safari add-on close to main routes."] },
      { slug: "sipi-falls", name: "Sipi Falls", note: "Waterfalls, hikes, and coffee-region visits.", details: ["Good for scenic hikes and day tours."] },
    ],
  },
};

export default async function CountryTourismPage({
  params,
  searchParams,
}: {
  params: Promise<{ country: string }>;
  searchParams?: Promise<SearchParams> | SearchParams;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = await Promise.resolve(searchParams ?? {});
  const raw = String(resolvedParams?.country || "");
  const decoded = (() => {
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  })();

  const countryKey = decoded.toLowerCase().trim();
  const data = COUNTRY_TOURISM[countryKey];
  const available = Object.values(COUNTRY_TOURISM);
  const zoneFilterRaw = getSearchParam(resolvedSearchParams, "zone").trim();
  const zoneFilter = zoneFilterRaw || "";
  const categoryFilterRaw = getSearchParam(resolvedSearchParams, "category").trim().toLowerCase();
  const categoryFilter = categoryFilterRaw === "major" || categoryFilterRaw === "minor" ? categoryFilterRaw : "all";
  const siteFilterRaw = getSearchParam(resolvedSearchParams, "site").trim();
  const siteFilter = siteFilterRaw || "";

  const selectedSites = (() => {
    if (!siteFilter) return [] as TourismSite[];
    const fromZones = (data?.zones ?? []).flatMap((z) => z.items ?? []);
    const fromMajorMinor = [...(data?.major ?? []), ...(data?.minor ?? [])];
    const all = [...fromZones, ...fromMajorMinor].filter((s) => s?.slug === siteFilter);
    const uniq = new Map<string, TourismSite>();
    for (const s of all) {
      const key = String(s.slug || s.name);
      if (!uniq.has(key)) uniq.set(key, s);
    }
    return Array.from(uniq.values());
  })();

  const heroCtaGradient =
    data?.id === "tanzania"
      ? "bg-gradient-to-r from-emerald-700 via-slate-800 to-teal-700"
      : data?.id === "kenya"
        ? "bg-gradient-to-r from-slate-800 via-red-500 to-emerald-600"
        : data?.id === "uganda"
          ? "bg-gradient-to-r from-slate-800 via-amber-400 to-red-500"
          : null;

  if (!data) {
    return (
      <main className="relative min-h-screen text-slate-900 header-offset overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 via-white to-slate-50" />
          <div className="absolute -top-28 -left-28 h-[28rem] w-[28rem] rounded-full bg-emerald-200/35 blur-3xl" />
          <div className="absolute top-24 -right-40 h-[34rem] w-[34rem] rounded-full bg-teal-200/30 blur-3xl" />
          <div className="absolute -bottom-48 left-1/3 h-[36rem] w-[36rem] rounded-full bg-lime-200/25 blur-3xl" />
        </div>
        <section className="public-container py-8 sm:py-10">
          <div className="flex items-center justify-between gap-4">
            <Link
              href="/public"
              className="inline-flex items-center gap-2 rounded-full bg-slate-900/90 text-white px-4 py-2 text-sm font-semibold no-underline hover:no-underline shadow-sm"
            >
              <ChevronRight className="h-4 w-4 rotate-180" aria-hidden />
              Back
            </Link>
          </div>

          <div className="mt-6 rounded-[32px] p-[1px] bg-gradient-to-br from-white/70 via-emerald-200/25 to-teal-200/25 shadow-[0_22px_70px_rgba(2,6,23,0.10)] ring-1 ring-white/60">
            <div className="rounded-[31px] bg-white/75 backdrop-blur-xl border border-white/70 p-6 sm:p-8">
              <div className="text-slate-900 text-2xl sm:text-3xl font-semibold tracking-tight">Country page not available yet</div>
              <div className="mt-2 text-slate-600 text-sm sm:text-base leading-relaxed max-w-[78ch]">
                We couldn’t find details for <span className="font-semibold text-slate-900">{decoded || raw || "this country"}</span>.
                Choose an option below, or pick one of the available countries to explore tourism sites.
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/public/properties?page=1"
                  className="inline-flex items-center gap-2 rounded-full bg-emerald-700 text-white px-5 py-2.5 text-sm font-semibold no-underline hover:no-underline shadow-[0_14px_32px_rgba(2,6,23,0.14)]"
                >
                  Accommodation only
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
                <Link
                  href="/public/plan-with-us"
                  className="inline-flex items-center gap-2 rounded-full bg-white/75 ring-1 ring-slate-200/70 px-5 py-2.5 text-slate-900 text-sm font-semibold no-underline hover:no-underline"
                >
                  Full tour package
                  <ChevronRight className="h-4 w-4" aria-hidden />
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-[32px] p-[1px] bg-gradient-to-br from-white/70 via-emerald-200/25 to-teal-200/25 ring-1 ring-white/60 shadow-[0_18px_55px_rgba(2,6,23,0.10)]">
            <div className="rounded-[31px] bg-white/75 backdrop-blur-xl border border-white/70 p-6 sm:p-8">
              <div className="text-slate-900 text-xl sm:text-2xl font-semibold tracking-tight">Available countries</div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                {available.map((c) => (
                  <Link
                    key={c.id}
                    href={`/public/countries/${encodeURIComponent(c.id)}`}
                    className="no-underline hover:no-underline rounded-2xl bg-white/70 border border-slate-200/70 px-4 py-3 transition hover:bg-white/85 hover:border-slate-300/70"
                  >
                    <div className="text-slate-900 font-semibold">{c.name}</div>
                    <div className="mt-1 text-sm text-slate-600">{c.subtitle}</div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen text-slate-900 header-offset overflow-hidden">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50 via-white to-slate-50" />
        <div className="absolute -top-28 -left-28 h-[28rem] w-[28rem] rounded-full bg-emerald-200/35 blur-3xl" />
        <div className="absolute top-24 -right-40 h-[34rem] w-[34rem] rounded-full bg-teal-200/30 blur-3xl" />
        <div className="absolute -bottom-48 left-1/3 h-[36rem] w-[36rem] rounded-full bg-lime-200/25 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white/55" />
      </div>
      <section className="public-container py-8 sm:py-10">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/public"
            className="inline-flex items-center gap-2 rounded-full bg-slate-900/90 text-white px-4 py-2 text-sm font-semibold no-underline hover:no-underline shadow-sm"
          >
            <ChevronRight className="h-4 w-4 rotate-180" aria-hidden />
            Back
          </Link>

          <div className="hidden sm:flex items-center gap-2 rounded-full bg-emerald-700/10 ring-1 ring-emerald-700/20 px-4 py-2 text-emerald-900 text-xs font-semibold backdrop-blur">
            {data.name}
            <span className="text-emerald-800/50">•</span>
            {data.subtitle}
          </div>
        </div>

        <div className="mt-6 relative overflow-hidden rounded-[32px] p-[1px] bg-gradient-to-br from-white/70 via-emerald-200/25 to-teal-200/25 shadow-[0_22px_70px_rgba(2,6,23,0.10)] ring-1 ring-white/60">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/35 via-transparent to-emerald-200/20" aria-hidden />
          <div className="relative rounded-[31px] bg-white/75 backdrop-blur-xl border border-white/70 p-6 sm:p-8">
            <div className="text-center max-w-[78ch] mx-auto">
              <div className="text-slate-900 text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
                {data.hero.title}
              </div>
              <div className="mt-2 text-slate-600 text-sm sm:text-base leading-relaxed">
                {data.hero.body}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] sm:text-[13px] font-medium text-slate-600">
                <span className="inline-flex items-center">Choose a park</span>
                <span className="text-slate-300" aria-hidden>
                  |
                </span>
                <span className="inline-flex items-center">Shortlist stays</span>
                <span className="text-slate-300" aria-hidden>
                  |
                </span>
                <span className="inline-flex items-center">Book + coordinate transport</span>
              </div>

              <div className="mt-6 w-full max-w-[78ch] mx-auto">
                <div className="grid grid-cols-2 gap-2">
                <Link
                  href={`/public/properties?country=${encodeURIComponent(data.id)}&page=1`}
                  className={
                    `min-w-0 w-full h-11 inline-flex items-center justify-center rounded-xl px-3 py-0 text-sm font-semibold no-underline hover:no-underline border border-slate-200/70 shadow-none motion-safe:transition ` +
                    (heroCtaGradient
                      ? `text-white ${heroCtaGradient}`
                      : "text-white bg-emerald-700 motion-safe:transition-colors hover:bg-emerald-700/95")
                  }
                >
                  <span className="min-w-0 truncate whitespace-nowrap">Accommodation only</span>
                </Link>
                <Link
                  href={`/public/plan-with-us?country=${encodeURIComponent(data.id)}`}
                  className="min-w-0 w-full h-11 inline-flex items-center justify-center rounded-xl bg-white/75 border border-slate-200/70 px-3 sm:px-4 py-0 text-slate-900 text-sm font-semibold no-underline hover:no-underline motion-safe:transition hover:bg-white/90 hover:border-slate-300/70"
                >
                  <span className="min-w-0 truncate whitespace-nowrap">Full tour package</span>
                </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {(() => {
          const hasZones = Array.isArray(data.zones) && data.zones.length;
          const allSites: TourismSite[] = hasZones
            ? (data.zones ?? []).flatMap((z) => z.items)
            : [...(data.major ?? []), ...(data.minor ?? [])];

          const uniqueSites = Array.from(
            new Map(
              allSites
                .filter((s): s is TourismSite & { slug: string } => typeof s.slug === "string" && s.slug.length > 0)
                .map((s) => [s.slug, s] as const),
            ).values(),
          ).sort((a, b) => a.name.localeCompare(b.name));

          const basePath = `/public/countries/${encodeURIComponent(data.id)}`;

          return (
            <div className="mt-6 max-w-[78ch] mx-auto">
              <div className="rounded-2xl border border-slate-200/70 bg-white/80 backdrop-blur-md p-3 sm:p-4">
                <CountryFiltersRow
                  basePath={basePath}
                  hasZones={Boolean(hasZones)}
                  zones={(data.zones ?? []).map((z) => z.title)}
                  sites={uniqueSites.map((s) => ({ value: s.slug, label: s.name }))}
                  zone={zoneFilter}
                  category={categoryFilter}
                  site={siteFilter}
                />
              </div>
            </div>
          );
        })()}

        {(() => {
          const basePath = `/public/countries/${encodeURIComponent(data.id)}`;

          const matches = (s: TourismSite) => {
            if (siteFilter && s.slug !== siteFilter) return false;
            return true;
          };

          // If a specific park/site is selected, hide all other lists
          // and show the selected park expanded with a wider properties grid.
          if (siteFilter && selectedSites.length) {
            return (
              <div className="mt-8">
                <CountryTourismSiteList
                  title=""
                  items={selectedSites}
                  hideHeader
                  defaultOpenFirst
                  propertyGrid="wide"
                  basePath={basePath}
                />
              </div>
            );
          }

          if (Array.isArray(data.zones) && data.zones.length) {
            const filteredZones = (data.zones ?? [])
              .filter((z) => (!zoneFilter ? true : z.title === zoneFilter))
              .map((z) => ({
                ...z,
                items: (z.items ?? []).filter(matches),
              }))
              .filter((z) => z.items.length > 0);

            if (!filteredZones.length) {
              return (
                <div className="mt-8 rounded-3xl bg-white/70 backdrop-blur-xl border border-slate-200/70 p-6 text-center">
                  <div className="text-slate-900 font-semibold">No parks match your filters</div>
                  <div className="mt-1 text-sm text-slate-600">Try clearing a filter or searching a different name.</div>
                </div>
              );
            }

            return (
              <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                {filteredZones.map((z) => (
                  <CountryTourismSiteList key={z.title} title={z.title} items={z.items} basePath={basePath} />
                ))}
              </div>
            );
          }

          const majorFiltered = (data.major ?? []).filter(matches);
          const minorFiltered = (data.minor ?? []).filter(matches);
          const showMajor = categoryFilter === "all" || categoryFilter === "major";
          const showMinor = categoryFilter === "all" || categoryFilter === "minor";
          const listsToShow = [showMajor ? 1 : 0, showMinor ? 1 : 0].reduce((a, b) => a + b, 0);

          if ((showMajor && !majorFiltered.length) && (showMinor && !minorFiltered.length)) {
            return (
              <div className="mt-8 rounded-3xl bg-white/70 backdrop-blur-xl border border-slate-200/70 p-6 text-center">
                <div className="text-slate-900 font-semibold">No sites match your filters</div>
                <div className="mt-1 text-sm text-slate-600">Try clearing a filter or searching a different name.</div>
              </div>
            );
          }

          return (
            <div className={`mt-8 grid grid-cols-1 ${listsToShow === 1 ? "lg:grid-cols-1" : "lg:grid-cols-2"} gap-6`}>
              {showMajor ? <CountryTourismSiteList title="Major tourist sites" items={majorFiltered} basePath={basePath} /> : null}
              {showMinor ? <CountryTourismSiteList title="More to explore" items={minorFiltered} basePath={basePath} /> : null}
            </div>
          );
        })()}

        <div className="mt-8 rounded-[32px] p-[1px] bg-gradient-to-br from-white/70 via-emerald-200/22 to-teal-200/22 ring-1 ring-white/60 shadow-[0_18px_55px_rgba(2,6,23,0.10)]">
          <div className="rounded-[31px] bg-white/75 backdrop-blur-xl border border-white/70 p-6 sm:p-10">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div className="min-w-0">
                <div className="text-slate-900 text-2xl sm:text-3xl font-semibold tracking-tight">
                  The NoLSAF advantage
                </div>
                <div className="mt-2 text-slate-600 text-sm sm:text-base leading-relaxed max-w-[78ch]">
                  A tourism trip is only smooth when stays, transport, and verification work together. NoLSAF connects the steps so you don’t have to piece everything together.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-3 md:flex md:flex-wrap md:justify-end">
                <Link
                  href={`/public/properties?country=${encodeURIComponent(data.id)}&page=1`}
                  className="h-11 w-full md:w-auto inline-flex items-center justify-center rounded-full bg-emerald-700 text-white px-6 text-sm font-semibold no-underline hover:no-underline shadow-[0_14px_32px_rgba(2,6,23,0.14)]"
                >
                  Start booking
                </Link>
                <Link
                  href="/public/group-stays"
                  className="h-11 w-full md:w-auto inline-flex items-center justify-center rounded-full bg-white/70 ring-1 ring-slate-200/70 px-6 text-slate-900 text-sm font-semibold no-underline hover:no-underline"
                >
                  Group stays
                </Link>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
              {[
                {
                  title: "Verified stays",
                  body: "Book listings with clearer details so you can match location to your itinerary.",
                },
                {
                  title: "Coordinated transport",
                  body: "Add pickup and move from booking to arrival with confirmation steps.",
                },
                {
                  title: "Secure payments + support",
                  body: "Pay with trusted methods and get assistance when you need it.",
                },
              ].map((b) => (
                <div
                  key={b.title}
                  className={[
                    "h-full rounded-3xl overflow-hidden",
                    "bg-gradient-to-b from-white/80 via-white/60 to-slate-50/40",
                    "ring-1 ring-slate-200/70 shadow-sm",
                    "p-6",
                    "motion-safe:transition motion-safe:duration-200",
                    "hover:shadow-md hover:ring-slate-300/70",
                  ].join(" ")}
                >
                  <div className="flex flex-col gap-2">
                    <div className="text-slate-900 font-semibold tracking-tight">{b.title}</div>
                    <div className="text-sm text-slate-600 leading-relaxed">{b.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
