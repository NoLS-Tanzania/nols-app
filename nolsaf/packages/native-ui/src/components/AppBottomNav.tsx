import { ReactNode, useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, radius, spacing } from "../theme";
import { AppText } from "./AppText";

export type AppBottomNavItem<Key extends string> = {
  key: Key;
  label: string;
  icon: (color: string) => ReactNode;
  onPress: () => void;
};

type AppBottomNavProps<Key extends string> = {
  activeKey: Key;
  items: Array<AppBottomNavItem<Key>>;
};

export function AppBottomNav<Key extends string>({ activeKey, items }: AppBottomNavProps<Key>) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.shell, { paddingBottom: Math.max(insets.bottom, spacing[2]) }]}>
      <View style={styles.bar}>
        {items.map((item) => {
          const active = item.key === activeKey;
          return (
            <AppBottomNavButton
              key={item.key}
              active={active}
              item={item}
            />
          );
        })}
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

  return (
    <Pressable
      accessibilityRole="button"
      onPress={item.onPress}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
    >
      <View style={styles.itemInner}>
        <View style={styles.iconWrapBase}>
          <Animated.View
            pointerEvents="none"
            style={[styles.iconWrapActive, { opacity: activeOpacity, transform: [{ scale: iconScale }] }]}
          />
          {item.icon(active ? colors.primary : colors.softText)}
        </View>
        <AppText
          variant="caption"
          weight={active ? "bold" : "medium"}
          tone={active ? "default" : "soft"}
          numberOfLines={1}
          style={styles.label}
        >
          {item.label}
        </AppText>
        <Animated.View
          style={[
            styles.activeMarker,
            {
              opacity: activeOpacity,
              backgroundColor: active ? colors.primary : colors.border,
              transform: [{ scaleX: markerScale }]
            }
          ]}
        />
      </View>
    </Pressable>
  );
}

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
    gap: 4
  },
  iconWrapBase: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center"
  },
  iconWrapActive: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.brand[50]
  },
  label: {
    textAlign: "center",
    maxWidth: 82,
    fontSize: 9.5,
    lineHeight: 11.5,
    letterSpacing: 0.6,
    textTransform: "uppercase"
  },
  activeMarker: {
    width: 18,
    height: 3,
    borderRadius: radius.full,
    marginTop: 1
  }
});
