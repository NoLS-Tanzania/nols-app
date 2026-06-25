import {
  AppText,
  colors,
  radius,
  spacing
} from "@nolsaf/native-ui";
import {
  Building2,
  Calendar,
  ChevronRight,
  CircleHelp,
  LogOut,
  Shield,
  UserPen,
  Wallet,
  X
} from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "../auth";
import { AuthUser } from "../auth/types";

type Props = {
  visible: boolean;
  onClose: () => void;
  onNavigate: (destination: string) => void;
};

type MenuItem = {
  key: string;
  label: string;
  sub?: string;
  icon: React.ReactNode;
  danger?: boolean;
};

export function OwnerAccountSheet({ visible, onClose, onNavigate }: Props) {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const [signingOut, setSigningOut] = useState(false);

  const initials = getInitials(user);
  const displayName = user?.fullName ?? user?.name ?? "Owner";
  const displayEmail = user?.email ?? "";

  const menuItems: MenuItem[] = [
    {
      key: "profile",
      label: "My Profile",
      sub: "Edit your name, photo and contact",
      icon: <UserPen size={18} color={colors.primary} />
    },
    {
      key: "properties",
      label: "My Properties",
      sub: "Manage listings and approvals",
      icon: <Building2 size={18} color={colors.primary} />
    },
    {
      key: "revenue",
      label: "Revenue & Payouts",
      sub: "Earnings, invoices and disbursements",
      icon: <Wallet size={18} color={colors.primary} />
    },
    {
      key: "calendar",
      label: "Availability Calendar",
      sub: "Set dates open or blocked",
      icon: <Calendar size={18} color={colors.primary} />
    },
    {
      key: "security",
      label: "Security & Password",
      sub: "Change password, sessions",
      icon: <Shield size={18} color={colors.primary} />
    },
    {
      key: "help",
      label: "Help & Support",
      sub: "FAQs, contact NoLSAF team",
      icon: <CircleHelp size={18} color={colors.primary} />
    }
  ];

  const doSignOut = async () => {
    setSigningOut(true);
    onClose();
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  const onSignOut = () => {
    if (Platform.OS === "web") {
      // Alert.alert is a no-op on web — sign out directly
      void doSignOut();
    } else {
      Alert.alert("Sign out", "Are you sure you want to sign out?", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign out", style: "destructive", onPress: () => void doSignOut() },
      ]);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Sheet */}
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing[4]) }]}>
        {/* Drag handle */}
        <View style={styles.handle} />

        {/* Header row */}
        <View style={styles.sheetHeader}>
          <AppText variant="bodySmall" weight="semiBold">Account</AppText>
          <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
            <X size={18} color={colors.mutedText} />
          </Pressable>
        </View>

        {/* Profile card */}
        <Pressable
          style={styles.profileCard}
          onPress={() => { onClose(); onNavigate("profile"); }}
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
        >
          <View style={styles.avatar}>
            <AppText variant="titleSm" weight="bold" style={styles.avatarText}>
              {initials}
            </AppText>
          </View>
          <View style={styles.profileInfo}>
            <AppText variant="bodySmall" weight="semiBold" numberOfLines={1}>
              {displayName}
            </AppText>
            <AppText variant="caption" tone="muted" numberOfLines={1}>
              {displayEmail}
            </AppText>
            <View style={styles.rolePill}>
              <AppText variant="caption" style={styles.roleText}>Property Owner</AppText>
            </View>
          </View>
          <ChevronRight size={18} color={colors.softText} />
        </Pressable>

        <ScrollView showsVerticalScrollIndicator={false} style={styles.menuScroll}>
          {/* Menu items */}
          <View style={styles.menuGroup}>
            {menuItems.map((item, i) => (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.menuRow,
                  i < menuItems.length - 1 && styles.menuRowBorder,
                  pressed && styles.menuRowPressed
                ]}
                onPress={() => { onClose(); onNavigate(item.key); }}
              >
                <View style={styles.menuIcon}>{item.icon}</View>
                <View style={styles.menuText}>
                  <AppText variant="bodySmall" weight="medium" numberOfLines={1}>
                    {item.label}
                  </AppText>
                  {item.sub ? (
                    <AppText variant="caption" tone="muted" numberOfLines={1}>
                      {item.sub}
                    </AppText>
                  ) : null}
                </View>
                <ChevronRight size={16} color={colors.border} />
              </Pressable>
            ))}
          </View>

          {/* Danger zone */}
          <View style={[styles.menuGroup, styles.dangerGroup]}>
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
              onPress={onSignOut}
              disabled={signingOut}
            >
              <View style={[styles.menuIcon, styles.signOutIcon]}>
                <LogOut size={18} color={colors.danger} />
              </View>
              <View style={styles.menuText}>
                <AppText variant="bodySmall" weight="medium" numberOfLines={1} style={{ color: colors.danger }}>
                  {signingOut ? "Signing out…" : "Sign out"}
                </AppText>
              </View>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function getInitials(user: AuthUser | null): string {
  const name = user?.fullName ?? user?.name ?? "";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts[0]?.length) return parts[0][0].toUpperCase();
  return "O";
}

const styles = StyleSheet.create({
  backdrop: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)"
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: "92%"
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginTop: spacing[2]
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[2]
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    marginHorizontal: spacing[3],
    padding: spacing[3],
    borderRadius: radius.lg,
    backgroundColor: colors.brand[50],
    borderWidth: 1,
    borderColor: colors.brand[100],
    marginBottom: spacing[3]
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    color: colors.white
  },
  profileInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  rolePill: {
    alignSelf: "flex-start",
    marginTop: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.brand[100]
  },
  roleText: {
    color: colors.primaryDark,
    fontSize: 10
  },
  menuScroll: {
    flexGrow: 0
  },
  menuGroup: {
    marginHorizontal: spacing[3],
    marginBottom: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    overflow: "hidden"
  },
  dangerGroup: {
    borderColor: "#fca5a5"
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3]
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  menuRowPressed: {
    backgroundColor: colors.surface
  },
  menuIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.brand[50],
    alignItems: "center",
    justifyContent: "center"
  },
  signOutIcon: {
    backgroundColor: "#fef2f2"
  },
  menuText: {
    flex: 1,
    minWidth: 0,
    gap: 1
  }
});
