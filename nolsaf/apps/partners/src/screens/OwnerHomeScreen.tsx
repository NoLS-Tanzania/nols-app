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
import { Bed, Bell, Building2, Calendar, CalendarCheck, ClipboardList, Gavel, Home, KeyRound, LogIn, LogOut, Plus, QrCode, UserCircle, Users, Wallet } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../auth";
import { OwnerAccountSheet } from "./OwnerAccountSheet";
import { OwnerHelpSheet } from "./OwnerHelpSheet";
import { OwnerBookingsScreen } from "./OwnerBookingsScreen";
import { OwnerBookingValidationScreen } from "./OwnerBookingValidationScreen";
import { OwnerProfileSheet } from "./OwnerProfileSheet";
import { OwnerPropertiesScreen } from "./OwnerPropertiesScreen";
import { OwnerAvailabilityScreen } from "./OwnerAvailabilityScreen";
import { OwnerGroupStaysScreen } from "./OwnerGroupStaysScreen";
import { OwnerRevenueScreen } from "./OwnerRevenueScreen";
import { OwnerSecuritySheet } from "./OwnerSecuritySheet";
import { PropertyWizardScreen } from "./property/PropertyWizardScreen";
import { apiRequest } from "@nolsaf/native-ui";
import { fetchOwnerGroupStayCounts, OwnerGroupStaySegment } from "../ownerGroupStays";
import { fetchOwnerRevenueStats, formatTzs, OwnerRevenueSegment } from "../ownerRevenue";

type HomeStats = {
  requestedCount: number;
  paidCount: number;
  rejectedCount: number;
  paidRevenue: number;
  pendingRevenue: number;
  totalRevenue: number;
  totalProperties: number;
  approvedProperties: number;
  pendingProperties: number;
  checkedIn: number;
  checkoutDue: number;
  groupStaysAssigned: number;
  groupStaysAvailable: number;
  groupStayBids: number;
};

