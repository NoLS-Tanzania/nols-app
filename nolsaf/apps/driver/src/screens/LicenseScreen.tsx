import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppButton, AppCard, AppStack, AppText, colors, radius, spacing, StateView } from "@nolsaf/native-ui";
import { ArrowLeft } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { useAuth } from "../auth/AuthProvider";
import { fetchDriverLicense } from "../driver/driverApi";
import { LicenseInfo } from "../driver/types";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "License">;

function formatDate(value: string | null | undefined) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function LicenseScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setError("Please sign in to view your license.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setLicense(await fetchDriverLicense(token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load your license.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={colors.ink} size={22} />
        </Pressable>
        <AppText variant="title" weight="bold">
          License
        </AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <StateView title="Loading your license" message="Fetching your license details." />
        ) : error ? (
          <StateView title="Could not load license" message={error} actionLabel="Try again" onAction={() => load()} />
        ) : license ? (
          <AppCard>
            <AppStack gap={3}>
              <View style={styles.row}>
                <AppText variant="bodySmall" tone="muted">
                  License number
                </AppText>
                <AppText variant="bodySmall" weight="bold">
                  {license.number || "Not provided"}
                </AppText>
              </View>
              <View style={styles.row}>
                <AppText variant="bodySmall" tone="muted">
                  Expires
                </AppText>
                <AppText variant="bodySmall" weight="bold">
                  {formatDate(license.expires)}
                </AppText>
              </View>
              {license.url ? (
                <AppButton title="View license document" variant="secondary" onPress={() => Linking.openURL(license.url!)} />
              ) : (
                <AppText variant="caption" tone="muted">
                  No license document uploaded yet. You can add one from your Profile.
                </AppText>
              )}
            </AppStack>
          </AppCard>
        ) : null}
      </ScrollView>
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
    paddingTop: spacing[4]
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
  scrollContent: {
    gap: spacing[4],
    padding: spacing[4],
    paddingBottom: spacing[8]
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[2]
  }
});
