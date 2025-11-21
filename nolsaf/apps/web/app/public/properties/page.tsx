import Link from "next/link";

type Props = { searchParams?: { [key: string]: string | undefined } };

const MOCK_PROPERTIES: Array<any> = [
  { id: 'p1', title: 'Beachfront Villa, Zanzibar', location: 'Zanzibar', price: 120, amenities: ['Wifi','Pool'], types: ['Villa'], availableFrom: '2025-01-01', availableTo: '2026-12-31' },
  { id: 'p2', title: 'Safari Lodge, Arusha', location: 'Arusha', price: 200, amenities: ['Parking','Breakfast'], types: ['Lodge'], availableFrom: '2025-06-01', availableTo: '2025-12-31' },
  { id: 'p3', title: 'City Apartment, Dar es Salaam', location: 'Dar es Salaam', price: 75, amenities: ['Wifi'], types: ['Condo'], availableFrom: '2025-01-01', availableTo: '2025-12-31' },
  { id: 'p4', title: 'Mount Kilimanjaro Cabin', location: 'Kilimanjaro', price: 150, amenities: ['Breakfast'], types: ['Cabin'], availableFrom: '2025-09-01', availableTo: '2026-03-31' },
  { id: 'p5', title: 'Ngorongoro Camp', location: 'Ngorongoro', price: 180, amenities: ['Parking','Wifi'], types: ['Camp'], availableFrom: '2025-01-01', availableTo: '2026-12-31' },
];

function parseList(v?: string) {
  if (!v) return [];
  return v.split(',').map(s => s.trim()).filter(Boolean);
}

export default function PropertiesPage({ searchParams }: Props) {
  const q = (searchParams?.q || '').trim().toLowerCase();
  const minPrice = searchParams?.minPrice ? Number(searchParams.minPrice) : undefined;
  const maxPrice = searchParams?.maxPrice ? Number(searchParams.maxPrice) : undefined;
  const region = searchParams?.region;
  const district = searchParams?.district;
  const state = searchParams?.state;
  const amenities = parseList(searchParams?.amenities);
  const types = parseList(searchParams?.types);
  const checkIn = searchParams?.checkIn;
  const checkOut = searchParams?.checkOut;

  const results = MOCK_PROPERTIES.filter(p => {
    if (q) {
      const matched = (p.title + ' ' + p.location).toLowerCase().includes(q);
      if (!matched) return false;
    }
    if (minPrice !== undefined && !Number.isNaN(minPrice)) {
      if (p.price < minPrice) return false;
    }
    if (maxPrice !== undefined && !Number.isNaN(maxPrice)) {
      if (p.price > maxPrice) return false;
    }
    if (region && p.location.toLowerCase() !== region.toLowerCase()) return false;
    if (district && (!p.district || p.district.toLowerCase() !== district.toLowerCase())) return false;
    if (state && p.state && p.state.toLowerCase() !== state.toLowerCase()) return false;
    if (amenities.length) {
      const ok = amenities.every(a => (p.amenities || []).map(String).map(s=>s.toLowerCase()).includes(a.toLowerCase()));
      if (!ok) return false;
    }
    if (types.length) {
      const ok = types.every(t => (p.types || []).map(String).map(s=>s.toLowerCase()).includes(t.toLowerCase()));
      if (!ok) return false;
    }
    if (checkIn) {
      // ensure the property is available from <= checkIn
      if (p.availableFrom && p.availableFrom > checkIn) return false;
    }
    if (checkOut) {
      // ensure availableTo >= checkOut
      if (p.availableTo && p.availableTo < checkOut) return false;
    }

    return true;
  });

  return (
    <>
      <main className="min-h-screen bg-white text-slate-900 header-offset">
        <section className="py-8">
          <div className="public-container">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-semibold">{q ? `Search results for "${searchParams?.q}"` : 'All properties'}</h1>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map(p => (
                <article key={p.id} className="border rounded-lg overflow-hidden shadow-sm">
                  <div className="h-40 bg-gray-200 flex items-center justify-center text-gray-500">Image</div>
                  <div className="p-4">
                    <h3 className="font-medium mb-1">{p.title}</h3>
                    <div className="text-sm text-slate-500 mb-3">{p.location}</div>
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-semibold">${p.price}/night</div>
                      <Link href={`/public/properties/${p.id}`} className="text-sky-600">View</Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
