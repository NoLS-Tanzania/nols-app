import { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  AmountText,
  AppButton,
  AppCard,
  AppStack,
  AppText,
  CodeText,
  colors,
  ConfirmSheet,
  radius,
  ResponsiveRow,
  spacing,
  StateView,
  StatusBadge
} from "@nolsaf/native-ui";
import { ArrowLeft, Copy, Share2 } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { Alert, Linking, Platform, Pressable, RefreshControl, ScrollView, Share, StyleSheet, View } from "react-native";

import { useAuth } from "../auth/AuthProvider";
import {
  applyReferralWithdrawal,
  fetchReferral,
  fetchReferralEarnings,
  fetchReferralPerformance,
  fetchReferralWithdrawals
} from "../driver/driverApi";
import {
  DriverReferral,
  REFERRAL_EARNING_STATUS_TONE,
  REFERRAL_WITHDRAWAL_STATUS_TONE,
  ReferralEarningsResponse,
  ReferralPerformance,
  ReferralWithdrawalsResponse
} from "../driver/types";
import { useDriverSocket } from "../hooks/useDriverSocket";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Referral">;

type TabKey = "overview" | "earnings" | "performance";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "earnings", label: "Earnings" },
  { key: "performance", label: "Performance" }
];

function formatDate(value: string | null | undefined) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function ReferralScreen({ navigation }: Props) {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [referral, setReferral] = useState<DriverReferral | null>(null);
  const [earnings, setEarnings] = useState<ReferralEarningsResponse | null>(null);
  const [withdrawals, setWithdrawals] = useState<ReferralWithdrawalsResponse | null>(null);
  const [performance, setPerformance] = useState<ReferralPerformance | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(
    async (tab: TabKey, mode: "initial" | "refresh" = "initial") => {
      if (!token) {
        setError("Please sign in to view your referrals.");
        setLoading(false);
        return;
      }
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      setError(null);
      try {
        if (tab === "overview") {
          setReferral(await fetchReferral(token));
        } else if (tab === "earnings") {
          const [earningsRes, withdrawalsRes] = await Promise.all([fetchReferralEarnings(token), fetchReferralWithdrawals(token)]);
          setEarnings(earningsRes);
          setWithdrawals(withdrawalsRes);
        } else {
          setPerformance(await fetchReferralPerformance(token));
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load your referral data.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useEffect(() => {
    void load(activeTab);
  }, [activeTab, load]);

  useDriverSocket({
    "referral-update": () => void load(activeTab, "refresh"),
    "referral-notification": () => void load(activeTab, "refresh")
  });

  async function copyToClipboard(text: string) {
    const nav = (globalThis as { navigator?: { clipboard?: { writeText?: (value: string) => Promise<void> } } }).navigator;
    if (nav?.clipboard?.writeText) {
      try {
        await nav.clipboard.writeText(text);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }

  function showCopiedFeedback() {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleCopyLink() {
    if (!referral) return;
    const ok = await copyToClipboard(referral.referralLink);
    if (ok) {
      showCopiedFeedback();
    } else {
      Alert.alert("Referral link", referral.referralLink);
    }
  }

  async function handleShare() {
    if (!referral) return;
    const shareText = `Join NoLSAF as a driver using my referral code ${referral.referralCode}: ${referral.referralLink}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

    try {
      const canOpenWhatsapp = await Linking.canOpenURL(whatsappUrl);
      if (canOpenWhatsapp) {
        await Linking.openURL(whatsappUrl);
        return;
      }
    } catch {
      // fall through to generic share
    }

    if (Platform.OS === "web") {
      const nav = (globalThis as { navigator?: { share?: (data: { title?: string; text?: string; url?: string }) => Promise<void> } }).navigator;
      if (nav?.share) {
        try {
          await nav.share({ title: "Join NoLSAF", text: shareText, url: referral.referralLink });
        } catch {
          // user dismissed the share sheet
        }
        return;
      }
      if (await copyToClipboard(shareText)) {
        showCopiedFeedback();
      } else {
        Alert.alert("Referral link", shareText);
      }
      return;
    }
    try {
      await Share.share({ message: shareText });
    } catch {
      // user dismissed the share sheet
    }
  }

  async function confirmWithdraw() {
    if (!token) return;
    setWithdrawing(true);
    try {
      await applyReferralWithdrawal(token, {});
      setShowWithdrawConfirm(false);
      await load("earnings", "refresh");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not request a withdrawal.");
      setShowWithdrawConfirm(false);
    } finally {
      setWithdrawing(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={colors.ink} size={22} />
        </Pressable>
        <AppText variant="title" weight="bold">
          Referral
        </AppText>
      </View>

      <View style={styles.tabsRow}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            accessibilityRole="button"
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
          >
            <AppText variant="caption" weight="bold" tone={activeTab === tab.key ? "inverse" : "muted"}>
              {tab.label}
            </AppText>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(activeTab, "refresh")} tintColor={colors.primary} colors={[colors.primary]} />}
      >
        {loading ? (
          <StateView title="Loading" message="Fetching your referral data." />
        ) : error ? (
          <StateView title="Could not load" message={error} actionLabel="Try again" onAction={() => load(activeTab)} />
        ) : activeTab === "overview" && referral ? (
          <AppStack gap={4}>
            <AppCard tone="brand" style={styles.card}>
              <AppText variant="bodySmall" tone="inverse">
                Your referral code
              </AppText>
              <CodeText value={referral.referralCode} tone="inverse" />

              <View style={styles.linkRow}>
                <AppText variant="caption" tone="inverse" style={styles.linkText} selectable numberOfLines={1}>
                  {referral.referralLink}
                </AppText>
                <Pressable accessibilityRole="button" onPress={handleCopyLink} style={styles.linkCopyButton}>
                  <Copy color={colors.white} size={16} />
                </Pressable>
              </View>
              {copied ? (
                <AppText variant="caption" tone="inverse">
                  Copied to clipboard!
                </AppText>
              ) : null}

              <AppButton
                title="Share referral link"
                variant="secondary"
                icon={<Share2 color={colors.primary} size={18} />}
                onPress={handleShare}
              />
            </AppCard>

            <ResponsiveRow gap={3} style={styles.statsRow}>
              <AppCard style={styles.statCard}>
                <AppText variant="title" weight="bold">
                  {referral.totalReferrals}
                </AppText>
                <AppText variant="caption" tone="muted">
                  Total referrals
                </AppText>
              </AppCard>
              <AppCard style={styles.statCard}>
                <AppText variant="title" weight="bold">
                  {referral.activeReferrals}
                </AppText>
                <AppText variant="caption" tone="muted">
                  Active referrals
                </AppText>
              </AppCard>
              <AppCard style={styles.statCard}>
                <AmountText amount={referral.totalCredits} variant="title" />
                <AppText variant="caption" tone="muted">
                  Total credits
                </AppText>
              </AppCard>
              <AppCard style={styles.statCard}>
                <AmountText amount={referral.pendingCredits} variant="title" />
                <AppText variant="caption" tone="muted">
                  Pending credits
                </AppText>
              </AppCard>
            </ResponsiveRow>

            <AppStack gap={3}>
              <AppText variant="titleSm" weight="bold">
                Your referrals
              </AppText>
              {referral.referrals.length === 0 ? (
                <StateView title="No referrals yet" message="Drivers you invite will show up here." />
              ) : (
                <AppStack gap={2}>
                  {referral.referrals.map((item) => (
                    <AppCard key={item.id} style={styles.card}>
                      <View style={styles.row}>
                        <AppText variant="bodySmall" weight="bold">
                          {item.name}
                        </AppText>
                        <AppText variant="caption" tone="muted" style={{ textTransform: "capitalize" }}>
                          {item.status}
                        </AppText>
                      </View>
                      <AppText variant="caption" tone="muted">
                        {item.email}
                      </AppText>
                      <View style={styles.row}>
                        <AppText variant="caption" tone="muted">
                          Joined {formatDate(item.joinedAt)}
                        </AppText>
                        <AmountText amount={item.creditsEarned} variant="bodySmall" />
                      </View>
                    </AppCard>
                  ))}
                </AppStack>
              )}
            </AppStack>
          </AppStack>
        ) : activeTab === "earnings" && earnings && withdrawals ? (
          <AppStack gap={4}>
            <ResponsiveRow gap={3} style={styles.statsRow}>
              <AppCard style={styles.statCard}>
                <AmountText amount={earnings.summary.availableForWithdrawal} variant="title" />
                <AppText variant="caption" tone="muted">
                  Available
                </AppText>
              </AppCard>
              <AppCard style={styles.statCard}>
                <AmountText amount={earnings.summary.pending} variant="title" />
                <AppText variant="caption" tone="muted">
                  Pending
                </AppText>
              </AppCard>
              <AppCard style={styles.statCard}>
                <AmountText amount={earnings.summary.paidAsBonus} variant="title" />
                <AppText variant="caption" tone="muted">
                  Paid as bonus
                </AppText>
              </AppCard>
              <AppCard style={styles.statCard}>
                <AmountText amount={earnings.summary.withdrawn} variant="title" />
                <AppText variant="caption" tone="muted">
                  Withdrawn
                </AppText>
              </AppCard>
            </ResponsiveRow>

            <AppButton
              title="Request withdrawal"
              onPress={() => setShowWithdrawConfirm(true)}
              disabled={earnings.summary.availableForWithdrawal <= 0}
            />

            <AppStack gap={3}>
              <AppText variant="titleSm" weight="bold">
                Earnings
              </AppText>
              {earnings.earnings.length === 0 ? (
                <StateView title="No referral earnings yet" message="Earnings from your referrals will show up here." />
              ) : (
                <AppStack gap={2}>
                  {earnings.earnings.map((item) => (
                    <AppCard key={item.id} style={styles.card}>
                      <View style={styles.row}>
                        <AmountText amount={item.amount} currency={item.currency} variant="bodySmall" />
                        <StatusBadge status={REFERRAL_EARNING_STATUS_TONE[item.status]} label={item.status.replace(/_/g, " ")} />
                      </View>
                      {item.referredUser ? (
                        <AppText variant="caption" tone="muted">
                          From {item.referredUser.name}
                        </AppText>
                      ) : null}
                      <AppText variant="caption" tone="muted">
                        {formatDate(item.createdAt)}
                      </AppText>
                    </AppCard>
                  ))}
                </AppStack>
              )}
            </AppStack>

            <AppStack gap={3}>
              <AppText variant="titleSm" weight="bold">
                Withdrawals
              </AppText>
              {withdrawals.withdrawals.length === 0 ? (
                <StateView title="No withdrawals yet" message="Your withdrawal requests will show up here." />
              ) : (
                <AppStack gap={2}>
                  {withdrawals.withdrawals.map((item) => (
                    <AppCard key={item.id} style={styles.card}>
                      <View style={styles.row}>
                        <AmountText amount={item.totalAmount} currency={item.currency} variant="bodySmall" />
                        <StatusBadge status={REFERRAL_WITHDRAWAL_STATUS_TONE[item.status]} label={item.status} />
                      </View>
                      <AppText variant="caption" tone="muted">
                        Requested {formatDate(item.createdAt)}
                      </AppText>
                      {item.rejectionReason ? (
                        <AppText variant="caption" tone="danger">
                          {item.rejectionReason}
                        </AppText>
                      ) : null}
                    </AppCard>
                  ))}
                </AppStack>
              )}
            </AppStack>
          </AppStack>
        ) : activeTab === "performance" && performance ? (
          <AppStack gap={4}>
            <ResponsiveRow gap={3} style={styles.statsRow}>
              <AppCard style={styles.statCard}>
                <AppText variant="title" weight="bold">
                  {performance.referrals.total}
                </AppText>
                <AppText variant="caption" tone="muted">
                  Total referrals
                </AppText>
              </AppCard>
              <AppCard style={styles.statCard}>
                <AppText variant="title" weight="bold">
                  {Math.round(performance.referrals.conversionRate * 100)}%
                </AppText>
                <AppText variant="caption" tone="muted">
                  Conversion rate
                </AppText>
              </AppCard>
              <AppCard style={styles.statCard}>
                <AmountText amount={performance.referrals.avgCreditsPerReferral} variant="title" />
                <AppText variant="caption" tone="muted">
                  Avg credits / referral
                </AppText>
              </AppCard>
              <AppCard style={styles.statCard}>
                <AmountText amount={performance.earnings.monthly} variant="title" />
                <AppText variant="caption" tone="muted">
                  This month
                </AppText>
              </AppCard>
              <AppCard style={styles.statCard}>
                <AmountText amount={performance.earnings.yearly} variant="title" />
                <AppText variant="caption" tone="muted">
                  This year
                </AppText>
              </AppCard>
            </ResponsiveRow>
          </AppStack>
        ) : null}
      </ScrollView>

      <ConfirmSheet
        visible={showWithdrawConfirm}
        title="Request withdrawal?"
        message="Your available referral credits will be sent for withdrawal processing."
        confirmLabel="Request withdrawal"
        loading={withdrawing}
        onConfirm={confirmWithdraw}
        onCancel={() => setShowWithdrawConfirm(false)}
      />
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
  tabsRow: {
    flexDirection: "row",
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4]
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  scrollContent: {
    gap: spacing[4],
    padding: spacing[4],
    paddingBottom: spacing[8]
  },
  card: {
    gap: spacing[2]
  },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[2],
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  linkText: {
    flex: 1,
    minWidth: 0,
    opacity: 0.85
  },
  linkCopyButton: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)"
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[2]
  },
  statsRow: {
    flexWrap: "wrap"
  },
  statCard: {
    flexGrow: 1,
    flexBasis: "47%",
    gap: spacing[1]
  }
});
