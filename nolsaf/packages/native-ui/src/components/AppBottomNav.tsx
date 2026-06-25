import { ReactNode, useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, shadows, spacing } from "../theme";
import { AppText } from "./AppText";

export type AppBottomNavItem<Key extends string> = {
  key: Key;
  label: string;
  icon: (color: string) => ReactNode;
  onPress: () => void;
};

/** The raised circular action that floats in the middle of the bar (for example a QR scan). */
export type AppBottomNavCenterAction = {
  icon: (color: string) => ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
};

type AppBottomNavProps<Key extends string> = {
  activeKey: Key;
  items: Array<AppBottomNavItem<Key>>;
  /** When set, a floating button is rendered in the middle, splitting the tabs evenly around it. */
  centerAction?: AppBottomNavCenterAction;
};

export function AppBottomNav<Key extends string>({ activeKey, items, centerAction }: AppBottomNavProps<Key>) {
  const insets = useSafeAreaInsets();

  // Split the tabs around the floating centre button so they sit evenly on each side.
  const half = Math.ceil(items.length / 2);
  const left = centerAction ? items.slice(0, half) : items;
  const right = centerAction ? items.slice(half) : [];

  const renderItem = (item: AppBottomNavItem<Key>) => (
    <AppBottomNavButton key={item.key} active={item.key === activeKey} item={item} />
  );

  return (
    <View style={[styles.shell, { paddingBottom: Math.max(insets.bottom, spacing[2]) }]}>
      {centerAction ? (
        <View pointerEvents="box-none" style={styles.centerWrap}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={centerAction.accessibilityLabel}
            onPress={centerAction.onPress}
            style={({ pressed }) => [styles.centerButton, pressed && styles.centerButtonPressed]}
          >
            {centerAction.icon(colors.white)}
          </Pressable>
        </View>
      ) : null}

      <View style={styles.bar}>
        {left.map(renderItem)}
        {centerAction ? <View style={styles.centerSlot} /> : null}
        {right.map(renderItem)}
      </View>
    </View>
  );
}

function AppBottomNavButton<Key extends string>({
  item,
  active
}: {
  item: AppBottomNavItem<Key>;
  active: boolean;
}) {
  const progress = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: active ? 1 : 0,
      duration: 220,
      useNativeDriver: true
    }).start();
  }, [active, progress]);

  const activeOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1]
  });

  const iconScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1]
  });

  const markerScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 1]
  });

  const tint = active ? colors.primary : colors.brandMuted;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={item.onPress}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
    >
      <View style={styles.itemInner}>
        {/* Active dash sits above the icon, matching the web mobile nav. */}
        <Animated.View
          style={[
            styles.activeMarker,
            { opacity: activeOpacity, transform: [{ scaleX: markerScale }] }
          ]}
        />
        <Animated.View style={[styles.iconWrap, { transform: [{ scale: iconScale }] }]}>
          {item.icon(tint)}
        </Animated.View>
        <AppText
          variant="caption"
          weight={active ? "bold" : "medium"}
          numberOfLines={1}
          style={[styles.label, { color: tint }]}
        >
          {item.label}
        </AppText>
      </View>
    </Pressable>
  );
}

const CENTER_SIZE = 58;

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing[2]
  },
  bar: {
    minWidth: 0,
    minHeight: 64,
    flexDirection: "row",
    alignItems: "stretch"
  },
  item: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
    paddingVertical: spacing[1]
  },
  itemPressed: {
    opacity: 0.7
  },
  itemInner: {
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 3
  },
  iconWrap: {
    alignItems: "center",
    justifyContent: "center"
  },
  label: {
    textAlign: "center",
    maxWidth: 82,
    fontSize: 10,
    lineHeight: 12,
    letterSpacing: 0.1
  },
  activeMarker: {
    width: 18,
    height: 2.5,
    borderRadius: radius.full,
    marginBottom: 1,
    backgroundColor: colors.primary
  },
  // Reserves the gap in the tab row that the floating button sits over.
  centerSlot: {
    width: CENTER_SIZE + spacing[3]
  },
  centerWrap: {
    position: "absolute",
    top: -CENTER_SIZE / 2,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 2
  },
  centerButton: {
    width: CENTER_SIZE,
    height: CENTER_SIZE,
    borderRadius: CENTER_SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: colors.white,
    ...shadows.sheet
  },
  centerButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.94 }]
  }
});
