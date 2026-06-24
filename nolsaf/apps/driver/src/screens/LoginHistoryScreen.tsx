import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppCard, AppStack, AppText, colors, radius, spacing, StateView } from "@nolsaf/native-ui";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { useAuth } from "../auth/AuthProvider";
import { fetchLoginHistory } from "../driver/driverApi";
import { LoginHistoryRecord } from "../driver/types";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "LoginHistory">;

function formatDate(value: string | null | undefined) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function LoginHistoryScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [records, setRecords] = useState<LoginHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) {
      setError("Please sign in to view your login history.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetchLoginHistory(token);
      setRecords(response.records || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load your login history.");
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
          Login history
        </AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <StateView title="Loading your login history" message="Fetching recent sign ins." />
        ) : error ? (
          <StateView title="Could not load login history" message={error} actionLabel="Try again" onAction={() => load()} />
        ) : records.length === 0 ? (
          <StateView title="No login history yet" message="Your recent sign ins will appear here." />
        ) : (
          <AppStack gap={2}>
            {records.map((record) => (
              <AppCard key={record.id} style={styles.card}>
                <View style={styles.row}>
                  {record.success ? <CheckCircle2 color={colors.success} size={18} /> : <XCircle color={colors.danger} size={18} />}
                  <AppText variant="bodySmall" weight="bold">
                    {formatDate(record.at)}
                  </AppText>
                </View>
                {record.platform ? (
                  <AppText variant="caption" tone="muted">
                    {record.platform}
                  </AppText>
                ) : null}
                {record.ip ? (
                  <AppText variant="caption" tone="muted">
                    {record.ip}
                  </AppText>
                ) : null}
              </AppCard>
            ))}
          </AppStack>
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
  card: {
    gap: spacing[1]
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2]
  }
});
