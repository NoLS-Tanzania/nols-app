import { AppText, colors, radius } from "@nolsaf/native-ui";
import { StyleSheet, View } from "react-native";

export type TripMapPoint = { lat: number; lng: number };

export type TripMapProps = {
  pickup: TripMapPoint | null;
  dropoff: TripMapPoint | null;
  driverPosition: TripMapPoint | null;
};

export function TripMap(_props: TripMapProps) {
  return (
    <View style={styles.container}>
      <AppText variant="caption" tone="muted">
        Map preview is available in the mobile app.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 260,
    borderRadius: radius.lg,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border
  }
});
