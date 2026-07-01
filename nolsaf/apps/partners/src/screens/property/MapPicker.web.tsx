import { AppText, colors, radius, spacing } from "@nolsaf/native-ui";
import { MapPin, PenLine } from "lucide-react-native";
import { useEffect, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

type Props = {
  latitude: string;
  longitude: string;
  onChange: (lat: string, lng: string) => void;
};

export function MapPicker({ latitude, longitude, onChange }: Props) {
  const [localLat, setLocalLat] = useState(latitude);
  const [localLng, setLocalLng] = useState(longitude);

  useEffect(() => { setLocalLat(latitude); }, [latitude]);
  useEffect(() => { setLocalLng(longitude); }, [longitude]);

  const hasPin = latitude !== "" && longitude !== "" &&
    !isNaN(Number(latitude)) && !isNaN(Number(longitude));

  const commitManual = () => {
    const lat = parseFloat(localLat);
    const lng = parseFloat(localLng);
    if (isNaN(lat) || isNaN(lng)) return;
    onChange(localLat, localLng);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.webFallback}>
        <MapPin size={20} color={colors.softText} />
        <AppText variant="caption" tone="muted" style={styles.fallbackText}>
          Interactive map available on the Android app.{"\n"}Use the fields below to enter coordinates manually.
        </AppText>
      </View>

      <View style={styles.readout}>
        {hasPin ? (
          <View style={styles.coordRow}>
            <View style={styles.coordChip}>
              <AppText variant="caption" style={styles.coordKey}>LAT</AppText>
              <AppText variant="caption" weight="medium">{latitude}</AppText>
            </View>
            <View style={styles.coordDivider} />
            <View style={styles.coordChip}>
              <AppText variant="caption" style={styles.coordKey}>LNG</AppText>
              <AppText variant="caption" weight="medium">{longitude}</AppText>
            </View>
          </View>
        ) : (
          <AppText variant="caption" tone="muted" style={styles.noCoord}>
            No location pinned yet
          </AppText>
        )}
      </View>

      <View style={styles.manualWrap}>
        <View style={styles.manualHeader}>
          <PenLine size={12} color={colors.softText} />
          <AppText variant="caption" style={styles.manualLabel}>
            Enter coordinates manually
          </AppText>
        </View>
        <View style={styles.manualRow}>
          <View style={styles.manualField}>
            <AppText variant="caption" style={styles.fieldLabel}>Latitude</AppText>
            <TextInput
              style={styles.fieldInput}
              value={localLat}
              onChangeText={setLocalLat}
              onBlur={commitManual}
              placeholder="-3.3869"
              placeholderTextColor={colors.softText}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />
          </View>
          <View style={styles.manualDivider} />
          <View style={styles.manualField}>
            <AppText variant="caption" style={styles.fieldLabel}>Longitude</AppText>
            <TextInput
              style={styles.fieldInput}
              value={localLng}
              onChangeText={setLocalLng}
              onBlur={commitManual}
              placeholder="36.6827"
              placeholderTextColor={colors.softText}
              keyboardType="decimal-pad"
              returnKeyType="done"
              onSubmitEditing={commitManual}
            />
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: radius.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white
  },
  webFallback: {
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    backgroundColor: colors.surface
  },
  fallbackText: { textAlign: "center" },
  readout: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    minHeight: 38,
    justifyContent: "center"
  },
  coordRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  coordChip: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing[1] },
  coordKey: { color: colors.softText, fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  coordDivider: { width: 1, height: 14, backgroundColor: colors.border },
  noCoord: { textAlign: "center" },
  manualWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: spacing[3],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
    gap: spacing[2]
  },
  manualHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1]
  },
  manualLabel: { color: colors.softText },
  manualRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    overflow: "hidden"
  },
  manualField: { flex: 1, paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  manualDivider: { width: 1, height: 36, backgroundColor: colors.border },
  fieldLabel: { color: colors.softText, fontSize: 9, fontWeight: "700", letterSpacing: 0.5, marginBottom: 2 },
  fieldInput: {
    fontSize: 13,
    color: colors.ink,
    padding: 0
  }
});
