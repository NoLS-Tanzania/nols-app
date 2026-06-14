import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AmountText,
  AppCard,
  AppStack,
  AppText,
  colors,
  radius,
  ResponsiveRow,
  SafeScreen,
  shadows,
  spacing,
  StateView
} from "@nolsaf/native-ui";
import { AlertTriangle, Bell, Info, Star, Sparkles, TrendingUp } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { useAuth } from "../auth/AuthProvider";
import { AvailabilitySwitch } from "../components/AvailabilitySwitch";
import { DriverBottomNav } from "../components/DriverBottomNav";
import { fetchAvailability, fetchDashboard, fetchNotifications, setAvailability } from "../driver/driverApi";
import { DashboardResponse } from "../driver/types";
import { useDriverSocket } from "../hooks/useDriverSocket";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export function DashboardScreen({ navigation }: Props) {
  const { user, token } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [available, setAvailableState] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        setError("Please sign in to view your dashboard.");
        setLoading(false);
        return;
      }
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const [dashboardData, availabilityData, notificationsData] = await Promise.all([
          fetchDashboard(token),
          fetchAvailability(token),
          fetchNotifications(token, "unread")
        ]);
        setDashboard(dashboardData);
        setAvailableState(availabilityData.available);
        setUnreadCount(notificationsData.totalUnread ?? 0);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load your dashboard.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    void load();
  }, [load]);

  useDriverSocket({
    "driver:availability:update": () => {
      if (!token) return;
      fetchAvailability(token)
        .then((res) => setAvailableState(res.available))
        .catch(() => {});
    }
  });

  async function toggleAvailability(next: boolean) {
    if (!token) return;
    setAvailabilityLoading(true);
    setAvailableState(next);
    try {
      const result = await setAvailability(token, next);
      setAvailableState(result.available);
    } catch {
      setAvailableState(!next);
    } finally {
      setAvailabilityLoading(false);
    }
  }

  const name = user?.fullName || user?.name || "Driver";
  const firstName = name.split(" ")[0];

  return (
    <View style={styles.root}>
      <SafeScreen scroll={false} contentStyle={styles.content}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} tintColor={colors.primary} colors={[colors.primary]} />}
        >
          <View style={styles.header}>
            <AppStack gap={1} style={styles.headerText}>
              <AppText variant="bodySmall" tone="muted">
                Good to see you,
              </AppText>
              <AppText variant="headline" weight="extraBold" numberOfLines={1}>
                {firstName}
              </AppText>
            </AppStack>
            <Pressable accessibilityRole="button" onPress={() => navigation.navigate("Notifications")} style={styles.bellButton}>
              <Bell color={colors.ink} size={20} />
              {unreadCount > 0 ? (
                <View style={styles.badge}>
                  <AppText variant="caption" weight="bold" tone="inverse" style={styles.badgeText}>
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </AppText>
                </View>
              ) : null}
            </Pressable>
          </View>

          <AvailabilitySwitch available={available} loading={availabilityLoading} onToggle={toggleAvailability} />

          {loading ? (
            <View style={styles.stateWrap}>
              <StateView title="Loading your dashboard" message="Fetching today's stats and trips." />
            </View>
          ) : error ? (
            <View style={styles.stateWrap}>
              <StateView title="Could not load dashboard" message={error} actionLabel="Try again" onAction={() => load()} />
            </View>
          ) : dashboard ? (
            <AppStack gap={4}>
              <ResponsiveRow gap={3}>
                <AppCard style={styles.statCard}>
                  <AppStack gap={1}>
                    <AppText variant="caption" tone="muted">
                      Today's earnings
                    </AppText>
                    <AmountText amount={dashboard.todayEarnings} />
                    <AppText variant="caption" tone="soft">
                      Goal: {dashboard.todayGoal.toLocaleString()} TZS ({dashboard.goalProgress}%)
                    </AppText>
                  </AppStack>
                </AppCard>
                <AppCard style={styles.statCard}>
                  <AppStack gap={1}>
                    <AppText variant="caption" tone="muted">
                      Today's rides
                    </AppText>
                    <AppText variant="title" weight="bold">
                      {dashboard.todaysRides}
                    </AppText>
                    <AppText variant="caption" tone="soft">
                      Acceptance rate {dashboard.acceptanceRate}%
                    </AppText>
                  </AppStack>
                </AppCard>
              </ResponsiveRow>

              <ResponsiveRow gap={3}>
                <AppCard style={styles.statCard}>
                  <AppStack gap={1}>
                    <View style={styles.iconRow}>
                      <Star color={colors.warning} size={16} />
                      <AppText variant="caption" tone="muted">
                        Rating
                      </AppText>
                    </View>
                    <AppText variant="title" weight="bold">
                      {dashboard.rating.toFixed(1)}
                    </AppText>
                    <AppText variant="caption" tone="soft">
                      {dashboard.totalReviews} reviews
                    </AppText>
                  </AppStack>
                </AppCard>
                <AppCard style={styles.statCard}>
                  <AppStack gap={1}>
                    <View style={styles.iconRow}>
                      <TrendingUp color={colors.primary} size={16} />
                      <AppText variant="caption" tone="muted">
                        Online today
                      </AppText>
                    </View>
                    <AppText variant="title" weight="bold">
                      {dashboard.onlineHours}h
                    </AppText>
                  </AppStack>
                </AppCard>
              </ResponsiveRow>

              <AppCard>
                <AppStack gap={3}>
                  <AppText variant="titleSm" weight="bold">
                    Earnings breakdown
                  </AppText>
                  <View style={styles.breakdownRow}>
                    <AppStack gap={1} style={styles.breakdownItem}>
                      <AppText variant="caption" tone="muted">
                        Base fare
                      </AppText>
                      <AmountText amount={dashboard.earningsBreakdown.base} variant="bodySmall" />
                    </AppStack>
                    <AppStack gap={1} style={styles.breakdownItem}>
                      <AppText variant="caption" tone="muted">
                        Tips
                      </AppText>
                      <AmountText amount={dashboard.earningsBreakdown.tips} variant="bodySmall" />
                    </AppStack>
                    <AppStack gap={1} style={styles.breakdownItem}>
                      <AppText variant="caption" tone="muted">
                        Bonus
                      </AppText>
                      <AmountText amount={dashboard.earningsBreakdown.bonus} variant="bodySmall" />
                    </AppStack>
                  </View>
                </AppStack>
              </AppCard>

              {dashboard.peakHours?.active ? (
                <AppCard tone="brand">
                  <View style={styles.peakRow}>
                    <Sparkles color={colors.white} size={20} />
                    <AppStack gap={1} style={styles.peakText}>
                      <AppText variant="bodySmall" weight="bold" tone="inverse">
                        Peak hours active: {dashboard.peakHours.multiplier}x earnings
                      </AppText>
                      <AppText variant="caption" tone="inverse">
                        {dashboard.peakHours.start} to {dashboard.peakHours.end} - {dashboard.peakHours.timeLeft} left
                      </AppText>
                    </AppStack>
                  </View>
                </AppCard>
              ) : null}

              <AppStack gap={3}>
                <AppText variant="titleSm" weight="bold">
                  Recent trips
                </AppText>
                {dashboard.recentTrips.length === 0 ? (
                  <StateView title="No trips yet today" message="Your completed trips will appear here." />
                ) : (
                  <AppStack gap={2}>
                    {dashboard.recentTrips.map((trip) => (
                      <AppCard key={trip.id}>
                        <View style={styles.tripRow}>
                          <AppStack gap={1} style={styles.tripText}>
                            <AppText variant="bodySmall" weight="bold" numberOfLines={1}>
                              {trip.from} to {trip.to}
                            </AppText>
                            <AppText variant="caption" tone="muted">
                              {trip.time} - {trip.distance}
                            </AppText>
                          </AppStack>
                          <AmountText amount={trip.amount} variant="bodySmall" />
                        </View>
                      </AppCard>
                    ))}
                  </AppStack>
                )}
              </AppStack>

              {dashboard.reminders.length > 0 ? (
                <AppStack gap={3}>
                  <AppText variant="titleSm" weight="bold">
                    Reminders
                  </AppText>
                  <AppStack gap={2}>
                    {dashboard.reminders.map((reminder) => (
                      <AppCard key={reminder.id} tone={reminder.type === "warning" ? "warning" : "default"}>
                        <View style={styles.reminderRow}>
                          {reminder.type === "warning" ? (
                            <AlertTriangle color={colors.warning} size={18} />
                          ) : (
                            <Info color={colors.primary} size={18} />
                          )}
                          <AppStack gap={1} style={styles.reminderText}>
                            <AppText variant="bodySmall">{reminder.message}</AppText>
                            {reminder.action && reminder.actionLink ? (
                              <Pressable onPress={() => Linking.openURL(reminder.actionLink!)}>
                                <AppText variant="caption" weight="bold" tone="primary">
                                  {reminder.action}
                                </AppText>
                              </Pressable>
                            ) : null}
                          </AppStack>
                        </View>
                      </AppCard>
                    ))}
                  </AppStack>
                </AppStack>
              ) : null}
            </AppStack>
          ) : null}
        </ScrollView>
      </SafeScreen>
      <DriverBottomNav active="Home" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface
  },
  content: {
    flex: 1,
    minWidth: 0
  },
  scrollContent: {
    gap: spacing[4],
    paddingBottom: spacing[8]
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[3]
  },
  headerText: {
    flexShrink: 1,
    minWidth: 0
  },
  bellButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: radius.full,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.danger
  },
  badgeText: {
    fontSize: 10,
    lineHeight: 12
  },
  stateWrap: {
    marginTop: spacing[2]
  },
  statCard: {
    flex: 1,
    minWidth: 0
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1]
  },
  breakdownRow: {
    flexDirection: "row",
    gap: spacing[3]
  },
  breakdownItem: {
    flex: 1,
    minWidth: 0
  },
  peakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3]
  },
  peakText: {
    flexShrink: 1,
    minWidth: 0
  },
  tripRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[3]
  },
  tripText: {
    flexShrink: 1,
    minWidth: 0
  },
  reminderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[3]
  },
  reminderText: {
    flexShrink: 1,
    minWidth: 0
  }
});
