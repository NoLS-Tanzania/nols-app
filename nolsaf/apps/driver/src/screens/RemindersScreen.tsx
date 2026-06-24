import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppText, colors, radius, SafeScreen, shadows, spacing, StateView } from "@nolsaf/native-ui";
import { AlertTriangle, ArrowLeft, Info } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";

import { useAuth } from "../auth/AuthProvider";
import { fetchReminders, markReminderRead } from "../driver/driverApi";
import { ReminderItem } from "../driver/types";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Reminders">;

function formatWhen(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function RemindersScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [items, setItems] = useState<ReminderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        setError("Please sign in to view your reminders.");
        setLoading(false);
        return;
      }
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const response = await fetchReminders(token);
        setItems(response || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load reminders.");
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

  async function handlePress(item: ReminderItem) {
    if (!token) return;
    if (!item.isRead) {
      try {
        await markReminderRead(token, item.id);
        setItems((prev) => prev.map((r) => (r.id === item.id ? { ...r, isRead: true } : r)));
      } catch {
        // ignore - will refresh on next load
      }
    }
    if (item.actionLink) Linking.openURL(item.actionLink);
  }

  return (
    <View style={styles.root}>
      <SafeScreen scroll={false} contentStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color={colors.ink} size={22} />
          </Pressable>
          <AppText variant="title" weight="bold">
            Reminders
          </AppText>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} tintColor={colors.primary} colors={[colors.primary]} />}
        >
          {loading ? (
            <StateView title="Loading reminders" message="Fetching your reminders." />
          ) : error ? (
            <StateView title="Could not load reminders" message={error} actionLabel="Try again" onAction={() => load()} />
          ) : items.length === 0 ? (
            <StateView title="You're all caught up" message="Reminders about your account and trips will show up here." />
          ) : (
            items.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                onPress={() => handlePress(item)}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              >
                <View style={[styles.cardIcon, !item.isRead && styles.cardIconUnread]}>
                  {item.type === "WARNING" ? (
                    <AlertTriangle color={!item.isRead ? colors.warning : colors.softText} size={16} />
                  ) : (
                    <Info color={!item.isRead ? colors.primary : colors.softText} size={16} />
                  )}
                </View>
                <View style={styles.cardBody}>
                  <AppText variant="bodySmall" weight={item.isRead ? "medium" : "bold"} numberOfLines={3}>
                    {item.message}
                  </AppText>
                  <AppText variant="caption" tone="soft">
                    {formatWhen(item.createdAt)}
                  </AppText>
                  {item.action ? (
                    <AppText variant="caption" tone="primary" weight="bold">
                      {item.action}
                    </AppText>
                  ) : null}
                </View>
              </Pressable>
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
  cardPressed: { opacity: 0.85 },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface
  },
  cardIconUnread: { backgroundColor: colors.brand[50] },
  cardBody: { flex: 1, minWidth: 0, gap: spacing[1] }
});