export function OwnerHomeScreen() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<"home" | "bookings" | "calendar" | "account" | "revenue" | "groupStays">("home");
  const [homeStats, setHomeStats] = useState<HomeStats>({
    requestedCount: 0, paidCount: 0, rejectedCount: 0,
    paidRevenue: 0, pendingRevenue: 0, totalRevenue: 0,
    totalProperties: 0, approvedProperties: 0, pendingProperties: 0,
    checkedIn: 0, checkoutDue: 0,
    groupStaysAssigned: 0, groupStaysAvailable: 0, groupStayBids: 0
  });
  const [checkedInBookings, setCheckedInBookings] = useState<any[]>([]);
  const [checkoutBookings, setCheckoutBookings] = useState<any[]>([]);

  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetchOwnerRevenueStats({ token, segment: "all" }),
      fetchOwnerRevenueStats({ token, segment: "requested" }),
      fetchOwnerRevenueStats({ token, segment: "rejected" }),
      apiRequest<{ checkedIn: number; checkoutDue: number }>("/api/owner/bookings/sidebar-counts", { token }).catch(() => ({ checkedIn: 0, checkoutDue: 0 })),
      apiRequest<{ total: number; items: any[] }>("/api/owner/properties/mine?pageSize=200", { token }).catch(() => ({ total: 0, items: [] })),
      apiRequest<any[]>("/api/owner/bookings/checked-in", { token }).catch(() => []),
      apiRequest<any[]>("/api/owner/bookings/for-checkout", { token }).catch(() => []),
      fetchOwnerGroupStayCounts({ token }).catch(() => ({ assigned: 0, available: 0, myBids: 0 }))
    ]).then(([all, requested, rejected, sidebar, props, checkedIn, forCheckout, groupStays]) => {
      const propItems: any[] = Array.isArray(props?.items) ? props.items : [];
      const approvedProperties = propItems.filter((p) => String(p.status).toUpperCase() === "APPROVED").length;
      const pendingProperties = propItems.filter((p) => ["PENDING", "DRAFT", "UNDER_REVIEW"].includes(String(p.status).toUpperCase())).length;
      setHomeStats({
        requestedCount: requested.totalInvoices,
        paidCount: all.paidInvoices,
        rejectedCount: rejected.totalInvoices,
        paidRevenue: all.paidRevenue,
        pendingRevenue: all.pendingRevenue,
        totalRevenue: all.totalRevenue,
        totalProperties: Number(props?.total ?? propItems.length),
        approvedProperties,
        pendingProperties,
        checkedIn: Number(sidebar?.checkedIn ?? 0),
        checkoutDue: Number(sidebar?.checkoutDue ?? 0),
        groupStaysAssigned: groupStays.assigned,
        groupStaysAvailable: groupStays.available,
        groupStayBids: groupStays.myBids
      });
      setCheckedInBookings(Array.isArray(checkedIn) ? checkedIn : []);
      setCheckoutBookings(Array.isArray(forCheckout) ? forCheckout : []);
    }).catch(() => {});
  }, [token]);
  const [revenueSegment, setRevenueSegment] = useState<OwnerRevenueSegment>("all");
  const [groupStaySegment, setGroupStaySegment] = useState<OwnerGroupStaySegment>("assigned");
  const [validationOpen, setValidationOpen] = useState(false);
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
    if (destination === "bookings")   { setActiveTab("bookings"); return; }
    if (destination === "calendar") { setActiveTab("calendar"); return; }
    if (destination === "revenue" || destination === "payouts" || destination === "this-month") {
      setRevenueSegment("all");
      setActiveTab("revenue");
      return;
    }
    if (destination === "requested" || destination === "paid" || destination === "rejected") {
      setRevenueSegment(destination);
      setActiveTab("revenue");
      return;
    }
    if (destination === "validate-booking") { setValidationOpen(true); return; }
    if (destination === "group-stays" || destination === "group-stays-assigned") {
      setGroupStaySegment("assigned");
      setActiveTab("groupStays");
      return;
    }
    if (destination === "group-stays-bid") {
      setGroupStaySegment("available");
      setActiveTab("groupStays");
      return;
    }
    if (destination === "group-stays-my-bids") {
      setGroupStaySegment("myBids");
      setActiveTab("groupStays");
      return;
    }
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
      {validationOpen ? (
        <OwnerBookingValidationScreen
          onBack={() => setValidationOpen(false)}
          onConfirmed={() => {
            setValidationOpen(false);
            setActiveTab("bookings");
          }}
        />
      ) : activeTab === "bookings" ? (
        <OwnerBookingsScreen onOpenValidate={() => setValidationOpen(true)} />
      ) : activeTab === "revenue" ? (
        <OwnerRevenueScreen initialSegment={revenueSegment} />
      ) : activeTab === "groupStays" ? (
        <OwnerGroupStaysScreen initialSegment={groupStaySegment} />
      ) : activeTab === "calendar" ? (
        <OwnerAvailabilityScreen />
      ) : (
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
            <HeroStat label="CHECKED IN" value={String(homeStats.checkedIn)} accent={colors.accent.blueBright} footer="Active guests" />
            <HeroStat label="REVENUE" value={homeStats.totalRevenue > 0 ? (homeStats.totalRevenue / 1_000_000).toFixed(1) + "M" : "0"} prefix="TZS" accent={colors.accent.teal} />
          </View>
        </PartnerHero>

        <View style={styles.body}>
          <View style={styles.statRow}>
            <StatCard
              label="Properties"
              value={String(homeStats.totalProperties)}
              icon={<Building2 size={19} color={colors.primary} />}
              iconBg={colors.brand[50]}
              caption={`${homeStats.approvedProperties} approved, ${homeStats.pendingProperties} pending`}
              onPress={() => setPropertiesOpen(true)}
            />
            <StatCard
              label="Checkout due"
              value={String(homeStats.checkoutDue)}
              icon={<CalendarCheck size={19} color={colors.accent.blue} />}
              iconBg={colors.accent.blueSoft}
              caption="within 7 hours"
              onPress={() => open("bookings")}
            />
          </View>
          <View style={styles.statRow}>
            <StatCard
              label="Pending payout"
              value={formatTzs(homeStats.pendingRevenue).replace(/^TZS\s?/i, "")}
              icon={<Wallet size={19} color={colors.accent.amberDark} />}
              iconBg={colors.accent.amberSoft}
              caption={`${homeStats.requestedCount} invoice${homeStats.requestedCount !== 1 ? "s" : ""} requested`}
              onPress={() => open("payouts")}
            />
            <StatCard
              label="Checked in"
              value={String(homeStats.checkedIn)}
              icon={<CalendarCheck size={19} color={colors.primary} />}
              iconBg={colors.brand[50]}
              caption="active guests"
              onPress={() => open("bookings")}
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
              <SnapshotTile label="Requested" value={String(homeStats.requestedCount)} tone="amber" onPress={() => open("requested")} />
            </View>
            <View style={styles.snapshotSlide}>
              <SnapshotTile label="Paid" value={String(homeStats.paidCount)} tone="green" onPress={() => open("paid")} />
            </View>
            <View style={styles.snapshotSlide}>
              <SnapshotTile label="Rejected" value={String(homeStats.rejectedCount)} tone="red" onPress={() => open("rejected")} />
            </View>
            <View style={styles.snapshotSlide}>
              <SnapshotTile label="Total paid" value={formatTzs(homeStats.paidRevenue).replace(/^TZS\s?/i, "TSh ")} tone="neutral" onPress={() => open("paid")} />
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
              <StatusBadge status="approved" label={String(homeStats.checkedIn)} />
            </View>
            {checkedInBookings.length === 0 ? (
              <AppText variant="caption" tone="muted">No active check-ins right now.</AppText>
            ) : checkedInBookings.slice(0, 2).map((b) => (
              <View key={b.id} style={styles.listRow}>
                <View style={[styles.thumb, { backgroundColor: colors.accent.blueSoft }]}>
                  <KeyRound size={18} color={colors.accent.blue} />
                </View>
                <View style={styles.listText}>
                  <AppText variant="bodySmall" weight="semiBold" numberOfLines={1}>
                    {b.property?.title ?? "Property"}{b.roomType ? `, ${b.roomType}` : ""}
                  </AppText>
                  <AppText variant="caption" tone="muted" numberOfLines={1}>
                    {b.guestName ?? "Guest"}{b.codeVisible ? ` · ${b.codeVisible}` : ""}
                  </AppText>
                </View>
                <StatusBadge status="approved" label="in" />
              </View>
            ))}
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
              <StatusBadge status="awaiting" label={String(homeStats.checkoutDue)} />
            </View>
            {checkoutBookings.length === 0 ? (
              <AppText variant="caption" tone="muted">No checkouts due in the next 7 hours.</AppText>
            ) : checkoutBookings.slice(0, 2).map((b) => (
              <View key={b.id} style={styles.listRow}>
                <View style={[styles.thumb, { backgroundColor: colors.brand[50] }]}>
                  <Bed size={18} color={colors.primary} />
                </View>
                <View style={styles.listText}>
                  <AppText variant="bodySmall" weight="semiBold" numberOfLines={1}>
                    {b.property?.title ?? "Property"}
                  </AppText>
                  <AppText variant="caption" tone="muted" numberOfLines={1}>
                    {b.guestName ?? "Guest"}{b.codeVisible ? ` · ${b.codeVisible}` : ""} · departs {new Date(b.checkOut).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </AppText>
                </View>
                <StatusBadge status="awaiting" label="due" />
              </View>
            ))}
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
                <AppText variant="titleSm" weight="semiBold" numberOfLines={1}>{homeStats.groupStaysAssigned}</AppText>
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
                <AppText variant="titleSm" weight="semiBold" numberOfLines={1}>{homeStats.groupStaysAvailable}</AppText>
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
                <AppText variant="titleSm" weight="semiBold" numberOfLines={1}>{homeStats.groupStayBids}</AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
      )}

      <AppBottomNav
        activeKey={activeTab}
        items={[
          { key: "home", label: "Home", icon: (c) => <Home size={22} color={c} />, onPress: () => setActiveTab("home") },
          { key: "bookings", label: "Bookings", icon: (c) => <ClipboardList size={22} color={c} />, onPress: () => setActiveTab("bookings") },
          { key: "calendar", label: "Calendar", icon: (c) => <Calendar size={22} color={c} />, onPress: () => setActiveTab("calendar") },
          { key: "account", label: "Account", icon: (c) => <UserCircle size={22} color={c} />, onPress: () => { setActiveTab("account"); setAccountOpen(true); } }
        ]}
        centerAction={{
          accessibilityLabel: "Scan guest QR",
          icon: (c) => <QrCode size={26} color={c} />,
          onPress: () => setValidationOpen(true)
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
