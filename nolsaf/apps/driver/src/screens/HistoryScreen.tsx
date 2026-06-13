import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppStack, AppText, colors, radius, SafeScreen, spacing, StateView } from "@nolsaf/native-ui";
import { ArrowLeft } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { useAuth } from "../auth/AuthProvider";
import { formatTripWhen, TripCard } from "../components/TripCard";
import { fetchTrips } from "../driver/driverApi";
import { TripListItem } from "../driver/types";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "History">;

export function HistoryScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [trips, setTrips] = useState<TripListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        setError("Please sign in to view your trip history.");
        setLoading(false);
        return;
      }
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const response = await fetchTrips(token);
        const finished = (response.trips || []).filter((t) => t.status === "COMPLETED" || t.status === "CANCELED");
        setTrips(finished);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load your trip history.");
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
            History
          </AppText>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} tintColor={colors.primary} colors={[colors.primary]} />}
        >
          {loading ? (
            <StateView title="Loading history" message="Fetching your completed and cancelled trips." />
          ) : error ? (
            <StateView title="Could not load history" message={error} actionLabel="Try again" onAction={() => load()} />
          ) : trips.length === 0 ? (
            <StateView title="No trips yet" message="Completed and cancelled trips will show up here." />
          ) : (
            <AppStack gap={2}>
              {trips.map((trip) => (
                <TripCard
                  key={trip.id}
                  status={trip.status}
                  pickup={trip.pickup}
                  dropoff={trip.dropoff}
                  when={formatTripWhen(trip.dropoffTime || trip.pickupTime || trip.date)}
                  tripCode={trip.tripCode}
                  amount={trip.amount}
                  currency={trip.currency}
                  onPress={() => navigation.navigate("TripDetail", { tripId: trip.id })}
                />
              ))}
            </AppStack>
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
  scrollContent: { gap: spacing[4], paddingBottom: spacing[8] }
});
