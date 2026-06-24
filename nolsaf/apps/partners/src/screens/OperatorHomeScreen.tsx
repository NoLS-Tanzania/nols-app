import {
  AppText,
  HeroStat,
  MiniTrendChart,
  PartnerHero,
  SnapshotTile,
  StatCard,
  StatusBadge,
  AppBottomNav,
  colors,
  radius,
  spacing
} from "@nolsaf/native-ui";
import { CircleCheck, ClipboardList, Clock, LogOut, Route, Star } from "lucide-react-native";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../auth";

// The Operator (agent) home, composed from the @nolsaf/native-ui dashboard kit.
// Sample values for now; the next increment wires them to /api/agent/me and
// /api/agent/tour-bookings (see the API readiness checklist in the plan).
export function OperatorHomeScreen() {
  const { signOut } = useAuth();

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <PartnerHero
          eyebrow="OPERATOR PORTAL"
          title="Dashboard"
          subtitle="Track your assignments, status and daily workload."
          align="left"
          headerRight={<LogOut size={20} color="#cdeee2" onPress={() => void signOut()} />}
        >
          <View style={styles.heroRow}>
            <HeroStat label="ASSIGNED" value="8" accent="#85B7EB" footer="active now" />
            <HeroStat label="RATING" value="4.8" prefix="Level GOLD" accent="#EF9F27" />
          </View>
        </PartnerHero>

        <View style={styles.body}>
          <View style={styles.statRow}>
            <StatCard
              label="Total"
              value="10"
              icon={<ClipboardList size={19} color={colors.primary} />}
              iconBg={colors.brand[50]}
              delta={{ direction: "up", label: 3 }}
            />
            <StatCard
              label="Completed"
              value="2"
              icon={<CircleCheck size={19} color="#3B6D11" />}
              iconBg="#EAF3DE"
              delta={{ direction: "down", label: 1 }}
            />
            <StatCard
              label="Active"
              value="8"
              icon={<Clock size={19} color="#185FA5" />}
              iconBg="#E6F1FB"
              delta={{ direction: "steady", label: "0" }}
            />
          </View>

          <MiniTrendChart
            title="Bookings, 14 days"
            meta="70% success"
            series={[
              { values: [4, 5, 4.5, 7, 6, 8, 7, 9], color: "#2dd4bf" },
              { values: [2, 2.5, 3, 4, 3.6, 5, 4.5, 6], color: "#22c55e" },
              { values: [3, 2.6, 4, 3.5, 4.4, 3.8, 4.8, 4.2], color: "#60a5fa", dashed: true }
            ]}
            legend={[
              { label: "Total", color: "#2dd4bf" },
              { label: "Done", color: "#22c55e" },
              { label: "Active", color: "#60a5fa" }
            ]}
          />

          <View style={styles.snapshotGrid}>
            <SnapshotTile label="Awaiting" value="3" tone="amber" />
            <SnapshotTile label="In progress" value="8" tone="brand" />
            <SnapshotTile label="Completed" value="2" tone="green" />
            <SnapshotTile label="Completion" value="20%" tone="neutral" />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <AppText variant="bodySmall" weight="semiBold">
                My tour bookings
              </AppText>
              <AppText variant="caption" tone="primary">
                View all
              </AppText>
            </View>
            <View style={styles.listRow}>
              <View style={[styles.thumb, { backgroundColor: "#E6F1FB" }]}>
                <Route size={18} color="#185FA5" />
              </View>
              <View style={styles.listText}>
                <AppText variant="bodySmall" weight="semiBold" numberOfLines={1}>
                  3 day Serengeti safari
                </AppText>
                <AppText variant="caption" tone="muted" numberOfLines={1}>
                  J. Okello , pickup 07:30
                </AppText>
              </View>
              <StatusBadge status="approved" label="active" />
            </View>
            <View style={styles.listRow}>
              <View style={[styles.thumb, { backgroundColor: colors.brand[50] }]}>
                <Route size={18} color={colors.primary} />
              </View>
              <View style={styles.listText}>
                <AppText variant="bodySmall" weight="semiBold" numberOfLines={1}>
                  Ngorongoro day trip
                </AppText>
                <AppText variant="caption" tone="muted" numberOfLines={1}>
                  L. Mushi , rated 5.0
                </AppText>
              </View>
              <StatusBadge status="completed" label="done" />
            </View>
          </View>

          <View style={styles.statRow}>
            <View style={styles.perfTile}>
              <AppText variant="caption" tone="muted">
                Level
              </AppText>
              <View style={styles.perfValueRow}>
                <Star size={16} color="#BA7517" />
                <AppText variant="titleSm" weight="semiBold">
                  GOLD
                </AppText>
              </View>
              <AppText variant="caption" tone="muted">
                2 tours to PLATINUM
              </AppText>
            </View>
            <View style={styles.perfTile}>
              <AppText variant="caption" tone="muted">
                Rating
              </AppText>
              <View style={styles.perfValueRow}>
                <Star size={16} color="#BA7517" />
                <AppText variant="titleSm" weight="semiBold">
                  4.8 / 5
                </AppText>
              </View>
              <AppText variant="caption" tone="muted">
                126 reviews
              </AppText>
            </View>
          </View>
        </View>
      </ScrollView>

      <AppBottomNav
        activeKey="home"
        items={[
          { key: "home", label: "Home", icon: () => null, onPress: () => undefined },
          { key: "tours", label: "Tours", icon: () => null, onPress: () => undefined },
          { key: "revenue", label: "Revenue", icon: () => null, onPress: () => undefined },
          { key: "account", label: "Account", icon: () => null, onPress: () => undefined }
        ]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { paddingBottom: spacing[4] },
  heroRow: { flexDirection: "row", gap: spacing[3], width: "100%" },
  body: { padding: spacing[3], gap: spacing[3] },
  statRow: { flexDirection: "row", gap: spacing[2] },
  snapshotGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  section: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing[3],
    gap: spacing[3]
  },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  listRow: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  thumb: { width: 34, height: 34, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  listText: { flex: 1, minWidth: 0 },
  perfTile: {
    flex: 1,
    minWidth: 0,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing[3],
    gap: 2
  },
  perfValueRow: { flexDirection: "row", alignItems: "center", gap: spacing[2], marginVertical: 2 }
});
