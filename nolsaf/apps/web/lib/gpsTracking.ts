export type GpsTrackPoint = {
  lat: number;
  lng: number;
  speedMps?: number;
  accuracyM?: number;
};

export function gpsDistanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
) {
  const earthRadiusMeters = 6371000;
  const deltaLat = ((b.lat - a.lat) * Math.PI) / 180;
  const deltaLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const haversine =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export function blendGpsPoint(
  prev: { lat: number; lng: number },
  next: { lat: number; lng: number },
  alpha: number
) {
  return {
    lat: prev.lat + (next.lat - prev.lat) * alpha,
    lng: prev.lng + (next.lng - prev.lng) * alpha,
  };
}

export function acceptGpsTrackPoint({
  prevAccepted,
  lastAcceptedAt,
  raw,
  now = Date.now(),
}: {
  prevAccepted: GpsTrackPoint | null;
  lastAcceptedAt: number | null;
  raw: GpsTrackPoint;
  now?: number;
}): GpsTrackPoint | null {
  if (!prevAccepted) {
    return raw;
  }

  const dtSec = Math.max(0.5, (now - (lastAcceptedAt ?? now)) / 1000);
  const distanceM = gpsDistanceMeters(prevAccepted, raw);
  const reportedSpeed = typeof raw.speedMps === "number" && Number.isFinite(raw.speedMps) ? raw.speedMps : undefined;
  const inferredSpeed = reportedSpeed ?? distanceM / dtSec;
  const accuracyM = typeof raw.accuracyM === "number" && Number.isFinite(raw.accuracyM) ? raw.accuracyM : 10;
  const stationaryDeadbandM = Math.max(5, Math.min(16, accuracyM * 0.45));

  // Ignore tiny GPS wobble when the device is effectively stationary.
  if (inferredSpeed < 1 && distanceM < stationaryDeadbandM) {
    return null;
  }

  const alpha = inferredSpeed < 1.5 ? 0.22 : inferredSpeed < 5 ? 0.42 : 0.72;
  const blended = blendGpsPoint(prevAccepted, raw, alpha);

  return {
    ...raw,
    lat: blended.lat,
    lng: blended.lng,
  };
}