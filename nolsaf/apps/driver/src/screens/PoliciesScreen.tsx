import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppCard, AppText, colors, radius, spacing } from "@nolsaf/native-ui";
import { ArrowLeft, ExternalLink } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Policies">;

const WEB_BASE_URL = "https://nolsaf.com";

const LINKS: Array<{ label: string; description: string; path: string }> = [
  { label: "Terms of service", description: "The terms that govern your use of NoLSAF", path: "/driver/terms" },
  { label: "Privacy policy", description: "How we collect and use your information", path: "/driver/privacy" },
  { label: "Cookies policy", description: "How cookies are used on NoLSAF", path: "/driver/cookies-policy" },
  { label: "Cancellation policy", description: "Rules for cancelling trips", path: "/driver/cancellation-policy" },
  { label: "Verification policy", description: "How driver verification works", path: "/driver/verification-policy" },
  { label: "Driver disbursement policy", description: "How payouts and disbursements work", path: "/driver/driver-disbursement-policy" }
];

export function PoliciesScreen({ navigation }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={colors.ink} size={22} />
        </Pressable>
        <AppText variant="title" weight="bold">
          Policies
        </AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" onPress={() => navigation.navigate("ClaimPolicy")}>
          <AppCard style={styles.linkCard}>
            <View style={styles.linkText}>
              <AppText variant="bodySmall" weight="bold">
                What does claiming mean?
              </AppText>
              <AppText variant="caption" tone="muted">
                How scheduled trip claims and the auction review process work
              </AppText>
            </View>
            <ExternalLink color={colors.mutedText} size={18} />
          </AppCard>
        </Pressable>

        <AppText variant="bodySmall" tone="muted">
          These always show the latest version, right inside the app.
        </AppText>
        {LINKS.map((link) => (
          <Pressable
            key={link.path}
            accessibilityRole="button"
            onPress={() => navigation.navigate("WebPage", { title: link.label, url: `${WEB_BASE_URL}${link.path}` })}
          >
            <AppCard style={styles.linkCard}>
              <View style={styles.linkText}>
                <AppText variant="bodySmall" weight="bold">
                  {link.label}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {link.description}
                </AppText>
              </View>
              <ExternalLink color={colors.mutedText} size={18} />
            </AppCard>
          </Pressable>
        ))}
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
    gap: spacing[3],
    padding: spacing[4],
    paddingBottom: spacing[8]
  },
  linkCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3]
  },
  linkText: {
    flex: 1,
    minWidth: 0,
    gap: spacing[1]
  }
});
