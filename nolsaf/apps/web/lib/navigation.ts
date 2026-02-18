/**
 * Navigation utilities for opening routes in external map applications
 */

export function openInMaps(
  destinationLat: number,
  destinationLng: number,
  destinationName?: string
) {
  // Detect if iOS or Android
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
  const isAndroid = /android/i.test(userAgent);

  const encodedName = destinationName ? encodeURIComponent(destinationName) : "";

  if (isIOS) {
    // iOS - try Apple Maps first, fallback to Google Maps
    const appleMapsUrl = `maps://maps.apple.com/?daddr=${destinationLat},${destinationLng}${encodedName ? `&q=${encodedName}` : ""}`;
    const googleMapsUrl = `comgooglemaps://?daddr=${destinationLat},${destinationLng}${encodedName ? `&q=${encodedName}` : ""}`;
    const webGoogleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destinationLat},${destinationLng}${encodedName ? `&destination_place_id=${encodedName}` : ""}`;

    // Try Apple Maps first
    window.location.href = appleMapsUrl;
    
    // Fallback to Google Maps if Apple Maps fails
    setTimeout(() => {
      window.location.href = googleMapsUrl;
      // Final fallback to web Google Maps
      setTimeout(() => {
        window.open(webGoogleMapsUrl, "_blank");
      }, 500);
    }, 500);
  } else if (isAndroid) {
    // Android - try Google Maps app first
    const googleMapsUrl = `google.navigation:q=${destinationLat},${destinationLng}`;
    const webGoogleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destinationLat},${destinationLng}${encodedName ? `&destination_place_id=${encodedName}` : ""}`;

    window.location.href = googleMapsUrl;
    
    // Fallback to web Google Maps
    setTimeout(() => {
      window.open(webGoogleMapsUrl, "_blank");
    }, 500);
  } else {
    // Desktop - open in web Google Maps
    const webGoogleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destinationLat},${destinationLng}${encodedName ? `&destination_place_id=${encodedName}` : ""}`;
    window.open(webGoogleMapsUrl, "_blank");
  }
}

export function openRouteInMaps(
  originLat: number,
  originLng: number,
  destinationLat: number,
  destinationLng: number,
  _originName?: string,
  _destinationName?: string
) {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream;
  const isAndroid = /android/i.test(userAgent);

  if (isIOS) {
    const appleMapsUrl = `maps://maps.apple.com/?saddr=${originLat},${originLng}&daddr=${destinationLat},${destinationLng}`;
    const webGoogleMapsUrl = `https://www.google.com/maps/dir/${originLat},${originLng}/${destinationLat},${destinationLng}`;
    
    window.location.href = appleMapsUrl;
    setTimeout(() => {
      window.open(webGoogleMapsUrl, "_blank");
    }, 500);
  } else if (isAndroid) {
    const googleMapsUrl = `google.navigation:q=${destinationLat},${destinationLng}`;
    const webGoogleMapsUrl = `https://www.google.com/maps/dir/${originLat},${originLng}/${destinationLat},${destinationLng}`;
    
    window.location.href = googleMapsUrl;
    setTimeout(() => {
      window.open(webGoogleMapsUrl, "_blank");
    }, 500);
  } else {
    const webGoogleMapsUrl = `https://www.google.com/maps/dir/${originLat},${originLng}/${destinationLat},${destinationLng}`;
    window.open(webGoogleMapsUrl, "_blank");
  }
}

