"use client";

export type SearchFilters = {
  minPrice?: number | '';
  maxPrice?: number | '';
  /** ISO date string, e.g. 2025-11-20 */
  checkIn?: string;
  /** ISO date string */
  checkOut?: string;
  region?: string;
  district?: string;
  state?: string;
  amenities?: string[];
  types?: string[];
};

export default function SearchFilters({
  value,
  onChange,
}: {
  value: SearchFilters;
  onChange: (v: SearchFilters) => void;
}) {

    const regions = ['Zanzibar', 'Arusha', 'Dar es Salaam', 'Kilimanjaro', 'Ngorongoro'];
  const states = ['Coastal', 'Northern', 'Central'];
  const amenities = ['Wifi', 'Pool', 'Parking', 'Breakfast'];
  const types = ['Hotel', 'Lodge', 'Condo', 'Villa', 'Cabin', 'Camp'];

  const set = (patch: Partial<SearchFilters>) => onChange({ ...value, ...patch });

  const toggleArray = (key: 'amenities' | 'types', item: string) => {
    const arr = (value[key] || []) as string[];
    const next = arr.includes(item) ? arr.filter(a => a !== item) : [...arr, item];
    set({ [key]: next });
  };

  return (
    <div className="mt-3 p-4 bg-white border rounded-md shadow-sm">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Min price</label>
          <input aria-label="Minimum price" title="Minimum price" type="number" value={value.minPrice ?? ''} onChange={e => set({ minPrice: e.target.value ? Number(e.target.value) : '' })} className="mt-1 block w-full border rounded px-2 py-1" placeholder="Min" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Max price</label>
          <input aria-label="Maximum price" title="Maximum price" type="number" value={value.maxPrice ?? ''} onChange={e => set({ maxPrice: e.target.value ? Number(e.target.value) : '' })} className="mt-1 block w-full border rounded px-2 py-1" placeholder="Max" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Region</label>
          <select aria-label="Region" title="Region" value={value.region ?? ''} onChange={e => set({ region: e.target.value || undefined })} className="mt-1 block w-full border rounded px-2 py-1">
            <option value="">Any</option>
            {regions.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">District</label>
          <input aria-label="District" title="District" value={value.district ?? ''} onChange={e => set({ district: e.target.value || undefined })} className="mt-1 block w-full border rounded px-2 py-1" placeholder="District" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Check-in</label>
          <input aria-label="Check-in date" title="Check-in date" type="date" value={value.checkIn ?? ''} onChange={e => set({ checkIn: e.target.value || undefined })} className="mt-1 block w-full border rounded px-2 py-1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Check-out</label>
          <input aria-label="Check-out date" title="Check-out date" type="date" value={value.checkOut ?? ''} onChange={e => set({ checkOut: e.target.value || undefined })} className="mt-1 block w-full border rounded px-2 py-1" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">State</label>
          <select aria-label="State" title="State" value={value.state ?? ''} onChange={e => set({ state: e.target.value || undefined })} className="mt-1 block w-full border rounded px-2 py-1">
            <option value="">Any</option>
            {states.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Accommodation types</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {types.map(t => (
              <button key={t} type="button" onClick={() => toggleArray('types', t)} className={`px-2 py-1 border rounded ${ (value.types || []).includes(t) ? 'bg-[#02665e] text-white' : '' }`}>{t}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Amenities</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {amenities.map(a => (
              <button key={a} type="button" onClick={() => toggleArray('amenities', a)} className={`px-2 py-1 border rounded ${ (value.amenities || []).includes(a) ? 'bg-[#02665e] text-white' : '' }`}>{a}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
