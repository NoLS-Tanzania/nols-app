import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AmountText, AppCard, AppStack, AppText, colors, radius, spacing, StateView, StatusBadge } from "@nolsaf/native-ui";
import { ArrowLeft } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { useAuth } from "../auth/AuthProvider";
import { fetchInvoices } from "../driver/driverApi";
import { INVOICE_STATUS_TONE, InvoiceItem } from "../driver/types";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Invoices">;

function formatDate(value: string | null | undefined) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function InvoicesScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        setError("Please sign in to view your invoices.");
        setLoading(false);
        return;
      }
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const response = await fetchInvoices(token);
        setItems(response.items || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load your invoices.");
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
          Invoices
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {loading ? (
          <StateView title="Loading your invoices" message="Fetching your invoices." />
        ) : error ? (
          <StateView title="Could not load invoices" message={error} actionLabel="Try again" onAction={() => load()} />
        ) : items.length === 0 ? (
          <StateView title="No invoices yet" message="Your invoices will appear here." />
        ) : (
          <AppStack gap={2}>
            {items.map((item) => (
              <Pressable key={item.id} accessibilityRole="button" onPress={() => navigation.navigate("InvoiceDetail", { invoice: item })}>
                <AppCard style={styles.card}>
                  <View style={styles.row}>
                    <AppText variant="bodySmall" weight="bold">
                      {item.invoiceNumber || `Invoice #${item.invoiceId}`}
                    </AppText>
                    <StatusBadge status={INVOICE_STATUS_TONE[item.status]} label={item.status} />
                  </View>
                  <View style={styles.row}>
                    <AmountText amount={item.gross ?? 0} variant="bodySmall" />
                    <AppText variant="caption" tone="muted">
                      Issued {formatDate(item.issuedAt)}
                    </AppText>
                  </View>
                  {item.tripCode ? (
                    <AppText variant="caption" tone="muted">
                      Trip {item.tripCode}
                    </AppText>
                  ) : null}
                </AppCard>
              </Pressable>
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[2]
  }
});
