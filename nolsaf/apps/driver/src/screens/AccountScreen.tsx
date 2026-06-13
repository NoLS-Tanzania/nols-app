import { AppButton, AppCard, AppStack, AppText, colors, radius, SafeScreen } from "@nolsaf/native-ui";
import { Mail, Phone, UserCircle } from "lucide-react-native";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { useAuth } from "../auth/AuthProvider";
import { DriverBottomNav } from "../components/DriverBottomNav";

export function AccountScreen() {
  const { user, signOut } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await signOut();
    } finally {
      setLoggingOut(false);
    }
  }

  const name = user?.fullName || user?.name || "Driver";

  return (
    <SafeScreen contentStyle={styles.content}>
      <AppText variant="headline" weight="extraBold">
        Account
      </AppText>

      <AppCard>
        <AppStack gap={3}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <UserCircle color={colors.primary} size={32} />
            </View>
            <AppStack gap={1} style={styles.identity}>
              <AppText variant="title" weight="bold">
                {name}
              </AppText>
              <AppText variant="bodySmall" tone="muted">
                Driver
              </AppText>
            </AppStack>
          </View>

          <View style={styles.divider} />

          {user?.email ? (
            <View style={styles.detailRow}>
              <Mail color={colors.mutedText} size={18} />
              <AppText variant="body" style={styles.detailText}>
                {user.email}
              </AppText>
            </View>
          ) : null}

          {user?.phone ? (
            <View style={styles.detailRow}>
              <Phone color={colors.mutedText} size={18} />
              <AppText variant="body" style={styles.detailText}>
                {user.phone}
              </AppText>
            </View>
          ) : null}
        </AppStack>
      </AppCard>

      <AppButton title="Log out" variant="secondary" loading={loggingOut} onPress={handleLogout} />

      <View style={styles.navWrap}>
        <DriverBottomNav active="Account" />
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    gap: 16
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand[50]
  },
  identity: {
    flexShrink: 1,
    minWidth: 0
  },
  divider: {
    height: 1,
    backgroundColor: colors.border
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  detailText: {
    flexShrink: 1,
    minWidth: 0
  },
  navWrap: {
    marginTop: "auto",
    marginHorizontal: -16,
    marginBottom: -16
  }
});
