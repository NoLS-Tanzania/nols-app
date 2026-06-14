import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppButton, AppStack, AppText, colors, radius, spacing } from "@nolsaf/native-ui";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { ArrowLeft } from "lucide-react-native";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ReceiptCard } from "../components/ReceiptCard";
import { RootStackParamList } from "../navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "InvoiceDetail">;

function formatDate(value: string | null | undefined) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function InvoiceDetailScreen({ route, navigation }: Props) {
  const { invoice } = route.params;
  const [sharing, setSharing] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  async function handleShare() {
    setShareError(null);
    setSharing(true);
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        setUnavailable(true);
        return;
      }
      const lines = [
        "NoLSAF - Proof of payment",
        `Invoice no.: ${invoice.invoiceNumber || "--"}`,
        `Receipt no.: ${invoice.receiptNumber || "--"}`,
        `Trip code: ${invoice.tripCode || "--"}`,
        `Status: ${invoice.status}`,
        `Paid to: ${invoice.paidTo || "--"}`,
        `Issued: ${formatDate(invoice.issuedAt)}`,
        `Paid: ${formatDate(invoice.paidAt)}`,
        `Gross: ${(invoice.gross ?? 0).toLocaleString()}`,
        `Commission: ${(invoice.commissionAmount ?? 0).toLocaleString()}`,
        `Net paid: ${(invoice.netPaid ?? 0).toLocaleString()}`
      ];
      const file = new File(Paths.cache, `receipt-${invoice.invoiceId}.txt`);
      file.write(lines.join("\n"));
      await Sharing.shareAsync(file.uri);
    } catch (e) {
      setShareError(e instanceof Error ? e.message : "Could not share this receipt.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <Pressable accessibilityRole="button" onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={colors.ink} size={22} />
        </Pressable>
        <AppText variant="title" weight="bold">
          Receipt
        </AppText>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <AppStack gap={4}>
          <ReceiptCard invoice={invoice} />

          {unavailable ? (
            <AppText variant="bodySmall" tone="muted" style={styles.center}>
              Sharing isn't available on this device.
            </AppText>
          ) : (
            <AppButton title="Share receipt" onPress={handleShare} loading={sharing} />
          )}

          {shareError ? (
            <AppText variant="caption" tone="danger" style={styles.center}>
              {shareError}
            </AppText>
          ) : null}
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
  center: {
    textAlign: "center"
  }
});
