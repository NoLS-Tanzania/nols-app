const EARTH_RADIUS_KM = 6371;
const ASSUMED_SPEED_KMPH = 30;

export function haversineDistanceKm(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const dLat = ((to.lat - from.lat) * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;

  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

export function estimateEtaMinutes(from: { lat: number; lng: number }, to: { lat: number; lng: number }, averageSpeedKmph = ASSUMED_SPEED_KMPH) {
  const distanceKm = haversineDistanceKm(from, to);
  return Math.max(1, Math.round((distanceKm / averageSpeedKmph) * 60));
}

export function formatEta(from: { lat: number; lng: number }, to: { lat: number; lng: number }, averageSpeedKmph = ASSUMED_SPEED_KMPH) {
  const minutes = estimateEtaMinutes(from, to, averageSpeedKmph);
  return `About ${minutes} min away`;
}
