import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppButton, AppCard, AppInput, AppStack, AppText, colors, radius, ResponsiveRow, spacing, StateView } from "@nolsaf/native-ui";
import { ArrowLeft, Check, CheckCircle2, Clock, DollarSign, MessageSquare, Star, Target, TrendingUp } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { useAuth } from "../auth/AuthProvider";
import { fetchDriverLevel, sendLevelMessage } from "../driver/driverApi";
import { AdminLevelMessageResponse, DriverLevel } from "../driver/types";
import { useDriverSocket } from "../hooks/useDriverSocket";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Level">;

type ConversationMessage = {
  from: "driver" | "admin";
  name?: string;
  text: string;
  timestamp: string;
};

const TIER_PALETTES: Record<number, { badge: string; achievedBorder: string; achievedBg: string; nextBorder: string; nextBg: string; icon: string; nextIcon: string }> = {
  1: {
    badge: "#94a3b8",
    achievedBorder: "#10b981",
    achievedBg: "#ecfdf5",
    nextBorder: "#10b981",
    nextBg: "#ecfdf5",
    icon: "#059669",
    nextIcon: "#059669"
  },
  2: {
    badge: "#fbbf24",
    achievedBorder: "#eab308",
    achievedBg: "#fefce8",
    nextBorder: "#fde047",
    nextBg: "#fefce8",
    icon: "#ca8a04",
    nextIcon: "#eab308"
  },
  3: {
    badge: "#a855f7",
    achievedBorder: "#a855f7",
    achievedBg: "#faf5ff",
    nextBorder: "#d8b4fe",
    nextBg: "#faf5ff",
    icon: "#9333ea",
    nextIcon: "#a855f7"
  }
};

export function LevelScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [level, setLevel] = useState<DriverLevel | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);

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

  useDriverSocket({
    "trip:update": (payload) => {
      const status = (payload as { status?: string } | null)?.status;
      if (status === "COMPLETED") void load("refresh");
    },
    "admin-level-message-response": (payload) => {
      const data = payload as AdminLevelMessageResponse | null;
      if (!data) return;
      setMessages((prev) => [
        ...prev,
        { from: "admin", name: data.adminName, text: data.response, timestamp: data.timestamp }
      ]);
    }
  });

  async function handleSend() {
    if (!token || !message.trim()) return;
    const text = message.trim();
    setSending(true);
    setSent(false);
    try {
      await sendLevelMessage(token, text);
      setMessages((prev) => [...prev, { from: "driver", text, timestamp: new Date().toISOString() }]);
      setMessage("");
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send your message.");
    } finally {
      setSending(false);
    }
  }

  const overallProgress = useMemo(() => {
    if (!level) return 0;
    if (level.currentLevel === 3) return 100;
    const { earnings, trips, rating, reviews, goals } = level.progress;
    return Math.round((earnings + trips + rating + reviews + goals) / 5);
  }, [level]);

  const metrics = useMemo(() => {
    if (!level) return [];
    const atMax = level.currentLevel === 3;
    return [
      {
        id: "earnings",
        title: "Earnings",
        icon: DollarSign,
        color: "#10b981",
        bg: "#ecfdf5",
        percent: level.progress.earnings,
        valueLabel: `${level.totalEarnings.toLocaleString()} / ${level.earningsForNextLevel > 0 ? `${level.earningsForNextLevel.toLocaleString()} TZS` : "Max"}`,
        footnote: atMax
          ? "Maximum level reached!"
          : `${Math.max(0, Math.round((level.earningsForNextLevel - level.totalEarnings) / 1000))}K TZS to next level`
      },
      {
        id: "trips",
        title: "Trips",
        icon: TrendingUp,
        color: "#3b82f6",
        bg: "#eff6ff",
        percent: level.progress.trips,
        valueLabel: `${level.totalTrips.toLocaleString()} / ${level.tripsForNextLevel > 0 ? level.tripsForNextLevel.toLocaleString() : "Max"}`,
        footnote: atMax
          ? "Maximum level reached!"
          : `${Math.max(0, Math.round(level.tripsForNextLevel - level.totalTrips))} trips to next level`
      },
      {
        id: "rating",
        title: "Rating",
        icon: Star,
        color: "#eab308",
        bg: "#fefce8",
        percent: level.progress.rating,
        valueLabel: `${level.averageRating.toFixed(1)} / ${level.ratingForNextLevel > 0 ? level.ratingForNextLevel.toFixed(1) : "Max"}`,
        footnote: atMax ? "Maximum level reached!" : `Maintain ${level.ratingForNextLevel.toFixed(1)}+ rating`
      },
      {
        id: "reviews",
        title: "Reviews",
        icon: MessageSquare,
        color: "#a855f7",
        bg: "#faf5ff",
        percent: level.progress.reviews,
        valueLabel: `${level.totalReviews.toLocaleString()} / ${level.reviewsForNextLevel > 0 ? level.reviewsForNextLevel.toLocaleString() : "Max"}`,
        footnote: atMax
          ? "Maximum level reached!"
          : `${Math.max(0, Math.round(level.reviewsForNextLevel - level.totalReviews))} reviews to next level`
      },
      {
        id: "goals",
        title: "Goals",
        icon: Target,
        color: "#10b981",
        bg: "#ecfdf5",
        percent: level.progress.goals,
        valueLabel: `${level.goalsCompleted.toLocaleString()} / ${level.goalsForNextLevel > 0 ? level.goalsForNextLevel.toLocaleString() : "Max"}`,
        footnote: atMax
          ? "Maximum level reached!"
          : `${Math.max(0, Math.round(level.goalsForNextLevel - level.goalsCompleted))} goals to next level`
      }
    ];
  }, [level]);

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
              {level.currentLevel < 3 ? (
                <View style={styles.heroProgressBlock}>
                  <View style={styles.progressLabelRow}>
                    <AppText variant="caption" tone="inverse">
                      Progress to {level.nextLevelName}
                    </AppText>
                    <AppText variant="caption" weight="bold" tone="inverse">
                      {overallProgress}%
                    </AppText>
                  </View>
                  <View style={styles.heroProgressTrack}>
                    <View style={[styles.heroProgressFill, { width: `${Math.max(0, Math.min(100, overallProgress))}%` }]} />
                  </View>
                </View>
              ) : null}
            </AppCard>

            <AppCard style={styles.card}>
              <AppText variant="titleSm" weight="bold">
                Progress to next level
              </AppText>
              <ResponsiveRow gap={3} style={styles.metricsRow}>
                {metrics.map((metric) => (
                  <MetricCard key={metric.id} {...metric} />
                ))}
              </ResponsiveRow>
            </AppCard>

            <AppCard style={styles.card}>
              <AppText variant="titleSm" weight="bold">
                Level Benefits
              </AppText>
              <AppStack gap={3}>
                {level.allLevels.map((tier) => (
                  <LevelTierCard key={tier.level} tier={tier} currentLevel={level.currentLevel} />
                ))}
              </AppStack>
            </AppCard>

            <AppCard style={styles.card}>
              <AppText variant="titleSm" weight="bold">
                Message admin
              </AppText>
              {messages.length > 0 ? (
                <AppStack gap={2}>
                  {messages.map((item, index) => (
                    <View
                      key={index}
                      style={[
                        styles.messageBubble,
                        item.from === "driver" ? styles.messageBubbleDriver : styles.messageBubbleAdmin
                      ]}
                    >
                      <AppText variant="caption" weight="bold" tone={item.from === "driver" ? "success" : "primary"}>
                        {item.from === "driver" ? "You" : item.name || "Admin"}
                      </AppText>
                      <AppText variant="bodySmall">{item.text}</AppText>
                    </View>
                  ))}
                </AppStack>
              ) : null}
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

