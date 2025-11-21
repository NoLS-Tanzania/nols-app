"use client";

import { useState } from 'react';
import PublicSearch from './PublicSearch';
import SearchFilters, { type SearchFilters as Filters } from './SearchFilters';

export default function PublicSearchPanel({ initialQuery = '' }: { initialQuery?: string }) {
  const [filters, setFilters] = useState<Filters>({});

  return (
    <div>
      <div className="max-w-3xl mx-auto">
        <PublicSearch initialQuery={initialQuery} filters={filters} />
        <div className="mt-4">
          <SearchFilters value={filters} onChange={(v) => setFilters(v)} />
        </div>
      </div>
    </div>
  );
}
