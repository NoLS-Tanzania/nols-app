import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppCard, AppStack, AppText, colors, radius, spacing } from "@nolsaf/native-ui";
import { ArrowLeft, ExternalLink } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "ClaimPolicy">;

const WEB_BASE_URL = "https://nolsaf.com";

const POLICY_LINKS: Array<{ label: string; path: string }> = [
  { label: "Terms of service", path: "/driver/terms" },
  { label: "NoLSAF Auction Policy", path: "/driver/auction-policy" }
];

const STEPS: Array<{ title: string; body: string }> = [
  {
    title: "Trips open 72 hours before pickup",
    body: "Scheduled trips become available to bid on 72 hours before their pickup time. Check the Available tab regularly so you do not miss a trip you want."
  },
  {
    title: "More than one driver can bid",
    body: "Bidding on a trip is not a guarantee. Other drivers may also bid on the same trip during the open window."
  },
  {
    title: "NoLSAF reviews every bid",
    body: "Our team reviews all bids for a trip and awards it to one driver, considering factors such as location, rating, and availability. This is the auction model."
  },
  {
    title: "Your bid status",
    body: "After you bid on a trip, it moves to Pending. Once NoLSAF reviews it, your bid becomes Approved (you are awarded the trip) or Rejected (another driver was awarded it). You can track this in the Pending tab."
  },
  {
    title: "Awaiting NoLSAF review",
    body: "If you see Awaiting NoLSAF review, your bid has been submitted and is in the queue. You do not need to do anything else while you wait."
  }
];

export function ClaimPolicyScreen({ navigation }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={colors.ink} size={22} />
        </Pressable>
        <AppText variant="title" weight="bold">
          What does bidding mean?
        </AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AppText variant="bodySmall" tone="muted">
          Scheduled trips work a little differently from on demand trips. Here is how bidding and the auction
          review process work.
        </AppText>

        <AppStack gap={2}>
          {STEPS.map((step) => (
            <AppCard key={step.title}>
              <AppStack gap={2}>
                <AppText variant="bodySmall" weight="bold">
                  {step.title}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {step.body}
                </AppText>
              </AppStack>
            </AppCard>
          ))}
        </AppStack>

        <AppStack gap={2}>
          <AppText variant="titleSm" weight="bold">
            Read the full policies
          </AppText>
          {POLICY_LINKS.map((link) => (
            <Pressable
              key={link.path}
              accessibilityRole="button"
              onPress={() => navigation.navigate("WebPage", { title: link.label, url: `${WEB_BASE_URL}${link.path}` })}
            >
              <AppCard style={styles.linkCard}>
                <AppText variant="bodySmall" weight="bold" style={styles.linkText}>
                  {link.label}
                </AppText>
                <ExternalLink color={colors.mutedText} size={18} />
              </AppCard>
            </Pressable>
          ))}
        </AppStack>
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
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[3]
  },
  linkText: {
    flex: 1,
    minWidth: 0
  }
});
