import { ReactNode } from "react";
import { AppButton, AppCard, AppStack, AppText, colors, radius, SafeScreen, spacing } from "@nolsaf/native-ui";
import { StyleSheet, View } from "react-native";

type GateAction = {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

type GateScreenProps = {
  icon: ReactNode;
  title: string;
  message: string;
  detail?: string;
  primaryAction?: GateAction;
  secondaryAction?: GateAction;
};

export function GateScreen({ icon, title, message, detail, primaryAction, secondaryAction }: GateScreenProps) {
  return (
    <SafeScreen contentStyle={styles.content}>
      <AppCard style={styles.card}>
        <AppStack gap={4}>
          <View style={styles.iconMark}>{icon}</View>
          <AppStack gap={2}>
            <AppText variant="title" weight="bold" style={styles.center}>
              {title}
            </AppText>
            <AppText variant="body" tone="muted" style={styles.center}>
              {message}
            </AppText>
          </AppStack>
          {detail ? (
            <AppCard tone="warning">
              <AppText variant="bodySmall" tone="default">
                {detail}
              </AppText>
            </AppCard>
          ) : null}
          {primaryAction || secondaryAction ? (
            <AppStack gap={2}>
              {primaryAction ? (
                <AppButton
                  title={primaryAction.label}
                  variant={primaryAction.variant ?? "primary"}
                  loading={primaryAction.loading}
                  onPress={primaryAction.onPress}
                />
              ) : null}
              {secondaryAction ? (
                <AppButton
                  title={secondaryAction.label}
                  variant={secondaryAction.variant ?? "ghost"}
                  onPress={secondaryAction.onPress}
                />
              ) : null}
            </AppStack>
          ) : null}
        </AppStack>
      </AppCard>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  card: {
    width: "100%",
    maxWidth: 420
  },
  iconMark: {
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand[50]
  },
  center: {
    textAlign: "center"
  }
});
