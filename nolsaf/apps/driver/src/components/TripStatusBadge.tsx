import { AppText, colors, radius, spacing } from "@nolsaf/native-ui";
import { StyleSheet, View } from "react-native";

import { TripStatus } from "../driver/types";

type TripStatusBadgeProps = {
  status: TripStatus;
};

const STATUS_LABEL: Record<TripStatus, string> = {
  PENDING: "Awaiting confirmation",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELED: "Cancelled"
};

const STATUS_TONE: Record<TripStatus, { bg: string; text: string }> = {
  PENDING: { bg: "#fef3c7", text: "#b45309" },
  CONFIRMED: { bg: colors.brand[50], text: colors.primary },
  IN_PROGRESS: { bg: "#eaf5ff", text: "#0369a1" },
  COMPLETED: { bg: colors.brand[50], text: colors.success },
  CANCELED: { bg: "#fee2e2", text: colors.danger }
};

export function TripStatusBadge({ status }: TripStatusBadgeProps) {
  const tone = STATUS_TONE[status];

  return (
    <View style={[styles.base, { backgroundColor: tone.bg }]}>
      <AppText variant="caption" weight="bold" style={{ color: tone.text, textTransform: "uppercase" }}>
        {STATUS_LABEL[status]}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: "flex-start",
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1]
  }
});
