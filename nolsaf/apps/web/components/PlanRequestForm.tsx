"use client";

import React from "react";
import { ChevronDown, CheckCircle, ArrowRight, Plus, Trash2, ArrowUp, ArrowDown, MapPin, Calendar } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DatePicker from "@/components/ui/DatePicker";

type Props = {
  selectedRole: string | null;
};

export default function PlanRequestForm({ selectedRole }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [willRedirectToAccount, setWillRedirectToAccount] = React.useState(false);
  const redirectTimerRef = React.useRef<number | null>(null);
  const prefillKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        window.clearTimeout(redirectTimerRef.current);
        redirectTimerRef.current = null;
      }
    };
  }, []);

  const [transportRequired, setTransportRequired] = React.useState<string>('');
  const [dateFrom, setDateFrom] = React.useState<string>('');
  const [dateTo, setDateTo] = React.useState<string>('');
  const [datePickerOpen, setDatePickerOpen] = React.useState<boolean>(false);

  const [budgetCurrency, setBudgetCurrency] = React.useState<string>('USD');
  const [budgetCurrencyOther, setBudgetCurrencyOther] = React.useState<string>('');
  const [budgetAmount, setBudgetAmount] = React.useState<string>('');
  const [touristMustHaves, setTouristMustHaves] = React.useState<string[]>([]);
  const [touristInterests, setTouristInterests] = React.useState<string[]>([]);

  const formatDateDisplay = React.useCallback((iso: string) => {
    try {
      const d = new Date(`${iso}T00:00:00`);
      if (Number.isNaN(d.getTime())) return iso;
      return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
    } catch {
      return iso;
    }
  }, []);

  const budgetCurrencyOptions = React.useMemo(
    () => [
      'USD',
      'EUR',
      'GBP',
      'TZS',
      'KES',
      'UGX',
      'RWF',
      'ZAR',
      'AED',
      'SAR',
      'INR',
      'CNY',
      'CAD',
      'AUD',
      'OTHER',
    ],
    []
  );

  const touristMustHaveOptions = React.useMemo(
    () => ['Big 5 safari', 'Zanzibar', 'Hot air balloon', 'Ngorongoro Crater', 'Kilimanjaro', 'Local markets'],
    []
  );

  const touristInterestOptions = React.useMemo(
    () => [
      'Wildlife / Safari',
      'Beach / Islands',
      'Culture / Heritage',
      'Adventure / Hiking',
      'Food & markets',
      'Photography',
      'Family-friendly',
      'Luxury / honeymoon',
      'Wellness / relaxation',
    ],
    []
  );

  const toggleSelection = React.useCallback((list: string[], value: string) => {
    const exists = list.includes(value);
    if (exists) return list.filter((v) => v !== value);
    return [...list, value];
  }, []);

  const budgetCurrencyEffective = React.useMemo(() => {
    if (budgetCurrency === 'OTHER') return (budgetCurrencyOther || '').trim().toUpperCase();
    return budgetCurrency;
  }, [budgetCurrency, budgetCurrencyOther]);

  const budgetValue = React.useMemo(() => {
    const amt = (budgetAmount || '').trim();
    const cur = (budgetCurrencyEffective || '').trim();
    if (!amt) return '';
    if (!cur) return amt;
    return `${cur} ${amt}`;
  }, [budgetAmount, budgetCurrencyEffective]);

  // Keep group size and passenger count in state so we can auto-fill passengers
  const [groupSizeState, setGroupSizeState] = React.useState<string>('');
  const [passengerCount, setPassengerCount] = React.useState<string>('');

  // Minimal form state (expand as needed)
  const formRef = React.useRef<HTMLFormElement | null>(null);

  // Wizard state
  const [step, setStep] = React.useState<number>(1);
  const totalSteps = 4;
  const [reviewData, setReviewData] = React.useState<Record<string, string>>({});

  type RouteStop = {
    id: string;
    place: string;
    nights: string;
  };

  const [tripTypeValue, setTripTypeValue] = React.useState<string>('');
  const [routeStops, setRouteStops] = React.useState<RouteStop[]>([]);
  const [routeSaved, setRouteSaved] = React.useState<boolean>(false);
  const [routeSaveAttempted, setRouteSaveAttempted] = React.useState<boolean>(false);
  const [routeTouchedById, setRouteTouchedById] = React.useState<Record<string, { place?: boolean; nights?: boolean }>>({});
  const [pendingFocusStopId, setPendingFocusStopId] = React.useState<string | null>(null);

  const tripTypeOptions = React.useMemo(() => {
    switch (selectedRole) {
      case 'Tourist':
        return [
          'Safari',
          'Beach / Islands',
          'Mountain Trekking',
          'Cultural / Heritage',
          'Study / Campus visit',
          'Multi-destination tour',
          'Other',
        ];
      case 'Event planner':
        return [
          'Conference / Workshop',
          'Wedding / Ceremony',
          'Corporate retreat',
          'Festival / Concert',
          'Team building',
          'Other',
        ];
      case 'School / Teacher':
        return [
          'Educational tour',
          'Field trip',
          'Cultural exchange',
          'Sports tour',
          'Service learning',
          'Other',
        ];
      case 'University':
        return [
          'Research / Fieldwork',
          'Study abroad program',
          'Academic conference',
          'Internship / Placement',
          'Campus visits',
          'Other',
        ];
      case 'Community group':
        return [
          'Retreat',
          'Volunteer / Outreach',
          'Cultural visit',
          'Pilgrimage',
          'Group tour',
          'Other',
        ];
      case 'Other':
      default:
        return ['Local tourism', 'Safari', 'Cultural', 'Adventure / Hiking', 'Other'];
    }
  }, [selectedRole]);

  // Set a reasonable default trip type per role (without breaking restored state)
  React.useEffect(() => {
    if (!selectedRole) return;
    setTripTypeValue((prev) => prev || tripTypeOptions[0] || '');
  }, [selectedRole, tripTypeOptions]);

  const isTourist = selectedRole === 'Tourist';
  const isMultiDestination = isTourist && tripTypeValue === 'Multi-destination tour';

  const [destinationsText, setDestinationsText] = React.useState<string>('');

  React.useEffect(() => {
    if (!isMultiDestination) setRouteSaved(false);
  }, [isMultiDestination]);

  const serializeRouteStops = React.useCallback((stops: RouteStop[]) => {
    const cleaned = (stops || []).filter((s) => (s.place || '').trim());
    if (cleaned.length === 0) return '';
    return cleaned
      .map((s, idx) => {
        const nights = (s.nights || '').trim();
        const nightsPart = nights ? ` — ${nights} night${Number(nights) === 1 ? '' : 's'}` : '';
        return `${idx + 1}) ${s.place.trim()}${nightsPart}`;
      })
      .join('\n');
  }, []);

  const destinationsValue = React.useMemo(() => {
    if (!isMultiDestination) return '';
    return serializeRouteStops(routeStops);
  }, [isMultiDestination, routeStops, serializeRouteStops]);

  const parseDestinationList = React.useCallback((raw: string) => {
    return String(raw || '')
      .split(/\n|,|→|->|\/|\||&/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }, []);

  type EastAfricaDestination = {
    id: string;
    label: string;
    countryLabel: string;
    match: string[];
    activities: string[];
  };

  const eastAfricaDestinations: EastAfricaDestination[] = React.useMemo(
    () => [
      {
        id: 'serengeti',
        label: 'Serengeti',
        countryLabel: 'Tanzania',
        match: ['serengeti'],
        activities: ['Big 5 safari', 'Great Migration (seasonal)', 'Hot air balloon', 'Game drives', 'Sundowner'],
      },
      {
        id: 'ngorongoro',
        label: 'Ngorongoro',
        countryLabel: 'Tanzania',
        match: ['ngorongoro', 'crater'],
        activities: ['Crater game drive', 'Maasai boma visit', 'Olduvai Gorge', 'Photography viewpoints'],
      },
      {
        id: 'tarangire',
        label: 'Tarangire',
        countryLabel: 'Tanzania',
        match: ['tarangire'],
        activities: ['Elephants & baobabs', 'Game drives', 'Birdwatching'],
      },
      {
        id: 'manyara',
        label: 'Lake Manyara',
        countryLabel: 'Tanzania',
        match: ['manyara', 'lake manyara'],
        activities: ['Tree-climbing lions (seasonal)', 'Birdwatching', 'Canoeing (when available)'],
      },
      {
        id: 'nyerere-selous',
        label: 'Nyerere / Selous',
        countryLabel: 'Tanzania',
        match: ['nyerere', 'selous', 'selous game reserve', 'nyerere national park'],
        activities: ['Boat safari (Rufiji)', 'Walking safari', 'Game drives', 'Fly-in safari'],
      },
      {
        id: 'ruaha',
        label: 'Ruaha',
        countryLabel: 'Tanzania',
        match: ['ruaha'],
        activities: ['Remote game drives', 'Big cats', 'Walking safari (when available)'],
      },
      {
        id: 'mikumi',
        label: 'Mikumi',
        countryLabel: 'Tanzania',
        match: ['mikumi'],
        activities: ['Game drives', 'Quick safari from Dar (time permitting)'],
      },
      {
        id: 'kilimanjaro',
        label: 'Mount Kilimanjaro',
        countryLabel: 'Tanzania',
        match: ['kilimanjaro', 'kili', 'moshi'],
        activities: ['Kilimanjaro trek', 'Day hike (Mandara / Marangu)', 'Waterfalls & coffee tour', 'Acclimatization hike'],
      },
      {
        id: 'lake-natron',
        label: 'Lake Natron',
        countryLabel: 'Tanzania',
        match: ['natron', 'lake natron'],
        activities: ['Waterfall hike', 'Flamingos (seasonal)', 'Ol Doinyo Lengai viewpoints'],
      },
      {
        id: 'lake-eyasi',
        label: 'Lake Eyasi',
        countryLabel: 'Tanzania',
        match: ['eyasi', 'lake eyasi'],
        activities: ['Cultural experience (Hadzabe)', 'Lake views', 'Local community visit'],
      },
      {
        id: 'arusha',
        label: 'Arusha',
        countryLabel: 'Tanzania',
        match: ['arusha', 'arusha city'],
        activities: ['City tour', 'Coffee experience', 'Cultural heritage centre', 'Arusha National Park (day trip)'],
      },
      {
        id: 'zanzibar',
        label: 'Zanzibar',
        countryLabel: 'Tanzania',
        match: ['zanzibar', 'stone town', 'nungwi', 'kendwa', 'paje', 'jambiani'],
        activities: ['Stone Town tour', 'Spice tour', 'Snorkeling / diving', 'Dhow sunset cruise', 'Beach days'],
      },
      {
        id: 'mafia',
        label: 'Mafia Island',
        countryLabel: 'Tanzania',
        match: ['mafia island', 'mafia'],
        activities: ['Diving', 'Snorkeling', 'Marine park', 'Whale sharks (seasonal)'],
      },
      {
        id: 'dar',
        label: 'Dar es Salaam',
        countryLabel: 'Tanzania',
        match: ['dar es salaam', 'dar', 'dsm'],
        activities: ['City & markets', 'Coco Beach', 'Island day trip (when available)'],
      },

      {
        id: 'maasai-mara',
        label: 'Masai Mara',
        countryLabel: 'Kenya',
        match: ['masai mara', 'maasai mara', 'mara'],
        activities: ['Big 5 safari', 'Hot air balloon', 'Game drives', 'Cultural village visit'],
      },
      {
        id: 'amboseli',
        label: 'Amboseli',
        countryLabel: 'Kenya',
        match: ['amboseli'],
        activities: ['Elephants with Kilimanjaro views', 'Game drives', 'Photography'],
      },
      {
        id: 'lake-naivasha',
        label: 'Lake Naivasha',
        countryLabel: 'Kenya',
        match: ['naivasha', 'lake naivasha'],
        activities: ['Boat ride', 'Crescent Island walk', 'Relaxed lakeside day'],
      },
      {
        id: 'nakuru',
        label: 'Lake Nakuru',
        countryLabel: 'Kenya',
        match: ['nakuru', 'lake nakuru'],
        activities: ['Rhino sanctuary', 'Birdwatching', 'Game drives'],
      },
      {
        id: 'samburu',
        label: 'Samburu',
        countryLabel: 'Kenya',
        match: ['samburu'],
        activities: ['Unique wildlife', 'Game drives', 'Cultural experiences'],
      },
      {
        id: 'tsavo',
        label: 'Tsavo',
        countryLabel: 'Kenya',
        match: ['tsavo', 'tsavo east', 'tsavo west'],
        activities: ['Game drives', 'Red elephants (seasonal)', 'Scenic landscapes'],
      },
      {
        id: 'diani',
        label: 'Diani',
        countryLabel: 'Kenya',
        match: ['diani', 'diani beach'],
        activities: ['Beach days', 'Snorkeling / diving', 'Kite-surfing (seasonal)'],
      },
      {
        id: 'nairobi',
        label: 'Nairobi',
        countryLabel: 'Kenya',
        match: ['nairobi'],
        activities: ['City tour', 'Giraffe Centre', 'National Museum', 'Nairobi National Park'],
      },

      {
        id: 'bwindi',
        label: 'Bwindi',
        countryLabel: 'Uganda',
        match: ['bwindi'],
        activities: ['Gorilla trekking', 'Community walk', 'Forest hikes'],
      },
      {
        id: 'queen-elizabeth',
        label: 'Queen Elizabeth NP',
        countryLabel: 'Uganda',
        match: ['queen elizabeth', 'queen elizabeth np', 'qenp', 'kazinga'],
        activities: ['Kazinga Channel boat cruise', 'Game drives', 'Tree-climbing lions (Ishasha)'],
      },
      {
        id: 'kibale',
        label: 'Kibale',
        countryLabel: 'Uganda',
        match: ['kibale'],
        activities: ['Chimpanzee tracking', 'Forest walks', 'Crater lakes (nearby)'],
      },
      {
        id: 'jinja',
        label: 'Jinja',
        countryLabel: 'Uganda',
        match: ['jinja'],
        activities: ['White-water rafting (seasonal)', 'Nile cruise', 'Adventure day'],
      },
      {
        id: 'murchison',
        label: 'Murchison Falls',
        countryLabel: 'Uganda',
        match: ['murchison'],
        activities: ['Boat cruise', 'Falls hike', 'Game drives'],
      },
      {
        id: 'kigali',
        label: 'Kigali',
        countryLabel: 'Rwanda',
        match: ['kigali'],
        activities: ['City tour', 'Local markets', 'Cultural experiences'],
      },
      {
        id: 'volcanoes',
        label: 'Volcanoes National Park',
        countryLabel: 'Rwanda',
        match: ['volcanoes', 'musanze', 'ruhengeri'],
        activities: ['Gorilla trekking', 'Golden monkey trekking', 'Hikes & viewpoints'],
      },
      {
        id: 'lake-kivu',
        label: 'Lake Kivu',
        countryLabel: 'Rwanda',
        match: ['kivu', 'lake kivu', 'gisenyi', 'karongi', 'kibuye'],
        activities: ['Lakeside relaxation', 'Boat ride', 'Coffee & local experiences'],
      },
    ],
    []
  );

  const matchEastAfricaDestinations = React.useCallback(
    (inputs: string[]) => {
      const matchedIds = new Set<string>();
      const matchedByInput: Record<string, string[]> = {};
      const unmatched: string[] = [];

      for (const raw of inputs) {
        const normalized = raw.toLowerCase();
        const matches = eastAfricaDestinations
          .filter((d) => d.match.some((m) => normalized.includes(m)))
          .map((d) => d.id);
        if (matches.length === 0) {
          unmatched.push(raw);
        } else {
          matchedByInput[raw] = matches;
          matches.forEach((id) => matchedIds.add(id));
        }
      }

      const matched = eastAfricaDestinations.filter((d) => matchedIds.has(d.id));
      return { matched, matchedByInput, unmatched };
    },
    [eastAfricaDestinations]
  );

  const cleanedRouteStops = React.useMemo(() => {
    if (!isMultiDestination) return [] as RouteStop[];
    return (routeStops || []).filter((s) => (s.place || '').trim());
  }, [isMultiDestination, routeStops]);

  const selectedDestinationInputs = React.useMemo(() => {
    if (isMultiDestination) {
      return (cleanedRouteStops || []).map((s) => (s.place || '').trim()).filter(Boolean);
    }
    return parseDestinationList(destinationsText);
  }, [isMultiDestination, cleanedRouteStops, destinationsText, parseDestinationList]);

  const destinationActivityContext = React.useMemo(() => {
    return matchEastAfricaDestinations(selectedDestinationInputs);
  }, [matchEastAfricaDestinations, selectedDestinationInputs]);

  const suggestedActivitiesSet = React.useMemo(() => {
    const set = new Set<string>();
    for (const d of destinationActivityContext.matched) {
      for (const a of d.activities) set.add(a);
    }
    return set;
  }, [destinationActivityContext.matched]);

  const popularMustHavesFiltered = React.useMemo(() => {
    return touristMustHaveOptions.filter((a) => !suggestedActivitiesSet.has(a));
  }, [touristMustHaveOptions, suggestedActivitiesSet]);

  type DestinationAccent = {
    chipActive: string;
    chipInactive: string;
    iconActive: string;
    headerIconWrap: string;
    headerIcon: string;
    destinationPill: string;
    destinationPillSubtle: string;
    reviewSectionBorder: string;
    reviewSectionFrom: string;
    reviewSectionBar: string;
    reviewLabel: string;
  };

  const destinationAccentPalette = React.useMemo<DestinationAccent[]>(
    () => [
      {
        chipActive:
          ' bg-emerald-100 text-emerald-950 border-emerald-400 ring-1 ring-emerald-300/40 hover:bg-emerald-100 hover:border-emerald-500',
        chipInactive: ' bg-white text-slate-900 border-slate-200 hover:bg-emerald-50 hover:border-emerald-200',
        iconActive: 'text-emerald-700',
        headerIconWrap: 'bg-emerald-50 border-emerald-200',
        headerIcon: 'text-emerald-700',
        destinationPill: 'bg-emerald-50 text-emerald-950 border-emerald-200',
        destinationPillSubtle: 'text-emerald-700/80',
        reviewSectionBorder: 'border-emerald-200/70',
        reviewSectionFrom: 'from-emerald-50/70',
        reviewSectionBar:
          "before:bg-gradient-to-r before:from-emerald-500 before:via-emerald-400 before:to-emerald-200",
        reviewLabel: 'text-emerald-700/80',
      },
      {
        chipActive:
          ' bg-sky-100 text-sky-950 border-sky-400 ring-1 ring-sky-300/40 hover:bg-sky-100 hover:border-sky-500',
        chipInactive: ' bg-white text-slate-900 border-slate-200 hover:bg-sky-50 hover:border-sky-200',
        iconActive: 'text-sky-700',
        headerIconWrap: 'bg-sky-50 border-sky-200',
        headerIcon: 'text-sky-700',
        destinationPill: 'bg-sky-50 text-sky-950 border-sky-200',
        destinationPillSubtle: 'text-sky-700/80',
        reviewSectionBorder: 'border-sky-200/70',
        reviewSectionFrom: 'from-sky-50/70',
        reviewSectionBar: "before:bg-gradient-to-r before:from-sky-500 before:via-sky-400 before:to-sky-200",
        reviewLabel: 'text-sky-700/80',
      },
      {
        chipActive:
          ' bg-violet-100 text-violet-950 border-violet-400 ring-1 ring-violet-300/40 hover:bg-violet-100 hover:border-violet-500',
        chipInactive: ' bg-white text-slate-900 border-slate-200 hover:bg-violet-50 hover:border-violet-200',
        iconActive: 'text-violet-700',
        headerIconWrap: 'bg-violet-50 border-violet-200',
        headerIcon: 'text-violet-700',
        destinationPill: 'bg-violet-50 text-violet-950 border-violet-200',
        destinationPillSubtle: 'text-violet-700/80',
        reviewSectionBorder: 'border-violet-200/70',
        reviewSectionFrom: 'from-violet-50/70',
        reviewSectionBar:
          "before:bg-gradient-to-r before:from-violet-500 before:via-violet-400 before:to-violet-200",
        reviewLabel: 'text-violet-700/80',
      },
      {
        chipActive:
          ' bg-rose-100 text-rose-950 border-rose-400 ring-1 ring-rose-300/40 hover:bg-rose-100 hover:border-rose-500',
        chipInactive: ' bg-white text-slate-900 border-slate-200 hover:bg-rose-50 hover:border-rose-200',
        iconActive: 'text-rose-700',
        headerIconWrap: 'bg-rose-50 border-rose-200',
        headerIcon: 'text-rose-700',
        destinationPill: 'bg-rose-50 text-rose-950 border-rose-200',
        destinationPillSubtle: 'text-rose-700/80',
        reviewSectionBorder: 'border-rose-200/70',
        reviewSectionFrom: 'from-rose-50/70',
        reviewSectionBar: "before:bg-gradient-to-r before:from-rose-500 before:via-rose-400 before:to-rose-200",
        reviewLabel: 'text-rose-700/80',
      },
      {
        chipActive:
          ' bg-amber-100 text-amber-950 border-amber-400 ring-1 ring-amber-300/40 hover:bg-amber-100 hover:border-amber-500',
        chipInactive: ' bg-white text-slate-900 border-slate-200 hover:bg-amber-50 hover:border-amber-200',
        iconActive: 'text-amber-700',
        headerIconWrap: 'bg-amber-50 border-amber-200',
        headerIcon: 'text-amber-700',
        destinationPill: 'bg-amber-50 text-amber-950 border-amber-200',
        destinationPillSubtle: 'text-amber-700/80',
        reviewSectionBorder: 'border-amber-200/70',
        reviewSectionFrom: 'from-amber-50/70',
        reviewSectionBar:
          "before:bg-gradient-to-r before:from-amber-500 before:via-amber-400 before:to-amber-200",
        reviewLabel: 'text-amber-700/80',
      },
    ],
    []
  );

  const destinationAccentById = React.useMemo(() => {
    const map: Record<string, DestinationAccent> = {};
    destinationActivityContext.matched.forEach((d, idx) => {
      map[d.id] = destinationAccentPalette[idx % destinationAccentPalette.length];
    });
    return map;
  }, [destinationActivityContext.matched, destinationAccentPalette]);

  const getDestinationAccent = React.useCallback(
    (id: string) => destinationAccentById[id] ?? destinationAccentPalette[0],
    [destinationAccentById, destinationAccentPalette]
  );

  const touristPrimaryAccent = React.useMemo(() => {
    const id = destinationActivityContext.matched[0]?.id;
    if (id) return getDestinationAccent(id);
    return destinationAccentPalette[0];
  }, [destinationActivityContext.matched, getDestinationAccent, destinationAccentPalette]);

  const activityChipBaseClass =
    'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold border select-none bg-white shadow-sm transition-all duration-150 ease-out hover:-translate-y-px hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white active:translate-y-0 active:shadow-sm active:scale-[0.99]';

  const totalRouteNights = React.useMemo(() => {
    return cleanedRouteStops.reduce((sum, s) => {
      const n = Number(s.nights);
      return sum + (Number.isFinite(n) ? Math.max(0, n) : 0);
    }, 0);
  }, [cleanedRouteStops]);

  const addRouteStop = React.useCallback(() => {
    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    setRouteStops((prev) => [...prev, { id, place: '', nights: '' }]);
    setPendingFocusStopId(id);
    setRouteSaved(false);
  }, []);

  React.useEffect(() => {
    if (!pendingFocusStopId) return;
    if (!isMultiDestination || routeSaved) return;

    const id = pendingFocusStopId;
    const focus = () => {
      const el = document.querySelector(`[data-route-stop-place="${id}"]`) as HTMLInputElement | null;
      if (el) {
        el.focus();
        el.select();
      }
      setPendingFocusStopId(null);
    };

    // Let the input mount first.
    requestAnimationFrame(focus);
  }, [pendingFocusStopId, isMultiDestination, routeSaved, routeStops.length]);

  const routeValidation = React.useMemo(() => {
    if (!isMultiDestination) {
      return {
        byId: {} as Record<string, { placeOk: boolean; nightsOk: boolean; duplicate: boolean; normalized: string }>,
        duplicates: [] as string[],
        canSave: false,
        hasAtLeastOne: false,
        routePath: '',
      };
    }

    const normalizedPlaces = (routeStops || []).map((s) => (s.place || '').trim().toLowerCase());
    const counts = new Map<string, number>();
    for (const p of normalizedPlaces) {
      if (!p) continue;
      counts.set(p, (counts.get(p) || 0) + 1);
    }

    const duplicates = Array.from(counts.entries())
      .filter(([, c]) => c > 1)
      .map(([p]) => p);

    const byId: Record<string, { placeOk: boolean; nightsOk: boolean; duplicate: boolean; normalized: string }> = {};
    let hasAtLeastOne = false;

    for (const s of routeStops || []) {
      const normalized = (s.place || '').trim().toLowerCase();
      const placeOk = !!normalized;
      const nightsOk = Number(s.nights) >= 1;
      const duplicate = !!normalized && (counts.get(normalized) || 0) > 1;
      if (placeOk) hasAtLeastOne = true;
      byId[s.id] = { placeOk, nightsOk, duplicate, normalized };
    }

    const canSave =
      hasAtLeastOne &&
      (routeStops || []).length > 0 &&
      (routeStops || []).every((s) => {
        const v = byId[s.id];
        return v?.placeOk && v?.nightsOk && !v?.duplicate;
      });

    const routePath = (routeStops || [])
      .filter((s) => (s.place || '').trim())
      .map((s) => (s.place || '').trim())
      .join(' → ');

    return { byId, duplicates, canSave, hasAtLeastOne, routePath };
  }, [isMultiDestination, routeStops]);

  const removeRouteStop = React.useCallback((id: string) => {
    setRouteStops((prev) => prev.filter((s) => s.id !== id));
    setRouteSaved(false);
  }, []);

  const moveRouteStop = React.useCallback((id: string, dir: -1 | 1) => {
    setRouteStops((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const nextIdx = idx + dir;
      if (nextIdx < 0 || nextIdx >= prev.length) return prev;
      const copy = [...prev];
      const tmp = copy[idx];
      copy[idx] = copy[nextIdx];
      copy[nextIdx] = tmp;
      return copy;
    });
    setRouteSaved(false);
  }, []);
  
  // Storage key for autosave - based on role to separate different form sessions
  const storageKey = React.useMemo(() => `planRequestForm_${selectedRole || 'default'}`, [selectedRole]);
  const [hasRestored, setHasRestored] = React.useState(false);

  const collectFormAsObject = React.useCallback(() => {
    if (!formRef.current) return {} as Record<string, string>;
    const fm = new FormData(formRef.current);
    const obj: Record<string, string> = {};
    fm.forEach((value, key) => {
      obj[key] = typeof value === 'string' ? value : String(value);
    });
    // ensure role is included
    obj.role = selectedRole ?? '';
    
    // Also try to get saved data from sessionStorage to include fields from other steps
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.formData) {
          // Merge saved data with current form data (current form data takes precedence)
          Object.keys(data.formData).forEach((key) => {
            // Deprecated/removed fields
            if (key === 'touristGoal' || key === 'touristPace' || key === 'attachments') return;
            // Tourist: pickup/dropoff is planned after destination confirmation
            if (selectedRole === 'Tourist' && (key === 'pickupLocation' || key === 'dropoffLocation')) return;
            if (obj[key] === '' || obj[key] === undefined) {
              obj[key] = data.formData[key] || '';
            }
          });
        }
      }
    } catch (e) {
      // Ignore errors when reading saved data
    }
    
    return obj;
  }, [selectedRole, storageKey]);

  // Save form data to sessionStorage
  const saveFormData = React.useCallback(() => {
    if (!formRef.current || !selectedRole) return;
    try {
      const formData = collectFormAsObject();
      const dataToSave = {
        formData,
        transportRequired,
        budgetCurrency,
        budgetCurrencyOther,
        budgetAmount,
        touristMustHaves,
        touristInterests,
        groupSizeState,
        passengerCount,
        step,
        tripTypeValue,
        routeStops,
        routeSaved,
      };
      sessionStorage.setItem(storageKey, JSON.stringify(dataToSave));
    } catch (e) {
      console.error('Failed to save form data:', e);
    }
  }, [selectedRole, collectFormAsObject, storageKey, transportRequired, budgetCurrency, budgetCurrencyOther, budgetAmount, touristMustHaves, touristInterests, groupSizeState, passengerCount, step, tripTypeValue, routeStops, routeSaved]);

  // Restore form data from sessionStorage
  const restoreFormData = React.useCallback(() => {
    if (!formRef.current || !selectedRole || hasRestored) return;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (!saved) {
        setHasRestored(true);
        return;
      }
      
      const data = JSON.parse(saved);
      if (data.formData && formRef.current) {
        // Restore form fields - use setTimeout to ensure DOM is ready
        setTimeout(() => {
          if (!formRef.current) return;
          
          Object.keys(data.formData).forEach((key) => {
            if (key === 'role') return; // Skip role, it's set by the component
            
            const input = formRef.current?.querySelector(`[name="${key}"]`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
            if (input) {
              const value = data.formData[key] || '';
              if (input.tagName === 'INPUT') {
                const inputEl = input as HTMLInputElement;
                if (inputEl.type === 'checkbox') {
                  inputEl.checked = value === 'on' || value === 'true' || value === true;
                } else if (inputEl.type === 'radio') {
                  const radio = formRef.current?.querySelector(`[name="${key}"][value="${value}"]`) as HTMLInputElement;
                  if (radio) radio.checked = true;
                } else {
                  inputEl.value = value;
                }
              } else if (input.tagName === 'SELECT' || input.tagName === 'TEXTAREA') {
                input.value = value;
              }
            }
          });
          
          // Trigger change events to ensure React state updates
          formRef.current.querySelectorAll('input, select, textarea').forEach((el) => {
            const event = new Event('change', { bubbles: true });
            el.dispatchEvent(event);
          });
        }, 100);
        
        // Restore state
        if (data.transportRequired !== undefined) setTransportRequired(data.transportRequired);
        if (data.groupSizeState !== undefined) setGroupSizeState(data.groupSizeState);
        if (data.passengerCount !== undefined) setPassengerCount(data.passengerCount);
        if (data.step) setStep(data.step);
        if (data.tripTypeValue !== undefined) setTripTypeValue(data.tripTypeValue);
        else if (data.formData?.tripType) setTripTypeValue(data.formData.tripType);
        if (Array.isArray(data.routeStops)) {
          setRouteStops(
            data.routeStops
              .map((s: any) => ({
                id: String(s?.id ?? `${Date.now()}_${Math.random().toString(16).slice(2)}`),
                place: String(s?.place ?? ''),
                nights: String(s?.nights ?? ''),
              }))
              .slice(0, 20)
          );
        }
        if (typeof data.routeSaved === 'boolean') setRouteSaved(data.routeSaved);

        if (data.formData?.dateFrom !== undefined) setDateFrom(String(data.formData.dateFrom || ''));
        if (data.formData?.dateTo !== undefined) setDateTo(String(data.formData.dateTo || ''));
        if (data.formData?.destinations !== undefined) setDestinationsText(String(data.formData.destinations || ''));

        if (data.budgetCurrency !== undefined) setBudgetCurrency(String(data.budgetCurrency || 'USD'));
        if (data.budgetCurrencyOther !== undefined) setBudgetCurrencyOther(String(data.budgetCurrencyOther || ''));
        if (data.budgetAmount !== undefined) setBudgetAmount(String(data.budgetAmount || ''));
        if (Array.isArray(data.touristMustHaves)) setTouristMustHaves(data.touristMustHaves.filter(Boolean));
        if (data.touristMustHaves === undefined && typeof data.formData?.touristMustHaves === 'string') {
          const parts = String(data.formData.touristMustHaves || '')
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
          setTouristMustHaves(parts);
        }

        if (Array.isArray(data.touristInterests)) setTouristInterests(data.touristInterests.filter(Boolean));
        if (data.touristInterests === undefined && typeof data.formData?.touristInterests === 'string') {
          const parts = String(data.formData.touristInterests || '')
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean);
          setTouristInterests(parts);
        }

        // Back-compat: budget was previously a single string; split into currency + amount when possible.
        const rawBudget = String(data.formData?.budget ?? '').trim();
        if (rawBudget && data.budgetAmount === undefined) {
          const m = rawBudget.match(/^([A-Za-z]{3,6})\s+(.+)$/);
          if (m) {
            const code = m[1].toUpperCase();
            const amountPart = (m[2] || '').trim();
            if (budgetCurrencyOptions.includes(code)) {
              setBudgetCurrency(code);
              setBudgetCurrencyOther('');
            } else {
              setBudgetCurrency('OTHER');
              setBudgetCurrencyOther(code);
            }
            setBudgetAmount(amountPart);
          } else {
            setBudgetAmount(rawBudget);
          }
        }
        
        setHasRestored(true);
      } else {
        setHasRestored(true);
      }
    } catch (e) {
      console.error('Failed to restore form data:', e);
      setHasRestored(true);
    }
  }, [selectedRole, storageKey, hasRestored, budgetCurrencyOptions]);

  // Restore on mount and when selectedRole changes
  React.useEffect(() => {
    if (selectedRole) {
      setHasRestored(false);
      restoreFormData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRole]); // Only depend on selectedRole to avoid infinite loops

  // Autofill contact details for logged-in users (only if blank).
  // This prevents mismatches (email/phone formatting) and makes requests reliably show under "My Plan Requests".
  React.useEffect(() => {
    if (!selectedRole || !hasRestored) return;
    if (prefillKeyRef.current === storageKey) return;
    prefillKeyRef.current = storageKey;

    let cancelled = false;

    const setIfEmpty = (name: string, value: string) => {
      const v = String(value || '').trim();
      if (!v) return;
      const el = formRef.current?.querySelector(`[name="${name}"]`) as
        | HTMLInputElement
        | HTMLSelectElement
        | HTMLTextAreaElement
        | null;
      if (!el) return;
      const current = String((el as any).value || '').trim();
      if (current) return;
      (el as any).value = v;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };

    (async () => {
      try {
        const meRes = await fetch('/api/account/me', { credentials: 'include' });
        if (!meRes.ok) return;
        const me = await meRes.json().catch(() => null);
        if (!me || typeof me !== 'object') return;

        const fullName = String((me as any).fullName || (me as any).name || '').trim();
        const email = String((me as any).email || '').trim();
        const phone = String((me as any).phone || '').trim();

        if (cancelled) return;

        // Persist into sessionStorage so it will restore even if the contact step isn't mounted yet.
        try {
          const savedRaw = sessionStorage.getItem(storageKey);
          const saved = savedRaw ? JSON.parse(savedRaw) : {};
          const formData = (saved && typeof saved === 'object' && saved.formData && typeof saved.formData === 'object')
            ? { ...saved.formData }
            : {};

          if (!String(formData.fullName || '').trim() && fullName) formData.fullName = fullName;
          if (!String(formData.email || '').trim() && email) formData.email = email;
          if (!String(formData.phone || '').trim() && phone) formData.phone = phone;
          formData.role = selectedRole ?? '';

          sessionStorage.setItem(storageKey, JSON.stringify({
            ...(saved && typeof saved === 'object' ? saved : {}),
            formData,
          }));
        } catch {
          // non-blocking
        }

        // If the inputs are currently mounted, populate them too.
        setIfEmpty('fullName', fullName);
        setIfEmpty('email', email);
        setIfEmpty('phone', phone);
      } catch {
        // non-blocking
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedRole, hasRestored, storageKey]);

  // Save form data whenever it changes (debounced)
  React.useEffect(() => {
    if (!selectedRole || !hasRestored) return;
    const timeoutId = setTimeout(() => {
      saveFormData();
    }, 500); // Debounce saves by 500ms
    
    return () => clearTimeout(timeoutId);
  }, [transportRequired, dateFrom, dateTo, budgetCurrency, budgetCurrencyOther, budgetAmount, touristMustHaves, groupSizeState, passengerCount, step, selectedRole, hasRestored, saveFormData]);

  // Save form data when inputs change (including when navigating between steps)
  React.useEffect(() => {
    if (!selectedRole || !hasRestored || !formRef.current) return;
    
    const form = formRef.current;
    const handleChange = () => {
      saveFormData();
    };
    
    // Also restore when step changes (to restore conditionally rendered fields)
    const handleStepChange = () => {
      // Small delay to ensure DOM is updated with new step's fields
      setTimeout(() => {
        if (!formRef.current) return;
        const saved = sessionStorage.getItem(storageKey);
        if (saved) {
          try {
            const data = JSON.parse(saved);
            if (data.formData) {
              Object.keys(data.formData).forEach((key) => {
                if (key === 'role') return;
                const input = formRef.current?.querySelector(`[name="${key}"]`) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
                if (input && !input.value) {
                  const value = data.formData[key] || '';
                  if (key === 'destinations' && !destinationsText) {
                    setDestinationsText(String(value || ''));
                  }
                  if (input.tagName === 'INPUT') {
                    const inputEl = input as HTMLInputElement;
                    if (inputEl.type === 'checkbox') {
                      inputEl.checked = value === 'on' || value === 'true' || value === true;
                    } else if (inputEl.type !== 'radio') {
                      inputEl.value = value;
                    }
                  } else if (input.tagName === 'SELECT' || input.tagName === 'TEXTAREA') {
                    input.value = value;
                  }
                }
              });
            }
          } catch (e) {
            console.error('Failed to restore on step change:', e);
          }
        }
      }, 50);
    };
    
    form.addEventListener('change', handleChange);
    form.addEventListener('input', handleChange);
    
    // Restore form fields when step changes
    handleStepChange();
    
    return () => {
      form.removeEventListener('change', handleChange);
      form.removeEventListener('input', handleChange);
    };
  }, [selectedRole, hasRestored, saveFormData, step, storageKey, destinationsText]);

  // Friendly labels and preferred order for the review step
  const reviewLabels: Record<string, string> = {
    role: 'Role',
    tripType: 'Trip type',
    destinations: 'Destination(s)',
    dateFrom: 'From',
    dateTo: 'To',
    groupSize: 'Group size',
    budget: 'Budget',
    notes: 'Notes',
    // Event planner
    eventType: 'Event type',
    expectedAttendees: 'Expected attendees',
    eventStartDate: 'Event start',
    eventEndDate: 'Event end',
    venuePreferences: 'Venue preferences',
    accommodationNeeded: 'Accommodation needed',
    cateringRequired: 'Catering required',
    avRequirements: 'AV / internet',
    budgetPerPerson: 'Budget / person',
    // School
    studentsCount: 'Students',
    chaperones: 'Chaperones',
    ageRange: 'Student age range',
    learningObjectives: 'Learning objectives',
    riskAssessment: 'Risk assessment needed',
    specialNeedsSupport: 'Special needs support',
    // University
    researchPurpose: 'Research purpose',
    staffCount: 'Staff / supervisors',
    studentsCountUniv: 'Students (university)',
    ethicsApproval: 'Ethics ref',
    sampleCollection: 'Collect samples?',
    permitsNeeded: 'Permits likely?',
    // Community
    communityObjectives: 'Community objectives',
    beneficiaries: 'Estimated beneficiaries',
    projectDuration: 'Project duration',
    localPartners: 'Local partners',
    // Other / Tourist
    otherDetails: 'Details',
    // Contact & transport
    fullName: 'Contact name',
    email: 'Email',
    phone: 'Phone',
    transportRequired: 'Transport required?',
    vehicleType: 'Preferred vehicle',
    pickupLocation: 'Pickup',
    dropoffLocation: 'Dropoff',
    vehiclesNeeded: 'Vehicles needed',
    passengerCount: 'Estimated passengers',
    vehicleRequirements: 'Vehicle requirements',
    touristMustHaves: 'Must-have activities',
    touristInterests: 'Interests',
  };

  const reviewOrder = [
    'role', 'tripType', 'destinations', 'dateFrom', 'dateTo', 'groupSize', 'passengerCount', 'budget', 'notes',
    'fullName', 'email', 'phone', 'transportRequired', 'vehicleType', 'pickupLocation', 'dropoffLocation', 'vehiclesNeeded', 'vehicleRequirements',
  ];

  const getOrderedReviewKeys = (data: Record<string, string>) => {
    const keys = Object.keys(data);
    const ordered: string[] = [];
    reviewOrder.forEach((k) => { if (keys.includes(k)) ordered.push(k); });
    keys.forEach((k) => { if (!ordered.includes(k)) ordered.push(k); });
    return ordered;
  };

  const formatLabel = (key: string) => reviewLabels[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
  const formatValue = (v: string | undefined) => {
    if (v == null || v === '') return '-';
    const lower = String(v).toLowerCase();
    if (lower === 'yes' || lower === 'no') return lower === 'yes' ? 'Yes' : 'No';
    return v;
  };

  const splitCommaList = React.useCallback((raw: string | undefined) => {
    return String(raw || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }, []);

  const parseSerializedRouteStopsForReview = React.useCallback((raw: string | undefined) => {
    const text = String(raw || '').trim();
    if (!text) return [] as Array<{ idx: number; place: string; nights?: number }>;

    // Supports both newline-separated and space-separated formats like:
    // "1) Serengeti — 6 nights\n2) Zanzibar — 6 nights" or
    // "1) Serengeti — 6 nights 2) Zanzibar — 6 nights"
    const normalized = text.replace(/\r\n/g, '\n');
    const parts = normalized
      .split(/(?=\b\d+\)\s)/g)
      .map((s) => s.trim())
      .filter(Boolean);

    const stops = parts
      .map((part) => {
        const idxMatch = part.match(/^(\d+)\)\s*/);
        const idx = idxMatch ? Number(idxMatch[1]) : NaN;
        const rest = part.replace(/^(\d+)\)\s*/, '').trim();

        const nightsMatch = rest.match(/—\s*(\d+)\s*night/i) || rest.match(/-\s*(\d+)\s*night/i);
        const nights = nightsMatch ? Number(nightsMatch[1]) : undefined;

        const place = rest
          .replace(/—\s*\d+\s*nights?/i, '')
          .replace(/-\s*\d+\s*nights?/i, '')
          .trim();

        if (!place) return null;
        return {
          idx: Number.isFinite(idx) ? idx : 0,
          place,
          nights: Number.isFinite(nights as number) ? nights : undefined,
        };
      })
      .filter(Boolean) as Array<{ idx: number; place: string; nights?: number }>;

    return stops;
  }, []);

  const goNext = () => {
    // Save current step data before moving forward
    saveFormData();
    const next = Math.min(totalSteps, step + 1);
    if (next === totalSteps) {
      // Collect all form data for review, including all fields from all steps
      const allFormData = collectFormAsObject();
      setReviewData(allFormData);
    }
    setStep(next);
  };

  const goBack = () => {
    // Save current step data before moving back
    saveFormData();
    setStep(Math.max(1, step - 1));
  };

  const goToStep = React.useCallback(
    (target: number) => {
      saveFormData();
      setStep(Math.max(1, Math.min(totalSteps, target)));
    },
    [saveFormData, totalSteps]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRef.current) return;
    setSubmitting(true);
    
    // Collect all form data - first try from saved sessionStorage (most complete)
    // This ensures we get all fields even if they're on different steps
    let allFormData: Record<string, string> = {};
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.formData) {
          allFormData = data.formData;
        }
      }
    } catch (e) {
      console.error('Failed to load saved form data:', e);
    }
    
    // Fallback to collecting from current form if saved data is incomplete
    const currentFormData = collectFormAsObject();
    allFormData = { ...allFormData, ...currentFormData };
    
    // Ensure role is set
    allFormData.role = selectedRole ?? '';
    
    // Build FormData from collected data
    const form = new FormData();
    Object.keys(allFormData).forEach((key) => {
      const value = allFormData[key];
      if (value !== null && value !== undefined && value !== '') {
        form.append(key, String(value));
      }
    });
    
    // Debug: Log what's being sent
    console.log('Submitting form data:', {
      role: selectedRole,
      fullName: allFormData.fullName,
      email: allFormData.email,
      phone: allFormData.phone,
      allKeys: Array.from(form.keys()),
      allFormDataKeys: Object.keys(allFormData),
    });

    try {
      const response = await fetch('/api/plan-request', {
        method: 'POST',
        body: form,
      });
      
      const data = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        console.error('Request failed:', response.status, data);
        throw new Error(data.error || data.message || 'Failed to submit request');
      }
      
      // Reset/clear state BEFORE flipping to the success view.
      // Once submitted=true, the form unmounts and the ref becomes null.
      formRef.current?.reset();
      // clear controlled sync state after successful reset
      setGroupSizeState('');
      setPassengerCount('');
      setTransportRequired('');
      setTripTypeValue('');
      setRouteStops([]);
      setRouteSaved(false);
      setStep(1);
      // Clear saved form data
      try {
        sessionStorage.removeItem(storageKey);
      } catch (e) {
        console.error('Failed to clear saved form data:', e);
      }
      setHasRestored(false);

      // If the user is logged in, redirect them to their account progress page.
      // This avoids the "nothing is appearing" confusion after submit.
      try {
        const meRes = await fetch('/api/account/me', { credentials: 'include' });
        if (meRes.ok) {
          const me = await meRes.json().catch(() => null);
          if (me && typeof me.id === 'number') {
            // Best-effort: attach this newly created request to the logged-in account.
            // This makes the experience more flexible (like Group Stays) even if the initial create
            // couldn't reliably resolve userId due to email/phone formatting.
            try {
              if (data && typeof data.id === 'number') {
                await fetch(`/api/customer/plan-requests/${data.id}/claim`, {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({}),
                });
              }
            } catch {
              // non-blocking
            }

            setWillRedirectToAccount(true);
            redirectTimerRef.current = window.setTimeout(() => {
              router.push('/account/event-plans');
            }, 1500);
          }
        }
      } catch {
        // non-blocking
      }

      // Show success message and hide form
      setSubmitted(true);
    } catch (err: any) {
      console.error('Submit error:', err);
      alert(err.message || 'Failed to submit request. Please try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  // Show confirmation message after successful submission
  if (submitted) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes scaleIn {
            from { opacity: 0; transform: scale(0.8); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes slideUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .success-fade-in { animation: fadeIn 0.5s ease-out; }
          .success-scale-in { animation: scaleIn 0.6s ease-out; }
          .success-slide-up { animation: slideUp 0.6s ease-out 0.2s both; }
          .success-slide-up-delayed { animation: slideUp 0.6s ease-out 0.4s both; }
          .success-fade-in-delayed { animation: fadeIn 0.5s ease-out 0.6s both; }
        `}} />
        <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-sm success-fade-in">
          <div className="max-w-2xl mx-auto text-center space-y-6">
            {/* Animated success icon */}
            <div className="flex justify-center">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg success-scale-in">
                <CheckCircle className="h-10 w-10 text-white transition-all duration-300" strokeWidth={2.5} />
              </div>
            </div>
            
            {/* Heading and description with slide-up animation */}
            <div className="space-y-3 success-slide-up">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Thank you for planning with NoLSAF!
              </h2>
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                We&apos;ve received your request and our team is currently reviewing it. 
                We&apos;ll get back to you within 48 hours with a personalized plan tailored to your needs.
              </p>
            </div>

            {/* Button with hover and transition effects */}
            <div className="pt-4 success-slide-up-delayed">
              <Link
                href="/account/event-plans"
                className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 active:scale-[0.98] no-underline group"
              >
                <span>View My Plan Requests</span>
                <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>

            {/* Footer note */}
            <p className="text-sm text-slate-500 pt-2 success-fade-in-delayed">
              {willRedirectToAccount
                ? "Redirecting you to your plan requests…"
                : "You can track your request status in your account."}
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6 bg-white border rounded-lg p-6 shadow-sm" aria-labelledby={selectedRole ? 'request-form' : undefined}>
      <input type="hidden" name="role" value={selectedRole ?? ''} />
      {selectedRole && (
        <>
          <h2 id="request-form" className="text-xl font-semibold">Your plan details</h2>
          <p className="mt-1 text-sm text-slate-600">Showing questions for <strong className="text-slate-800">{selectedRole}</strong></p>
        </>
      )}

      {/* Two-column wrapper: show stepper + content only after a role is selected */}
      <div className="mt-4 flex items-start gap-6">
        {selectedRole ? (
          <>
            <div className="w-28 pr-4 border-r border-slate-200">
              <div className="flex flex-col items-center gap-4">
                {['Details', 'Role', 'Transport', 'Review'].map((label, i) => (
                  <div key={label} className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${step === i+1 ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-slate-700'}`}>{i+1}</div>
                    <div className="mt-2 text-slate-700 text-xs text-center">{label}</div>
                    {i < 3 && <div className="w-px h-6 bg-slate-200 mt-2"></div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1">

          {step === 1 && (
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/40 p-5 mb-4 groupstays-section shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-sm" aria-hidden />
              <div>
                <div className="text-sm font-semibold text-slate-900">Trip details</div>
                <div className="text-xs text-slate-500">Tell us the basics so we can plan</div>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="trip-type" className="block text-sm font-medium text-slate-700">Trip type</label>
              <div className="mt-2 relative">
                <select
                  id="trip-type"
                  name="tripType"
                  value={tripTypeValue}
                  onChange={(e) => setTripTypeValue(e.target.value)}
                  className="groupstays-select w-full h-12 rounded-xl px-4 pr-10 border border-slate-200 bg-white text-sm font-medium text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 appearance-none transition"
                >
                  {tripTypeOptions.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <ChevronDown className="groupstays-chevron pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
              </div>
            </div>

            <div>
              <label htmlFor="destinations" className="block text-sm font-medium text-slate-700">Destination(s)</label>
              {isMultiDestination ? (
                <div className="mt-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <MapPin className="w-4 h-4" />
                        </span>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">Route builder</div>
                          <div className="text-xs text-slate-600">Add destinations in travel order (Serengeti → Zanzibar). Nights are required per stop.</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                      {routeSaved ? (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setRouteStops([]);
                              setRouteSaved(false);
                            }}
                            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:border-red-200 hover:bg-red-50 hover:text-red-700 transition"
                            title="Clear route"
                          >
                            <Trash2 className="w-4 h-4" />
                            Clear
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRouteSaved(false);
                              if (routeStops.length === 0) addRouteStop();
                            }}
                            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition shadow-sm"
                          >
                            Edit route
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setRouteSaveAttempted(true);
                              if (!routeValidation.canSave) return;
                              setRouteSaved(true);
                              setRouteSaveAttempted(false);
                            }}
                            disabled={!routeValidation.canSave}
                            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                            title="Save route and collapse"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Save route
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setRouteSaved(false);
                              addRouteStop();
                            }}
                            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-white border border-slate-200 text-slate-800 text-xs font-semibold hover:bg-slate-50 transition"
                          >
                            <Plus className="w-4 h-4 text-emerald-600" />
                            Add stop
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {!routeSaved && (routeSaveAttempted || routeValidation.duplicates.length > 0) ? (
                    <div className="mt-3">
                      {routeValidation.duplicates.length > 0 ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                          <span className="font-semibold">Duplicate destinations:</span>{' '}
                          {routeValidation.duplicates.slice(0, 3).join(', ')}
                          {routeValidation.duplicates.length > 3 ? '…' : ''}. Please make each stop unique.
                        </div>
                      ) : null}

                      {routeSaveAttempted && !routeValidation.canSave ? (
                        <div className="mt-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                          Fill in a destination and nights (minimum 1) for every stop.
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {/* Persist into existing field name for backend compatibility */}
                  <input type="hidden" id="destinations" name="destinations" value={destinationsValue} />

                  {routeSaved ? (
                    <div className="mt-3">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-semibold text-slate-900">Route summary</div>
                              <span className="inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold px-2 py-0.5 border border-emerald-100">
                                Saved
                              </span>
                            </div>
                            {routeValidation.routePath ? (
                              <div className="mt-1 text-xs font-semibold text-slate-700">{routeValidation.routePath}</div>
                            ) : null}
                            <div className="mt-1 text-xs text-slate-600">
                              {cleanedRouteStops.length} stop{cleanedRouteStops.length === 1 ? '' : 's'} • {totalRouteNights} night{totalRouteNights === 1 ? '' : 's'}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4">
                          <ol className="m-0 list-none space-y-3 p-0">
                            {cleanedRouteStops.map((s, idx) => (
                              <li key={s.id} className="relative pl-9 sm:pl-10">
                                {idx < cleanedRouteStops.length - 1 && (
                                  <span className="absolute left-2.5 sm:left-3 top-8 bottom-0 w-px bg-slate-200" aria-hidden />
                                )}
                                <span
                                  className={
                                    "absolute left-0 top-0 inline-flex h-7 w-7 sm:h-6 sm:w-6 items-center justify-center rounded-full text-white text-xs font-semibold ring-2 ring-white " +
                                    (idx % 2 === 0 ? "bg-emerald-600" : "bg-indigo-600")
                                  }
                                >
                                  {idx + 1}
                                </span>

                                <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-3 sm:px-4 py-3">
                                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                                    <div className="min-w-0">
                                      <div className="text-[11px] font-semibold text-slate-600">Destination</div>
                                      <div className="mt-0.5 text-sm font-semibold text-slate-900 break-words">
                                        {(s.place || '').trim()}
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:block sm:shrink-0 sm:text-right">
                                      <div className="text-[11px] font-semibold text-slate-600">Nights</div>
                                      <div className="mt-0.5 inline-flex items-center rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold px-2 py-1 border border-emerald-100">
                                        {s.nights}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ol>
                        </div>

                        <div className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">Use Edit route to make changes.</div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {routeStops.length === 0 ? (
                        <div className="mt-3 text-xs text-slate-500">
                          No stops added yet. Click <span className="font-semibold">Add stop</span> to begin.
                        </div>
                      ) : (
                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                          {routeStops.map((stop, index) => (
                            <div key={stop.id} className="rounded-xl bg-white border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-bold">
                                    {index + 1}
                                  </span>
                                  <div className="text-xs font-semibold text-slate-700">Stop</div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => moveRouteStop(stop.id, -1)}
                                    disabled={index === 0}
                                    className="h-9 w-9 inline-flex items-center justify-center rounded-full border-0 bg-transparent text-slate-700 transition-colors active:bg-slate-100 hover:bg-slate-100 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                                    title="Move up"
                                  >
                                    <ArrowUp className="w-4 h-4 text-slate-500" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveRouteStop(stop.id, 1)}
                                    disabled={index === routeStops.length - 1}
                                    className="h-9 w-9 inline-flex items-center justify-center rounded-full border-0 bg-transparent text-slate-700 transition-colors active:bg-slate-100 hover:bg-slate-100 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                                    title="Move down"
                                  >
                                    <ArrowDown className="w-4 h-4 text-slate-500" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeRouteStop(stop.id)}
                                    className="h-9 w-9 inline-flex items-center justify-center rounded-full border-0 bg-transparent text-red-700 transition-colors active:bg-red-50 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-200 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                                    title="Remove stop"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-600" />
                                  </button>
                                </div>
                              </div>

                              <div className="mt-3 grid grid-cols-1 gap-3">
                                <div>
                                  <label className="block text-[11px] font-medium text-slate-600">Destination / place</label>
                                  <input
                                    value={stop.place}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      setRouteStops((prev) => prev.map((s) => (s.id === stop.id ? { ...s, place: v } : s)));
                                      setRouteSaved(false);
                                    }}
                                    onBlur={() => {
                                      setRouteTouchedById((prev) => ({ ...prev, [stop.id]: { ...(prev[stop.id] || {}), place: true } }));
                                      setRouteStops((prev) =>
                                        prev.map((s) => (s.id === stop.id ? { ...s, place: (s.place || '').trim() } : s))
                                      );
                                    }}
                                    data-route-stop-place={stop.id}
                                    className={
                                      "groupstays-select mt-1 w-full rounded-lg px-3 py-2 border bg-white text-sm focus:outline-none focus:ring-2 " +
                                      (routeSaveAttempted || routeTouchedById[stop.id]?.place
                                        ? !routeValidation.byId[stop.id]?.placeOk
                                          ? "border-red-300 focus:ring-red-200"
                                          : routeValidation.byId[stop.id]?.duplicate
                                            ? "border-amber-300 focus:ring-amber-200"
                                            : "border-slate-200 focus:ring-emerald-200"
                                        : "border-slate-200 focus:ring-emerald-200")
                                    }
                                    placeholder="e.g. Serengeti National Park"
                                  />
                                  {(routeSaveAttempted || routeTouchedById[stop.id]?.place) && !routeValidation.byId[stop.id]?.placeOk ? (
                                    <div className="mt-1 text-[11px] font-medium text-red-600">Destination is required.</div>
                                  ) : null}
                                  {(routeSaveAttempted || routeTouchedById[stop.id]?.place) && routeValidation.byId[stop.id]?.duplicate ? (
                                    <div className="mt-1 text-[11px] font-medium text-amber-700">Duplicate destination. Please make it unique.</div>
                                  ) : null}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                  <div className="sm:col-span-2">
                                    <label className="block text-[11px] font-medium text-slate-600">Nights <span className="text-red-600">*</span></label>
                                    <input
                                      value={stop.nights}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        setRouteStops((prev) => prev.map((s) => (s.id === stop.id ? { ...s, nights: v } : s)));
                                        setRouteSaved(false);
                                      }}
                                      onBlur={() => {
                                        setRouteTouchedById((prev) => ({ ...prev, [stop.id]: { ...(prev[stop.id] || {}), nights: true } }));
                                        setRouteStops((prev) =>
                                          prev.map((s) => {
                                            if (s.id !== stop.id) return s;
                                            const n = parseInt((s.nights || '').trim(), 10);
                                            if (!Number.isFinite(n) || n < 1) return { ...s, nights: '' };
                                            return { ...s, nights: String(n) };
                                          })
                                        );
                                      }}
                                      type="number"
                                      min={1}
                                      required
                                      className={
                                        "groupstays-select mt-1 w-full rounded-lg px-3 py-2 border bg-white text-sm focus:outline-none focus:ring-2 " +
                                        (routeSaveAttempted || routeTouchedById[stop.id]?.nights
                                          ? !routeValidation.byId[stop.id]?.nightsOk
                                            ? "border-red-300 focus:ring-red-200"
                                            : "border-slate-200 focus:ring-emerald-200"
                                          : "border-slate-200 focus:ring-emerald-200")
                                      }
                                      placeholder="e.g. 3"
                                    />
                                    {(routeSaveAttempted || routeTouchedById[stop.id]?.nights) && !routeValidation.byId[stop.id]?.nightsOk ? (
                                      <div className="mt-1 text-[11px] font-medium text-red-600">Nights must be at least 1.</div>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {destinationsValue ? (
                        <div className="mt-3">
                          <details className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                            <summary className="cursor-pointer text-xs font-semibold text-slate-700">Generated format (what will be submitted)</summary>
                            <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-700">{destinationsValue}</pre>
                          </details>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              ) : (
                <input
                  id="destinations"
                  name="destinations"
                  value={destinationsText}
                  onChange={(e) => setDestinationsText(e.target.value)}
                  onBlur={() => setDestinationsText((v) => v.trim())}
                  className="groupstays-select mt-2 w-full h-12 rounded-xl px-4 border border-slate-200 bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition"
                  placeholder="City, national park, region, or 'Any'"
                />
              )}
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="date-from" className="block text-sm font-medium text-slate-700">From</label>
              <input type="hidden" id="date-from" name="dateFrom" value={dateFrom} />
              <button
                type="button"
                onClick={() => setDatePickerOpen(true)}
                className="relative mt-2 w-full h-12 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 shadow-sm px-4 pl-11 text-left focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 hover:bg-emerald-50/30 transition"
                aria-label="Select start date"
                title="Select start date"
              >
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" aria-hidden />
                <span className={dateFrom ? "text-slate-900" : "text-slate-400"}>
                  {dateFrom ? formatDateDisplay(dateFrom) : "dd / mm / yyyy"}
                </span>
              </button>
            </div>
            <div>
              <label htmlFor="date-to" className="block text-sm font-medium text-slate-700">To</label>
              <input type="hidden" id="date-to" name="dateTo" value={dateTo} />
              <button
                type="button"
                onClick={() => setDatePickerOpen(true)}
                className="relative mt-2 w-full h-12 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 shadow-sm px-4 pl-11 text-left focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 hover:bg-emerald-50/30 transition"
                aria-label="Select end date"
                title="Select end date"
              >
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" aria-hidden />
                <span className={dateTo ? "text-slate-900" : "text-slate-400"}>
                  {dateTo ? formatDateDisplay(dateTo) : "dd / mm / yyyy"}
                </span>
              </button>
            </div>
            <div>
              <label htmlFor="group-size" className="block text-sm font-medium text-slate-700">Group size</label>
              <input id="group-size" name="groupSize" value={groupSizeState} onChange={(e) => { const v = e.target.value; setGroupSizeState(v); setPassengerCount(v); }} className="groupstays-select mt-2 w-full h-12 rounded-xl px-4 border border-slate-200 bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition" placeholder="Number of people" type="number" min={1} inputMode="numeric" />
            </div>
            <div>
              <label htmlFor="budget" className="block text-sm font-medium text-slate-700">Budget (approx.)</label>
              <input id="budget" name="budget" type="hidden" value={budgetValue} />

              <div className="mt-2">
                <div className="h-12 w-full rounded-xl border border-slate-200 bg-white shadow-sm flex items-stretch overflow-hidden focus-within:ring-2 focus-within:ring-emerald-200 focus-within:border-emerald-300 transition">
                  <div className="relative w-[96px] shrink-0">
                    <select
                      id="budget-currency"
                      value={budgetCurrency}
                      onChange={(e) => {
                        setBudgetCurrency(e.target.value);
                        if (e.target.value !== 'OTHER') setBudgetCurrencyOther('');
                      }}
                      className="groupstays-select h-full w-full bg-transparent border-0 px-3 pr-7 text-sm font-semibold text-slate-900 text-center focus:outline-none appearance-none"
                      aria-label="Budget currency"
                      title="Budget currency"
                    >
                      {budgetCurrencyOptions.map((c) => (
                        <option key={c} value={c}>
                          {c === 'OTHER' ? 'Other' : c}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
                  </div>

                  <div className="w-px bg-slate-200 my-2" aria-hidden />

                  <input
                    id="budget-amount"
                    value={budgetAmount}
                    onChange={(e) => setBudgetAmount(e.target.value)}
                    onBlur={() => setBudgetAmount((v) => v.trim())}
                    inputMode="decimal"
                    className="h-full flex-1 min-w-0 bg-transparent border-0 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    placeholder="Amount (e.g. 1,500 or 500-800)"
                    aria-label="Budget amount"
                  />
                </div>

                {budgetCurrency === 'OTHER' ? (
                  <div className="mt-2">
                    <input
                      id="budget-currency-other"
                      value={budgetCurrencyOther}
                      onChange={(e) => setBudgetCurrencyOther(e.target.value.toUpperCase())}
                      onBlur={() => setBudgetCurrencyOther((v) => v.trim().toUpperCase())}
                      className="groupstays-select w-full h-11 rounded-xl px-4 border border-slate-200 bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition"
                      placeholder="Currency code (e.g. NGN)"
                      aria-label="Other currency"
                    />
                  </div>
                ) : null}
              </div>

              <div className="mt-1 text-[11px] text-slate-500">
                Example: {budgetCurrencyEffective || 'USD'} 1500
              </div>
            </div>
          </div>

          {datePickerOpen && (
            <>
              <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setDatePickerOpen(false)} />
              <div className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                <DatePicker
                  selected={dateFrom && dateTo ? [dateFrom, dateTo] : dateFrom ? [dateFrom] : undefined}
                  onSelectAction={(s) => {
                    if (Array.isArray(s) && s.length === 2) {
                      setDateFrom(s[0]);
                      setDateTo(s[1]);
                      setDatePickerOpen(false);
                      return;
                    }
                    const d = Array.isArray(s) ? s[0] : s;
                    if (d) {
                      setDateFrom(d);
                      setDateTo(d);
                      // keep open until user selects end date
                    }
                  }}
                  onCloseAction={() => setDatePickerOpen(false)}
                  allowRange={true}
                />
              </div>
            </>
          )}

          <div className="mt-3">
            <label htmlFor="notes" className="block text-sm font-medium text-slate-700">Special requirements / notes</label>
            <textarea id="notes" name="notes" className="groupstays-select mt-2 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" rows={4} placeholder="Dietary requirements, accessibility needs, permits, transport or vehicle requests, etc."></textarea>
          </div>
        </div>
      )}

      {/* Role-specific sections (expanded) - step 2 */}
      {step === 2 && selectedRole === 'Event planner' && (
        <div className="rounded border p-3 mb-4 groupstays-section border-slate-100" aria-labelledby="event-planner-section">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-sm" aria-hidden />
              <div>
                <div id="event-planner-section" className="text-sm font-medium">For Event Planners</div>
                <div className="text-xs text-slate-500">Provide details about the event so we can suggest suitable venues, services and cost estimates.</div>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="event-type" className="block text-xs text-slate-600">Event type</label>
              <input id="event-type" name="eventType" placeholder="Conference, wedding, workshop etc." className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>

            <div>
              <label htmlFor="expected-attendees" className="block text-xs text-slate-600">Expected attendees</label>
              <input id="expected-attendees" name="expectedAttendees" placeholder="Number of attendees" type="number" min={1} className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="event-start-date" className="block text-sm font-medium text-slate-700">Start date</label>
              <input id="event-start-date" name="eventStartDate" type="date" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
            <div>
              <label htmlFor="event-end-date" className="block text-sm font-medium text-slate-700">End date</label>
              <input id="event-end-date" name="eventEndDate" type="date" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
          </div>

          <div className="mt-3">
            <label htmlFor="venue-preferences" className="block text-xs text-slate-600">Venue preferences</label>
            <input id="venue-preferences" name="venuePreferences" placeholder="Capacity, accessibility, indoor/outdoor, facilities" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="accommodation-needed" className="block text-sm font-medium text-slate-700">Accommodation needed?</label>
              <div className="relative mt-1">
                <select id="accommodation-needed" name="accommodationNeeded" className="groupstays-select w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200">
                  <option value="">Select an option</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
              </div>
            </div>

            <div>
              <label htmlFor="catering-required" className="block text-sm font-medium text-slate-700">Catering required?</label>
              <div className="relative mt-1">
                <select id="catering-required" name="cateringRequired" className="groupstays-select w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200">
                  <option value="">Select an option</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="av-requirements" className="block text-xs text-slate-600">AV / power / internet requirements</label>
              <input id="av-requirements" name="avRequirements" placeholder="Microphones, projectors, power, connectivity" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
            <div>
              <label htmlFor="budget-per-person" className="block text-xs text-slate-600">Target budget per person</label>
              <input id="budget-per-person" name="budgetPerPerson" placeholder="USD or local currency" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
          </div>
        </div>
      )}

      {step === 2 && selectedRole === 'School / Teacher' && (
        <div className="rounded border p-3 mb-4 groupstays-section border-slate-100" aria-labelledby="school-section">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-sm" aria-hidden />
              <div>
                <div className="text-sm font-medium">For Schools / Teachers</div>
                <div className="text-xs text-slate-500">Tell us about group numbers, learning goals and any special requirements for school trips.</div>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="studentsCount" className="block text-xs text-slate-600">Number of students</label>
              <input id="studentsCount" name="studentsCount" type="number" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
            <div>
              <label htmlFor="chaperones" className="block text-xs text-slate-600">Number of chaperones</label>
              <input id="chaperones" name="chaperones" type="number" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="ageRange" className="block text-xs text-slate-600">Student age range</label>
              <input id="ageRange" name="ageRange" placeholder="e.g. 12-15" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
            <div>
              <label htmlFor="learningObjectives" className="block text-xs text-slate-600">Learning objectives / curriculum links</label>
              <input id="learningObjectives" name="learningObjectives" placeholder="Curriculum links or goals" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="risk-assessment" className="block text-xs text-slate-600">Risk assessment needed?</label>
              <div className="relative mt-1">
                <select id="risk-assessment" name="riskAssessment" className="groupstays-select w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200">
                  <option value="">Select an option</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
              </div>
            </div>
            <div>
              <label htmlFor="special-needs-support" className="block text-xs text-slate-600">Special needs support required?</label>
              <div className="relative mt-1">
                <select id="special-needs-support" name="specialNeedsSupport" className="groupstays-select w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200">
                  <option value="">Select an option</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && selectedRole === 'University' && (
        <div className="rounded border p-3 mb-4 groupstays-section border-slate-100" aria-labelledby="university-section">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-sm" aria-hidden />
              <div>
                <div id="university-section" className="text-sm font-medium">For Universities</div>
                <div className="text-xs text-slate-500">For research or fieldwork visits: share project aims, permits and staff involved.</div>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <label htmlFor="research-purpose" className="block text-xs text-slate-600">Research purpose / project description</label>
            <input id="research-purpose" name="researchPurpose" placeholder="Brief project summary, aims and methods" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="staff-count" className="block text-xs text-slate-600">Staff / supervisors count</label>
              <input id="staff-count" name="staffCount" placeholder="Number of staff" type="number" min={0} className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
            <div>
              <label htmlFor="students-count-univ" className="block text-xs text-slate-600">Number of students involved</label>
              <input id="students-count-univ" name="studentsCountUniv" placeholder="Number of students" type="number" min={0} className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
          </div>

          <div className="mt-3">
            <label htmlFor="ethics-approval" className="block text-xs text-slate-600">Ethics approval reference (if any)</label>
            <input id="ethics-approval" name="ethicsApproval" placeholder="Reference or N/A" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="sample-collection" className="block text-sm font-medium text-slate-700">Collect samples?</label>
              <div className="relative mt-1">
                <select id="sample-collection" name="sampleCollection" className="groupstays-select w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200">
                  <option value="">Select an option</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
              </div>
            </div>

            <div>
              <label htmlFor="permits-needed" className="block text-sm font-medium text-slate-700">Permits likely needed?</label>
              <div className="relative mt-1">
                <select id="permits-needed" name="permitsNeeded" className="groupstays-select w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200">
                  <option value="">Select an option</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && selectedRole === 'Community group' && (
        <div className="rounded border p-3 mb-4 groupstays-section border-slate-100" aria-labelledby="community-section">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-sm" aria-hidden />
              <div>
                <div id="community-section" className="text-sm font-medium">For Community Groups</div>
                <div className="text-xs text-slate-500">Share objectives, beneficiaries and local partnerships to help us recommend sustainable options.</div>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <label htmlFor="community-objectives" className="block text-xs text-slate-600">Community objectives / program description</label>
            <input id="community-objectives" name="communityObjectives" placeholder="Brief description of objectives" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="beneficiaries" className="block text-xs text-slate-600">Estimated beneficiaries</label>
              <input id="beneficiaries" name="beneficiaries" placeholder="Number of beneficiaries" type="number" min={0} className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
            <div>
              <label htmlFor="project-duration" className="block text-xs text-slate-600">Project duration</label>
              <input id="project-duration" name="projectDuration" placeholder="Days / weeks" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
          </div>

          <div className="mt-3">
            <label htmlFor="local-partners" className="block text-xs text-slate-600">Local partners or contacts</label>
            <input id="local-partners" name="localPartners" placeholder="Local organisations or contact people" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
          </div>

          {/* Funding status removed per product decision */}
        </div>
      )}

      {step === 2 && selectedRole === 'Other' && (
        <div className="rounded border p-3 mb-4 groupstays-section border-slate-100" aria-labelledby="other-section">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-sm" aria-hidden />
              <div>
                <div id="other-section" className="text-sm font-medium">Other details</div>
                <div className="text-xs text-slate-500">If your request does not match the categories, describe your needs so we can route it correctly.</div>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <label htmlFor="other-details" className="block text-xs text-slate-600">Describe your request</label>
            <textarea id="other-details" name="otherDetails" placeholder="Tell us more about your request" rows={4} className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
          </div>
        </div>
      )}

      {step === 2 && selectedRole === 'Tourist' && (
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/40 p-5 mb-4 groupstays-section shadow-sm" aria-labelledby="tourist-section">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-sm" aria-hidden />
              <div>
                <div id="tourist-section" className="text-sm font-semibold text-slate-900">For Tourists</div>
                <div className="text-xs text-slate-500">Pick a few options (fast) and we’ll tailor the itinerary around your preferences.</div>
              </div>
            </div>
          </div>

          <input type="hidden" name="touristMustHaves" value={touristMustHaves.join(', ')} />
          <input type="hidden" name="touristInterests" value={touristInterests.join(', ')} />

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white/70 backdrop-blur p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-1.5 h-10 bg-amber-400 rounded-sm" aria-hidden />
                <div>
                  <div className="text-sm font-semibold text-slate-900">Must-have activities</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    We suggest experiences based on your destination(s) in East Africa.
                  </div>
                </div>
              </div>
              {touristMustHaves.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setTouristMustHaves([])}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 hover:shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  <Trash2 className="w-4 h-4 text-slate-500" aria-hidden />
                  Clear
                </button>
              ) : null}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/70 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-semibold text-slate-700">Selected ({touristMustHaves.length})</div>
                <div className="text-[11px] font-semibold text-slate-500">Tap again to remove</div>
              </div>
              {touristMustHaves.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {touristMustHaves.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setTouristMustHaves((prev) => toggleSelection(prev, opt))}
                      className={
                        activityChipBaseClass +
                        ' bg-amber-100 text-amber-950 border-amber-400 ring-1 ring-amber-300/40 hover:bg-amber-100 hover:border-amber-500'
                      }
                      title="Remove"
                    >
                      <CheckCircle className="w-4 h-4 text-amber-700" aria-hidden />
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white/70 px-4 py-3 text-xs text-slate-600">
                  No selections yet — choose a few suggestions below.
                </div>
              )}
            </div>

            {selectedDestinationInputs.length > 0 ? (
              <div className="mt-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[11px] font-semibold text-slate-600">Destinations detected</div>
                  {destinationActivityContext.unmatched.length > 0 ? (
                    <div className="text-[11px] font-semibold text-slate-500">Some places may show generic ideas</div>
                  ) : null}
                </div>
                <div className="mt-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                  <div className="flex gap-2 overflow-x-auto whitespace-nowrap [-webkit-overflow-scrolling:touch]">
                    {destinationActivityContext.matched.map((d) => {
                      const accent = getDestinationAccent(d.id);
                      return (
                      <span
                        key={d.id}
                        className={
                          "inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold " +
                          accent.destinationPill
                        }
                      >
                        <MapPin className={"w-3.5 h-3.5 " + accent.headerIcon} aria-hidden />
                        <span className="tracking-tight">{d.label}</span>
                        <span className={"text-[11px] font-semibold " + accent.destinationPillSubtle}>{d.countryLabel}</span>
                      </span>
                      );
                    })}
                    {destinationActivityContext.unmatched.slice(0, 3).map((u) => (
                      <span
                        key={u}
                        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-slate-50 text-slate-700 border border-slate-200 px-3 py-1.5 text-xs font-semibold"
                        title="We’ll still plan for this, but suggestions may be generic."
                      >
                        <MapPin className="w-3.5 h-3.5 text-slate-400" aria-hidden />
                        {u}
                      </span>
                    ))}
                    {destinationActivityContext.unmatched.length > 3 ? (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-white text-slate-600 border border-slate-200 px-3 py-1.5 text-xs font-semibold">
                        +{destinationActivityContext.unmatched.length - 3} more
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Add your destination(s) above to see activity suggestions.
              </div>
            )}

            <div className="mt-5 space-y-5">
              {destinationActivityContext.matched.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {destinationActivityContext.matched.map((d) => {
                    const accent = getDestinationAccent(d.id);
                    return (
                    <div
                      key={d.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={"inline-flex h-8 w-8 items-center justify-center rounded-xl border " + accent.headerIconWrap}>
                            <MapPin className={"w-4 h-4 " + accent.headerIcon} aria-hidden />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-slate-900 truncate">{d.label}</div>
                            <div className="text-[11px] font-semibold text-slate-500">{d.countryLabel}</div>
                          </div>
                        </div>
                        <div className="text-[11px] font-semibold text-slate-500">Top picks</div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {d.activities.map((opt) => {
                          const active = touristMustHaves.includes(opt);
                          return (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setTouristMustHaves((prev) => toggleSelection(prev, opt))}
                              className={
                                activityChipBaseClass +
                                (active
                                  ? accent.chipActive
                                  : accent.chipInactive)
                              }
                            >
                              {active ? <CheckCircle className={"w-4 h-4 " + accent.iconActive} aria-hidden /> : null}
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    );
                  })}
                </div>
              ) : null}

              {popularMustHavesFiltered.length > 0 ? (
                <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <summary className="cursor-pointer list-none select-none">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">More ideas</div>
                        <div className="mt-0.5 text-[11px] text-slate-500">Popular in East Africa</div>
                      </div>
                      <div className="text-[11px] font-semibold text-slate-600">{popularMustHavesFiltered.length} options</div>
                    </div>
                  </summary>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {popularMustHavesFiltered.map((opt) => {
                      const active = touristMustHaves.includes(opt);
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setTouristMustHaves((prev) => toggleSelection(prev, opt))}
                          className={
                            activityChipBaseClass +
                            (active
                              ? ' bg-amber-100 text-amber-950 border-amber-400 ring-1 ring-amber-300/40 hover:bg-amber-100 hover:border-amber-500'
                              : ' bg-white text-slate-900 border-slate-200 hover:bg-slate-50 hover:border-slate-300')
                          }
                        >
                          {active ? <CheckCircle className="w-4 h-4 text-amber-700" aria-hidden /> : null}
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                </details>
              ) : null}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white/70 backdrop-blur p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-1.5 h-10 bg-sky-400 rounded-sm" aria-hidden />
                <div>
                  <div className="text-sm font-semibold text-slate-900">Interests</div>
                  <div className="mt-0.5 text-xs text-slate-500">Choose a few themes so we match the vibe.</div>
                </div>
              </div>
              {touristInterests.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setTouristInterests([])}
                  className="inline-flex items-center gap-2 h-9 px-4 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 hover:shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  <Trash2 className="w-4 h-4 text-slate-500" aria-hidden />
                  Clear
                </button>
              ) : null}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/70 p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-semibold text-slate-700">Selected ({touristInterests.length})</div>
                <div className="text-[11px] font-semibold text-slate-500">Tap again to remove</div>
              </div>
              {touristInterests.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {touristInterests.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setTouristInterests((prev) => toggleSelection(prev, opt))}
                      className={
                        activityChipBaseClass +
                        touristPrimaryAccent.chipActive
                      }
                      title="Remove"
                    >
                      <CheckCircle className={"w-4 h-4 " + touristPrimaryAccent.iconActive} aria-hidden />
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-white/70 px-4 py-3 text-xs text-slate-600">
                  No interests selected yet — pick a couple below.
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {touristInterestOptions.map((opt) => {
                const active = touristInterests.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setTouristInterests((prev) => toggleSelection(prev, opt))}
                    className={
                      activityChipBaseClass +
                      (active
                        ? touristPrimaryAccent.chipActive
                        : touristPrimaryAccent.chipInactive)
                    }
                  >
                    {active ? <CheckCircle className={"w-4 h-4 " + touristPrimaryAccent.iconActive} aria-hidden /> : null}
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-slate-900">Quick summary</div>
                <div className="mt-0.5 text-xs text-slate-500">Your selected must-haves (tap to remove).</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold text-slate-700">
                  {touristMustHaves.length} selected
                </span>
                {touristMustHaves.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setTouristMustHaves([])}
                    className="inline-flex items-center gap-2 h-8 px-3 rounded-full border border-slate-200 bg-white text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  >
                    <Trash2 className="w-4 h-4 text-slate-500" aria-hidden />
                    Clear
                  </button>
                ) : null}
              </div>
            </div>

            {touristMustHaves.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {touristMustHaves.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setTouristMustHaves((prev) => toggleSelection(prev, opt))}
                    className={
                      activityChipBaseClass +
                      ' bg-slate-50 text-slate-900 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }
                    title="Remove"
                  >
                    <CheckCircle className="w-4 h-4 text-slate-500" aria-hidden />
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                No must-haves selected yet.
              </div>
            )}
          </div>

          <div className="mt-3">
            <details className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <summary className="cursor-pointer text-xs font-semibold text-slate-800">Add extra notes (optional)</summary>
              <div className="mt-3">
                <label htmlFor="tourist-details" className="block text-xs text-slate-600">Anything else we should know?</label>
                <textarea
                  id="tourist-details"
                  name="otherDetails"
                  placeholder="Optional: dietary needs, accessibility, hotel preferences, any constraints, or study details."
                  rows={3}
                  className="groupstays-select mt-2 w-full rounded-xl px-4 py-3 border border-slate-200 bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition"
                />
              </div>
            </details>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/40 p-5 mb-4 groupstays-section shadow-sm" aria-labelledby="contact-transport-heading">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-sm" aria-hidden />
              <div>
                <div id="contact-transport-heading" className="text-sm font-semibold text-slate-900">Contact & Transport</div>
                <div className="text-xs text-slate-500">A few details so we can tailor the logistics.</div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Contact details</div>
              <div className="mt-0.5 text-xs text-slate-500">Where should we send the plan and follow-ups?</div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-1">
                  <label htmlFor="full-name" className="block text-xs font-semibold text-slate-700">Your name</label>
                  <input
                    id="full-name"
                    name="fullName"
                    placeholder="Full name"
                    autoComplete="name"
                    className="groupstays-select mt-2 w-full rounded-xl px-4 py-3 border border-slate-200 bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition"
                  />
                </div>
                <div className="md:col-span-1">
                  <label htmlFor="email" className="block text-xs font-semibold text-slate-700">Email</label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@email.com"
                    autoComplete="email"
                    className="groupstays-select mt-2 w-full rounded-xl px-4 py-3 border border-slate-200 bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition"
                  />
                </div>
                <div className="md:col-span-1">
                  <label htmlFor="phone" className="block text-xs font-semibold text-slate-700">Phone</label>
                  <input
                    id="phone"
                    name="phone"
                    placeholder="+255..."
                    autoComplete="tel"
                    className="groupstays-select mt-2 w-full rounded-xl px-4 py-3 border border-slate-200 bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition"
                  />
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Transport & transfers</div>
                  <div className="mt-0.5 text-xs text-slate-500">
                    {selectedRole === 'Tourist'
                      ? 'Vehicle preferences (optional). Pickup/dropoff is planned after your itinerary is confirmed.'
                      : 'Pickup/dropoff and vehicle preferences (optional).'}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="transport-required" className="block text-xs font-semibold text-slate-700">Do you need transport?</label>
                <div className="relative mt-2">
                  <select
                    id="transport-required"
                    name="transportRequired"
                    value={transportRequired}
                    onChange={(e) => setTransportRequired(e.target.value)}
                    className="groupstays-select w-full rounded-xl px-4 py-3 pr-10 border border-slate-200 bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition"
                  >
                    <option value="">Select</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
                </div>

                {transportRequired === 'no' ? (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                    No transport needed — we’ll focus on the itinerary.
                  </div>
                ) : null}
              </div>

              {transportRequired === 'yes' && (
                <div className="mt-4 space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="vehicle-type" className="block text-xs font-semibold text-slate-700">Preferred vehicle type</label>
                      <div className="relative mt-2">
                        <select
                          id="vehicle-type"
                          name="vehicleType"
                          className="groupstays-select w-full rounded-xl px-4 py-3 pr-10 border border-slate-200 bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition"
                        >
                          <option value="">Select</option>
                          <option value="bus">Bus / Coach</option>
                          <option value="minibus">Minibus</option>
                          <option value="4x4">4x4 / SUV</option>
                          <option value="safari-land-cruiser">Safari Land Cruiser / Jeep (4x4)</option>
                          <option value="safari-van">Safari Van (pop-up roof)</option>
                          <option value="van">Van</option>
                          <option value="boat">Boat</option>
                          <option value="other">Other</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="vehicles-needed" className="block text-xs font-semibold text-slate-700">Vehicles / units</label>
                      <input
                        id="vehicles-needed"
                        name="vehiclesNeeded"
                        type="number"
                        min={0}
                        placeholder="e.g. 1, 2"
                        className="groupstays-select mt-2 w-full rounded-xl px-4 py-3 border border-slate-200 bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition"
                      />
                    </div>
                  </div>

                  {selectedRole !== 'Tourist' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="pickup-location" className="block text-xs font-semibold text-slate-700">Pickup location</label>
                        <input
                          id="pickup-location"
                          name="pickupLocation"
                          placeholder="City, hotel, or coordinates"
                          className="groupstays-select mt-2 w-full rounded-xl px-4 py-3 border border-slate-200 bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition"
                        />
                      </div>
                      <div>
                        <label htmlFor="dropoff-location" className="block text-xs font-semibold text-slate-700">Dropoff location</label>
                        <input
                          id="dropoff-location"
                          name="dropoffLocation"
                          placeholder="City, park, or coordinates"
                          className="groupstays-select mt-2 w-full rounded-xl px-4 py-3 border border-slate-200 bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                      Pickup and dropoff details are confirmed after you choose your destination and itinerary.
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="passenger-count" className="block text-xs font-semibold text-slate-700">Estimated passengers</label>
                      <input
                        id="passenger-count"
                        name="passengerCount"
                        value={passengerCount}
                        onChange={(e) => {
                          if (!groupSizeState) setPassengerCount(e.target.value);
                        }}
                        type="number"
                        min={0}
                        placeholder="Number of passengers"
                        disabled={!!groupSizeState}
                        className="groupstays-select mt-2 w-full rounded-xl px-4 py-3 border border-slate-200 bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition disabled:bg-slate-50 disabled:text-slate-500"
                      />
                      {groupSizeState ? (
                        <div className="mt-1 text-[11px] text-slate-500">Auto-filled from group size.</div>
                      ) : null}
                    </div>
                    <div>
                      <label htmlFor="vehicle-requirements" className="block text-xs font-semibold text-slate-700">Special requirements</label>
                      <input
                        id="vehicle-requirements"
                        name="vehicleRequirements"
                        placeholder="e.g. wheelchair access, refrigeration, trailer"
                        className="groupstays-select mt-2 w-full rounded-xl px-4 py-3 border border-slate-200 bg-white text-sm text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-300 transition"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Review step (4) */}
      {step === 4 && (() => {
        // Always collect fresh form data for review to ensure we show everything
        const currentReviewData = Object.keys(reviewData).length > 0 ? reviewData : collectFormAsObject();
        const orderedKeys = getOrderedReviewKeys(currentReviewData);

        const reviewDestinationContext = matchEastAfricaDestinations(
          parseDestinationList(currentReviewData.destinations || '')
        );
        const reviewPrimaryDestinationId = reviewDestinationContext.matched[0]?.id;
        const tripReviewAccent = reviewPrimaryDestinationId
          ? getDestinationAccent(reviewPrimaryDestinationId)
          : destinationAccentPalette[0];

        const reviewChecklist = [
          {
            label: 'Destinations',
            ok: Boolean(String(currentReviewData.destinations || '').trim()),
          },
          {
            label: 'Dates',
            ok: Boolean(String(currentReviewData.dateFrom || '').trim()) && Boolean(String(currentReviewData.dateTo || '').trim()),
          },
          {
            label: 'Group size',
            ok: Boolean(String(currentReviewData.groupSize || '').trim()) || Boolean(String(currentReviewData.passengerCount || '').trim()),
          },
          {
            label: 'Contact info',
            ok: Boolean(String(currentReviewData.fullName || '').trim()) && Boolean(String(currentReviewData.email || '').trim()),
          },
        ];
        
        // Group fields by category for better organization
        const tripDetails = ['role', 'tripType', 'destinations', 'dateFrom', 'dateTo', 'groupSize', 'passengerCount', 'budget', 'notes'];
        const contactDetails = ['fullName', 'email', 'phone'];
        const transportDetails =
          selectedRole === 'Tourist'
            ? ['transportRequired', 'vehicleType', 'vehiclesNeeded', 'vehicleRequirements']
            : ['transportRequired', 'vehicleType', 'pickupLocation', 'dropoffLocation', 'vehiclesNeeded', 'vehicleRequirements'];
        
        // Role-specific fields based on role
        const roleSpecificKeys: string[] = [];
        if (selectedRole === 'Event planner') {
          roleSpecificKeys.push('eventType', 'expectedAttendees', 'eventStartDate', 'eventEndDate', 'venuePreferences', 'accommodationNeeded', 'cateringRequired', 'avRequirements', 'budgetPerPerson');
        } else if (selectedRole === 'School / Teacher') {
          roleSpecificKeys.push('studentsCount', 'chaperones', 'ageRange', 'learningObjectives', 'riskAssessment', 'specialNeedsSupport');
        } else if (selectedRole === 'University') {
          roleSpecificKeys.push('researchPurpose', 'staffCount', 'studentsCountUniv', 'ethicsApproval', 'sampleCollection', 'permitsNeeded');
        } else if (selectedRole === 'Community group') {
          roleSpecificKeys.push('communityObjectives', 'beneficiaries', 'projectDuration', 'localPartners');
        } else if (selectedRole === 'Other' || selectedRole === 'Tourist') {
          roleSpecificKeys.push('otherDetails');
        }
        
        // Filter keys by category and get remaining keys
        const tripKeys = orderedKeys.filter(k => tripDetails.includes(k));
        const contactKeys = orderedKeys.filter(k => contactDetails.includes(k));
        const transportKeys = orderedKeys.filter(k => transportDetails.includes(k));
        const roleKeys = orderedKeys.filter(k => roleSpecificKeys.includes(k));
        const otherKeys = orderedKeys.filter(k => !tripDetails.includes(k) && !contactDetails.includes(k) && !transportDetails.includes(k) && !roleSpecificKeys.includes(k));
        
        return (
          <section aria-labelledby="review-heading" className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-6 shadow-sm">
              <h3 id="review-heading" className="text-xl font-semibold text-slate-900">Review your request</h3>
              <p className="text-sm text-slate-600 mt-1">Review all information below before sending. Use Back to edit any section.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Before you send</div>
                    <div className="mt-1 text-xs text-slate-600">Quick checklist to avoid surprises.</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {reviewChecklist.map((item) => (
                    <div key={item.label} className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-white px-3 py-2 shadow-sm">
                      <CheckCircle className={item.ok ? 'w-4 h-4 text-emerald-600' : 'w-4 h-4 text-slate-300'} aria-hidden />
                      <div className={item.ok ? 'text-xs font-semibold text-slate-800' : 'text-xs font-semibold text-slate-500'}>
                        {item.label}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-[11px] text-slate-500">
                  Your contact details are only used to respond to this request.
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-5 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">What happens next</div>
                <div className="mt-1 text-xs text-slate-600">Here’s what to expect after you send.</div>
                <ol className="mt-4 space-y-2">
                  <li className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2 shadow-sm">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white text-[11px] font-semibold">1</span>
                    <div className="text-xs text-slate-700"><span className="font-semibold text-slate-900">We review</span> your details and confirm availability.</div>
                  </li>
                  <li className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2 shadow-sm">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white text-[11px] font-semibold">2</span>
                    <div className="text-xs text-slate-700"><span className="font-semibold text-slate-900">We tailor</span> the itinerary around your preferences.</div>
                  </li>
                  <li className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white px-3 py-2 shadow-sm">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-white text-[11px] font-semibold">3</span>
                    <div className="text-xs text-slate-700"><span className="font-semibold text-slate-900">We reply</span> with next steps and a quote.</div>
                  </li>
                </ol>
              </div>
            </div>
            
            {orderedKeys.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <p className="text-sm text-slate-500">No details to show. Please fill out the form.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Trip Details Section */}
                {tripKeys.length > 0 && (
                  <div
                    className={
                      "group relative overflow-hidden rounded-3xl border bg-gradient-to-b to-white p-5 shadow-sm backdrop-blur transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-md " +
                      tripReviewAccent.reviewSectionBorder +
                      " " +
                      tripReviewAccent.reviewSectionFrom +
                      " before:content-[''] before:absolute before:inset-x-0 before:top-0 before:h-1 " +
                      tripReviewAccent.reviewSectionBar
                    }
                  >
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
                      <h4 className="text-sm font-semibold text-slate-900">Trip Details</h4>
                      <button
                        type="button"
                        onClick={() => goToStep(1)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                      >
                        Edit
                        <ArrowRight className="w-4 h-4 text-slate-500" aria-hidden />
                      </button>
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {tripKeys.map((k) => (
                        <div
                          key={k}
                          className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-md group-hover:border-slate-200"
                        >
                          <div
                            className={
                              'text-[11px] font-semibold uppercase tracking-wide ' +
                              (k === 'destinations' || k === 'tripType' ? tripReviewAccent.reviewLabel : 'text-slate-500')
                            }
                          >
                            {formatLabel(k)}
                          </div>
                          {k === 'destinations' ? (
                            (() => {
                              const raw = currentReviewData[k];
                              const stops = parseSerializedRouteStopsForReview(raw);
                              if (stops.length > 0) {
                                return (
                                  <div className="mt-2 space-y-2">
                                    {stops.map((s, index) => (
                                      <div
                                        key={`${s.idx || index}_${s.place}`}
                                        className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/60 px-3 py-2"
                                      >
                                        <span
                                          className={
                                            'mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ring-2 ring-white ' +
                                            tripReviewAccent.destinationPill.replace('bg-', 'bg-')
                                          }
                                        >
                                          {s.idx || index + 1}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                          <div className="text-sm font-semibold text-slate-900 break-words">{s.place}</div>
                                          {typeof s.nights === 'number' ? (
                                            <div className="mt-1">
                                              <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-700 shadow-sm">
                                                {s.nights} night{s.nights === 1 ? '' : 's'}
                                              </span>
                                            </div>
                                          ) : null}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                );
                              }

                              const formatted = formatValue(raw);
                              return <div className="mt-1 text-sm text-slate-900 break-words whitespace-pre-wrap">{formatted}</div>;
                            })()
                          ) : (
                            <div className="mt-1 text-sm text-slate-900 break-words">{formatValue(currentReviewData[k])}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Role-Specific Details Section */}
                {roleKeys.length > 0 && (
                  <div className="group rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur transition-shadow hover:shadow-md">
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
                      <h4 className="text-sm font-semibold text-slate-900">{selectedRole} Details</h4>
                      <button
                        type="button"
                        onClick={() => goToStep(2)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                      >
                        Edit
                        <ArrowRight className="w-4 h-4 text-slate-500" aria-hidden />
                      </button>
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {roleKeys.map((k) => (
                        <div
                          key={k}
                          className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-md group-hover:border-slate-200"
                        >
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{formatLabel(k)}</div>
                          <div className="mt-1 text-sm text-slate-900 break-words">{formatValue(currentReviewData[k])}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Contact Details Section */}
                {contactKeys.length > 0 && (
                  <div className="group rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur transition-shadow hover:shadow-md">
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
                      <h4 className="text-sm font-semibold text-slate-900">Contact Information</h4>
                      <button
                        type="button"
                        onClick={() => goToStep(3)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                      >
                        Edit
                        <ArrowRight className="w-4 h-4 text-slate-500" aria-hidden />
                      </button>
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {contactKeys.map((k) => (
                        <div
                          key={k}
                          className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-md group-hover:border-slate-200"
                        >
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{formatLabel(k)}</div>
                          <div className="mt-1 text-sm text-slate-900 break-words">{formatValue(currentReviewData[k])}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Transport Details Section */}
                {transportKeys.length > 0 && (
                  <div className="group rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur transition-shadow hover:shadow-md">
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
                      <h4 className="text-sm font-semibold text-slate-900">Transport & Vehicle Details</h4>
                      <button
                        type="button"
                        onClick={() => goToStep(3)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                      >
                        Edit
                        <ArrowRight className="w-4 h-4 text-slate-500" aria-hidden />
                      </button>
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {transportKeys.map((k) => (
                        <div
                          key={k}
                          className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-md group-hover:border-slate-200"
                        >
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{formatLabel(k)}</div>
                          <div className="mt-1 text-sm text-slate-900 break-words">{formatValue(currentReviewData[k])}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Other Details Section */}
                {otherKeys.length > 0 && (
                  <div className="group rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur transition-shadow hover:shadow-md">
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900">
                          {selectedRole === 'Tourist' && (otherKeys.includes('touristMustHaves') || otherKeys.includes('touristInterests'))
                            ? 'For Tourists'
                            : 'Additional Details'}
                        </h4>
                        {selectedRole === 'Tourist' && (otherKeys.includes('touristMustHaves') || otherKeys.includes('touristInterests')) ? (
                          <div className="mt-1 text-xs text-slate-600">Pick a few options (fast) and we’ll tailor the itinerary around your preferences.</div>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => goToStep(2)}
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
                      >
                        Edit
                        <ArrowRight className="w-4 h-4 text-slate-500" aria-hidden />
                      </button>
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      {otherKeys.map((k) => (
                        <div
                          key={k}
                          className="rounded-2xl border border-slate-100 bg-white px-4 py-3 shadow-sm transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-md group-hover:border-slate-200"
                        >
                          <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{formatLabel(k)}</div>
                          {k === 'touristMustHaves' || k === 'touristInterests' ? (
                            (() => {
                              const items = splitCommaList(currentReviewData[k]);
                              return items.length > 0 ? (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {items.map((item) => (
                                    <span
                                      key={item}
                                      className={
                                        'inline-flex items-center rounded-xl px-3 py-1.5 text-xs font-semibold border shadow-sm select-none ' +
                                        tripReviewAccent.chipActive
                                      }
                                    >
                                      {item}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className="mt-1 text-sm text-slate-900 break-words">-</div>
                              );
                            })()
                          ) : (
                            <div className="mt-1 text-sm text-slate-900 break-words">{formatValue(currentReviewData[k])}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })()}

      </div></>) : null}</div>

      {selectedRole && (
        <div className="pt-3 flex gap-3">
          {step > 1 && (
            <button type="button" onClick={goBack} className="inline-flex items-center justify-center gap-2 border border-slate-200 text-slate-700 bg-white px-4 py-2 rounded-lg">Back</button>
          )}

          {step < totalSteps && (
            <button type="button" onClick={goNext} className="ml-auto inline-flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold px-4 py-2 rounded-lg">Next</button>
          )}

          {step === totalSteps && (
            <button type="submit" disabled={submitting} className="ml-auto inline-flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold px-4 py-2 rounded-lg">
              {submitting ? 'Sending…' : 'Send request'}
            </button>
          )}
        </div>
      )}
    </form>
  );
}