function MetricCard({
  title,
  icon: Icon,
  color,
  bg,
  percent,
  valueLabel,
  footnote
}: {
  title: string;
  icon: typeof DollarSign;
  color: string;
  bg: string;
  percent: number;
  valueLabel: string;
  footnote: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricHeaderRow}>
        <View style={[styles.metricIconCircle, { backgroundColor: bg }]}>
          <Icon color={color} size={16} />
        </View>
        <AppText variant="bodySmall" weight="bold">
          {title}
        </AppText>
      </View>
      <AppText variant="bodySmall" weight="bold">
        {valueLabel}
      </AppText>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <AppText variant="caption" tone="muted">
        {footnote}
      </AppText>
    </View>
  );
}

function LevelTierCard({
  tier,
  currentLevel
}: {
  tier: { level: number; levelName: string; benefits: string[] };
  currentLevel: number;
}) {
  const palette = TIER_PALETTES[tier.level] ?? TIER_PALETTES[1];
  const achieved = currentLevel >= tier.level;
  const isNext = currentLevel + 1 === tier.level;
  const borderColor = achieved ? palette.achievedBorder : isNext ? palette.nextBorder : colors.border;
  const backgroundColor = achieved ? palette.achievedBg : isNext ? palette.nextBg : colors.surface;
  const iconColor = achieved ? palette.icon : palette.nextIcon;

  return (
    <View style={[styles.tierCard, { borderColor, backgroundColor }]}>
      <View style={styles.tierHeaderRow}>
        <View style={[styles.tierBadge, { backgroundColor: palette.badge }]}>
          <AppText variant="caption" weight="bold" tone="inverse">
            {tier.levelName}
          </AppText>
        </View>
        {achieved ? (
          <CheckCircle2 color={iconColor} size={18} />
        ) : isNext ? (
          <Clock color={iconColor} size={18} />
        ) : (
          <Clock color={colors.softText} size={18} />
        )}
      </View>
      <AppStack gap={1}>
        {tier.benefits.map((benefit, index) => (
          <View key={index} style={styles.benefitRow}>
            {achieved ? <Check color={iconColor} size={14} /> : <Clock color={colors.softText} size={14} />}
            <AppText variant="caption" tone={achieved || isNext ? "default" : "muted"} style={styles.benefitText}>
              {benefit}
            </AppText>
          </View>
        ))}
      </AppStack>
      {achieved ? (
        <AppText variant="caption" weight="bold" style={{ color: iconColor }}>
          ✓ Achieved
        </AppText>
      ) : isNext ? (
        <AppText variant="caption" weight="bold" style={{ color: iconColor }}>
          → Next Level
        </AppText>
      ) : null}
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
  heroProgressBlock: {
    marginTop: spacing[2]
  },
  heroProgressTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden"
  },
  heroProgressFill: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.white
  },
  card: {
    gap: spacing[3]
  },
  metricsRow: {
    flexWrap: "wrap"
  },
  metricCard: {
    flexBasis: "47%",
    flexGrow: 1,
    gap: spacing[1],
    padding: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card
  },
  metricHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2]
  },
  metricIconCircle: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center"
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
  messageBubble: {
    padding: spacing[3],
    borderRadius: radius.lg,
    gap: spacing[1]
  },
  messageBubbleDriver: {
    backgroundColor: "#ecfdf5",
    alignSelf: "flex-end"
  },
  messageBubbleAdmin: {
    backgroundColor: "#eff6ff",
    alignSelf: "flex-start"
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
  },
  tierCard: {
    borderWidth: 2,
    borderRadius: radius.lg,
    padding: spacing[3],
    gap: spacing[2]
  },
  tierHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  tierBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.full
  }
});
