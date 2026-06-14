import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AmountText, AppCard, AppStack, AppText, colors, radius, spacing, StateView } from "@nolsaf/native-ui";
import { ArrowLeft } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { useAuth } from "../auth/AuthProvider";
import { fetchPayouts } from "../driver/driverApi";
import { PayoutItem } from "../driver/types";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Payouts">;

function formatDate(value: string | null | undefined) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function PayoutsScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [items, setItems] = useState<PayoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        setError("Please sign in to view your payouts.");
        setLoading(false);
        return;
      }
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const response = await fetchPayouts(token);
        setItems(response.items || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load your payouts.");
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
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={colors.ink} size={22} />
        </Pressable>
        <AppText variant="title" weight="bold">
          Payouts
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {loading ? (
          <StateView title="Loading your payouts" message="Fetching your completed payouts." />
        ) : error ? (
          <StateView title="Could not load payouts" message={error} actionLabel="Try again" onAction={() => load()} />
        ) : items.length === 0 ? (
          <StateView title="No payouts yet" message="Completed payouts will appear here." />
        ) : (
          <AppStack gap={2}>
            {items.map((item) => (
              <AppCard key={item.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <AppText variant="bodySmall" weight="bold">
                    {item.invoiceNumber || item.tripCode || `Payout #${item.id}`}
                  </AppText>
                  <AmountText amount={item.netPaid ?? 0} variant="bodySmall" />
                </View>
                <View style={styles.row}>
                  <AppText variant="caption" tone="muted">
                    Paid {formatDate(item.paidAt)}
                  </AppText>
                  {item.receiptNumber ? (
                    <AppText variant="caption" tone="muted">
                      Receipt {item.receiptNumber}
                    </AppText>
                  ) : null}
                </View>
                <View style={styles.breakdownRow}>
                  <AppText variant="caption" tone="muted">
                    Gross: {(item.gross ?? 0).toLocaleString()}
                  </AppText>
                  <AppText variant="caption" tone="muted">
                    Commission: {(item.commissionAmount ?? 0).toLocaleString()}
                  </AppText>
                </View>
              </AppCard>
            ))}
          </AppStack>
        )}
      </ScrollView>
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
    gap: spacing[2]
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[2]
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[2]
  },
  breakdownRow: {
    flexDirection: "row",
    gap: spacing[4]
  }
});
