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
import { Bed, Bell, Building2, Calendar, CalendarCheck, ChartPie, ClipboardList, Gavel, Home, KeyRound, LogIn, LogOut, Plus, QrCode, UserCircle, Users, Wallet } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { OwnerAccountSheet } from "./OwnerAccountSheet";
import { OwnerHelpSheet } from "./OwnerHelpSheet";
import { OwnerProfileSheet } from "./OwnerProfileSheet";
import { OwnerPropertiesScreen } from "./OwnerPropertiesScreen";
import { OwnerSecuritySheet } from "./OwnerSecuritySheet";
import { PropertyWizardScreen } from "./property/PropertyWizardScreen";

// The Owner home, composed entirely from the @nolsaf/native-ui dashboard kit.
// The numbers below are sample placeholders; the next increment wires them to
// /api/owner/properties/mine, /api/owner/revenue/stats, /api/owner/reports/* and
// /api/owner/bookings/* (see the API readiness checklist in the plan). The shell
// and composition are final.
export function OwnerHomeScreen() {
  const [accountOpen, setAccountOpen] = useState(false);
  const [securityOpen, setSecurityOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingPropertyId, setEditingPropertyId] = useState<number | undefined>(undefined);

  const open = (destination: string) => {
    if (destination === "security")   { setSecurityOpen(true);   return; }
    if (destination === "profile")    { setProfileOpen(true);    return; }
    if (destination === "help")       { setHelpOpen(true);       return; }
    if (destination === "properties") { setPropertiesOpen(true); return; }
    if (destination === "add-property") {
      setEditingPropertyId(undefined);
      setWizardOpen(true);
      return;
    }
    void destination;
  };

  const openAddProperty = () => { setEditingPropertyId(undefined); setWizardOpen(true); };
  const openEditProperty = (id: number) => { setEditingPropertyId(id); setWizardOpen(true); };

  return (
    <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <PartnerHero
          eyebrow="OWNER PORTAL"
          title="Your workspace"
          subtitle="Bookings, revenue and live insights."
          live
          align="center"
          headerRight={
            <View style={styles.heroActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Notifications"
                onPress={() => open("notifications")}
                style={({ pressed }) => [styles.heroBtn, pressed && styles.heroBtnPressed]}
              >
                <Bell size={19} color={colors.onHeroSoft} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add property"
                onPress={() => open("add-property")}
                style={({ pressed }) => [styles.heroBtn, styles.heroBtnAdd, pressed && styles.heroBtnPressed]}
              >
                <Plus size={19} color={colors.white} />
              </Pressable>
            </View>
          }
        >
          <View style={styles.heroRow}>
            <HeroStat label="BOOKINGS" value="2" accent={colors.accent.blueBright} footer="Last 14 days" />
            <HeroStat label="REVENUE" value="9,450,000" prefix="TZS" accent={colors.accent.teal} />
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
              onPress={() => setPropertiesOpen(true)}
            />
            <StatCard
              label="Occupancy"
              value="78%"
              icon={<ChartPie size={19} color={colors.accent.blue} />}
              iconBg={colors.accent.blueSoft}
              caption="this week"
              delta={{ direction: "up", label: "4%" }}
              onPress={() => open("occupancy")}
            />
          </View>
          <View style={styles.statRow}>
            <StatCard
              label="Pending payout"
              value="1.2M"
              icon={<Wallet size={19} color={colors.accent.amberDark} />}
              iconBg={colors.accent.amberSoft}
              caption="2 invoices requested"
              onPress={() => open("payouts")}
            />
            <StatCard
              label="Check outs due"
              value="3"
              icon={<CalendarCheck size={19} color={colors.primary} />}
              iconBg={colors.brand[50]}
              caption="today"
              onPress={() => open("checkouts")}
            />
          </View>

          <MiniTrendChart
            title="Net revenue, 14 days"
            meta="+18%"
            series={[{ values: [3, 3.4, 4.1, 5, 4.6, 6.2, 6, 7.8], color: colors.chart.total }]}
            legend={[{ label: "Net revenue", color: colors.chart.total }]}
          />

          <ScrollView
            horizontal
            nestedScrollEnabled
            directionalLockEnabled
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.snapshotSlider}
          >
            <View style={styles.snapshotSlide}>
              <SnapshotTile label="Requested" value="3" tone="amber" onPress={() => open("requested")} />
            </View>
            <View style={styles.snapshotSlide}>
              <SnapshotTile label="Paid" value="14" tone="green" onPress={() => open("paid")} />
            </View>
            <View style={styles.snapshotSlide}>
              <SnapshotTile label="Rejected" value="1" tone="red" onPress={() => open("rejected")} />
            </View>
            <View style={styles.snapshotSlide}>
              <SnapshotTile label="This month" value="4.2M" tone="neutral" onPress={() => open("this-month")} />
            </View>
            <View style={styles.snapshotSlide}>
              <SnapshotTile label="Reports" value="View" tone="brand" onPress={() => open("reports")} />
            </View>
          </ScrollView>

          {/* ── Today's activity label ── */}
          <View style={styles.groupLabel}>
            <View style={styles.groupLabelLine} />
            <AppText variant="caption" style={styles.groupLabelText}>TODAY'S ACTIVITY</AppText>
            <View style={styles.groupLabelLine} />
          </View>

          {/* Check-in card */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionHeadLeft}>
                <View style={[styles.sectionIcon, { backgroundColor: colors.accent.blueSoft }]}>
                  <LogIn size={15} color={colors.accent.blue} />
                </View>
                <AppText variant="bodySmall" weight="semiBold">Ready to check in</AppText>
              </View>
              <StatusBadge status="approved" label="2" />
            </View>
            <View style={styles.listRow}>
              <View style={[styles.thumb, { backgroundColor: colors.accent.blueSoft }]}>
                <KeyRound size={18} color={colors.accent.blue} />
              </View>
              <View style={styles.listText}>
                <AppText variant="bodySmall" weight="semiBold" numberOfLines={1}>
                  Serengeti View Lodge, Rm 2
                </AppText>
                <AppText variant="caption" tone="muted" numberOfLines={1}>
                  T. Mwangi , NLS-3A9X · arrives today
                </AppText>
              </View>
              <StatusBadge status="approved" label="due" />
            </View>
          </View>

          {/* Check-out card */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionHeadLeft}>
                <View style={[styles.sectionIcon, { backgroundColor: colors.brand[50] }]}>
                  <LogOut size={15} color={colors.primary} />
                </View>
                <AppText variant="bodySmall" weight="semiBold">Ready for check out</AppText>
              </View>
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
                  Grace M. , NLS-7F2K · departs today
                </AppText>
              </View>
              <StatusBadge status="verified" />
            </View>
          </View>

          {/* ── Group stays label ── */}
          <View style={styles.groupLabel}>
            <View style={styles.groupLabelLine} />
            <AppText variant="caption" style={styles.groupLabelText}>GROUP STAYS</AppText>
            <View style={styles.groupLabelLine} />
          </View>

          {/* Group Stays */}
          <View style={styles.section}>
            <View style={styles.sectionHead}>
              <View style={styles.sectionHeadLeft}>
                <View style={styles.sectionIcon}>
                  <Users size={15} color={colors.primary} />
                </View>
                <AppText variant="bodySmall" weight="semiBold">Group Stays</AppText>
              </View>
              <Pressable onPress={() => open("group-stays")} accessibilityRole="button">
                <AppText variant="caption" tone="primary">View all</AppText>
              </Pressable>
            </View>

            <View style={styles.groupRow}>
              <Pressable
                style={({ pressed }) => [styles.groupCard, pressed && styles.groupCardPressed]}
                onPress={() => open("group-stays-assigned")}
                accessibilityRole="button"
              >
                <View style={[styles.groupCardIcon, { backgroundColor: colors.brand[50] }]}>
                  <Users size={16} color={colors.primary} />
                </View>
                <AppText variant="caption" tone="muted" numberOfLines={1}>Assigned to Me</AppText>
                <AppText variant="titleSm" weight="semiBold" numberOfLines={1}>4</AppText>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.groupCard, pressed && styles.groupCardPressed]}
                onPress={() => open("group-stays-bid")}
                accessibilityRole="button"
              >
                <View style={[styles.groupCardIcon, { backgroundColor: colors.accent.amberSoft }]}>
                  <Gavel size={16} color={colors.accent.amberDark} />
                </View>
                <AppText variant="caption" tone="muted" numberOfLines={1}>Available to Bid</AppText>
                <AppText variant="titleSm" weight="semiBold" numberOfLines={1}>7</AppText>
              </Pressable>

              <Pressable
                style={({ pressed }) => [styles.groupCard, pressed && styles.groupCardPressed]}
                onPress={() => open("group-stays-my-bids")}
                accessibilityRole="button"
              >
                <View style={[styles.groupCardIcon, { backgroundColor: colors.accent.blueSoft }]}>
                  <ClipboardList size={16} color={colors.accent.blue} />
                </View>
                <AppText variant="caption" tone="muted" numberOfLines={1}>My Bids</AppText>
                <AppText variant="titleSm" weight="semiBold" numberOfLines={1}>2</AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      <AppBottomNav
        activeKey="home"
        items={[
          { key: "home", label: "Home", icon: (c) => <Home size={22} color={c} />, onPress: () => undefined },
          { key: "bookings", label: "Bookings", icon: (c) => <ClipboardList size={22} color={c} />, onPress: () => undefined },
          { key: "calendar", label: "Calendar", icon: (c) => <Calendar size={22} color={c} />, onPress: () => undefined },
          { key: "account", label: "Account", icon: (c) => <UserCircle size={22} color={c} />, onPress: () => setAccountOpen(true) }
        ]}
        centerAction={{
          accessibilityLabel: "Scan guest QR",
          icon: (c) => <QrCode size={26} color={c} />,
          onPress: () => undefined
        }}
      />
      <OwnerAccountSheet
        visible={accountOpen}
        onClose={() => setAccountOpen(false)}
        onNavigate={open}
      />
      <OwnerSecuritySheet
        visible={securityOpen}
        onClose={() => setSecurityOpen(false)}
      />
      <OwnerProfileSheet
        visible={profileOpen}
        onClose={() => setProfileOpen(false)}
      />
      <OwnerHelpSheet
        visible={helpOpen}
        onClose={() => setHelpOpen(false)}
      />
      <OwnerPropertiesScreen
        visible={propertiesOpen}
        onClose={() => setPropertiesOpen(false)}
        onAddProperty={openAddProperty}
        onEditProperty={openEditProperty}
      />
      <PropertyWizardScreen
        visible={wizardOpen}
        onClose={() => setWizardOpen(false)}
        propertyId={editingPropertyId}
        onSuccess={() => setPropertiesOpen(true)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing[3], paddingBottom: spacing[4], gap: spacing[3] },
  heroRow: { flexDirection: "row", gap: spacing[3], width: "100%" },
  heroActions: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  heroBtn: {
    width: 34,
    height: 34,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)"
  },
  heroBtnAdd: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark
  },
  heroBtnPressed: { opacity: 0.75 },
  body: { gap: spacing[3] },
  statRow: { flexDirection: "row", gap: spacing[2] },
  snapshotSlider: { gap: spacing[2], paddingRight: spacing[3] },
  snapshotSlide: { width: 130, flexGrow: 0, flexShrink: 0 },
  section: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing[3],
    gap: spacing[3]
  },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionHeadLeft: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  sectionDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing[2] },
  groupLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2]
  },
  groupLabelLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border
  },
  groupLabelText: {
    color: colors.softText,
    letterSpacing: 1.2,
    fontSize: 10
  },
  sectionIcon: {
    width: 26,
    height: 26,
    borderRadius: radius.sm,
    backgroundColor: colors.brand[50],
    alignItems: "center",
    justifyContent: "center"
  },
  groupRow: { flexDirection: "row", gap: spacing[2] },
  groupCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing[3],
    gap: spacing[2]
  },
  groupCardPressed: { opacity: 0.8, transform: [{ scale: 0.97 }] },
  groupCardIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center"
  },
  listRow: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  thumb: { width: 34, height: 34, borderRadius: radius.sm, alignItems: "center", justifyContent: "center" },
  listText: { flex: 1, minWidth: 0 }
});
