import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AmountText, AppCard, AppStack, AppText, colors, radius, ResponsiveRow, spacing, StateView, StatusBadge } from "@nolsaf/native-ui";
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Gem,
  Gift,
  Star,
  Target,
  TrendingUp,
  Trophy,
  X
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import Svg, { Rect } from "react-native-svg";

import { useAuth } from "../auth/AuthProvider";
import { fetchBonusEligibility, fetchBonusHistory, fetchDriverPerformance } from "../driver/driverApi";
import { BONUS_STATUS_TONE, BonusEligibility, BonusGrantedNotification, BonusHistoryItem, DriverPerformance } from "../driver/types";
import { useDriverSocket } from "../hooks/useDriverSocket";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Bonus">;

type ChartPeriod = "week" | "month" | "year";

const CHART_HEIGHT = 90;

const CHART_PERIODS: ChartPeriod[] = ["week", "month", "year"];

function formatDate(value: string | null | undefined) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function groupBonusHistory(history: BonusHistoryItem[], period: ChartPeriod) {
  const now = Date.now();
  const maxAgeDays = period === "week" ? 7 : period === "month" ? 30 : 365;
  const filtered = history.filter((item) => {
    const time = new Date(item.date).getTime();
    if (Number.isNaN(time)) return false;
    return (now - time) / (1000 * 60 * 60 * 24) <= maxAgeDays;
  });

  const groups = new Map<string, { amount: number; sortKey: number }>();
  for (const item of filtered) {
    const date = new Date(item.date);
    let key: string;
    if (period === "week") {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = `Week of ${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
    } else if (period === "month") {
      key = date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
    } else {
      key = String(date.getFullYear());
    }
    const existing = groups.get(key);
    if (existing) existing.amount += item.amount;
    else groups.set(key, { amount: item.amount, sortKey: date.getTime() });
  }

  return Array.from(groups.entries())
    .sort((a, b) => a[1].sortKey - b[1].sortKey)
    .map(([periodLabel, value]) => ({ period: periodLabel, amount: value.amount }));
}

export function BonusScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [eligibility, setEligibility] = useState<BonusEligibility | null>(null);
  const [history, setHistory] = useState<BonusHistoryItem[]>([]);
  const [performance, setPerformance] = useState<DriverPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("month");
  const [notification, setNotification] = useState<BonusGrantedNotification | null>(null);
  const notificationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        setError("Please sign in to view your bonus.");
        setLoading(false);
        return;
      }
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const [eligibilityRes, historyRes, performanceRes] = await Promise.all([
          fetchBonusEligibility(token),
          fetchBonusHistory(token),
          fetchDriverPerformance(token)
        ]);
        setEligibility(eligibilityRes);
        setHistory(historyRes || []);
        setPerformance(performanceRes);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load your bonus.");
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
    "bonus-granted": (payload) => {
      setNotification(payload as BonusGrantedNotification);
      void load("refresh");
      if (notificationTimer.current) clearTimeout(notificationTimer.current);
      notificationTimer.current = setTimeout(() => setNotification(null), 10000);
    }
  });

  useEffect(() => {
    return () => {
      if (notificationTimer.current) clearTimeout(notificationTimer.current);
    };
  }, []);

  const totals = useMemo(() => {
    let total = 0;
    let paid = 0;
    let pending = 0;
    for (const item of history) {
      total += item.amount;
      if (item.status === "paid") paid += item.amount;
      else if (item.status === "pending") pending += item.amount;
    }
    return { total, paid, pending };
  }, [history]);

  const chartData = useMemo(() => groupBonusHistory(history, chartPeriod), [history, chartPeriod]);

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={colors.ink} size={22} />
        </Pressable>
        <AppText variant="title" weight="bold">
          Bonus
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {loading ? (
          <StateView title="Loading your bonus" message="Fetching eligibility and history." />
        ) : error ? (
          <StateView title="Could not load your bonus" message={error} actionLabel="Try again" onAction={() => load()} />
        ) : (
          <AppStack gap={4}>
            {notification ? (
              <AppCard tone="success" style={styles.card}>
                <View style={styles.notificationRow}>
                  <View style={styles.notificationIconCircle}>
                    <Bell color={colors.success} size={18} />
                  </View>
                  <View style={styles.notificationBody}>
                    <AppText variant="bodySmall" weight="bold" tone="success">
                      New Bonus Granted! 🎉
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      You&apos;ve received a {notification.bonusAmount.toLocaleString()} TZS bonus for {notification.reason}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      Period: {notification.period} · Ref: {notification.bonusPaymentRef}
                    </AppText>
                  </View>
                  <Pressable accessibilityRole="button" onPress={() => setNotification(null)}>
                    <X color={colors.softText} size={18} />
                  </Pressable>
                </View>
              </AppCard>
            ) : null}

            {history.length > 0 ? (
              <ResponsiveRow gap={3} style={styles.statsRow}>
                <AppCard style={styles.summaryCard}>
                  <View style={styles.summaryCardHeader}>
                    <View style={styles.summaryCardText}>
                      <AppText variant="caption" tone="muted">
                        Total Bonuses
                      </AppText>
                      <AmountText amount={totals.total} variant="bodySmall" />
                    </View>
                    <View style={[styles.summaryIconCircle, { backgroundColor: colors.brand[50] }]}>
                      <Gift color={colors.primary} size={18} />
                    </View>
                  </View>
                </AppCard>
                <AppCard style={styles.summaryCard}>
                  <View style={styles.summaryCardHeader}>
                    <View style={styles.summaryCardText}>
                      <AppText variant="caption" tone="muted">
                        Paid
                      </AppText>
                      <AmountText amount={totals.paid} variant="bodySmall" tone="success" />
                    </View>
                    <View style={[styles.summaryIconCircle, { backgroundColor: "#ecfdf5" }]}>
                      <CheckCircle2 color={colors.success} size={18} />
                    </View>
                  </View>
                </AppCard>
                <AppCard style={styles.summaryCard}>
                  <View style={styles.summaryCardHeader}>
                    <View style={styles.summaryCardText}>
                      <AppText variant="caption" tone="muted">
                        Pending
                      </AppText>
                      <AmountText amount={totals.pending} variant="bodySmall" tone="warning" />
                    </View>
                    <View style={[styles.summaryIconCircle, { backgroundColor: "#fffbeb" }]}>
                      <Clock color={colors.warning} size={18} />
                    </View>
                  </View>
                </AppCard>
              </ResponsiveRow>
            ) : null}

            {performance ? (
              <AppCard style={styles.card}>
                <View style={styles.sectionHeaderRow}>
                  <Target color={colors.success} size={18} />
                  <AppText variant="titleSm" weight="bold">
                    Performance Metrics &amp; Bonus Eligibility
                  </AppText>
                </View>

                <ResponsiveRow gap={3} style={styles.statsRow}>
                  <View style={[styles.metricCard, { backgroundColor: "#eff6ff", borderColor: "#dbeafe" }]}>
                    <View style={styles.metricCardHeader}>
                      <Star color="#2563eb" size={14} />
                      <AppText variant="caption" weight="bold" style={{ color: "#1d4ed8" }}>
                        Rating
                      </AppText>
                    </View>
                    <AppText variant="title" weight="bold" style={{ color: "#1e3a8a" }}>
                      {performance.metrics.rating.toFixed(1)}
                    </AppText>
                    <AppText variant="caption" style={{ color: "#2563eb" }}>
                      {performance.totalReviews} reviews
                    </AppText>
                  </View>
                  <View style={[styles.metricCard, { backgroundColor: "#ecfdf5", borderColor: "#d1fae5" }]}>
                    <View style={styles.metricCardHeader}>
                      <CheckCircle2 color="#059669" size={14} />
                      <AppText variant="caption" weight="bold" style={{ color: "#047857" }}>
                        Completion rate
                      </AppText>
                    </View>
                    <AppText variant="title" weight="bold" style={{ color: "#065f46" }}>
                      {Math.round(performance.metrics.completionRate)}%
                    </AppText>
                    <AppText variant="caption" style={{ color: "#059669" }}>
                      {performance.metrics.monthlyTrips} trips this month
                    </AppText>
                  </View>
                  <View style={[styles.metricCard, { backgroundColor: "#fffbeb", borderColor: "#fde68a" }]}>
                    <View style={styles.metricCardHeader}>
                      <BarChart3 color="#d97706" size={14} />
                      <AppText variant="caption" weight="bold" style={{ color: "#92400e" }}>
                        Active days
                      </AppText>
                    </View>
                    <AppText variant="title" weight="bold" style={{ color: "#78350f" }}>
                      {performance.metrics.activeDaysThisMonth}
                    </AppText>
                    <AppText variant="caption" style={{ color: "#d97706" }}>
                      Days with trips
                    </AppText>
                  </View>
                  <View style={[styles.metricCard, { backgroundColor: "#faf5ff", borderColor: "#e9d5ff" }]}>
                    <View style={styles.metricCardHeader}>
                      <Gem color="#9333ea" size={14} />
                      <AppText variant="caption" weight="bold" style={{ color: "#7e22ce" }}>
                        Service
                      </AppText>
                    </View>
                    <AppText variant="title" weight="bold" style={{ color: "#581c87" }}>
                      {performance.metrics.monthsOfService}
                    </AppText>
                    <AppText variant="caption" style={{ color: "#9333ea" }}>
                      Months active
                    </AppText>
                  </View>
                </ResponsiveRow>

                <View style={[styles.coloredSection, { backgroundColor: "#fffbeb", borderColor: "#fde68a" }]}>
                  <View style={styles.coloredSectionHeader}>
                    <Trophy color="#d97706" size={18} />
                    <AppText variant="bodySmall" weight="bold" style={{ color: "#78350f" }}>
                      Performance Excellence Bonus
                    </AppText>
                    {performance.metrics.meetsPerformanceExcellence ? <EligibleBadge /> : null}
                  </View>
                  <MetricProgressBar
                    label="Rating ≥ 4.7"
                    valueLabel={`${performance.metrics.rating.toFixed(1)} / 4.7${performance.metrics.rating >= 4.7 ? " ✓" : ""}`}
                    percent={performance.progress.performanceExcellence.rating}
                    trackColor="#fde68a"
                    fillColor="#d97706"
                    textColor="#78350f"
                  />
                  <MetricProgressBar
                    label="Completion Rate ≥ 95%"
                    valueLabel={`${Math.round(performance.metrics.completionRate)}% / 95%${performance.metrics.completionRate >= 95 ? " ✓" : ""}`}
                    percent={performance.progress.performanceExcellence.completionRate}
                    trackColor="#fde68a"
                    fillColor="#d97706"
                    textColor="#78350f"
                  />
                  <MetricProgressBar
                    label="Cancellation Rate < 5%"
                    valueLabel={`${performance.metrics.cancellationRate}% / 5%${performance.metrics.cancellationRate < 5 ? " ✓" : ""}`}
                    percent={performance.metrics.cancellationRate * 20}
                    trackColor="#fde68a"
                    fillColor={colors.danger}
                    textColor="#78350f"
                  />
                </View>

                <View style={[styles.coloredSection, { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }]}>
                  <View style={styles.coloredSectionHeader}>
                    <BarChart3 color="#2563eb" size={18} />
                    <AppText variant="bodySmall" weight="bold" style={{ color: "#1e3a8a" }}>
                      Volume Achievement Bonus
                    </AppText>
                    {performance.metrics.meetsVolumeMilestone ? <EligibleBadge /> : null}
                  </View>
                  <MetricProgressBar
                    label="Monthly Trips"
                    valueLabel={`${performance.metrics.monthlyTrips} trips${performance.metrics.monthlyTrips >= 50 ? " ✓" : ""}`}
                    percent={performance.progress.volumeAchievement.trips}
                    trackColor="#bfdbfe"
                    fillColor="#2563eb"
                    textColor="#1e3a8a"
                    caption="Milestones: 50 trips (100k TZS), 100 trips (150k TZS), 200+ trips (200k TZS)"
                  />
                  <MetricProgressBar
                    label="Active Days This Month"
                    valueLabel={`${performance.metrics.activeDaysThisMonth} days`}
                    percent={performance.progress.volumeAchievement.activeDays}
                    trackColor="#bfdbfe"
                    fillColor="#2563eb"
                    textColor="#1e3a8a"
                  />
                </View>

                <View style={[styles.coloredSection, { backgroundColor: "#faf5ff", borderColor: "#e9d5ff" }]}>
                  <View style={styles.coloredSectionHeader}>
                    <Gem color="#9333ea" size={18} />
                    <AppText variant="bodySmall" weight="bold" style={{ color: "#581c87" }}>
                      Loyalty &amp; Retention Bonus
                    </AppText>
                    {performance.metrics.meetsLoyaltyCriteria ? <EligibleBadge /> : null}
                  </View>
                  <MetricProgressBar
                    label="Months of Service ≥ 6"
                    valueLabel={`${performance.metrics.monthsOfService} months${performance.metrics.monthsOfService >= 6 ? " ✓" : ""}`}
                    percent={performance.progress.loyaltyRetention.monthsOfService}
                    trackColor="#e9d5ff"
                    fillColor="#9333ea"
                    textColor="#581c87"
                  />
                  <MetricProgressBar
                    label="Active Days ≥ 20"
                    valueLabel={`${performance.metrics.activeDaysThisMonth} / 20 days${performance.metrics.activeDaysThisMonth >= 20 ? " ✓" : ""}`}
                    percent={performance.progress.loyaltyRetention.activeDays}
                    trackColor="#e9d5ff"
                    fillColor="#9333ea"
                    textColor="#581c87"
                  />
                </View>
              </AppCard>
            ) : null}

            {eligibility ? (
              <AppCard style={styles.card}>
                <View style={styles.sectionHeaderRow}>
                  <TrendingUp color={colors.success} size={18} />
                  <AppText variant="titleSm" weight="bold">
                    Eligibility Status
                  </AppText>
                </View>
                <AppText variant="bodySmall" tone="muted">
                  Current period: {eligibility.currentPeriod}
                </AppText>
                {eligibility.nextBonusDate ? (
                  <AppText variant="caption" tone="muted">
                    Next bonus date: {formatDate(eligibility.nextBonusDate)}
                  </AppText>
                ) : null}

                <AppStack gap={3}>
                  <ProgressRow label={`Trips (${eligibility.tripsCompleted}/${eligibility.tripsRequired})`} value={eligibility.progress.trips} />
                  <ProgressRow
                    label={`Rating (${eligibility.currentRating.toFixed(1)}/${eligibility.ratingRequired.toFixed(1)})`}
                    value={eligibility.progress.rating}
                  />
                  <ProgressRow
                    label={`Earnings (${eligibility.currentEarnings.toLocaleString()}/${eligibility.earningsRequired.toLocaleString()})`}
                    value={eligibility.progress.earnings}
                  />
                </AppStack>

                <View style={[styles.statusBanner, eligibility.eligible ? styles.statusBannerSuccess : styles.statusBannerWarning]}>
                  {eligibility.eligible ? <CheckCircle2 color={colors.success} size={18} /> : <AlertCircle color={colors.warning} size={18} />}
                  <View style={styles.statusBannerBody}>
                    <AppText variant="bodySmall" weight="bold" tone={eligibility.eligible ? "success" : "warning"}>
                      {eligibility.eligible ? "You are eligible for a bonus!" : "Continue working to become eligible"}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      {eligibility.eligible
                        ? `You've met all requirements for ${eligibility.currentPeriod}`
                        : `Complete ${Math.max(0, eligibility.tripsRequired - eligibility.tripsCompleted)} more trips and earn ${Math.max(
                            0,
                            eligibility.earningsRequired - eligibility.currentEarnings
                          ).toLocaleString()} TZS more to qualify`}
                    </AppText>
                  </View>
                </View>
              </AppCard>
            ) : null}

            <AppCard style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <Calendar color={colors.success} size={18} />
                <AppText variant="titleSm" weight="bold" style={styles.sectionHeaderTitle}>
                  Bonus History
                </AppText>
              </View>
              <View style={styles.periodToggleRow}>
                {CHART_PERIODS.map((p) => (
                  <Pressable
                    key={p}
                    accessibilityRole="button"
                    onPress={() => setChartPeriod(p)}
                    style={[styles.periodButton, chartPeriod === p && styles.periodButtonActive]}
                  >
                    <AppText variant="caption" weight="bold" tone={chartPeriod === p ? "inverse" : "muted"}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </AppText>
                  </Pressable>
                ))}
              </View>
              {chartData.length > 0 ? (
                <BonusHistoryChart data={chartData} />
              ) : (
                <StateView title="No bonus data" message={`No bonus activity in the selected ${chartPeriod}.`} />
              )}
            </AppCard>

            <AppStack gap={3}>
              <AppText variant="titleSm" weight="bold">
                Bonus claims
              </AppText>
              {history.length === 0 ? (
                <StateView title="No bonus history yet" message="Bonuses you earn will show up here." />
              ) : (
                <AppStack gap={2}>
                  {history.map((item) => (
                    <AppCard key={item.id} style={styles.card}>
                      <View style={styles.row}>
                        <AppText variant="bodySmall" weight="bold">
                          {item.period}
                        </AppText>
                        <StatusBadge status={BONUS_STATUS_TONE[item.status]} label={item.status} />
                      </View>
                      <View style={styles.row}>
                        <AmountText amount={item.amount} variant="bodySmall" />
                        <AppText variant="caption" tone="muted">
                          {formatDate(item.date)}
                        </AppText>
                      </View>
                      {item.reason ? (
                        <AppText variant="caption" tone="muted">
                          {item.reason}
                        </AppText>
                      ) : null}
                      {item.status === "paid" && item.paidAt ? (
                        <AppText variant="caption" tone="success">
                          Paid {formatDate(item.paidAt)}
                        </AppText>
                      ) : null}
                    </AppCard>
                  ))}
                </AppStack>
              )}
            </AppStack>
          </AppStack>
        )}
      </ScrollView>
    </View>
  );
}

