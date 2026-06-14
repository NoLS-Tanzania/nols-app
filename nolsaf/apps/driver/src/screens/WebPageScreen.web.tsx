import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppButton, AppText, colors, radius, spacing } from "@nolsaf/native-ui";
import { ArrowLeft, ExternalLink } from "lucide-react-native";
import { createElement } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "WebPage">;

export function WebPageScreen({ navigation, route }: Props) {
  const { title, url } = route.params;

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={colors.ink} size={22} />
        </Pressable>
        <AppText variant="title" weight="bold" style={styles.title} numberOfLines={1}>
          {title}
        </AppText>
        <View style={styles.backButton} />
      </View>

      <View style={styles.webviewWrap}>
        {createElement("iframe", { src: url, title, style: { flex: 1, border: "none", width: "100%", height: "100%" } })}
      </View>

      <View style={styles.fallbackRow}>
        <AppText variant="caption" tone="muted" style={styles.fallbackText}>
          If this page does not load, open it in a new browser tab.
        </AppText>
        <AppButton
          title="Open in new tab"
          variant="secondary"
          icon={<ExternalLink color={colors.primary} size={16} />}
          onPress={() => window.open(url, "_blank", "noopener,noreferrer")}
        />
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
    paddingTop: spacing[4],
    paddingBottom: spacing[3]
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
  title: {
    flex: 1,
    minWidth: 0
  },
  webviewWrap: {
    flex: 1,
    backgroundColor: colors.white
  },
  fallbackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    padding: spacing[4],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.white
  },
  fallbackText: {
    flex: 1,
    minWidth: 0
  }
});
