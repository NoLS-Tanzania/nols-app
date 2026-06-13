import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppCard, AppStack, AppText, colors, radius, ResponsiveRow, SafeScreen, spacing, StateView } from "@nolsaf/native-ui";
import { ArrowLeft, Star } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { useAuth } from "../auth/AuthProvider";
import { fetchRating } from "../driver/driverApi";
import { RatingSummary } from "../driver/types";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Rating">;

const STAT_CARDS: Array<{ key: keyof RatingSummary; label: string }> = [
  { key: "totalTrips", label: "Total trips" },
  { key: "completedTrips", label: "Completed" },
  { key: "cancelledTrips", label: "Cancelled" },
  { key: "monthlyTrips", label: "This month" },
  { key: "activeDays", label: "Active days" },
  { key: "monthsOfService", label: "Months with NoLSAF" }
];

export function RatingScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [summary, setSummary] = useState<RatingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        setError("Please sign in to view your rating.");
        setLoading(false);
        return;
      }
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        setSummary(await fetchRating(token));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load your rating.");
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

  const rating = summary?.rating ?? 0;

  return (
    <View style={styles.root}>
      <SafeScreen scroll={false} contentStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color={colors.ink} size={22} />
          </Pressable>
          <AppText variant="title" weight="bold">
            Your rating
          </AppText>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} tintColor={colors.primary} colors={[colors.primary]} />}
        >
          {loading ? (
            <StateView title="Loading your rating" message="Fetching your performance summary." />
          ) : error ? (
            <StateView title="Could not load your rating" message={error} actionLabel="Try again" onAction={() => load()} />
          ) : summary ? (
            <AppStack gap={4}>
              <AppCard tone="brand" style={styles.heroCard}>
                <AppText variant="display" weight="extraBold">
                  {summary.rating != null ? summary.rating.toFixed(1) : "--"}
                </AppText>
                <View style={styles.starsRow}>
                  {[1, 2, 3, 4, 5].map((position) => (
                    <Star
                      key={position}
                      color={colors.warning}
                      fill={position <= Math.round(rating) ? colors.warning : "transparent"}
                      size={22}
                    />
                  ))}
                </View>
                <AppText variant="bodySmall" tone="muted" style={styles.heroCopy}>
                  Every trip you complete with care helps keep this number high. Passengers and dispatch can see it,
                  so it is worth protecting.
                </AppText>
              </AppCard>

              <ResponsiveRow gap={3} style={styles.statsRow}>
                {STAT_CARDS.map((stat) => (
                  <AppCard key={stat.key} style={styles.statCard}>
                    <AppText variant="title" weight="bold">
                      {String(summary[stat.key] ?? 0)}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      {stat.label}
                    </AppText>
                  </AppCard>
                ))}
              </ResponsiveRow>
            </AppStack>
          ) : null}
        </ScrollView>
      </SafeScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  content: { flex: 1, minWidth: 0, gap: spacing[4] },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
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
  scrollContent: { gap: spacing[4], paddingBottom: spacing[8] },
  heroCard: { alignItems: "center", gap: spacing[2], paddingVertical: spacing[6] },
  starsRow: { flexDirection: "row", gap: spacing[1] },
  heroCopy: { textAlign: "center" },
  statsRow: { flexWrap: "wrap" },
  statCard: { flexGrow: 1, flexBasis: "47%", gap: spacing[1] }
});