function EligibleBadge() {
  return (
    <View style={styles.eligibleBadge}>
      <AppText variant="caption" weight="bold" style={styles.eligibleBadgeText}>
        Eligible ✓
      </AppText>
    </View>
  );
}

function MetricProgressBar({
  label,
  valueLabel,
  percent,
  trackColor,
  fillColor,
  textColor,
  caption
}: {
  label: string;
  valueLabel: string;
  percent: number;
  trackColor: string;
  fillColor: string;
  textColor: string;
  caption?: string;
}) {
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <View style={styles.metricBarRow}>
      <View style={styles.progressLabelRow}>
        <AppText variant="caption" style={{ color: textColor }}>
          {label}
        </AppText>
        <AppText variant="caption" weight="bold" style={{ color: textColor }}>
          {valueLabel}
        </AppText>
      </View>
      <View style={[styles.metricTrack, { backgroundColor: trackColor }]}>
        <View style={[styles.metricFill, { width: `${pct}%`, backgroundColor: fillColor }]} />
      </View>
      {caption ? (
        <AppText variant="caption" tone="muted" style={styles.metricCaption}>
          {caption}
        </AppText>
      ) : null}
    </View>
  );
}

function BonusHistoryChart({ data }: { data: { period: string; amount: number }[] }) {
  const max = Math.max(...data.map((d) => d.amount), 1);
  const barWidth = 100 / data.length;
  return (
    <View>
      <Svg width="100%" height={CHART_HEIGHT} viewBox={`0 0 100 ${CHART_HEIGHT}`} preserveAspectRatio="none">
        {data.map((d, index) => {
          const height = max > 0 ? (d.amount / max) * (CHART_HEIGHT - 6) : 0;
          return (
            <Rect
              key={`${d.period}-${index}`}
              x={index * barWidth + barWidth * 0.2}
              y={CHART_HEIGHT - height}
              width={barWidth * 0.6}
              height={Math.max(height, 1)}
              rx={1}
              fill={colors.primary}
            />
          );
        })}
      </Svg>
      <View style={styles.chartLabels}>
        {data.map((d, index) => (
          <AppText key={`${d.period}-${index}`} variant="caption" tone="muted" style={styles.chartLabel} numberOfLines={1}>
            {d.period}
          </AppText>
        ))}
      </View>
    </View>
  );
}

