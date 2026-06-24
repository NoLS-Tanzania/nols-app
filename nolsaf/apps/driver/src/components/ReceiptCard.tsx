import { AmountText, AppCard, AppStack, AppText, colors, radius, spacing, StatusBadge } from "@nolsaf/native-ui";
import { StyleSheet, View } from "react-native";

import { INVOICE_STATUS_TONE, InvoiceItem } from "../driver/types";

type ReceiptCardProps = {
  invoice: InvoiceItem;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <AppText variant="bodySmall" tone="muted">
        {label}
      </AppText>
      <AppText variant="bodySmall" weight="semiBold">
        {value}
      </AppText>
    </View>
  );
}

export function ReceiptCard({ invoice }: ReceiptCardProps) {
  return (
    <AppCard style={styles.card}>
      <AppStack gap={1}>
        <AppText variant="caption" tone="muted" style={styles.center}>
          NoLSAF
        </AppText>
        <AppText variant="titleSm" weight="bold" style={styles.center}>
          Proof of payment
        </AppText>
      </AppStack>

      <View style={styles.badgeRow}>
        <StatusBadge status={INVOICE_STATUS_TONE[invoice.status]} label={invoice.status} />
      </View>

      <View style={styles.amountWrap}>
        <AppText variant="caption" tone="muted">
          Net paid
        </AppText>
        <AmountText amount={invoice.netPaid ?? 0} />
      </View>

      <View style={styles.divider} />

      <AppStack gap={2}>
        <Row label="Invoice no." value={invoice.invoiceNumber || "--"} />
        <Row label="Receipt no." value={invoice.receiptNumber || "--"} />
        <Row label="Trip code" value={invoice.tripCode || "--"} />
        <Row label="Paid to" value={invoice.paidTo || "--"} />
        <Row label="Issued" value={formatDate(invoice.issuedAt)} />
        <Row label="Paid" value={formatDate(invoice.paidAt)} />
      </AppStack>

      <View style={styles.divider} />

      <AppStack gap={2}>
        <Row label="Gross" value={(invoice.gross ?? 0).toLocaleString()} />
        <Row label="Commission" value={`- ${(invoice.commissionAmount ?? 0).toLocaleString()}`} />
        <Row label="Net paid" value={(invoice.netPaid ?? 0).toLocaleString()} />
      </AppStack>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing[4]
  },
  center: {
    textAlign: "center"
  },
  badgeRow: {
    alignItems: "center"
  },
  amountWrap: {
    alignItems: "center",
    gap: spacing[1]
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    borderRadius: radius.full
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[3]
  }
});
