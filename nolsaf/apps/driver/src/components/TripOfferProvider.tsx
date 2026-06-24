import { NavigationContainerRefWithCurrent } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";

import { useAuth } from "../auth/AuthProvider";
import { acceptTrip, declineTrip } from "../driver/driverApi";
import { TripOffer } from "../driver/types";
import { useDriverSocket } from "../hooks/useDriverSocket";
import { onTestTripOffer } from "../lib/tripOfferTestBus";
import { RootStackParamList } from "../navigation/types";
import { TripOfferModal } from "./TripOfferModal";

type TripOfferProviderProps = {
  navigationRef: NavigationContainerRefWithCurrent<RootStackParamList>;
};

export function TripOfferProvider({ navigationRef }: TripOfferProviderProps) {
  const { token } = useAuth();
  const [offers, setOffers] = useState<TripOffer[]>([]);
  const [loading, setLoading] = useState(false);

  const dequeue = useCallback((bookingId: number) => {
    setOffers((current) => current.filter((item) => item.bookingId !== bookingId));
  }, []);

  useDriverSocket(
    {
      "transport:booking:created": (payload) => {
        const offer = payload as TripOffer | null;
        if (!offer || typeof offer.bookingId !== "number") return;
        setOffers((current) => (current.some((item) => item.bookingId === offer.bookingId) ? current : [...current, offer]));
      }
    },
    { requireFocus: false }
  );

  useEffect(() => {
    if (!__DEV__) return undefined;
    return onTestTripOffer((offer) => {
      setOffers((current) => (current.some((item) => item.bookingId === offer.bookingId) ? current : [...current, offer]));
    });
  }, []);

  const current = offers[0] ?? null;

  const handleAccept = useCallback(async () => {
    if (!token || !current) return;
    setLoading(true);
    try {
      await acceptTrip(token, current.bookingId);
      dequeue(current.bookingId);
      navigationRef.current?.navigate("TripDetail", { tripId: current.bookingId });
    } catch (e) {
      Alert.alert("Could not accept trip", e instanceof Error ? e.message : "This trip may have already been taken.");
      dequeue(current.bookingId);
    } finally {
      setLoading(false);
    }
  }, [token, current, dequeue, navigationRef]);

  const handleDecline = useCallback(async () => {
    if (!current) return;
    const bookingId = current.bookingId;
    dequeue(bookingId);
    if (!token) return;
    try {
      await declineTrip(token, bookingId);
    } catch {
      // ignore - offer is removed from the queue regardless
    }
  }, [token, current, dequeue]);

  const handleExpire = useCallback(() => {
    if (!current) return;
    dequeue(current.bookingId);
  }, [current, dequeue]);

  return <TripOfferModal offer={current} loading={loading} onAccept={handleAccept} onDecline={handleDecline} onExpire={handleExpire} />;
}
