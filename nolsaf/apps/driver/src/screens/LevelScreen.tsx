import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppButton, AppCard, AppInput, AppStack, AppText, colors, radius, spacing, StateView } from "@nolsaf/native-ui";
import { ArrowLeft, Check } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { useAuth } from "../auth/AuthProvider";
import { fetchDriverLevel, sendLevelMessage } from "../driver/driverApi";
import { DriverLevel } from "../driver/types";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Level">;

const PROGRESS_ROWS: Array<{ key: keyof DriverLevel["progress"]; label: string }> = [
  { key: "earnings", label: "Earnings" },
  { key: "trips", label: "Trips" },
  { key: "rating", label: "Rating" },
  { key: "reviews", label: "Reviews" },
  { key: "goals", label: "Goals" }
];

export function LevelScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [level, setLevel] = useState<DriverLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        setError("Please sign in to view your level.");
        setLoading(false);
        return;
      }
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        setLevel(await fetchDriverLevel(token));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load your level.");
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

  async function handleSend() {
    if (!token || !message.trim()) return;
    setSending(true);
    setSent(false);
    try {
      await sendLevelMessage(token, message.trim());
      setMessage("");
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send your message.");
    } finally {
      setSending(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={colors.ink} size={22} />
        </Pressable>
        <AppText variant="title" weight="bold">
          Level
        </AppText>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {loading ? (
          <StateView title="Loading your level" message="Fetching your level progress." />
        ) : error && !level ? (
          <StateView title="Could not load your level" message={error} actionLabel="Try again" onAction={() => load()} />
        ) : level ? (
          <AppStack gap={4}>
            <AppCard tone="brand" style={styles.heroCard}>
              <AppText variant="bodySmall" tone="inverse">
                Current level
              </AppText>
              <AppText variant="headline" weight="extraBold" tone="inverse">
                {level.levelName}
              </AppText>
              <AppText variant="bodySmall" tone="inverse">
                Next: {level.nextLevelName}
              </AppText>
            </AppCard>

            <AppCard style={styles.card}>
              <AppText variant="titleSm" weight="bold">
                Progress to next level
              </AppText>
              <AppStack gap={3}>
                {PROGRESS_ROWS.map((row) => (
                  <ProgressRow key={row.key} label={row.label} value={level.progress[row.key]} />
                ))}
              </AppStack>
            </AppCard>

            <AppCard style={styles.card}>
              <AppText variant="titleSm" weight="bold">
                Your current benefits
              </AppText>
              <AppStack gap={2}>
                {level.levelBenefits.map((benefit, index) => (
                  <View key={index} style={styles.benefitRow}>
                    <Check color={colors.success} size={16} />
                    <AppText variant="bodySmall" style={styles.benefitText}>
                      {benefit}
                    </AppText>
                  </View>
                ))}
              </AppStack>
            </AppCard>

            <AppCard style={styles.card}>
              <AppText variant="titleSm" weight="bold">
                Benefits at {level.nextLevelName}
              </AppText>
              <AppStack gap={2}>
                {level.nextLevelBenefits.map((benefit, index) => (
                  <View key={index} style={styles.benefitRow}>
                    <Check color={colors.primary} size={16} />
                    <AppText variant="bodySmall" style={styles.benefitText}>
                      {benefit}
                    </AppText>
                  </View>
                ))}
              </AppStack>
            </AppCard>

            <AppCard style={styles.card}>
              <AppText variant="titleSm" weight="bold">
                Message admin
              </AppText>
              <AppInput
                label="Your message"
                placeholder="Ask about your level or benefits"
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={4}
                style={styles.messageInput}
              />
              {sent ? (
                <AppText variant="caption" tone="success">
                  Message sent successfully.
                </AppText>
              ) : null}
              {error ? (
                <AppText variant="caption" tone="danger">
                  {error}
                </AppText>
              ) : null}
              <AppButton title="Send message" onPress={handleSend} loading={sending} disabled={!message.trim()} />
            </AppCard>
          </AppStack>
        ) : null}
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
  heroCard: {
    gap: spacing[1]
  },
  card: {
    gap: spacing[3]
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing[2]
  },
  benefitText: {
    flex: 1,
    minWidth: 0
  },
  messageInput: {
    minHeight: 96,
    textAlignVertical: "top",
    paddingTop: spacing[3]
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
