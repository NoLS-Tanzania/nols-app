import { AppCard, AppStack, AppText, colors, radius, SafeScreen } from "@nolsaf/native-ui";
import { Wallet } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { DriverBottomNav } from "../components/DriverBottomNav";

export function EarningsScreen() {
  return (
    <SafeScreen contentStyle={styles.content}>
      <AppCard style={styles.card}>
        <AppStack gap={3}>
          <View style={styles.iconMark}>
            <Wallet color={colors.primary} size={26} />
          </View>
          <AppStack gap={1}>
            <AppText variant="title" weight="bold" style={styles.center}>
              Earnings are coming soon
            </AppText>
            <AppText variant="bodySmall" tone="muted" style={styles.center}>
              Your daily and weekly earnings breakdown, payouts, and statements will appear here once this feature launches in the app.
            </AppText>
          </AppStack>
        </AppStack>
      </AppCard>
      <View style={styles.navWrap}>
        <DriverBottomNav active="Earnings" />
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: "center",
    gap: 16
  },
  card: {
    alignItems: "center"
  },
  iconMark: {
    alignSelf: "center",
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand[50]
  },
  center: {
    textAlign: "center"
  },
  navWrap: {
    marginHorizontal: -16,
    marginBottom: -16
  }
});
