import { AmountText, AppCard, AppText, colors, spacing } from "@nolsaf/native-ui";
import { ArrowRight, MapPin } from "lucide-react-native";
import { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { TripStatus } from "../driver/types";
import { TripStatusBadge } from "./TripStatusBadge";

type TripCardProps = {
  status?: TripStatus;
  pickup: string | null;
  dropoff: string | null;
  when: string | null;
  tripCode?: string | null;
  amount?: number | null;
  currency?: string | null;
  onPress?: () => void;
  rightSlot?: ReactNode;
  footer?: ReactNode;
};

export function formatTripWhen(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function TripCard({ status, pickup, dropoff, when, tripCode, amount, currency, onPress, rightSlot, footer }: TripCardProps) {
  const content = (
    <AppCard style={styles.card}>
      <View style={styles.topRow}>
        {status ? <TripStatusBadge status={status} /> : <View />}
        {when ? (
          <AppText variant="caption" tone="muted">
            {when}
          </AppText>
        ) : null}
      </View>

      <View style={styles.routeRow}>
        <MapPin color={colors.primary} size={16} />
        <AppText variant="bodySmall" weight="medium" numberOfLines={1} style={styles.routeText}>
          {pickup || "Pickup location"}
        </AppText>
      </View>
      <View style={styles.routeRow}>
        <ArrowRight color={colors.mutedText} size={16} />
        <AppText variant="bodySmall" weight="medium" numberOfLines={1} style={styles.routeText}>
          {dropoff || "Dropoff location"}
        </AppText>
      </View>

      <View style={styles.bottomRow}>
        {tripCode ? (
          <AppText variant="caption" tone="soft">
            {tripCode}
          </AppText>
        ) : (
          <View />
        )}
        {amount != null ? <AmountText amount={amount} currency={currency || "TZS"} variant="bodySmall" weight="bold" /> : null}
      </View>

      {rightSlot}
      {footer}
    </AppCard>
  );

  if (!onPress) return content;

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [pressed && styles.pressed]}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing[2]
  },
  pressed: {
    opacity: 0.85
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minWidth: 0
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    minWidth: 0
  },
  routeText: {
    flex: 1,
    minWidth: 0
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minWidth: 0
  }
});
