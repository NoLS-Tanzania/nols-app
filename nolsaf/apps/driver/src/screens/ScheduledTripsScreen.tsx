import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppButton, AppStack, AppText, colors, radius, shadows, spacing, StateView } from "@nolsaf/native-ui";
import { ArrowLeft, Check, Star } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { useAuth } from "../auth/AuthProvider";
import { formatTripWhen, TripCard } from "../components/TripCard";
import { claimTrip, fetchAssignedScheduledTrips, fetchClaimsFinished, fetchClaimsPending, fetchScheduledTrips } from "../driver/driverApi";
import { ClaimItem, FinishedClaimItem, ScheduledTripItem } from "../driver/types";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "ScheduledTrips">;

type TabKey = "available" | "assigned" | "claims" | "finished";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "available", label: "Available" },
  { key: "assigned", label: "Assigned" },
  { key: "claims", label: "Claims" },
  { key: "finished", label: "Finished" }
];

type AnyScheduledItem = ScheduledTripItem & Partial<ClaimItem> & Partial<FinishedClaimItem>;

export function ScheduledTripsScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("available");
  const [items, setItems] = useState<AnyScheduledItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [claimTarget, setClaimTarget] = useState<AnyScheduledItem | null>(null);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedAuction, setAgreedAuction] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const load = useCallback(
    async (tab: TabKey, mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        setError("Please sign in to view scheduled trips.");
        setLoading(false);
        return;
      }
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        if (tab === "available") {
          const res = await fetchScheduledTrips(token);
          setItems(res.items || []);
        } else if (tab === "assigned") {
          const res = await fetchAssignedScheduledTrips(token);
          setItems(res.items || []);
        } else if (tab === "claims") {
          const res = await fetchClaimsPending(token);
          setItems(res.items || []);
        } else {
          const res = await fetchClaimsFinished(token);
          setItems(res.items || []);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load scheduled trips.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    void load(activeTab);
  }, [activeTab, load]);

  function openClaim(item: AnyScheduledItem) {
    setClaimTarget(item);
    setAgreedTerms(false);
    setAgreedAuction(false);
  }

  async function confirmClaim() {
    if (!token || !claimTarget) return;
    setClaiming(true);
    try {
      await claimTrip(token, claimTarget.id);
      setClaimTarget(null);
      await load("available", "refresh");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not claim this trip.");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={colors.ink} size={22} />
        </Pressable>
        <AppText variant="title" weight="bold">
          Scheduled trips
        </AppText>
      </View>

      <View style={styles.tabsRow}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            accessibilityRole="button"
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          >
            <AppText variant="caption" weight="bold" tone={activeTab === tab.key ? "inverse" : "muted"}>
              {tab.label}
            </AppText>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(activeTab, "refresh")} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {loading ? (
          <StateView title="Loading trips" message="Fetching scheduled trips." />
        ) : error ? (
          <StateView title="Could not load trips" message={error} actionLabel="Try again" onAction={() => load(activeTab)} />
        ) : items.length === 0 ? (
          <StateView title="Nothing here yet" message="Check back later for scheduled trips." />
        ) : (
          <AppStack gap={2}>
            {items.map((item) => (
              <TripCard
                key={item.id}
                pickup={item.fromAddress || item.pickupLocation || null}
                dropoff={item.toAddress || null}
                when={formatTripWhen(item.pickupTime || item.scheduledDate)}
                tripCode={item.tripCode}
                amount={item.amount}
                currency={item.currency}
                rightSlot={
                  activeTab === "available" && item.canClaim ? (
                    <AppButton title="Claim" onPress={() => openClaim(item)} />
                  ) : activeTab === "claims" ? (
                    <AppText variant="caption" tone="soft">
                      Claim status: {item.claimStatus}
                    </AppText>
                  ) : activeTab === "finished" && item.driverRating ? (
                    <View style={styles.ratingRow}>
                      <Star color={colors.warning} size={16} fill={colors.warning} />
                      <AppText variant="caption" weight="bold">
                        {item.driverRating.toFixed(1)}
                      </AppText>
                    </View>
                  ) : null
                }
              />
            ))}
          </AppStack>
        )}
      </ScrollView>

      <Modal visible={Boolean(claimTarget)} transparent animationType="fade" onRequestClose={() => setClaimTarget(null)}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <AppStack gap={5}>
              <AppStack gap={2}>
                <AppText variant="title" weight="bold">
                  Claim this trip?
                </AppText>
                <AppText variant="body" tone="muted">
                  Confirm both agreements before claiming this scheduled trip.
                </AppText>
              </AppStack>

              <AppStack gap={3}>
                <Pressable accessibilityRole="checkbox" onPress={() => setAgreedTerms((v) => !v)} style={styles.checkboxRow}>
                  <View style={[styles.checkbox, agreedTerms && styles.checkboxChecked]}>
                    {agreedTerms ? <Check color={colors.white} size={14} /> : null}
                  </View>
                  <AppText variant="bodySmall" style={styles.checkboxLabel}>
                    I agree to the Terms of Service
                  </AppText>
                </Pressable>
                <Pressable accessibilityRole="checkbox" onPress={() => setAgreedAuction((v) => !v)} style={styles.checkboxRow}>
                  <View style={[styles.checkbox, agreedAuction && styles.checkboxChecked]}>
                    {agreedAuction ? <Check color={colors.white} size={14} /> : null}
                  </View>
                  <AppText variant="bodySmall" style={styles.checkboxLabel}>
                    I agree to the NoLSAF Auction Policy
                  </AppText>
                </Pressable>
              </AppStack>

              <AppStack gap={2}>
                <AppButton title="Agree & Claim" onPress={confirmClaim} loading={claiming} disabled={!agreedTerms || !agreedAuction} />
                <AppButton title="Cancel" variant="ghost" onPress={() => setClaimTarget(null)} />
              </AppStack>
            </AppStack>
          </View>
        </View>
      </Modal>
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
  tabsRow: {
    flexDirection: "row",
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4]
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  scrollContent: {
    gap: spacing[4],
    padding: spacing[4],
    paddingBottom: spacing[8]
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1]
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(2,6,23,0.42)",
    padding: spacing[4]
  },
  sheet: {
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    padding: spacing[5],
    ...shadows.sheet
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    minWidth: 0
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  checkboxLabel: {
    flex: 1,
    minWidth: 0
  }
});
