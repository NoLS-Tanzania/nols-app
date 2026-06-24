import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { colors, radius, shadows, spacing } from "../theme";
import { AppText } from "./AppText";
import { DeltaBadge, DeltaBadgeProps } from "./DeltaBadge";
import { Sparkline } from "./Sparkline";

export type StatCardProps = {
  label: string;
  value: string | number;
  icon?: ReactNode;
  iconBg?: string;
  caption?: string;
  delta?: DeltaBadgeProps;
  spark?: { values: number[]; color?: string };
};

// The white stat card shared by the Owner and Operator home screens: a tinted
// icon, label, large value, an optional trend delta pill, and an optional
// caption or sparkline. Server authoritative; it only renders the values it is
// given and never computes them. Follows the Overflow Prevention Policy
// (numberOfLines + minWidth 0 + flexShrink) from NATIVE_APP_SETUP.md.
export function StatCard({ label, value, icon, iconBg, caption, delta, spark }: StatCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.left}>
          {icon ? <View style={[styles.iconWrap, iconBg ? { backgroundColor: iconBg } : null]}>{icon}</View> : null}
          <View style={styles.labelCol}>
            <AppText variant="caption" tone="muted" numberOfLines={1}>
              {label}
            </AppText>
            <AppText variant="title" weight="semiBold" numberOfLines={1}>
              {String(value)}
            </AppText>
          </View>
        </View>
        {delta ? <DeltaBadge {...delta} /> : null}
      </View>

      {caption ? (
        <AppText variant="caption" tone="muted" numberOfLines={1} style={{ marginTop: spacing[2] }}>
          {caption}
        </AppText>
      ) : null}

      {spark ? (
        <View style={{ marginTop: spacing[3] }}>
          <Sparkline values={spark.values} color={spark.color} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 0,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing[3],
    ...shadows.card
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing[2]
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    minWidth: 0,
    flexShrink: 1
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand[50]
  },
  labelCol: {
    minWidth: 0,
    flexShrink: 1
  }
});
