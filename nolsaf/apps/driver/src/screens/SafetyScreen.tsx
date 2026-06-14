import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppText, colors, radius, SafeScreen, shadows, spacing, StateView } from "@nolsaf/native-ui";
import { ArrowLeft, ShieldAlert } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { useAuth } from "../auth/AuthProvider";
import { fetchDriverSafety } from "../driver/driverApi";
import { SafetyEvent } from "../driver/types";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Safety">;

const FLAG_LABELS: Record<string, string> = {
  HARD_BRAKING: "Hard braking",
  HARSH_ACCELERATION: "Harsh acceleration",
  SPEEDING: "Speeding",
  RULE_VIOLATION: "Rule violated"
};

function formatFlag(flag: string) {
  return FLAG_LABELS[flag] || flag.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

function formatDate(value: string) {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function SafetyScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [items, setItems] = useState<SafetyEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        setError("Please sign in to view your safety events.");
        setLoading(false);
        return;
      }
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const response = await fetchDriverSafety(token);
        setItems(response.items || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load safety events.");
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

  return (
    <View style={styles.root}>
      <SafeScreen scroll={false} contentStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color={colors.ink} size={22} />
          </Pressable>
          <AppText variant="title" weight="bold">
            Safety
          </AppText>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} tintColor={colors.primary} colors={[colors.primary]} />}
        >
          <AppText variant="bodySmall" tone="muted">
            Hard braking, speeding, and other driving flags recorded during your trips.
          </AppText>

          {loading ? (
            <StateView title="Loading safety events" message="Fetching your safety record." />
          ) : error ? (
            <StateView title="Could not load safety events" message={error} actionLabel="Try again" onAction={() => load()} />
          ) : items.length === 0 ? (
            <StateView title="No safety events recorded" message="Drive safely and this list will stay empty." />
          ) : (
            items.map((item) => (
              <View key={item.id} style={styles.card}>
                <View style={styles.cardIcon}>
                  <ShieldAlert color={colors.warning} size={16} />
                </View>
                <View style={styles.cardBody}>
                  <AppText variant="bodySmall" weight="bold">
                    {formatFlag(item.flag)}
                  </AppText>
                  <AppText variant="caption" tone="soft">
                    {formatDate(item.date)}
                  </AppText>
                  {item.message ? (
                    <AppText variant="caption" tone="muted">
                      {item.message}
                    </AppText>
                  ) : null}
                  {item.tripCode ? (
                    <AppText variant="caption" tone="muted">
                      Trip {item.tripCode}
                    </AppText>
                  ) : null}
                </View>
              </View>
            ))
          )}
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
  scrollContent: { gap: spacing[3], paddingBottom: spacing[8] },
  card: {
    minWidth: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing[3],
    ...shadows.card
  },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface
  },
  cardBody: { flex: 1, minWidth: 0, gap: spacing[1] }
});
