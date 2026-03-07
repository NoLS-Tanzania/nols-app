export function buildDriverCaseRef(driverId: number, suspendedAt: Date | string | number | null | undefined): string | null {
  const id = Number(driverId);
  if (!Number.isFinite(id) || id <= 0) return null;

  const ts = new Date(suspendedAt ?? 0).getTime();
  if (!Number.isFinite(ts) || ts <= 0) return null;

  return `NOLS-DRV-${String(id).padStart(5, "0")}-${ts.toString(36).toUpperCase()}`;
}