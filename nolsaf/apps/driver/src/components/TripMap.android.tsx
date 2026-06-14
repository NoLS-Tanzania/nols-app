import Mapbox, { Camera, LineLayer, MapView, PointAnnotation, ShapeSource } from "@rnmapbox/maps";
import { StyleSheet, View } from "react-native";

import { colors, radius } from "@nolsaf/native-ui";

import { env } from "../lib/env";

Mapbox.setAccessToken(env.mapboxToken);

export type TripMapPoint = { lat: number; lng: number };

export type TripMapProps = {
  pickup: TripMapPoint | null;
  dropoff: TripMapPoint | null;
  driverPosition: TripMapPoint | null;
};

export function TripMap({ pickup, dropoff, driverPosition }: TripMapProps) {
  const center = driverPosition || pickup || dropoff;
  if (!center) return null;

  const routeLine =
    pickup && dropoff
      ? {
          type: "Feature" as const,
          properties: {},
          geometry: {
            type: "LineString" as const,
            coordinates: [
              [pickup.lng, pickup.lat],
              [dropoff.lng, dropoff.lat]
            ]
          }
        }
      : null;

  return (
    <View style={styles.container}>
      <MapView style={styles.map}>
        <Camera centerCoordinate={[center.lng, center.lat]} zoomLevel={11} />
        {pickup ? (
          <PointAnnotation id="pickup" coordinate={[pickup.lng, pickup.lat]}>
            <View style={[styles.marker, { backgroundColor: colors.primary }]} />
          </PointAnnotation>
        ) : null}
        {dropoff ? (
          <PointAnnotation id="dropoff" coordinate={[dropoff.lng, dropoff.lat]}>
            <View style={[styles.marker, { backgroundColor: colors.mutedText }]} />
          </PointAnnotation>
        ) : null}
        {driverPosition ? (
          <PointAnnotation id="driver" coordinate={[driverPosition.lng, driverPosition.lat]}>
            <View style={[styles.marker, { backgroundColor: colors.success }]} />
          </PointAnnotation>
        ) : null}
        {routeLine ? (
          <ShapeSource id="routeLine" shape={routeLine}>
            <LineLayer id="routeLineLayer" style={{ lineColor: colors.primary, lineWidth: 3 }} />
          </ShapeSource>
        ) : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 200,
    borderRadius: radius.lg,
    overflow: "hidden"
  },
  map: {
    flex: 1
  },
  marker: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.white
  }
});