function ProgressRow({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <View>
      <View style={styles.progressLabelRow}>
        <AppText variant="caption" tone="muted">
          {label}
        </AppText>
        <AppText variant="caption" weight="bold">
          {pct}%
        </AppText>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>
      <AppText variant="caption" tone="muted" style={styles.progressFootnote}>
        {pct}% complete
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4]
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border
  },
  scrollContent: {
    gap: spacing[4],
    padding: spacing[4],
    paddingBottom: spacing[8]
  },
  card: {
    gap: spacing[3]
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[2]
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2]
  },
  sectionHeaderTitle: {
    flex: 1
  },
  statsRow: {
    flexWrap: "wrap"
  },
  notificationRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[2]
  },
  notificationIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: "#ecfdf5",
    alignItems: "center",
    justifyContent: "center"
  },
  notificationBody: {
    flex: 1,
    gap: spacing[1],
    minWidth: 0
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: "30%",
    gap: spacing[1]
  },
  summaryCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing[2]
  },
  summaryCardText: {
    flex: 1,
    minWidth: 0,
    gap: spacing[1]
  },
  summaryIconCircle: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center"
  },
  metricCard: {
    flexGrow: 1,
    flexBasis: "47%",
    gap: spacing[1],
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing[3]
  },
  metricCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1]
  },
  coloredSection: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing[3],
    gap: spacing[3]
  },
  coloredSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2]
  },
  eligibleBadge: {
    marginLeft: "auto",
    backgroundColor: "#d1fae5",
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1] / 2,
    borderRadius: radius.full
  },
  eligibleBadgeText: {
    color: "#047857"
  },
  metricBarRow: {
    gap: spacing[1]
  },
  metricTrack: {
    height: 8,
    borderRadius: radius.full,
    overflow: "hidden"
  },
  metricFill: {
    height: 8,
    borderRadius: radius.full
  },
  metricCaption: {
    marginTop: spacing[1] / 2
  },
  periodToggleRow: {
    flexDirection: "row",
    gap: spacing[2]
  },
  periodButton: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.md,
    backgroundColor: colors.brand[50]
  },
  periodButtonActive: {
    backgroundColor: colors.primary
  },
  chartLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing[1]
  },
  chartLabel: {
    flex: 1,
    textAlign: "center"
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[2],
    padding: spacing[3],
    borderRadius: radius.md,
    borderWidth: 1
  },
  statusBannerSuccess: {
    backgroundColor: "#ecfdf5",
    borderColor: "#bbf7d0"
  },
  statusBannerWarning: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a"
  },
  statusBannerBody: {
    flex: 1,
    minWidth: 0,
    gap: spacing[1]
  },
  progressLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing[1]
  },
  progressTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.brand[50],
    overflow: "hidden"
  },
  progressFill: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.primary
  },
  progressFootnote: {
    marginTop: spacing[1]
  }
});
