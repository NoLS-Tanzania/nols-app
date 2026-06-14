import { StyleSheet, View } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_DEFAULT } from "react-native-maps";

import { colors, radius } from "@nolsaf/native-ui";

export type TripMapPoint = { lat: number; lng: number };

export type TripMapProps = {
  pickup: TripMapPoint | null;
  dropoff: TripMapPoint | null;
  driverPosition: TripMapPoint | null;
};

export function TripMap({ pickup, dropoff, driverPosition }: TripMapProps) {
  const center = driverPosition || pickup || dropoff;
  if (!center) return null;

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={{
          latitude: center.lat,
          longitude: center.lng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05
        }}
      >
        {pickup ? <Marker coordinate={{ latitude: pickup.lat, longitude: pickup.lng }} title="Pickup" pinColor={colors.primary} /> : null}
        {dropoff ? <Marker coordinate={{ latitude: dropoff.lat, longitude: dropoff.lng }} title="Dropoff" pinColor={colors.mutedText} /> : null}
        {driverPosition ? <Marker coordinate={{ latitude: driverPosition.lat, longitude: driverPosition.lng }} title="You" pinColor={colors.success} /> : null}
        {pickup && dropoff ? (
          <Polyline
            coordinates={[
              { latitude: pickup.lat, longitude: pickup.lng },
              { latitude: dropoff.lat, longitude: dropoff.lng }
            ]}
            strokeColor={colors.primary}
            strokeWidth={3}
          />
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
  }
});
