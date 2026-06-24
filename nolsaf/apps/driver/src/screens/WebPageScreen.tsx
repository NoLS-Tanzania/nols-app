import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppText, colors, radius, spacing } from "@nolsaf/native-ui";
import { ArrowLeft, RefreshCw } from "lucide-react-native";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { WebView } from "react-native-webview";

import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "WebPage">;

export function WebPageScreen({ navigation, route }: Props) {
  const { title, url } = route.params;
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={colors.ink} size={22} />
        </Pressable>
        <AppText variant="title" weight="bold" style={styles.title} numberOfLines={1}>
          {title}
        </AppText>
        <Pressable accessibilityRole="button" onPress={() => webViewRef.current?.reload()} style={styles.backButton}>
          <RefreshCw color={colors.ink} size={18} />
        </Pressable>
      </View>

      <View style={styles.webviewWrap}>
        <WebView
          ref={webViewRef}
          source={{ uri: url }}
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
          startInLoadingState
        />
        {loading ? (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : null}
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
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white
  }
});
