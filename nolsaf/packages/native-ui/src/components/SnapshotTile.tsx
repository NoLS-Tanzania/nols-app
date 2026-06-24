import { StyleSheet, View } from "react-native";

import { colors, radius, spacing } from "../theme";
import { AppText } from "./AppText";

type SnapshotTone = "amber" | "green" | "red" | "brand" | "neutral";

const tones: Record<SnapshotTone, { bg: string; border: string; text: string }> = {
  amber: { bg: "#faeeda", border: "#fac775", text: "#854f0b" },
  green: { bg: "#eaf3de", border: "#c0dd97", text: "#27500a" },
  red: { bg: "#fcebeb", border: "#f7c1c1", text: "#791f1f" },
  brand: { bg: colors.brand[50], border: colors.brand[100], text: colors.primary },
  neutral: { bg: colors.surface, border: colors.border, text: colors.mutedText }
};

export type SnapshotTileProps = {
  label: string;
  value: string | number;
  tone?: SnapshotTone;
};

// A compact, color coded snapshot tile (Requested, Paid, Awaiting action, and so
// on). Used in 2x2 grids under the trend chart on both Owner and Operator homes.
export function SnapshotTile({ label, value, tone = "neutral" }: SnapshotTileProps) {
  const t = tones[tone];

  return (
    <View style={[styles.tile, { backgroundColor: t.bg, borderColor: t.border }]}>
      <AppText variant="caption" numberOfLines={1} style={{ color: t.text }}>
        {label}
      </AppText>
      <AppText variant="titleSm" weight="semiBold" numberOfLines={1} style={{ color: t.text, marginTop: 2 }}>
        {String(value)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 0,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing[2]
  }
});
