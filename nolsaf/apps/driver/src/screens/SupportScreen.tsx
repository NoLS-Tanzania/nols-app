import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppCard, AppStack, AppText, colors, radius, spacing } from "@nolsaf/native-ui";
import { ArrowLeft, ChevronDown, ChevronRight, ChevronUp, Headphones, Mail, MessageCircle, Phone } from "lucide-react-native";
import { useState } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "Support">;

const FAQS: Array<{ q: string; a: string; steps?: string[] }> = [
  {
    q: "How do I get started as a driver?",
    a: "Complete your profile, upload required documents (license, insurance), and set your availability. Once approved, you can start accepting trip requests.",
    steps: [
      "Complete your driver profile with personal information",
      "Upload required documents (driving license, vehicle insurance)",
      "Set your availability status to Available",
      "Wait for admin approval",
      "Start accepting trip requests"
    ]
  },
  {
    q: "How do I view and manage my trips?",
    a: "Open Trips to see all your completed, ongoing, and upcoming trips. You can view trip details, passenger information, and trip history.",
    steps: [
      "Open Trips from the bottom navigation",
      "View all your trips (active, scheduled, history)",
      "Tap on a trip to see detailed information",
      "View passenger details and route",
      "Access trip history and earnings"
    ]
  },
  {
    q: "How do I view my earnings and invoices?",
    a: "Open Earnings to see payouts, bonuses, level progress, referrals, and invoices, including receipts for completed trips.",
    steps: [
      "Open Earnings from the bottom navigation",
      "Tap Invoices to view all invoices",
      "Tap an invoice to view its receipt",
      "Check payout status and history"
    ]
  },
  {
    q: "How do I update my documents?",
    a: "Open Account, then Profile, to upload or update your driving license, national ID, vehicle registration, and insurance.",
    steps: [
      "Open Account from the bottom navigation",
      "Tap Profile",
      "Scroll to Documents",
      "Upload new documents or replace existing ones",
      "Wait for admin review and approval"
    ]
  },
  {
    q: "How do I set my availability?",
    a: "Use the availability toggle on your dashboard. Switch to Available to receive trip requests, or Offline to stop receiving requests.",
    steps: [
      "Go to your dashboard",
      "Find the availability toggle",
      "Toggle to Available to receive requests",
      "Toggle to Offline when you are done for the day"
    ]
  },
  {
    q: "How do I view my bonuses and referrals?",
    a: "Open Earnings, then Bonus, for current bonuses and history. Open Referral to see your referral code and earnings from referring other drivers."
  },
  {
    q: "What should I do if I have a safety incident?",
    a: "Contact support immediately using the details below. Describe what happened and provide any relevant details so our team can assist you."
  },
  {
    q: "How do I update my vehicle information?",
    a: "Open Account, then Profile, to update your vehicle type, make, and plate details."
  }
];

const CONTACT = {
  name: "NoLSAF Driver Support",
  email: "support@nolsaf.com",
  phone: "+255 736 766 726",
  whatsapp: "https://wa.me/255736766726",
  hours: "24/7"
};

export function SupportScreen({ navigation }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={colors.ink} size={22} />
        </Pressable>
        <AppText variant="title" weight="bold">
          Support
        </AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AppText variant="bodySmall" tone="muted">
          Frequently asked questions and ways to reach our team.
        </AppText>

        <AppStack gap={2}>
          {FAQS.map((faq, index) => (
            <AppCard key={faq.q} style={styles.faqCard}>
              <Pressable accessibilityRole="button" onPress={() => setExpanded(expanded === index ? null : index)} style={styles.faqHeader}>
                <AppText variant="bodySmall" weight="bold" style={styles.faqQuestion}>
                  {faq.q}
                </AppText>
                {expanded === index ? <ChevronUp color={colors.mutedText} size={18} /> : <ChevronDown color={colors.mutedText} size={18} />}
              </Pressable>
              {expanded === index ? (
                <AppStack gap={2} style={styles.faqBody}>
                  <AppText variant="bodySmall" tone="muted">
                    {faq.a}
                  </AppText>
                  {faq.steps?.map((step, stepIndex) => (
                    <AppText key={step} variant="caption" tone="muted">
                      {stepIndex + 1}. {step}
                    </AppText>
                  ))}
                </AppStack>
              ) : null}
            </AppCard>
          ))}
        </AppStack>

        <AppCard>
          <AppStack gap={3}>
            <View style={styles.supportHeader}>
              <View style={styles.supportIconWrap}>
                <Headphones color={colors.primary} size={20} />
              </View>
              <AppStack gap={1} style={styles.supportHeaderText}>
                <AppText variant="titleSm" weight="bold">
                  {CONTACT.name}
                </AppText>
                <View style={styles.availabilityPill}>
                  <View style={styles.availabilityDot} />
                  <AppText variant="caption" weight="bold" tone="success">
                    Available {CONTACT.hours}
                  </AppText>
                </View>
              </AppStack>
            </View>

            <Pressable accessibilityRole="button" onPress={() => Linking.openURL(`mailto:${CONTACT.email}`)} style={styles.contactRow}>
              <View style={styles.contactIconWrap}>
                <Mail color={colors.primary} size={18} />
              </View>
              <View style={styles.contactInfo}>
                <AppText variant="caption" tone="muted">
                  Email
                </AppText>
                <AppText variant="bodySmall" weight="bold">
                  {CONTACT.email}
                </AppText>
              </View>
              <ChevronRight color={colors.softText} size={18} />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => Linking.openURL(`tel:${CONTACT.phone.replace(/\s+/g, "")}`)}
              style={styles.contactRow}
            >
              <View style={styles.contactIconWrap}>
                <Phone color={colors.primary} size={18} />
              </View>
              <View style={styles.contactInfo}>
                <AppText variant="caption" tone="muted">
                  Phone
                </AppText>
                <AppText variant="bodySmall" weight="bold">
                  {CONTACT.phone}
                </AppText>
              </View>
              <ChevronRight color={colors.softText} size={18} />
            </Pressable>

            <Pressable accessibilityRole="button" onPress={() => Linking.openURL(CONTACT.whatsapp)} style={styles.contactRow}>
              <View style={styles.contactIconWrap}>
                <MessageCircle color={colors.primary} size={18} />
              </View>
              <View style={styles.contactInfo}>
                <AppText variant="caption" tone="muted">
                  WhatsApp
                </AppText>
                <AppText variant="bodySmall" weight="bold">
                  Chat with our team
                </AppText>
              </View>
              <ChevronRight color={colors.softText} size={18} />
            </Pressable>
          </AppStack>
        </AppCard>
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
  faqCard: {
    gap: spacing[2]
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[2]
  },
  faqQuestion: {
    flex: 1,
    minWidth: 0
  },
  faqBody: {
    paddingTop: spacing[1]
  },
  supportHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3]
  },
  supportIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.brand[50],
    alignItems: "center",
    justifyContent: "center"
  },
  supportHeaderText: {
    flex: 1,
    minWidth: 0
  },
  availabilityPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1]
  },
  availabilityDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
    backgroundColor: colors.success
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    padding: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  contactIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  contactInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2
  }
});
