import { AmountText, AppCard, AppText, colors, radius, spacing } from "@nolsaf/native-ui";
import { ChevronRight } from "lucide-react-native";
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
        <View style={styles.topRowEnd}>
          {when ? (
            <AppText variant="caption" tone="muted">
              {when}
            </AppText>
          ) : null}
          {onPress ? <ChevronRight color={colors.softText} size={18} /> : null}
        </View>
      </View>

      <View style={styles.routeBlock}>
        <View style={styles.routeLineColumn}>
          <View style={[styles.dot, { backgroundColor: colors.primary }]} />
          <View style={styles.routeLine} />
          <View style={[styles.dot, { backgroundColor: colors.danger }]} />
        </View>
        <View style={styles.routeTextColumn}>
          <AppText variant="bodySmall" weight="bold" numberOfLines={1}>
            {pickup || "Pickup location"}
          </AppText>
          <AppText variant="bodySmall" weight="bold" numberOfLines={1}>
            {dropoff || "Dropoff location"}
          </AppText>
        </View>
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
    gap: spacing[3]
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
  topRowEnd: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1]
  },
  routeBlock: {
    flexDirection: "row",
    gap: spacing[3],
    minWidth: 0
  },
  routeLineColumn: {
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 4
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.full
  },
  routeLine: {
    width: 2,
    flex: 1,
    minHeight: 14,
    marginVertical: 2,
    backgroundColor: colors.border
  },
  routeTextColumn: {
    flex: 1,
    minWidth: 0,
    justifyContent: "space-between",
    gap: spacing[3]
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minWidth: 0
  }
});
