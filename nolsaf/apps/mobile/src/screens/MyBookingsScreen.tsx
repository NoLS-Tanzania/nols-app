import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CalendarCheck } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "../auth";
import { BookingListItem, fetchMyBookings } from "../bookings";
import {
  AppCard,
  AppStack,
  AppText,
  CodeText,
  CustomerBottomNav,
  GetThereSection,
  SafeScreen,
  ScreenHeader,
  StateView,
  StatusBadge
} from "../components";
import { RootStackParamList } from "../navigation/types";
import { colors, radius, spacing } from "../theme";

type Props = NativeStackScreenProps<RootStackParamList, "MyBookings">;

type BadgeStatus = "paid" | "pending" | "completed" | "cancelled" | "approved";

function toBadgeStatus(booking: BookingListItem): BadgeStatus {
  const status = String(booking.status || "").toUpperCase();
  if (status === "CANCELED" || status === "CANCELLED") return "cancelled";
  if (status === "CHECKED_OUT") return "completed";
  if (booking.isPaid) return "paid";
  if (booking.dashboardBucket === "DRAFT") return "pending";
  return "approved";
}

function formatDates(checkIn: string | null, checkOut: string | null) {
  if (!checkIn || !checkOut) return "Dates pending";
  const fmt = (iso: string) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString();
  };
  return `${fmt(checkIn)} → ${fmt(checkOut)}`;
}

export function MyBookingsScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [items, setItems] = useState<BookingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setError("Please sign in to view your bookings.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetchMyBookings(token, { page: 1, pageSize: 20 });
      setItems(response.items || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load bookings.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={styles.root}>
      <SafeScreen contentStyle={styles.screen}>
        <AppStack gap={5}>
          <ScreenHeader
            title="My bookings"
            subtitle="Your verified stays. Add NoLSAF transport to any paid booking to reach it door to door."
            centered
          />

          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
              <AppText variant="bodySmall" tone="muted">
                Loading your bookings...
              </AppText>
            </View>
          ) : error ? (
            <StateView title="Could not load bookings" message={error} actionLabel="Try again" onAction={load} />
          ) : items.length === 0 ? (
            <StateView
              title="No bookings yet"
              message="Book a verified stay first. Transport is offered on your booked stays, because NoLSAF brings you to them."
              actionLabel="Browse verified stays"
              onAction={() => navigation.navigate("VerifiedStays")}
            />
          ) : (
            <AppStack gap={5}>
              {items.map((booking) => {
                const badge = toBadgeStatus(booking);
                const title = booking.property?.title || "NoLSAF stay";
                const area = [booking.property?.regionName, booking.property?.district, booking.property?.city]
                  .filter(Boolean)
                  .join(", ");
                return (
                  <AppStack key={booking.id} gap={3}>
                    <AppCard>
                      <AppStack gap={3}>
                        <View style={styles.header}>
                          <View style={styles.iconWrap}>
                            <CalendarCheck color={colors.primary} size={22} />
                          </View>
                          <StatusBadge status={badge} />
                        </View>
                        <AppText variant="titleSm" weight="bold" numberOfLines={2}>
                          {title}
                        </AppText>
                        {area ? (
                          <AppText variant="bodySmall" tone="muted" numberOfLines={2}>
                            {area}
                          </AppText>
                        ) : null}
                        <AppText variant="caption" tone="muted">
                          {formatDates(booking.checkIn, booking.checkOut)}
                        </AppText>
                        {booking.bookingCode ? <CodeText value={booking.bookingCode} /> : null}
                      </AppStack>
                    </AppCard>

                    {booking.isPaid ? (
                      <View style={styles.transportWrap}>
                        <GetThereSection
                          booking={{
                            bookingId: booking.id,
                            propertyId: booking.property?.id ?? null,
                            propertyTitle: title,
                            propertyArea: area
                          }}
                        />
                      </View>
                    ) : (
                      <AppText variant="caption" tone="muted" style={styles.gateNote}>
                        Complete payment for this stay to add NoLSAF transport.
                      </AppText>
                    )}
                  </AppStack>
                );
              })}
            </AppStack>
          )}
        </AppStack>
      </SafeScreen>

      <CustomerBottomNav active="MyBookings" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface
  },
  screen: {
    paddingBottom: spacing[8]
  },
  loading: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[3],
    padding: spacing[6]
  },
  header: {
    minWidth: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing[3]
  },
  iconWrap: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.brand[50]
  },
  transportWrap: {
    borderLeftWidth: 2,
    borderLeftColor: colors.brand[100],
    paddingLeft: spacing[3]
  },
  gateNote: {
    paddingLeft: spacing[1]
  }
});
