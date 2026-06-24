import { AppCard, AppText, colors, radius, spacing } from "@nolsaf/native-ui";
import { Check, X } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { InvoiceItem, InvoiceStatus } from "../driver/types";

type TimelineStep = {
  key: string;
  label: string;
  description: string;
  date?: string | null;
};

const STEP_ORDER: InvoiceStatus[] = ["REQUESTED", "VERIFIED", "APPROVED", "PAID"];

function formatDateTime(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function InvoiceStatusTimeline({ invoice }: { invoice: InvoiceItem }) {
  const isRejected = invoice.status === "REJECTED";
  const isProcessing = invoice.status === "PROCESSING" || invoice.status === "DRAFT";

  const effectiveStatus: InvoiceStatus = isRejected || isProcessing ? "VERIFIED" : invoice.status;
  const activeIndex = STEP_ORDER.indexOf(effectiveStatus);

  const steps: TimelineStep[] = [
    {
      key: "REQUESTED",
      label: "Requested",
      description: "Payout request submitted for review.",
      date: invoice.issuedAt
    },
    {
      key: "VERIFIED",
      label: "Verified",
      description: "Trip and earnings details checked by NoLSAF.",
      date: null
    },
    {
      key: "APPROVED",
      label: "Approved",
      description: "Approved and queued for disbursement.",
      date: invoice.approvedAt
    },
    {
      key: "PAID",
      label: "Paid",
      description: "Funds disbursed to your payout method.",
      date: invoice.paidAt
    }
  ];

  return (
    <AppCard style={styles.card}>
      <AppText variant="label" weight="bold" tone="muted" style={styles.title}>
        Payout Progress
      </AppText>
      <View>
        {steps.map((step, index) => {
          const isDone = index < activeIndex || invoice.status === "PAID";
          const isCurrent = index === activeIndex && invoice.status !== "PAID";
          const isLast = index === steps.length - 1;
          const dateLabel = formatDateTime(step.date);

          return (
            <View key={step.key} style={styles.row}>
              <View style={styles.markerColumn}>
                <View
                  style={[
                    styles.marker,
                    isDone && styles.markerDone,
                    isCurrent && styles.markerCurrent
                  ]}
                >
                  {isDone ? <Check color={colors.white} size={14} /> : null}
                </View>
                {!isLast && <View style={[styles.connector, isDone && styles.connectorDone]} />}
              </View>
              <View style={styles.content}>
                <AppText variant="bodySmall" weight="bold" tone={isCurrent ? "primary" : isDone ? "default" : "muted"}>
                  {step.label}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {step.description}
                </AppText>
                {dateLabel ? (
                  <AppText variant="caption" tone="muted" style={styles.date}>
                    {dateLabel}
                  </AppText>
                ) : null}
              </View>
            </View>
          );
        })}

        {isRejected && (
          <View style={styles.row}>
            <View style={styles.markerColumn}>
              <View style={[styles.marker, styles.markerRejected]}>
                <X color={colors.white} size={14} />
              </View>
            </View>
            <View style={styles.content}>
              <AppText variant="bodySmall" weight="bold" tone="danger">
                Rejected
              </AppText>
              <AppText variant="caption" tone="muted">
                This payout was rejected. Contact support for details.
              </AppText>
            </View>
          </View>
        )}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing[3]
  },
  title: {
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  row: {
    flexDirection: "row",
    gap: spacing[3]
  },
  markerColumn: {
    alignItems: "center",
    width: 24
  },
  marker: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center"
  },
  markerDone: {
    borderColor: colors.success,
    backgroundColor: colors.success
  },
  markerCurrent: {
    borderColor: colors.primary
  },
  markerRejected: {
    borderColor: colors.danger,
    backgroundColor: colors.danger
  },
  connector: {
    flex: 1,
    width: 2,
    minHeight: spacing[4],
    backgroundColor: colors.border
  },
  connectorDone: {
    backgroundColor: colors.success
  },
  content: {
    flex: 1,
    gap: spacing[1] / 2,
    paddingBottom: spacing[3]
  },
  date: {
    marginTop: spacing[1] / 2
  }
});
