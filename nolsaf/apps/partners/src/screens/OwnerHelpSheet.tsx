import { AppText, colors, radius, spacing } from "@nolsaf/native-ui";
import {
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Clock,
  Mail,
  MessageCircle,
  Phone,
  X
} from "lucide-react-native";
import { useState } from "react";
import {
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ── Data ───────────────────────────────────────────────────────────────────

const CONTACT = {
  email: "support@nolsaf.com",
  phone: "+255 736 766 726",
  whatsapp: "https://wa.me/255736766726",
  hours: "24 / 7"
} as const;

type Faq = { q: string; a: string; steps?: string[] };

const FAQS: Faq[] = [
  {
    q: "How do I add a new property?",
    a: "Add a property from the Properties section of your dashboard.",
    steps: [
      "Open Owner → Properties → Add",
      "Enter basic details: name, location, pricing",
      "Add rooms, amenities, and property policies",
      "Upload clear, well-lit images",
      "Save Draft to pause, or Submit for Review to proceed"
    ]
  },
  {
    q: "What is the review process?",
    a: "After submission your property status changes to PENDING. Admin reviews and approves or requests changes.",
    steps: [
      "Submit your property for review",
      "Status changes to PENDING",
      "Admin reviews details and media",
      "You receive APPROVED or a change request",
      "Apply changes (if requested) and resubmit"
    ]
  },
  {
    q: "How do I manage bookings?",
    a: "Use the Bookings tab. Validate check-in codes, confirm check-ins, and view checked-in guests.",
    steps: [
      "Open the Bookings tab",
      "Validate guest check-in codes via the QR button",
      "Confirm check-ins",
      "View currently checked-in guests",
      "Resolve issues via Support if needed"
    ]
  },
  {
    q: "Where can I see revenue and invoices?",
    a: "Revenue charts and CSV invoices are in the Reports section.",
    steps: [
      "Open Revenue & Payouts from your Account",
      "Filter by date range",
      "Review charts and summaries",
      "Download CSV invoices",
      "Share with accounting if required"
    ]
  },
  {
    q: "How do I upload required documents?",
    a: "Go to My Profile → Required Documents. TIN Certificate and Business Licence are mandatory. JPG and PDF files only, max 2 MB each.",
    steps: [
      "Open Account → My Profile",
      "Scroll to Required Documents",
      "Enter the expiry date for TIN and Business Licence",
      "Tap the Upload button for each document",
      "Documents are reviewed within 48 hours"
    ]
  },
  {
    q: "How do I set my payout preferences?",
    a: "Enter your bank or mobile money details in My Profile → Payout Preferences. The same details apply on web and app.",
    steps: [
      "Open Account → My Profile",
      "Scroll to Payout Preferences",
      "Select Bank Transfer or Mobile Money",
      "Fill in your account details",
      "Tap Save payout details"
    ]
  },
  {
    q: "Can I save a property draft without submitting?",
    a: "Yes. Use Save Draft. Drafts appear under Properties with a DRAFT badge until you are ready to submit."
  },
  {
    q: "How do I contact support?",
    a: "Use the contact options at the top of this page: email, phone, or WhatsApp. Our team is available 24/7."
  }
];

// ── Props ──────────────────────────────────────────────────────────────────

type Props = {
  visible: boolean;
  onClose: () => void;
};

// ── Component ──────────────────────────────────────────────────────────────

export function OwnerHelpSheet({ visible, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggle = (i: number) => setExpandedIndex(prev => (prev === i ? null : i));

  const open = (url: string) => Linking.openURL(url).catch(() => undefined);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />

      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing[4]) }]}>
        <View style={styles.handle} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIcon}>
              <CircleHelp size={18} color={colors.primary} />
            </View>
            <View>
              <AppText variant="bodySmall" weight="semiBold">Help & Support</AppText>
              <AppText variant="caption" tone="muted">FAQs and contact options</AppText>
            </View>
          </View>
          <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button" accessibilityLabel="Close">
            <X size={18} color={colors.mutedText} />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* ── Contact ── */}
          <SectionLabel label="CONTACT US" />

          <View style={styles.contactRow}>
            <ContactCard
              icon={<Mail size={18} color={colors.primary} />}
              iconBg={colors.brand[50]}
              label="Email"
              value={CONTACT.email}
              onPress={() => open(`mailto:${CONTACT.email}`)}
            />
            <ContactCard
              icon={<Phone size={18} color={colors.primary} />}
              iconBg={colors.brand[50]}
              label="Call"
              value={CONTACT.phone}
              onPress={() => open(`tel:${CONTACT.phone.replace(/\s/g, "")}`)}
            />
            <ContactCard
              icon={<MessageCircle size={18} color={colors.accent.green} />}
              iconBg={colors.accent.greenSoft}
              label="WhatsApp"
              value="Chat with us"
              onPress={() => open(CONTACT.whatsapp)}
            />
          </View>

          <View style={styles.hoursRow}>
            <Clock size={13} color={colors.softText} />
            <AppText variant="caption" tone="muted">
              Available <AppText variant="caption" weight="semiBold" tone="muted">{CONTACT.hours}</AppText>
              {". "}Our team responds to all messages within 24 hours.
            </AppText>
          </View>

          {/* ── FAQs ── */}
          <SectionLabel label="FREQUENTLY ASKED QUESTIONS" />

          <View style={styles.faqCard}>
            {FAQS.map((faq, i) => {
              const expanded = expandedIndex === i;
              return (
                <View key={i}>
                  {i > 0 ? <View style={styles.faqDivider} /> : null}
                  <Pressable
                    onPress={() => toggle(i)}
                    style={({ pressed }) => [styles.faqRow, pressed && { backgroundColor: colors.surface }]}
                    accessibilityRole="button"
                    accessibilityLabel={faq.q}
                  >
                    <AppText variant="bodySmall" weight="medium" style={styles.faqQuestion}>
                      {faq.q}
                    </AppText>
                    {expanded
                      ? <ChevronUp size={16} color={colors.softText} />
                      : <ChevronDown size={16} color={colors.softText} />
                    }
                  </Pressable>

                  {expanded ? (
                    <View style={styles.faqAnswer}>
                      <AppText variant="caption" tone="muted" style={styles.faqAnswerText}>
                        {faq.a}
                      </AppText>
                      {faq.steps?.map((step, si) => (
                        <View key={si} style={styles.faqStep}>
                          <View style={styles.faqStepBadge}>
                            <AppText variant="caption" style={styles.faqStepNum}>{si + 1}</AppText>
                          </View>
                          <AppText variant="caption" tone="muted" style={styles.faqStepText}>{step}</AppText>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>

          <View style={{ height: spacing[2] }} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <AppText variant="caption" style={styles.sectionLabel}>{label}</AppText>
  );
}

function ContactCard({
  icon, iconBg, label, value, onPress
}: {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.contactCard, pressed && { opacity: 0.8 }]}
    >
      <View style={[styles.contactIcon, { backgroundColor: iconBg }]}>{icon}</View>
      <AppText variant="caption" weight="semiBold" numberOfLines={1}>{label}</AppText>
      <AppText variant="caption" tone="muted" numberOfLines={2} style={styles.contactValue}>{value}</AppText>
    </Pressable>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    maxHeight: "92%"
  },
  handle: { width: 36, height: 4, borderRadius: radius.full, backgroundColor: colors.border, alignSelf: "center", marginTop: spacing[2] },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing[4], paddingTop: spacing[3], paddingBottom: spacing[3],
    borderBottomWidth: 1, borderBottomColor: colors.border
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  headerIcon: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.brand[50], alignItems: "center", justifyContent: "center" },
  closeBtn: { width: 32, height: 32, borderRadius: radius.full, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  scroll: { padding: spacing[4], gap: spacing[3] },
  sectionLabel: { color: colors.softText, letterSpacing: 1.1, fontSize: 10 },
  // Contact
  contactRow: { flexDirection: "row", gap: spacing[2] },
  contactCard: {
    flex: 1, alignItems: "center",
    paddingVertical: spacing[3], paddingHorizontal: spacing[2],
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.white, gap: spacing[1]
  },
  contactIcon: { width: 40, height: 40, borderRadius: radius.full, alignItems: "center", justifyContent: "center" },
  contactValue: { textAlign: "center", fontSize: 10 },
  hoursRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing[2], paddingHorizontal: spacing[1] },
  // FAQs
  faqCard: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, overflow: "hidden" },
  faqRow: {
    flexDirection: "row", alignItems: "center", gap: spacing[3],
    paddingHorizontal: spacing[4], paddingVertical: spacing[3]
  },
  faqQuestion: { flex: 1 },
  faqDivider: { height: 1, backgroundColor: colors.border },
  faqAnswer: { paddingHorizontal: spacing[4], paddingBottom: spacing[3], gap: spacing[2] },
  faqAnswerText: { lineHeight: 18 },
  faqStep: { flexDirection: "row", alignItems: "flex-start", gap: spacing[2] },
  faqStepBadge: {
    width: 18, height: 18, borderRadius: radius.full,
    backgroundColor: colors.brand[50], borderWidth: 1, borderColor: colors.brand[100],
    alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0
  },
  faqStepNum: { color: colors.primary, fontSize: 9, fontWeight: "700" },
  faqStepText: { flex: 1, lineHeight: 17 }
});
