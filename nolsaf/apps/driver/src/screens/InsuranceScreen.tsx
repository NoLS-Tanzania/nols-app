import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppButton, AppCard, AppStack, AppText, colors, radius, spacing, StateView, StatusBadge } from "@nolsaf/native-ui";
import { ArrowLeft } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { useAuth } from "../auth/AuthProvider";
import { fetchProfile } from "../driver/driverApi";
import { DOCUMENT_STATUS_TONE, ProfileDocument } from "../driver/types";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Insurance">;

function formatDate(value: string | null | undefined) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function InsuranceScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [insuranceDoc, setInsuranceDoc] = useState<ProfileDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setError("Please sign in to view your insurance.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const profile = await fetchProfile(token);
      setInsuranceDoc(profile.documents?.find((d) => d.type === "INSURANCE") || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load your insurance.");
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
          Insurance
        </AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <StateView title="Loading your insurance" message="Fetching your insurance document." />
        ) : error ? (
          <StateView title="Could not load insurance" message={error} actionLabel="Try again" onAction={() => load()} />
        ) : insuranceDoc ? (
          <AppCard>
            <AppStack gap={3}>
              <View style={styles.row}>
                <AppText variant="bodySmall" tone="muted">
                  Status
                </AppText>
                <StatusBadge status={DOCUMENT_STATUS_TONE[insuranceDoc.status]} label={insuranceDoc.status} />
              </View>
              <View style={styles.row}>
                <AppText variant="bodySmall" tone="muted">
                  Uploaded
                </AppText>
                <AppText variant="bodySmall" weight="bold">
                  {formatDate(insuranceDoc.createdAt)}
                </AppText>
              </View>
              {insuranceDoc.reason ? (
                <AppText variant="caption" tone="danger">
                  {insuranceDoc.reason}
                </AppText>
              ) : null}
              <AppButton title="View insurance document" variant="secondary" onPress={() => Linking.openURL(insuranceDoc.url)} />
            </AppStack>
          </AppCard>
        ) : (
          <StateView title="No insurance document yet" message="You can upload your insurance document from your Profile." />
        )}
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
