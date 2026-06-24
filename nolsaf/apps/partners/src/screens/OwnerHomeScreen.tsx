import {
  AppText,
  DeltaBadge,
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
import { Bed, Building2, CalendarCheck, ChartPie, LogOut, Wallet } from "lucide-react-native";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../auth";

// The Owner home, composed entirely from the @nolsaf/native-ui dashboard kit.
// The numbers below are sample placeholders; the next increment wires them to
// /api/owner/properties/mine, /api/owner/revenue/stats, /api/owner/reports/* and
// /api/owner/bookings/* (see the API readiness checklist in the plan). The shell
// and composition are final.
export function OwnerHomeScreen() {
  const { signOut } = useAuth();

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <PartnerHero
          eyebrow="OWNER PORTAL"
          title="Your workspace"
          subtitle="Bookings, revenue and live insights."
          live
          align="center"
          headerRight={<LogOut size={20} color="#cdeee2" onPress={() => void signOut()} />}
        >
          <View style={styles.heroRow}>
            <HeroStat label="BOOKINGS" value="2" accent="#85B7EB" footer="Last 14 days" />
            <HeroStat label="REVENUE" value="9,450,000" prefix="TZS" accent="#5DCAA5" />
          </View>
        </PartnerHero>

        <View style={styles.body}>
          <View style={styles.statRow}>
            <StatCard
              label="Properties"
              value="12"
              icon={<Building2 size={19} color={colors.primary} />}
              iconBg={colors.brand[50]}
              caption="9 approved, 3 pending"
              delta={{ direction: "up", label: 2 }}
            />
            <StatCard
              label="Occupancy"
              value="78%"
              icon={<ChartPie size={19} color="#185FA5" />}
              iconBg="#E6F1FB"
              caption="this week"
              delta={{ direction: "up", label: "4%" }}
            />
          </View>
          <View style={styles.statRow}>
            <StatCard
              label="Pending payout"
              value="1.2M"
              icon={<Wallet size={19} color="#854F0B" />}
              iconBg="#FAEEDA"
              caption="2 invoices requested"
            />
            <StatCard
              label="Check outs due"
              value="3"
              icon={<CalendarCheck size={19} color={colors.primary} />}
              iconBg={colors.brand[50]}
              caption="today"
            />
          </View>

          <MiniTrendChart
            title="Net revenue, 14 days"
            meta="+18%"
            series={[{ values: [3, 3.4, 4.1, 5, 4.6, 6.2, 6, 7.8], color: "#2dd4bf" }]}
            legend={[{ label: "Net revenue", color: "#2dd4bf" }]}
          />

          <View style={styles.snapshotGrid}>
            <SnapshotTile label="Requested" value="3" tone="amber" />
            <SnapshotTile label="Paid" value="14" tone="green" />
            <SnapshotTile label="Rejected" value="1" tone="red" />
            <SnapshotTile label="This month" value="4.2M" tone="neutral" />
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <AppText variant="bodySmall" weight="semiBold">
                Ready for check out
              </AppText>
              <StatusBadge status="awaiting" label="3" />
            </View>
            <View style={styles.listRow}>
              <View style={[styles.thumb, { backgroundColor: colors.brand[50] }]}>
                <Bed size={18} color={colors.primary} />
              </View>
              <View style={styles.listText}>
                <AppText variant="bodySmall" weight="semiBold" numberOfLines={1}>
                  Amani Beach Villa, Rm 4
                </AppText>
                <AppText variant="caption" tone="muted" numberOfLines={1}>
                  Grace M. , NLS-7F2K
                </AppText>
              </View>
              <StatusBadge status="verified" />
            </View>
          </View>
        </View>
      </ScrollView>

      <AppBottomNav
        activeKey="home"
        items={[
          { key: "home", label: "Home", icon: () => null, onPress: () => undefined },
          { key: "properties", label: "Properties", icon: () => null, onPress: () => undefined },
          { key: "bookings", label: "Bookings", icon: () => null, onPress: () => undefined },
          { key: "money", label: "Money", icon: () => null, onPress: () => undefined },
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
  listText: { flex: 1, minWidth: 0 }
});
