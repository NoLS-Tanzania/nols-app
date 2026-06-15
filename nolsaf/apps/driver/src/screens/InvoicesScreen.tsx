import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AmountText, AppCard, AppStack, AppText, colors, radius, spacing, StateView, StatusBadge } from "@nolsaf/native-ui";
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronRight, Clock, FileText, RefreshCw, Wallet } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import Svg, { Rect } from "react-native-svg";

import { useAuth } from "../auth/AuthProvider";
import { fetchInvoices } from "../driver/driverApi";
import { INVOICE_STATUS_TONE, InvoiceItem } from "../driver/types";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Invoices">;

const PENDING_STATUSES = new Set(["DRAFT", "REQUESTED", "VERIFIED", "PROCESSING", "APPROVED"]);

type StatusFilter = "ALL" | "PAID" | "PENDING" | "REJECTED";

const CHART_BAR_HEIGHT = 10;

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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

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

  const stats = useMemo(() => {
    let totalRevenue = 0;
    let paidTotal = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;
    for (const item of items) {
      totalRevenue += item.gross ?? 0;
      if (item.status === "PAID") {
        paidTotal += item.netPaid ?? item.gross ?? 0;
        paidCount += 1;
      } else if (item.status === "REJECTED") {
        rejectedCount += 1;
      } else if (PENDING_STATUSES.has(item.status)) {
        pendingCount += 1;
      }
    }
    return { totalRevenue, paidTotal, paidCount, pendingCount, rejectedCount, totalCount: items.length };
  }, [items]);

  const filteredItems = useMemo(() => {
    switch (statusFilter) {
      case "PAID":
        return items.filter((item) => item.status === "PAID");
      case "PENDING":
        return items.filter((item) => PENDING_STATUSES.has(item.status));
      case "REJECTED":
        return items.filter((item) => item.status === "REJECTED");
      default:
        return items;
    }
  }, [items, statusFilter]);

  const chartSegments = useMemo(() => {
    const total = stats.totalCount || 1;
    return [
      { key: "PAID" as StatusFilter, label: "Paid", count: stats.paidCount, color: colors.success },
      { key: "PENDING" as StatusFilter, label: "Pending", count: stats.pendingCount, color: colors.warning },
      { key: "REJECTED" as StatusFilter, label: "Rejected", count: stats.rejectedCount, color: colors.danger }
    ].map((segment) => ({ ...segment, ratio: segment.count / total }));
  }, [stats]);

  const toggleFilter = useCallback((filter: StatusFilter) => {
    setStatusFilter((current) => (current === filter ? "ALL" : filter));
  }, []);

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
        <AppCard tone="brand" style={styles.hero}>
          <View style={styles.heroHeaderRow}>
            <View style={{ flex: 1 }}>
              <AppText variant="titleSm" weight="bold" tone="inverse">
                Invoices
              </AppText>
              <AppText variant="caption" tone="inverse" style={styles.heroSubtitle}>
                Your earnings & billing records
              </AppText>
            </View>
            <Pressable accessibilityRole="button" onPress={() => load("refresh")} style={styles.heroRefreshButton}>
              <RefreshCw color={colors.white} size={18} />
            </Pressable>
          </View>
        </AppCard>

        <View style={styles.statsGrid}>
          <Pressable
            accessibilityRole="button"
            onPress={() => toggleFilter("ALL")}
            style={({ pressed }) => [styles.statTilePressable, pressed && styles.statTilePressed]}
          >
            <AppCard style={[styles.statTile, statusFilter === "ALL" && styles.statTileActive]}>
              <View style={[styles.statIconCircle, { backgroundColor: colors.brand[50] }]}>
                <Wallet color={colors.primary} size={16} />
              </View>
              <AppText variant="caption" tone="muted">
                Total Revenue
              </AppText>
              <AmountText amount={stats.totalRevenue} variant="bodySmall" />
            </AppCard>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => toggleFilter("PAID")}
            style={({ pressed }) => [styles.statTilePressable, pressed && styles.statTilePressed]}
          >
            <AppCard style={[styles.statTile, statusFilter === "PAID" && styles.statTileActive]}>
              <View style={[styles.statIconCircle, { backgroundColor: colors.brand[50] }]}>
                <CheckCircle2 color={colors.success} size={16} />
              </View>
              <AppText variant="caption" tone="muted">
                Paid
              </AppText>
              <AmountText amount={stats.paidTotal} variant="bodySmall" />
            </AppCard>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => toggleFilter("PENDING")}
            style={({ pressed }) => [styles.statTilePressable, pressed && styles.statTilePressed]}
          >
            <AppCard style={[styles.statTile, statusFilter === "PENDING" && styles.statTileActive]}>
              <View style={[styles.statIconCircle, { backgroundColor: "#fef3c7" }]}>
                <Clock color={colors.warning} size={16} />
              </View>
              <AppText variant="caption" tone="muted">
                Pending
              </AppText>
              <AppText variant="bodySmall" weight="bold">
                {stats.pendingCount}
              </AppText>
            </AppCard>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => toggleFilter("REJECTED")}
            style={({ pressed }) => [styles.statTilePressable, pressed && styles.statTilePressed]}
          >
            <AppCard style={[styles.statTile, statusFilter === "REJECTED" && styles.statTileActive]}>
              <View style={[styles.statIconCircle, { backgroundColor: "#fee2e2" }]}>
                <AlertTriangle color={colors.danger} size={16} />
              </View>
              <AppText variant="caption" tone="muted">
                Rejected
              </AppText>
              <AppText variant="bodySmall" weight="bold">
                {stats.rejectedCount}
              </AppText>
            </AppCard>
          </Pressable>
        </View>

        {stats.totalCount > 0 && (
          <AppCard style={styles.chartCard}>
            <AppText variant="label" weight="bold" tone="muted" style={styles.sectionTitle}>
              Status Breakdown
            </AppText>
            <Svg width="100%" height={CHART_BAR_HEIGHT} viewBox="0 0 100 10" preserveAspectRatio="none">
              {(() => {
                let offset = 0;
                return chartSegments
                  .filter((segment) => segment.ratio > 0)
                  .map((segment) => {
                    const width = segment.ratio * 100;
                    const rect = <Rect key={segment.key} x={offset} y={0} width={width} height={CHART_BAR_HEIGHT} fill={segment.color} />;
                    offset += width;
                    return rect;
                  });
              })()}
            </Svg>
            <View style={styles.chartLegend}>
              {chartSegments.map((segment) => (
                <Pressable
                  key={segment.key}
                  accessibilityRole="button"
                  onPress={() => toggleFilter(segment.key)}
                  style={[styles.legendItem, statusFilter === segment.key && styles.legendItemActive]}
                >
                  <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
                  <AppText variant="caption" tone="muted">
                    {segment.label} ({segment.count})
                  </AppText>
                </Pressable>
              ))}
            </View>
          </AppCard>
        )}

        <View style={styles.sectionTitleRow}>
          <AppText variant="label" weight="bold" tone="muted" style={styles.sectionTitle}>
            Invoice Records{statusFilter !== "ALL" ? ` · ${statusFilter}` : ""}
          </AppText>
          {statusFilter !== "ALL" && (
            <Pressable accessibilityRole="button" onPress={() => setStatusFilter("ALL")}>
              <AppText variant="caption" tone="primary" weight="bold">
                Clear filter
              </AppText>
            </Pressable>
          )}
        </View>

        {loading ? (
          <StateView title="Loading your invoices" message="Fetching your invoices." />
        ) : error ? (
          <StateView title="Could not load invoices" message={error} actionLabel="Try again" onAction={() => load()} />
        ) : items.length === 0 ? (
          <StateView title="No invoices yet" message="Your invoices will appear here." />
        ) : filteredItems.length === 0 ? (
          <StateView title="No matching invoices" message="No invoices found for this filter." />
        ) : (
          <AppStack gap={2}>
            {filteredItems.map((item) => (
              <Pressable key={item.id} accessibilityRole="button" onPress={() => navigation.navigate("InvoiceDetail", { invoice: item })}>
                <AppCard style={styles.card}>
                  <View style={styles.row}>
                    <View style={styles.iconCircle}>
                      <FileText color={colors.primary} size={16} />
                    </View>
                    <View style={styles.recordInfo}>
                      <AppText variant="bodySmall" weight="bold">
                        {item.invoiceNumber || `Invoice #${item.invoiceId}`}
                      </AppText>
                      <AppText variant="caption" tone="muted">
                        {formatDate(item.issuedAt)}
                        {item.tripCode ? ` · Trip ${item.tripCode}` : ""}
                      </AppText>
                    </View>
                    <ChevronRight color={colors.softText} size={18} />
                  </View>
                  <View style={styles.row}>
                    <StatusBadge status={INVOICE_STATUS_TONE[item.status]} label={item.status} />
                    <AmountText amount={item.gross ?? 0} variant="bodySmall" />
                  </View>
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
  hero: {
    gap: spacing[1]
  },
  heroHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3]
  },
  heroSubtitle: {
    opacity: 0.8,
    marginTop: spacing[1]
  },
  heroRefreshButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)"
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[3]
  },
  statTilePressable: {
    flexBasis: "47%",
    flexGrow: 1
  },
  statTilePressed: {
    opacity: 0.7
  },
  statTile: {
    gap: spacing[1]
  },
  statTileActive: {
    borderWidth: 2,
    borderColor: colors.primary
  },
  statIconCircle: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center"
  },
  chartCard: {
    gap: spacing[2]
  },
  chartLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[3]
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1],
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[1],
    borderRadius: radius.sm
  },
  legendItemActive: {
    backgroundColor: colors.brand[50]
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sectionTitle: {
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  card: {
    gap: spacing[2]
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[2]
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.brand[50],
    alignItems: "center",
    justifyContent: "center"
  },
  recordInfo: {
    flex: 1,
    gap: spacing[1] / 2,
    minWidth: 0
  }
});
