import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AmountText, AppButton, AppCard, AppStack, AppText, colors, ConfirmSheet, radius, SafeScreen, spacing, StateView } from "@nolsaf/native-ui";
import { ArrowLeft, MapPin, Phone, User } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";

import { useAuth } from "../auth/AuthProvider";
import { formatTripWhen } from "../components/TripCard";
import { TripStatusBadge } from "../components/TripStatusBadge";
import {
  acceptTrip,
  cancelTrip,
  declineTrip,
  fetchMessageTemplates,
  fetchTripDetail,
  sendQuickMessage,
  updateTripStage
} from "../driver/driverApi";
import { MessageTemplate, TRIP_STAGE_FLOW, TRIP_STAGE_LABELS, TripDetail } from "../driver/types";
import { useLocationPing } from "../hooks/useLocationPing";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "TripDetail">;

export function TripDetailScreen({ navigation, route }: Props) {
  const { tripId } = route.params;
  const { token } = useAuth();
  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [cancelVisible, setCancelVisible] = useState(false);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [sendingKey, setSendingKey] = useState<string | null>(null);
  const [sentKey, setSentKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setError("Please sign in to view this trip.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const detail = await fetchTripDetail(token, tripId);
      setTrip(detail);
      setStageIndex(detail.status === "IN_PROGRESS" && detail.pickupTime ? 2 : 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load this trip.");
    } finally {
      setLoading(false);
    }
  }, [token, tripId]);

  useEffect(() => {
    void load();
  }, [load]);

  const isActive = trip?.status === "CONFIRMED" || trip?.status === "IN_PROGRESS";

  useLocationPing({ enabled: Boolean(isActive), tripId, token });

  useEffect(() => {
    if (!token || !isActive) return;
    fetchMessageTemplates(token)
      .then((res) => setTemplates(res.templates || []))
      .catch(() => setTemplates([]));
  }, [token, isActive]);

  const nextStage = useMemo(() => TRIP_STAGE_FLOW[stageIndex] ?? null, [stageIndex]);

  async function handleAccept() {
    if (!token || !trip) return;
    setActionLoading(true);
    try {
      await acceptTrip(token, trip.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not accept this trip.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDecline() {
    if (!token || !trip) return;
    setActionLoading(true);
    try {
      await declineTrip(token, trip.id);
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not decline this trip.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAdvanceStage() {
    if (!token || !trip || !nextStage) return;
    setActionLoading(true);
    try {
      await updateTripStage(token, trip.id, { stage: nextStage });
      if (nextStage === "completed") {
        await load();
      } else {
        setStageIndex((i) => i + 1);
        await load();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update the trip stage.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancel() {
    if (!token || !trip) return;
    setActionLoading(true);
    try {
      await cancelTrip(token, trip.id);
      setCancelVisible(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not cancel this trip.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleQuickMessage(template: MessageTemplate) {
    if (!token || !trip) return;
    setSendingKey(template.key);
    try {
      await sendQuickMessage(token, String(trip.passengerUserId), template.key);
      setSentKey(template.key);
      setTimeout(() => setSentKey(null), 2500);
    } catch {
      // best effort - the driver can try again
    } finally {
      setSendingKey(null);
    }
  }

  function callPassenger() {
    if (!trip?.phoneNumber) return;
    Linking.openURL(`tel:${trip.phoneNumber}`);
  }

  return (
    <View style={styles.root}>
      <SafeScreen contentStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color={colors.ink} size={22} />
          </Pressable>
          <AppText variant="title" weight="bold">
            Trip details
          </AppText>
        </View>

        {loading ? (
          <StateView title="Loading trip" message="Fetching the trip details." />
        ) : error ? (
          <StateView title="Could not load this trip" message={error} actionLabel="Try again" onAction={() => load()} />
        ) : trip ? (
          <AppStack gap={3}>
            <AppCard>
              <AppStack gap={2}>
                <View style={styles.topRow}>
                  <TripStatusBadge status={trip.status} />
                  {trip.tripCode ? (
                    <AppText variant="caption" tone="soft">
                      {trip.tripCode}
                    </AppText>
                  ) : null}
                </View>
                <AppText variant="bodySmall" tone="muted">
                  {formatTripWhen(trip.pickupTime || trip.scheduledDate) || "Time not set"}
                </AppText>
                {trip.amount != null ? <AmountText amount={trip.amount} currency={trip.currency || "TZS"} /> : null}
              </AppStack>
            </AppCard>

            <AppCard>
              <AppStack gap={3}>
                <AppText variant="titleSm" weight="bold">
                  Route
                </AppText>
                <View style={styles.routeRow}>
                  <MapPin color={colors.primary} size={18} />
                  <AppStack gap={0} style={styles.routeText}>
                    <AppText variant="caption" tone="muted">
                      Pickup
                    </AppText>
                    <AppText variant="bodySmall" weight="medium">
                      {trip.pickupAddress || trip.pickup || "Not specified"}
                    </AppText>
                  </AppStack>
                </View>
                <View style={styles.routeRow}>
                  <MapPin color={colors.mutedText} size={18} />
                  <AppStack gap={0} style={styles.routeText}>
                    <AppText variant="caption" tone="muted">
                      Dropoff
                    </AppText>
                    <AppText variant="bodySmall" weight="medium">
                      {trip.dropoffAddress || trip.dropoff || "Not specified"}
                    </AppText>
                  </AppStack>
                </View>
              </AppStack>
            </AppCard>

            {trip.passengerName || trip.phoneNumber ? (
              <AppCard>
                <View style={styles.passengerRow}>
                  <View style={styles.passengerIcon}>
                    <User color={colors.primary} size={20} />
                  </View>
                  <AppStack gap={0} style={styles.routeText}>
                    <AppText variant="bodySmall" weight="bold" numberOfLines={1}>
                      {trip.passengerName || "Passenger"}
                    </AppText>
                    <AppText variant="caption" tone="muted">
                      {trip.notes || "No notes for this trip"}
                    </AppText>
                  </AppStack>
                  {trip.phoneNumber ? (
                    <Pressable accessibilityRole="button" onPress={callPassenger} style={styles.callButton}>
                      <Phone color={colors.white} size={18} />
                    </Pressable>
                  ) : null}
                </View>
              </AppCard>
            ) : null}

            {trip.status === "PENDING" ? (
              <AppStack gap={2}>
                <AppButton title="Accept trip" onPress={handleAccept} loading={actionLoading} />
                <AppButton title="Decline" variant="ghost" onPress={handleDecline} loading={actionLoading} />
              </AppStack>
            ) : null}

            {isActive ? (
              <AppStack gap={3}>
                {nextStage ? (
                  <AppButton title={TRIP_STAGE_LABELS[nextStage]} onPress={handleAdvanceStage} loading={actionLoading} />
                ) : null}

                {templates.length > 0 ? (
                  <AppStack gap={2}>
                    <AppText variant="titleSm" weight="bold">
                      Quick messages
                    </AppText>
                    <View style={styles.messagesRow}>
                      {templates.map((tpl) => (
                        <Pressable
                          key={tpl.key}
                          accessibilityRole="button"
                          onPress={() => handleQuickMessage(tpl)}
                          disabled={sendingKey === tpl.key}
                          style={[styles.messageChip, sentKey === tpl.key && styles.messageChipSent]}
                        >
                          <AppText variant="caption" weight="medium" tone={sentKey === tpl.key ? "success" : "default"}>
                            {sentKey === tpl.key ? "Sent" : tpl.text}
                          </AppText>
                        </Pressable>
                      ))}
                    </View>
                  </AppStack>
                ) : null}

                <AppButton title="Cancel trip" variant="danger" onPress={() => setCancelVisible(true)} />
              </AppStack>
            ) : null}
          </AppStack>
        ) : null}
      </SafeScreen>

      <ConfirmSheet
        visible={cancelVisible}
        title="Cancel this trip?"
        message="The passenger will be notified that you cancelled. This cannot be undone."
        confirmLabel="Cancel trip"
        cancelLabel="Keep trip"
        destructive
        loading={actionLoading}
        onConfirm={handleCancel}
        onCancel={() => setCancelVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface
  },
  content: {
    gap: spacing[4]
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3]
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
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minWidth: 0
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[3],
    minWidth: 0
  },
  routeText: {
    flex: 1,
    minWidth: 0
  },
  passengerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    minWidth: 0
  },
  passengerIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand[50]
  },
  callButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary
  },
  messagesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing[2]
  },
  messageChip: {
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2]
  },
  messageChipSent: {
    backgroundColor: colors.brand[50],
    borderColor: colors.brand[100]
  }
});
