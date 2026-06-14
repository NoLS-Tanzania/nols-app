import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AmountText, AppCard, AppStack, AppText, colors, radius, ResponsiveRow, spacing, StateView, StatusBadge } from "@nolsaf/native-ui";
import { ArrowLeft } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { useAuth } from "../auth/AuthProvider";
import { fetchBonusEligibility, fetchBonusHistory, fetchDriverPerformance } from "../driver/driverApi";
import { BONUS_STATUS_TONE, BonusEligibility, BonusHistoryItem, DriverPerformance } from "../driver/types";
import { useDriverSocket } from "../hooks/useDriverSocket";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Bonus">;

function formatDate(value: string | null | undefined) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function BonusScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [eligibility, setEligibility] = useState<BonusEligibility | null>(null);
  const [history, setHistory] = useState<BonusHistoryItem[]>([]);
  const [performance, setPerformance] = useState<DriverPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    "bonus-granted": () => void load("refresh")
  });

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
            {eligibility ? (
              <AppCard tone={eligibility.eligible ? "success" : "default"} style={styles.card}>
                <AppStack gap={1}>
                  <AppText variant="bodySmall" tone="muted">
                    Current period: {eligibility.currentPeriod}
                  </AppText>
                  <AppText variant="titleSm" weight="bold">
                    {eligibility.eligible ? "You are eligible for a bonus" : "Not yet eligible for a bonus"}
                  </AppText>
                  {eligibility.nextBonusDate ? (
                    <AppText variant="caption" tone="muted">
                      Next bonus date: {formatDate(eligibility.nextBonusDate)}
                    </AppText>
                  ) : null}
                </AppStack>

                <AppStack gap={2}>
                  <ProgressRow
                    label={`Trips (${eligibility.tripsCompleted}/${eligibility.tripsRequired})`}
                    value={eligibility.progress.trips}
                  />
                  <ProgressRow
                    label={`Rating (${eligibility.currentRating.toFixed(1)}/${eligibility.ratingRequired.toFixed(1)})`}
                    value={eligibility.progress.rating}
                  />
                  <ProgressRow
                    label={`Earnings (${eligibility.currentEarnings.toLocaleString()}/${eligibility.earningsRequired.toLocaleString()})`}
                    value={eligibility.progress.earnings}
                  />
                </AppStack>
              </AppCard>
            ) : null}

            {performance ? (
              <ResponsiveRow gap={3} style={styles.statsRow}>
                <AppCard style={styles.statCard}>
                  <AppText variant="title" weight="bold">
                    {performance.metrics.rating.toFixed(1)}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    Rating
                  </AppText>
                </AppCard>
                <AppCard style={styles.statCard}>
                  <AppText variant="title" weight="bold">
                    {Math.round(performance.metrics.completionRate)}%
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    Completion rate
                  </AppText>
                </AppCard>
                <AppCard style={styles.statCard}>
                  <AppText variant="title" weight="bold">
                    {performance.metrics.monthlyTrips}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    Trips this month
                  </AppText>
                </AppCard>
              </ResponsiveRow>
            ) : null}

            <AppStack gap={3}>
              <AppText variant="titleSm" weight="bold">
                Bonus history
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

function ProgressRow({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
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
  statsRow: {
    flexWrap: "wrap"
  },
  statCard: {
    flexGrow: 1,
    flexBasis: "30%",
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
  }
});
