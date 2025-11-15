// Compatibility copy so imports using '@/utils/...' resolve correctly
// (tsconfig maps '@/*' -> './*' so '@/utils' -> 'apps/web/utils').

export function parseTripsResponse(data: any): any[] {
  return data?.trips ?? (Array.isArray(data) ? data : []);
}

export function parseItemsResponse(data: any): any[] {
  return data?.items ?? (Array.isArray(data) ? data : []);
}

export function normalizeSafetyItems(items: any[]): any[] {
  if (!Array.isArray(items)) return [];
  if (items.length > 0 && (items[0]?.month || items[0]?.period)) return items;

  const map = new Map<string, { month: string; trips: number; infractions: number }>();
  for (const it of items) {
    const dateStr = it.date || it.timestamp || it.createdAt || it.datetime || null;
    const d = dateStr ? new Date(dateStr) : new Date();
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const existing = map.get(key) ?? { month: key, trips: 0, infractions: 0 };
    existing.trips += 1;
    const infraction = !!(it.infraction || it.ruleViolated || it.speeding || it.hardBraking || it.harshAcceleration || it.distracted || it.offRoute);
    if (infraction) existing.infractions += 1;
    map.set(key, existing);
  }
  return Array.from(map.values()).sort((a, b) => b.month.localeCompare(a.month));
}

const historyParsers = {
  parseTripsResponse,
  parseItemsResponse,
  normalizeSafetyItems,
};

export default historyParsers;
