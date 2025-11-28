"use client";

import { useState, useEffect, useRef } from "react";
import { Search } from 'lucide-react';
import { useRouter } from "next/navigation";
import type { SearchFilters as Filters } from "./SearchFilters";

export type PublicSearchProps = {
  initialQuery?: string;
  onSearch?: (q: string) => void;
  redirect?: boolean;
  placeholder?: string;
  filters?: Filters;
  autoFocus?: boolean;
};

export function buildPublicPropertiesUrl(q?: string, filters?: Filters) {
  const params = new URLSearchParams();
  if (q && q.trim()) params.set('q', q.trim());

  if (filters) {
    const { minPrice, maxPrice, region, district, state, amenities, types } = filters;
    if (minPrice !== undefined && minPrice !== '') params.set('minPrice', String(minPrice));
    if (maxPrice !== undefined && maxPrice !== '') params.set('maxPrice', String(maxPrice));
    if (region) params.set('region', region);
    if (district) params.set('district', district);
    if (state) params.set('state', state);
    // date filters (ISO date strings)
    // `checkIn` / `checkOut` expected as YYYY-MM-DD strings from the date inputs
    // they are included as-is so server can parse them
    // e.g. /public/properties?checkIn=2025-11-20&checkOut=2025-11-22
    // ensure we only set when provided
    const { checkIn, checkOut } = filters as any;
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (amenities && amenities.length) params.set('amenities', amenities.join(','));
    if (types && types.length) params.set('types', types.join(','));
  }

  const qs = params.toString();
  return qs ? `/public/properties?${qs}` : `/public/properties`;
}

// Simple mock dataset for autocomplete suggestions — replace with API calls later.
const MOCK_PROPERTIES = [
  { id: 'p1', title: 'Beachfront Villa, Zanzibar', location: 'Zanzibar' },
  { id: 'p2', title: 'Safari Lodge, Arusha', location: 'Arusha' },
  { id: 'p3', title: 'City Apartment, Dar es Salaam', location: 'Dar es Salaam' },
  { id: 'p4', title: 'Mount Kilimanjaro Cabin', location: 'Kilimanjaro' },
  { id: 'p5', title: 'Ngorongoro Camp', location: 'Ngorongoro' },
];

export default function PublicSearch({
  initialQuery = "",
  onSearch,
  redirect = true,
  placeholder = "Search city, region or property",
  filters,
  autoFocus = false,
}: PublicSearchProps) {
  const [query, setQuery] = useState(initialQuery || "");
  // loading state removed (auto-search)
  const [suggestions, setSuggestions] = useState<Array<{ id: string; title: string; location: string }>>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const router = useRouter();
  const debounceRef = useRef<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setQuery(initialQuery || "");
  }, [initialQuery]);

  // autofocus when parent requests it (e.g., mobile expanded panel)
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      try {
        inputRef.current.focus();
      } catch (e) {}
    }
  }, [autoFocus]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  // Debounced suggestions (client-side mock). Replace with fetch to `/api/public/search?q=` later.
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    debounceRef.current = window.setTimeout(() => {
      const q = query.toLowerCase();
      const results = MOCK_PROPERTIES.filter(p => p.title.toLowerCase().includes(q) || p.location.toLowerCase().includes(q));
      setSuggestions(results);
      setActiveIndex(-1);
      setOpen(results.length > 0);
    }, 250);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  // submit is handled by selecting a suggestion or pressing Enter (handled in onKeyDown)

  const choose = (value: string) => {
    setQuery(value);
    setOpen(false);
    // submit automatically when choosing suggestion
    if (redirect) router.push(buildPublicPropertiesUrl(value, filters));
    if (onSearch) onSearch(value);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && suggestions[activeIndex]) {
        e.preventDefault();
        choose(suggestions[activeIndex].title);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={wrapperRef} className="w-full relative">
      <div className="w-full relative">
        <label className="sr-only">Search</label>
        {/* Search icon (left) inside the pill */}
        <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2">
          <Search className="h-3 w-3 text-white/90" aria-hidden />
        </div>
        <input
          value={query}
          ref={inputRef}
          onChange={(e) => { setQuery(e.target.value); }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          aria-label="Search"
          className="w-full bg-white/10 text-white placeholder-white/80 pl-8 pr-2 py-1 text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-white/40"
          onFocus={() => { if (suggestions.length) setOpen(true); }}
        />
      </div>

      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 mt-2 bg-white border rounded-md shadow-lg z-50 max-h-64 overflow-auto">
          {suggestions.map((s, idx) => (
            <li
              key={s.id}
              onMouseDown={(e) => { e.preventDefault(); choose(s.title); }}
              className={`px-4 py-2 cursor-pointer hover:bg-gray-50 ${idx === activeIndex ? 'bg-gray-100' : ''}`}
            >
              <div className="font-medium">{s.title}</div>
              <div className="text-xs text-gray-500">{s.location}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
