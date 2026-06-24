import { TripOffer } from "../driver/types";

type Listener = (offer: TripOffer) => void;

const listeners = new Set<Listener>();

export function onTestTripOffer(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitTestTripOffer(offer: TripOffer) {
  listeners.forEach((listener) => listener(offer));
}

export function buildSampleTripOffer(): TripOffer {
  return {
    bookingId: Math.floor(Date.now() / 1000),
    tripCode: "TRP-TEST",
    vehicleType: "STANDARD",
    fromAddress: "Kariakoo Market, Dar es Salaam",
    toAddress: "Mikocheni Light Industry, Dar es Salaam",
    fromLatitude: -6.816,
    fromLongitude: 39.286,
    toLatitude: -6.766,
    toLongitude: 39.255,
    amount: 18500,
    currency: "TZS",
    offer: {
      expiresAt: new Date(Date.now() + 3 * 60 * 1000).toISOString(),
      radiusKm: 1
    }
  };
}
