import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppText, colors, radius, SafeScreen, shadows, spacing, StateView } from "@nolsaf/native-ui";
import { AlertTriangle, ArrowLeft, Bell, Info, Trash2 } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  ActivityIndicator,
  Alert,
  FlatList,
  PanResponder,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../auth/AuthProvider";
import { deleteNotification, fetchNotifications, markNotificationRead } from "../driver/driverApi";
import { NotificationItem } from "../driver/types";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Notifications">;
type Tab = "unread" | "viewed";

const DELETE_THRESHOLD = -80;
const DELETE_FULL_THRESHOLD = -160;

function formatWhen(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function SwipeableRow({
  item,
  tab,
  onPress,
  onDelete,
}: {
  item: NotificationItem;
  tab: Tab;
  onPress: () => void;
  onDelete: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const rowWidth = useRef(0);

  const snapBack = () =>
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();

  const snapDelete = (cb: () => void) =>
    Animated.timing(translateX, { toValue: -(rowWidth.current || 400), useNativeDriver: true, duration: 200 }).start(cb);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5 && g.dx < 0,
      onPanResponderMove: (_, g) => {
        // Only allow left swipe, cap at full width
        const x = Math.min(0, g.dx);
        translateX.setValue(x);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < DELETE_FULL_THRESHOLD) {
          // Swiped far enough — auto delete
          snapDelete(onDelete);
        } else if (g.dx < DELETE_THRESHOLD) {
          // Partial — snap to reveal delete button
          Animated.spring(translateX, { toValue: DELETE_THRESHOLD, useNativeDriver: true, bounciness: 4 }).start();
        } else {
          snapBack();
        }
      },
      onPanResponderTerminate: () => snapBack(),
    })
  ).current;

  // Red background behind the card — scale delete button in as card slides
  const deleteOpacity = translateX.interpolate({
    inputRange: [DELETE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  return (
    <View
      style={styles.swipeRow}
      onLayout={(e) => { rowWidth.current = e.nativeEvent.layout.width; }}
    >
      {/* Delete action revealed behind */}
      <Animated.View style={[styles.deleteZone, { opacity: deleteOpacity }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete notification"
          onPress={() => snapDelete(onDelete)}
          style={styles.deleteAction}
        >
          <Trash2 color={colors.white} size={20} />
          <Text style={styles.deleteLabel}>Delete</Text>
        </Pressable>
      </Animated.View>

      {/* Sliding card */}
      <Animated.View
        style={[styles.cardWrap, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            // Reset swipe then action
            snapBack();
            onPress();
          }}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
        >
          <View style={[styles.cardIcon, item.unread && styles.cardIconUnread]}>
            {item.severity === "warning" ? (
              <AlertTriangle color={item.unread ? colors.warning : colors.softText} size={16} />
            ) : (
              <Bell color={item.unread ? colors.primary : colors.softText} size={16} />
            )}
          </View>
          <View style={styles.cardBody}>
            <AppText variant="bodySmall" weight="bold" numberOfLines={2}>
              {item.title}
            </AppText>
            <AppText variant="caption" tone="muted" numberOfLines={3}>
              {item.body}
            </AppText>
            <AppText variant="caption" tone="soft">
              {formatWhen(item.createdAt)}
            </AppText>
          </View>
          {tab === "unread" ? <Info color={colors.brand[300]} size={16} /> : null}
        </Pressable>
      </Animated.View>
    </View>
  );
}

export function NotificationsScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [tab, setTab] = useState<Tab>("unread");
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [viewedCount, setViewedCount] = useState(0);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        setError("Please sign in to view your notifications.");
        setLoading(false);
        return;
      }
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        const response = await fetchNotifications(token, tab);
        setItems(response.items || []);
        setUnreadCount(response.totalUnread ?? 0);
        setViewedCount(response.totalViewed ?? 0);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load notifications.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token, tab]
  );

  useEffect(() => { void load(); }, [load]);

  const markRead = useCallback(
    async (id: string) => {
      if (!token) return;
      try {
        await markNotificationRead(token, id);
        setItems((prev) => prev.filter((n) => n.id !== id));
        setUnreadCount((prev) => Math.max(0, prev - 1));
        setViewedCount((prev) => prev + 1);
      } catch {
        // ignore
      }
    },
    [token]
  );

  const removeItem = useCallback(
    async (item: NotificationItem) => {
      if (!token) return;
      setItems((prev) => prev.filter((n) => n.id !== item.id));
      if (item.unread) setUnreadCount((prev) => Math.max(0, prev - 1));
      else setViewedCount((prev) => Math.max(0, prev - 1));
      try {
        await deleteNotification(token, item.id);
      } catch {
        setItems((prev) => (prev.some((n) => n.id === item.id) ? prev : [item, ...prev]));
        if (item.unread) setUnreadCount((prev) => prev + 1);
        else setViewedCount((prev) => prev + 1);
        Alert.alert("Couldn't delete", "Please try again.");
      }
    },
    [token]
  );

  return (
    <View style={styles.root}>
      <SafeScreen scroll={false} padded={false} contentStyle={styles.flex}>
        <View style={styles.headerWrap}>
          <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backButton}>
            <ArrowLeft color={colors.ink} size={22} />
          </Pressable>
          <View style={styles.headerTextWrap}>
            <AppText variant="title" weight="bold" style={styles.centerText}>
              Notifications
            </AppText>
            <AppText variant="bodySmall" tone="muted" style={styles.centerText}>
              Updates on trips, earnings and your account.
            </AppText>
          </View>
        </View>

        <View style={styles.tabsRow}>
          <Pressable accessibilityRole="button" onPress={() => setTab("unread")} style={[styles.tab, tab === "unread" && styles.tabOn]}>
            <AppText variant="bodySmall" weight="bold" tone={tab === "unread" ? "inverse" : "muted"}>Unread</AppText>
            <View style={[styles.tabCount, tab === "unread" && styles.tabCountOn]}>
              <AppText variant="caption" weight="bold" tone={tab === "unread" ? "inverse" : "muted"}>{unreadCount}</AppText>
            </View>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => setTab("viewed")} style={[styles.tab, tab === "viewed" && styles.tabOn]}>
            <AppText variant="bodySmall" weight="bold" tone={tab === "viewed" ? "inverse" : "muted"}>Viewed</AppText>
            <View style={[styles.tabCount, tab === "viewed" && styles.tabCountOn]}>
              <AppText variant="caption" weight="bold" tone={tab === "viewed" ? "inverse" : "muted"}>{viewedCount}</AppText>
            </View>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.primary} />
            <AppText variant="bodySmall" tone="muted">Loading notifications...</AppText>
          </View>
        ) : error ? (
          <View style={styles.stateWrap}>
            <StateView title="Could not load notifications" message={error} actionLabel="Try again" onAction={() => load()} />
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(n) => n.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            showsVerticalScrollIndicator={false}
            // Disable FlatList's own scroll while user is swiping horizontally
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={() => load("refresh")} tintColor={colors.primary} colors={[colors.primary]} />
            }
            renderItem={({ item }) => (
              <SwipeableRow
                item={item}
                tab={tab}
                onPress={() => tab === "unread" ? markRead(item.id) : undefined}
                onDelete={() => removeItem(item)}
              />
            )}
            ListEmptyComponent={
              <View style={styles.stateWrap}>
                <StateView
                  title={tab === "unread" ? "You're all caught up" : "Nothing here yet"}
                  message={
                    tab === "unread"
                      ? "New updates about your trips, earnings and account will show up here."
                      : "Notifications you have read will appear in this tab."
                  }
                />
              </View>
            }
          />
        )}
      </SafeScreen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  flex: { flex: 1, minWidth: 0 },
  headerWrap: { paddingHorizontal: spacing[4], paddingTop: spacing[4], alignItems: "center", gap: spacing[3] },
  backButton: {
    alignSelf: "flex-start",
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTextWrap: { alignItems: "center", gap: spacing[1] },
  centerText: { textAlign: "center" },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  tabOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tabCount: {
    minWidth: 22,
    alignItems: "center",
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing[1],
  },
  tabCountOn: { backgroundColor: "rgba(255,255,255,0.22)" },
  loading: { alignItems: "center", justifyContent: "center", gap: spacing[3], padding: spacing[6] },
  stateWrap: { paddingHorizontal: spacing[4], paddingTop: spacing[5] },
  list: { flex: 1 },
  listContent: { paddingHorizontal: spacing[4], paddingBottom: spacing[10] },
  sep: { height: spacing[3] },

  // Swipeable row
  swipeRow: {
    position: "relative",
    borderRadius: radius.lg,
    overflow: "hidden",
  },
  deleteZone: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.danger,
    borderRadius: radius.lg,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  deleteAction: {
    width: 80,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[1],
  },
  deleteLabel: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "600",
  },
  cardWrap: {
    borderRadius: radius.lg,
  },
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
    ...shadows.card,
  },
  cardPressed: { opacity: 0.85 },
  cardIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  cardIconUnread: { backgroundColor: colors.brand[50] },
  cardBody: { flex: 1, minWidth: 0, gap: spacing[1] },
});
