import {
  AppButton,
  AppCard,
  AppText,
  StateView,
  StatusBadge,
  colors,
  radius,
  spacing
} from "@nolsaf/native-ui";
import { ArrowUpDown, Building2, CalendarDays, CheckCircle2, Clock3, FileText, MapPin, Phone, ReceiptText, RefreshCw, ScanLine, Search, ShieldCheck, UserRound, Wallet, X } from "lucide-react-native";
import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Animated, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import Svg, { Rect } from "react-native-svg";

import { useAuth } from "../auth";
import {
  OwnerRevenueInvoice,
  OwnerRevenueReceipt,
  OwnerRevenueSegment,
  OwnerRevenueStats,
  bookingCode,
  displayStatus,
  fetchOwnerRevenueInvoiceDetail,
  fetchOwnerRevenueInvoices,
  fetchOwnerRevenueReceipt,
  fetchOwnerRevenueStats,
  formatRevenueDate,
  formatRevenueDatetime,
  formatTzs,
  invoicePayout,
  invoiceSearchText,
  propertyTitle
} from "../ownerRevenue";

type OwnerRevenueScreenProps = {
  initialSegment?: OwnerRevenueSegment;
};

const SEGMENTS: Array<{ key: OwnerRevenueSegment; label: string; helper: string; dot: string }> = [
  { key: "all", label: "All", helper: "Revenue ledger", dot: "#94a3b8" },
  { key: "requested", label: "Requested", helper: "Awaiting review", dot: "#f59e0b" },
  { key: "paid", label: "Paid", helper: "Disbursed", dot: "#10b981" },
  { key: "rejected", label: "Rejected", helper: "Needs action", dot: "#f43f5e" }
];

const EMPTY_STATS: OwnerRevenueStats = {
  totalRevenue: 0,
  paidRevenue: 0,
  pendingRevenue: 0,
  totalInvoices: 0,
  paidInvoices: 0,
  pendingInvoices: 0
};

export function OwnerRevenueScreen({ initialSegment = "all" }: OwnerRevenueScreenProps) {
  const { token } = useAuth();
  const [segment, setSegment] = useState<OwnerRevenueSegment>(initialSegment);
  const [stats, setStats] = useState<OwnerRevenueStats>(EMPTY_STATS);
  const [invoices, setInvoices] = useState<OwnerRevenueInvoice[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextBeforeId, setNextBeforeId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailInvoice, setDetailInvoice] = useState<OwnerRevenueInvoice | null>(null);
  const [receipt, setReceipt] = useState<OwnerRevenueReceipt | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailMode, setDetailMode] = useState<"invoice" | "receipt">("invoice");
  const [sortKey, setSortKey] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc">("date_desc");
  const [showSort, setShowSort] = useState(false);

  useEffect(() => {
    setSegment(initialSegment);
  }, [initialSegment]);

  const load = async (nextSegment = segment, silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [invoiceRes, nextStats] = await Promise.all([
        fetchOwnerRevenueInvoices({ token, segment: nextSegment }),
        fetchOwnerRevenueStats({ token, segment: nextSegment })
      ]);
      setInvoices(invoiceRes.items || []);
      setHasMore(Boolean(invoiceRes.hasMore));
      setNextBeforeId(invoiceRes.nextBeforeId ?? null);
      setStats(nextStats);
    } catch (err) {
      setInvoices([]);
      setHasMore(false);
      setNextBeforeId(null);
      setStats(EMPTY_STATS);
      setError(err instanceof Error ? err.message : "Could not load owner revenue.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load(segment);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segment]);

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    setError(null);
    try {
      const res = await fetchOwnerRevenueInvoices({ token, segment, beforeId: nextBeforeId });
      setInvoices((prev) => {
        const seen = new Set(prev.map((item) => item.id));
        const merged = prev.slice();
        (res.items || []).forEach((item) => {
          if (!seen.has(item.id)) merged.push(item);
        });
        return merged;
      });
      setHasMore(Boolean(res.hasMore));
      setNextBeforeId(res.nextBeforeId ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load more invoices.");
    } finally {
      setLoadingMore(false);
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = invoices.slice();

    list.sort((a, b) => {
      if (sortKey === "date_desc") return new Date(String(b.issuedAt ?? "")).getTime() - new Date(String(a.issuedAt ?? "")).getTime();
      if (sortKey === "date_asc")  return new Date(String(a.issuedAt ?? "")).getTime() - new Date(String(b.issuedAt ?? "")).getTime();
      if (sortKey === "amount_desc") return invoicePayout(b) - invoicePayout(a);
      if (sortKey === "amount_asc")  return invoicePayout(a) - invoicePayout(b);
      return 0;
    });

    if (!q) return list;
    return list.filter((invoice) => invoiceSearchText(invoice).includes(q));
  }, [invoices, query, sortKey]);

  const summary = useMemo(() => {
    const shownValue = filtered.reduce((sum, item) => sum + invoicePayout(item), 0);
    return { count: filtered.length, shownValue };
  }, [filtered]);

  const openDetail = async (invoice: OwnerRevenueInvoice, openReceipt = false) => {
    setDetailInvoice(invoice);
    setReceipt(null);
    setDetailMode(openReceipt ? "receipt" : "invoice");
    setDetailLoading(true);
    setError(null);
    try {
      const detail = await fetchOwnerRevenueInvoiceDetail({ token, invoiceId: invoice.id });
      setDetailInvoice(detail);
      if (openReceipt) {
        try {
          const paidReceipt = await fetchOwnerRevenueReceipt({ token, invoiceId: invoice.id });
          setReceipt(paidReceipt);
        } catch {
          setReceipt(null);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open invoice.");
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          {/* Top row: icon + refresh */}
          <View style={styles.heroTop}>
            <View style={styles.heroIconWrap}>
              <View style={styles.heroIcon}>
                <Wallet size={22} color={colors.white} />
              </View>
              <View>
                <AppText variant="caption" weight="bold" style={styles.heroEyebrow}>
                  OWNER REVENUE
                </AppText>
                <AppText variant="bodySmall" weight="bold" tone="inverse">
                  Revenue & Payouts
                </AppText>
              </View>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Refresh revenue" onPress={() => load(segment, true)} style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}>
              <RefreshCw size={17} color={colors.onHeroSoft} />
            </Pressable>
          </View>

          {/* Big total */}
          <View style={styles.heroBigTotal}>
            <AppText variant="caption" weight="bold" style={styles.heroBigLabel}>
              TOTAL REVENUE
            </AppText>
            <AppText variant="display" weight="extraBold" tone="inverse" numberOfLines={1} style={styles.heroBigValue}>
              {formatTzs(stats.totalRevenue)}
            </AppText>
            <View style={styles.heroBadgeRow}>
              <View style={styles.heroBadge}>
                <AppText variant="caption" weight="bold" style={styles.heroBadgeText}>
                  {stats.totalInvoices} invoices
                </AppText>
              </View>
              <View style={[styles.heroBadge, styles.heroBadgeShowing]}>
                <AppText variant="caption" weight="bold" style={styles.heroBadgeTextMuted}>
                  {summary.count} showing
                </AppText>
              </View>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.heroDivider} />

          {/* Paid / Pending inline */}
          <View style={styles.heroStatRow}>
            <View style={styles.heroStatItem}>
              <View style={styles.heroStatDot} />
              <View>
                <AppText variant="caption" style={styles.heroStatLabel}>Disbursed</AppText>
                <AppText variant="bodySmall" weight="bold" tone="inverse" numberOfLines={1}>{formatTzs(stats.paidRevenue)}</AppText>
                <AppText variant="caption" style={styles.heroStatMeta}>{stats.paidInvoices} paid</AppText>
              </View>
            </View>
            <View style={styles.heroStatSep} />
            <View style={styles.heroStatItem}>
              <View style={[styles.heroStatDot, styles.heroStatDotAmber]} />
              <View>
                <AppText variant="caption" style={styles.heroStatLabel}>Pending</AppText>
                <AppText variant="bodySmall" weight="bold" tone="inverse" numberOfLines={1}>{formatTzs(stats.pendingRevenue)}</AppText>
                <AppText variant="caption" style={styles.heroStatMeta}>{stats.pendingInvoices} pending</AppText>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.segmentWrap}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentScroll}>
            {SEGMENTS.map((item) => {
              const active = segment === item.key;
              const count = segmentCount(item.key, stats);
              return (
                <Pressable
                  key={item.key}
                  accessibilityRole="button"
                  onPress={() => setSegment(item.key)}
                  style={({ pressed }) => [styles.segmentChip, active && styles.segmentChipActive, pressed && styles.pressed]}
                >
                  <View style={styles.segmentChipTop}>
                    <View style={[styles.segmentDot, { backgroundColor: active ? "rgba(255,255,255,0.55)" : item.dot }]} />
                    <AppText variant="caption" weight="bold" style={active ? styles.segmentTextActive : styles.segmentText}>
                      {item.label}
                    </AppText>
                  </View>
                  <View style={styles.segmentChipBottom}>
                    <View style={[styles.segmentCountBadge, active ? styles.segmentCountBadgeActive : styles.segmentCountBadgeIdle]}>
                      <AppText variant="caption" weight="bold" style={active ? styles.segmentCountActive : styles.segmentCount}>
                        {count}
                      </AppText>
                    </View>
                    <AppText variant="caption" style={active ? styles.segmentSubActive : styles.segmentSub} numberOfLines={1}>
                      {item.helper}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={styles.searchRow}>
          <View style={styles.searchBar}>
            <Search size={16} color={colors.softText} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search invoice, property, receipt..."
              placeholderTextColor={colors.softText}
              style={styles.searchInput}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
          <Pressable
            onPress={() => setShowSort((v) => !v)}
            style={({ pressed }) => [styles.sortToggleBtn, showSort && styles.sortToggleBtnActive, pressed && styles.pressed]}
            accessibilityLabel="Sort options"
          >
            <ArrowUpDown size={16} color={showSort ? colors.white : colors.primaryDeep} />
            {sortKey !== "date_desc" && !showSort ? <View style={styles.sortActiveDot} /> : null}
          </Pressable>
        </View>

        {showSort ? (
          <View style={styles.sortRow}>
            {([
              { key: "date_desc",   label: "Newest" },
              { key: "date_asc",    label: "Oldest" },
              { key: "amount_desc", label: "Highest" },
              { key: "amount_asc",  label: "Lowest" }
            ] as const).map((opt) => {
              const active = sortKey === opt.key;
              return (
                <Pressable
                  key={opt.key}
                  onPress={() => { setSortKey(opt.key); setShowSort(false); }}
                  style={({ pressed }) => [styles.sortChip, active && styles.sortChipActive, pressed && styles.pressed]}
                >
                  <AppText variant="caption" weight="bold" style={active ? styles.sortChipTextActive : styles.sortChipText}>
                    {opt.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={styles.ledgerHeader}>
          <View>
            <AppText variant="bodySmall" weight="bold">
              {summary.count} Invoice{summary.count !== 1 ? "s" : ""}
            </AppText>
            <AppText variant="caption" tone="muted">
              {formatTzs(summary.shownValue)} in this view
            </AppText>
          </View>
          {refreshing ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <AppText variant="bodySmall" tone="danger">
              {error}
            </AppText>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <AppText variant="bodySmall" tone="muted">
              Loading owner revenue
            </AppText>
          </View>
        ) : filtered.length === 0 ? (
          <StateView title="No invoices found" message="Try another segment or refresh to pull the latest owner revenue activity." actionLabel="Refresh" onAction={() => load(segment, true)} />
        ) : (
          <View style={styles.list}>
            {filtered.map((invoice) => (
              <InvoiceCard key={`${segment}-${invoice.id}`} invoice={invoice} onOpen={openDetail} />
            ))}
          </View>
        )}

        {hasMore && !loading ? (
          <AppButton title={loadingMore ? "Loading..." : "Load more"} variant="secondary" loading={loadingMore} onPress={loadMore} />
        ) : null}
      </ScrollView>

      <InvoiceDetailModal
        invoice={detailInvoice}
        receipt={receipt}
        mode={detailMode}
        loading={detailLoading}
        onClose={() => {
          setDetailInvoice(null);
          setReceipt(null);
          setDetailMode("invoice");
        }}
        onReceipt={() => detailInvoice && openDetail(detailInvoice, true)}
        onInvoice={() => {
          setReceipt(null);
          setDetailMode("invoice");
        }}
      />
    </View>
  );
}

const PROCESS_STEPS = [
  { key: "ISSUED",   label: "Issued" },
  { key: "VERIFIED", label: "Verified" },
  { key: "APPROVED", label: "Approved" },
  { key: "PAID",     label: "Paid" }
];

function stepIndex(status: string): number {
  if (status === "PAID") return 3;
  if (status === "APPROVED") return 2;
  if (status === "VERIFIED") return 1;
  return 0;
}

function InvoiceCard({ invoice, onOpen }: { invoice: OwnerRevenueInvoice; onOpen: (invoice: OwnerRevenueInvoice, receipt?: boolean) => void }) {
  const status = String(invoice.status || "").toUpperCase();
  const isPaid = status === "PAID";
  const isRejected = status === "REJECTED";
  const isRequested = !isPaid && !isRejected;
  const currentStep = stepIndex(status);

  const iconBg    = isPaid ? "#d1fae5" : isRejected ? "#ffe4e6" : "#fef3c7";
  const iconColor = isPaid ? "#059669" : isRejected ? "#e11d48" : "#d97706";
  const pillBg    = isPaid ? "#ecfdf5" : isRejected ? "#fff1f2" : "#fffbeb";
  const pillBorder = isPaid ? "#10b98133" : isRejected ? "#f43f5e33" : "#f59e0b33";
  const pillText  = isPaid ? "#059669"   : isRejected ? "#e11d48"   : "#d97706";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onOpen(invoice)}
      style={({ pressed }) => [styles.invoiceCard, pressed && styles.pressed]}
    >
      <View style={styles.invoiceCardInner}>

        {/* Top: icon + meta + status pill */}
        <View style={styles.cardTop}>
          <View style={[styles.statusMark, { backgroundColor: iconBg }]}>
            {isPaid ? <ReceiptText size={17} color={iconColor} /> : <FileText size={17} color={iconColor} />}
          </View>
          <View style={styles.cardTitle}>
            <AppText variant="bodySmall" weight="extraBold" numberOfLines={1} style={styles.invoiceNumber}>
              {invoice.invoiceNumber || `Invoice #${invoice.id}`}
            </AppText>
            <AppText variant="caption" tone="muted" numberOfLines={1}>
              {propertyTitle(invoice)}  ·  {bookingCode(invoice)}
            </AppText>
          </View>
          <View style={[styles.invoiceStatusPill, { backgroundColor: pillBg, borderColor: pillBorder }]}>
            <AppText variant="caption" weight="bold" style={[styles.invoiceStatusText, { color: pillText }]}>
              {displayStatus(invoice)}
            </AppText>
          </View>
        </View>

        <View style={styles.invoiceCardDivider} />

        {/* Amount + date */}
        <View style={styles.amountRow}>
          <View style={styles.amountBlock}>
            <AppText variant="caption" weight="bold" style={styles.amountLabel}>OWNER PAYOUT</AppText>
            <AppText variant="titleSm" weight="extraBold" style={styles.amountText} numberOfLines={1}>
              {formatTzs(invoicePayout(invoice))}
            </AppText>
          </View>
          <View style={styles.dateBlock}>
            <AppText variant="caption" weight="bold" style={styles.dateLabel}>
              {isPaid ? "PAID" : "ISSUED"}
            </AppText>
            <AppText variant="bodySmall" weight="bold" style={styles.dateValue} numberOfLines={1}>
              {formatRevenueDate(isPaid ? invoice.paidAt : invoice.issuedAt)}
            </AppText>
          </View>
        </View>

        {/* Footer varies by status */}
        {isPaid ? (
          <View style={styles.invoiceCardFooter}>
            <View style={styles.receiptChip}>
              <ReceiptText size={13} color={colors.primary} />
              <AppText variant="caption" weight="semiBold" style={styles.receiptChipText} numberOfLines={1}>
                {invoice.receiptNumber || invoice.paymentRef || "Receipt available"}
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={(e) => { e.stopPropagation?.(); onOpen(invoice, true); }}
              style={({ pressed }) => [styles.receiptActionBtn, pressed && styles.pressed]}
            >
              <ReceiptText size={14} color={colors.white} />
              <AppText variant="caption" weight="bold" style={styles.receiptActionText}>View Receipt</AppText>
            </Pressable>
          </View>
        ) : isRejected ? (
          <View style={styles.rejectedNote}>
            <AppText variant="caption" weight="bold" style={styles.rejectedNoteText}>
              Payout rejected · Tap to view details
            </AppText>
          </View>
        ) : isRequested ? (
          <View style={styles.processTrack}>
            {PROCESS_STEPS.map((step, i) => {
              const done = i <= currentStep;
              const active = i === currentStep;
              return (
                <View key={step.key} style={styles.processStep}>
                  <View style={[
                    styles.processDot,
                    done && styles.processDotDone,
                    active && styles.processDotActive
                  ]}>
                    {done && !active ? <CheckCircle2 size={10} color={colors.white} /> : null}
                  </View>
                  {i < PROCESS_STEPS.length - 1 && (
                    <View style={[styles.processLine, done && i < currentStep && styles.processLineDone]} />
                  )}
                  <AppText variant="caption" style={[styles.processLabel, done ? styles.processLabelDone : styles.processLabelIdle]}>
                    {step.label}
                  </AppText>
                </View>
              );
            })}
          </View>
        ) : null}

      </View>
    </Pressable>
  );
}

function InvoiceDetailModal({
  invoice,
  receipt,
  mode,
  loading,
  onClose,
  onReceipt,
  onInvoice
}: {
  invoice: OwnerRevenueInvoice | null;
  receipt: OwnerRevenueReceipt | null;
  mode: "invoice" | "receipt";
  loading: boolean;
  onClose: () => void;
  onReceipt: () => void;
  onInvoice: () => void;
}) {
  const qrPayload = receipt?.qrPayload ? JSON.stringify(receipt.qrPayload) : "";
  const qrMatrix = useMemo(() => {
    if (!qrPayload) return null;
    try {
      const qr = QRCode.create(qrPayload, { errorCorrectionLevel: "M" });
      return {
        size: qr.modules.size,
        data: Array.from(qr.modules.data, Boolean)
      };
    } catch {
      return null;
    }
  }, [qrPayload]);

  if (!invoice) return null;
  const activeInvoice = mode === "receipt" ? receipt?.invoice || invoice : invoice;
  const paid = String(activeInvoice.status || "").toUpperCase() === "PAID";
  const booking = activeInvoice.booking;
  const property = booking?.property;
  const codeVisible = booking?.code?.codeVisible || booking?.code?.code || "-";
  const nights = nightsBetween(booking?.checkIn, booking?.checkOut);
  const propLine = [property?.type, property?.city, property?.district, property?.regionName, property?.country].filter(Boolean).join(" , ");
  const showReceipt = mode === "receipt";

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          {loading ? (
            <View style={styles.detailLoading}>
              <ActivityIndicator color={colors.primary} />
              <AppText variant="bodySmall" tone="muted">
                Opening invoice
              </AppText>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.receiptScroll}>
              <View style={styles.receiptCutLine}>
                {Array.from({ length: 28 }).map((_, index) => (
                  <View key={index} style={styles.receiptCutDot} />
                ))}
              </View>
              <View style={styles.receiptHeader}>
                <Pressable accessibilityRole="button" accessibilityLabel="Close receipt" onPress={onClose} style={styles.receiptCloseButton}>
                  <X size={18} color={colors.mutedText} />
                </Pressable>
              </View>

              <ModeTabs mode={mode} paid={paid} onInvoice={onInvoice} onReceipt={onReceipt} receiptNumber={activeInvoice.receiptNumber} />

              {showReceipt ? (
                <>
                  <View style={styles.receiptHero}>
                    <AppText variant="caption" weight="bold" style={styles.receiptEyebrow}>
                      PAYOUT CONFIRMATION
                    </AppText>
                    <AppText variant="title" weight="extraBold" style={styles.receiptTitle}>
                      Payout Receipt
                    </AppText>
                    <AppText variant="caption" weight="bold" style={styles.receiptAmountLabel}>
                      AMOUNT DISBURSED
                    </AppText>
                    <View style={styles.receiptAmountRow}>
                      <AppText variant="display" weight="extraBold" style={styles.receiptAmount} numberOfLines={1}>
                        {formatTzs(invoicePayout(activeInvoice)).replace(/^TZS\s?/i, "").replace(/^TSh\s?/i, "")}
                      </AppText>
                      <AppText variant="titleSm" weight="bold" style={styles.receiptCurrency}>
                        TZS
                      </AppText>
                    </View>
                    <AppText variant="bodySmall" style={styles.receiptPaidDate}>
                      {formatRevenueDatetime(activeInvoice.paidAt)}
                    </AppText>
                  </View>

                  <View style={styles.receiptProofCard}>
                    <View style={styles.qrPanel}>
                      <View style={styles.qrFrame}>
                        {qrMatrix ? (
                          <QrMatrix matrix={qrMatrix} />
                        ) : (
                          <View style={styles.qrPlaceholder}>
                            <ScanLine size={34} color={colors.primary} />
                            <AppText variant="caption" tone="muted" style={styles.qrPlaceholderText}>
                              {receipt ? "QR unavailable" : "Open receipt"}
                            </AppText>
                          </View>
                        )}
                      </View>
                      <AppText variant="caption" weight="bold" style={styles.qrCaption}>
                        SCAN TO VERIFY
                      </AppText>
                    </View>
                    <View style={styles.proofMeta}>
                      <View style={styles.proofTitleRow}>
                        <ShieldCheck size={16} color={colors.primary} />
                        <AppText variant="caption" weight="bold" style={styles.proofTitle}>
                          VERIFIED RECEIPT
                        </AppText>
                      </View>
                      <ProofLine label="Receipt" value={activeInvoice.receiptNumber || "Not issued"} />
                      <ProofLine label="Invoice" value={activeInvoice.invoiceNumber || `#${activeInvoice.id}`} />
                      <ProofLine label="Payment ref" value={activeInvoice.paymentRef || "-"} />
                      <ProofLine label="Paid" value={formatRevenueDatetime(activeInvoice.paidAt)} />
                    </View>
                  </View>

                  <View style={styles.receiptGrid}>
                    <ReceiptInfoCard
                      icon={<Clock3 size={14} color={colors.primary} />}
                      title="Payment"
                      rows={[
                        ["Method", activeInvoice.paymentMethod || "-"],
                        ["Date", formatRevenueDatetime(activeInvoice.paidAt)],
                        ["Reference", activeInvoice.paymentRef || "-"]
                      ]}
                    />
                    <ReceiptInfoCard
                      icon={<CalendarDays size={14} color={colors.primary} />}
                      title="Booking"
                      rows={[
                        ["Code", codeVisible],
                        ["Check-in", formatRevenueDate(booking?.checkIn)],
                        ["Check-out", formatRevenueDate(booking?.checkOut)],
                        ["Duration", nights == null ? "-" : `${nights} night${nights === 1 ? "" : "s"}`],
                        ["Booking", `#${activeInvoice.bookingId || booking?.id || "-"}`]
                      ]}
                    />
                    {property ? (
                      <ReceiptInfoCard
                        icon={<MapPin size={14} color={colors.primary} />}
                        title="Property"
                        rows={[
                          ["Name", propertyTitle(activeInvoice)],
                          ["Location", propLine || "-"]
                        ]}
                      />
                    ) : null}
                    {booking?.guestName ? (
                      <ReceiptInfoCard
                        icon={<UserRound size={14} color={colors.primary} />}
                        title="Guest"
                        rows={[
                          ["Name", booking.guestName],
                          ["Phone", booking.guestPhone || "-"]
                        ]}
                      />
                    ) : null}
                  </View>
                </>
              ) : (
                <InvoiceViewContent invoice={activeInvoice} codeVisible={codeVisible} propLine={propLine} onReceipt={onReceipt} />
              )}

              {String(activeInvoice.status).toUpperCase() === "REJECTED" && (activeInvoice.rejectedReason || activeInvoice.rejectionReason) ? (
                <View style={styles.errorBox}>
                  <AppText variant="bodySmall" tone="danger">
                    {activeInvoice.rejectedReason || activeInvoice.rejectionReason}
                  </AppText>
                </View>
              ) : null}

              {paid && showReceipt ? (
                <AppButton title={receipt ? "Refresh receipt" : "Open receipt"} variant="secondary" onPress={onReceipt} icon={<ReceiptText size={18} color={colors.primary} />} />
              ) : null}

              <View style={styles.receiptFooter}>
                <AppText variant="caption" style={styles.receiptFooterText}>
                  Thank you for partnering with NoLSAF.
                </AppText>
                <AppText variant="caption" style={styles.receiptFooterText}>
                  Questions? Contact support.
                </AppText>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function ModeTabs({
  mode,
  paid,
  receiptNumber,
  onInvoice,
  onReceipt
}: {
  mode: "invoice" | "receipt";
  paid: boolean;
  receiptNumber?: string | null;
  onInvoice: () => void;
  onReceipt: () => void;
}) {
  const slideAnim = useState(() => new Animated.Value(mode === "receipt" ? 1 : 0))[0];

  const handleInvoice = () => {
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 280, friction: 22 }).start();
    onInvoice();
  };

  const handleReceipt = () => {
    Animated.spring(slideAnim, { toValue: 1, useNativeDriver: true, tension: 280, friction: 22 }).start();
    onReceipt();
  };

  if (!paid) {
    return (
      <View style={styles.modeTabs}>
        <View style={[styles.modeTabsTrack, styles.modeTabsTrackSingle]}>
          <View style={styles.modeTabActivePill} />
          <View style={styles.modeTabItem}>
            <FileText size={15} color={colors.white} />
            <AppText variant="caption" weight="bold" style={styles.modeTabTextActive}>
              Invoice
            </AppText>
          </View>
        </View>
      </View>
    );
  }

  const pillTranslateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"]
  });

  return (
    <View style={styles.modeTabs}>
      <View style={styles.modeTabsTrack}>
        <Animated.View style={[styles.modeTabActivePill, { transform: [{ translateX: pillTranslateX }] }]} />
        <Pressable accessibilityRole="button" onPress={handleInvoice} style={({ pressed }) => [styles.modeTabItem, pressed && styles.pressed]}>
          <FileText size={15} color={mode === "invoice" ? colors.white : colors.primary} />
          <AppText variant="caption" weight="bold" style={mode === "invoice" ? styles.modeTabTextActive : styles.modeTabText}>
            Invoice
          </AppText>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={handleReceipt} style={({ pressed }) => [styles.modeTabItem, pressed && styles.pressed]}>
          <ReceiptText size={15} color={mode === "receipt" ? colors.white : colors.primary} />
          <AppText variant="caption" weight="bold" style={mode === "receipt" ? styles.modeTabTextActive : styles.modeTabText}>
            Receipt
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

function InvoiceViewContent({
  invoice,
  codeVisible,
  propLine,
  onReceipt
}: {
  invoice: OwnerRevenueInvoice;
  codeVisible: string;
  propLine: string;
  onReceipt: () => void;
}) {
  const status = String(invoice.status || "").toUpperCase();
  const paid = status === "PAID";
  const booking = invoice.booking;
  const property = booking?.property;
  const ownerName = invoice.senderName || invoice.owner?.fullName || invoice.owner?.name || booking?.guestName || booking?.user?.fullName || booking?.user?.name || "Owner";
  const ownerPhone = invoice.senderPhone || invoice.owner?.phone || booking?.guestPhone || booking?.user?.phone || "-";
  const ownerAddress = invoice.senderAddress || [invoice.owner?.city || property?.city || property?.regionName, "Tanzania"].filter(Boolean).join(", ");
  const issued = invoice.issuedAt || invoice.createdAt;

  return (
    <View style={styles.invoiceDetailWrap}>
      <View style={styles.invoiceHeroCard}>
        <View style={styles.invoiceHeroBand}>
          <View style={styles.invoiceHeroIcon}>
            <FileText size={20} color={colors.white} />
          </View>
          <View style={styles.cardTitle}>
            <AppText variant="caption" weight="bold" style={styles.invoiceHeroKicker}>
              INVOICE
            </AppText>
            <AppText variant="bodySmall" weight="bold" tone="inverse" numberOfLines={1}>
              {invoice.invoiceNumber || `#${invoice.id}`}
            </AppText>
          </View>
        </View>

        <View style={styles.invoiceHeroBody}>
          <View style={styles.invoiceTitleRow}>
            <View style={styles.cardTitle}>
              <AppText variant="titleSm" weight="extraBold" style={styles.invoiceTitle} numberOfLines={2}>
                {invoice.invoiceNumber || `Invoice #${invoice.id}`}
              </AppText>
              <AppText variant="bodySmall" tone="muted" numberOfLines={2}>
                {propertyTitle(invoice)} | Accommodation Invoice
              </AppText>
            </View>
            <StatusBadge status={statusBadge(invoice)} label={displayStatus(invoice)} />
          </View>

          <View style={styles.invoiceMetricGrid}>
            <MetricTile label="Amount" value={formatTzs(invoicePayout(invoice))} accent />
            <MetricTile label="Issued" value={formatRevenueDatetime(issued)} />
            <MetricTile label="Property" value={propertyTitle(invoice)} wide />
          </View>
        </View>
      </View>

      <View style={styles.invoicePartiesCard}>
        <PartyBlock icon={<UserRound size={15} color={colors.primary} />} label="From" name={ownerName} phone={ownerPhone} address={ownerAddress || "-"} />
        <View style={styles.invoicePartyDivider} />
        <PartyBlock icon={<Building2 size={15} color={colors.primary} />} label="To" name={invoice.receiverName || "NoLSAF"} phone={invoice.receiverPhone || "+255"} address={invoice.receiverAddress || "Dar es Salaam, Tanzania"} />
      </View>

      <View style={styles.invoiceRowsCard}>
        <InvoiceRow label="Property" value={propertyTitle(invoice)} />
        <InvoiceRow label="NoLSAF Code" value={codeVisible} mono />
        <InvoiceRow label="Issued" value={formatRevenueDatetime(issued)} />
        {paid ? <InvoiceRow label="Disbursed" value={formatRevenueDatetime(invoice.paidAt)} /> : null}
        {propLine ? <InvoiceRow label="Location" value={propLine} /> : null}
      </View>

      <View style={styles.invoiceTotalCard}>
        <View>
          <AppText variant="caption" weight="bold" style={styles.invoiceTotalLabel}>
            TOTAL PAYOUT
          </AppText>
          <AppText variant="caption" style={styles.invoiceTotalSub}>
            Amount to be released
          </AppText>
        </View>
        <View style={styles.invoiceTotalRight}>
          <AppText variant="titleSm" weight="extraBold" tone="inverse">
            {formatTzs(invoicePayout(invoice))}
          </AppText>
          <AppText variant="caption" weight="bold" style={paid ? styles.invoicePaidPill : styles.invoicePendingPill}>
            {paid ? "DISBURSED" : displayStatus(invoice).toUpperCase()}
          </AppText>
        </View>
      </View>

      {paid ? (
        <Pressable accessibilityRole="button" onPress={onReceipt} style={({ pressed }) => [styles.invoiceReceiptCard, pressed && styles.pressed]}>
          <View style={styles.invoiceReceiptIcon}>
            <ReceiptText size={18} color={colors.primary} />
          </View>
          <View style={styles.cardTitle}>
            <AppText variant="bodySmall" weight="bold" style={styles.invoiceReceiptTitle}>
              Receipt available
            </AppText>
            <AppText variant="caption" tone="muted" numberOfLines={1}>
              {invoice.receiptNumber || "Open verified payout receipt"}
            </AppText>
          </View>
          <AppText variant="caption" weight="bold" style={styles.invoiceReceiptAction}>
            Open
          </AppText>
        </Pressable>
      ) : null}

      <TimelineCard invoice={invoice} />
    </View>
  );
}

function MetricTile({ label, value, accent, wide }: { label: string; value: string; accent?: boolean; wide?: boolean }) {
  return (
    <View style={[styles.metricTile, accent && styles.metricTileAccent, wide && styles.metricTileWide]}>
      <AppText variant="caption" tone="muted" weight="bold" style={styles.metricLabel}>
        {label}
      </AppText>
      <AppText variant="bodySmall" weight="extraBold" style={accent ? styles.metricValueAccent : styles.metricValue} numberOfLines={2}>
        {value}
      </AppText>
    </View>
  );
}

function PartyBlock({ icon, label, name, phone, address }: { icon: React.ReactNode; label: string; name: string; phone: string; address: string }) {
  return (
    <View style={styles.partyBlock}>
      <View style={styles.partyHeader}>
        <View style={styles.partyIcon}>{icon}</View>
        <AppText variant="caption" weight="bold" style={styles.partyLabel}>
          {label}
        </AppText>
      </View>
      <AppText variant="body" weight="bold" numberOfLines={2}>
        {name}
      </AppText>
      <View style={styles.partyLine}>
        <Phone size={13} color={colors.softText} />
        <AppText variant="bodySmall" tone="muted" numberOfLines={1}>
          {phone}
        </AppText>
      </View>
      <View style={styles.partyLine}>
        <MapPin size={13} color={colors.softText} />
        <AppText variant="bodySmall" tone="muted" numberOfLines={2}>
          {address}
        </AppText>
      </View>
    </View>
  );
}

function InvoiceRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.invoiceRow}>
      <AppText variant="caption" tone="muted" weight="bold" style={styles.invoiceRowLabel}>
        {label}
      </AppText>
      <AppText variant="bodySmall" weight="bold" style={[styles.invoiceRowValue, mono && styles.invoiceRowMono]} numberOfLines={2}>
        {value || "-"}
      </AppText>
    </View>
  );
}

function TimelineCard({ invoice }: { invoice: OwnerRevenueInvoice }) {
  const status = String(invoice.status || "").toUpperCase();
  const steps = [
    { label: "Issued", date: invoice.issuedAt || invoice.createdAt, color: "#0284c7" },
    { label: "Verified", date: invoice.verifiedAt, color: "#d97706" },
    { label: "Approved", date: invoice.approvedAt, color: "#059669" },
    { label: "Paid", date: invoice.paidAt, color: "#7c3aed" }
  ];

  return (
    <View style={styles.timelineCard}>
      <View style={styles.timelineHeader}>
        <View style={styles.partyIcon}>
          <Clock3 size={15} color={colors.primary} />
        </View>
        <AppText variant="caption" weight="bold" style={styles.partyLabel}>
          Process Timeline
        </AppText>
        <View style={styles.cardTitle} />
        <StatusBadge status={statusBadge(invoice)} label={displayStatus(invoice)} />
      </View>
      <View style={styles.timelineGrid}>
        {steps.map((step) => {
          const done = Boolean(step.date);
          return (
            <View key={step.label} style={styles.timelineStep}>
              <View style={[styles.timelineNode, done ? { borderColor: step.color, backgroundColor: `${step.color}14` } : styles.timelineNodeIdle]}>
                {done ? <CheckCircle2 size={16} color={step.color} /> : <View style={styles.timelineIdleDot} />}
              </View>
              <AppText variant="caption" weight="bold" style={[styles.timelineLabel, done ? { color: step.color } : styles.timelineIdleText]}>
                {step.label}
              </AppText>
              <AppText variant="caption" weight="semiBold" style={done ? styles.timelineDate : styles.timelineIdleText}>
                {done ? formatRevenueDatetime(step.date) : "-"}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}


function DateStack({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.dateStack}>
      <AppText variant="caption" tone="muted" weight="bold" style={styles.upperLabel}>
        {label}
      </AppText>
      <AppText variant="bodySmall" weight="semiBold" numberOfLines={1}>
        {value}
      </AppText>
    </View>
  );
}

function ProofLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.proofLine}>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <AppText variant="caption" weight="bold" style={styles.proofValue} numberOfLines={2}>
        {value}
      </AppText>
    </View>
  );
}

function QrMatrix({ matrix }: { matrix: { size: number; data: boolean[] } }) {
  const quietZone = 2;
  const viewSize = matrix.size + quietZone * 2;

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${viewSize} ${viewSize}`}>
      <Rect x={0} y={0} width={viewSize} height={viewSize} fill={colors.white} />
      {matrix.data.map((active, index) => {
        if (!active) return null;
        const x = (index % matrix.size) + quietZone;
        const y = Math.floor(index / matrix.size) + quietZone;
        return <Rect key={index} x={x} y={y} width={1} height={1} fill={colors.primaryDeep} />;
      })}
    </Svg>
  );
}

function ReceiptInfoCard({ icon, title, rows }: { icon: React.ReactNode; title: string; rows: Array<[string, string]> }) {
  return (
    <View style={styles.receiptInfoCard}>
      <View style={styles.infoCardHeader}>
        {icon}
        <AppText variant="caption" weight="bold" style={styles.infoCardTitle}>
          {title}
        </AppText>
      </View>
      <View style={styles.infoRows}>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.infoRow}>
            <AppText variant="caption" tone="muted">
              {label}
            </AppText>
            <AppText variant="caption" weight="bold" style={styles.infoValue} numberOfLines={2}>
              {value}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

function segmentCount(segment: OwnerRevenueSegment, stats: OwnerRevenueStats) {
  if (segment === "paid") return stats.paidInvoices;
  if (segment === "requested") return stats.pendingInvoices;
  if (segment === "rejected") return "-";
  return stats.totalInvoices;
}

function statusBadge(invoice: OwnerRevenueInvoice): "paid" | "failed" | "awaiting" | "approved" | "pending" {
  const status = String(invoice.status || "").toUpperCase();
  if (status === "PAID") return "paid";
  if (status === "REJECTED") return "failed";
  if (status === "REQUESTED" || status === "SUBMITTED" || status === "PENDING") return "awaiting";
  if (status === "APPROVED" || status === "VERIFIED") return "approved";
  return "pending";
}

function nightsBetween(checkIn: unknown, checkOut: unknown): number | null {
  const a = new Date(String(checkIn ?? "")).getTime();
  const b = new Date(String(checkOut ?? "")).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  const n = Math.round((b - a) / 86400000);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing[3], paddingBottom: spacing[8], gap: spacing[3] },
  hero: {
    borderRadius: radius.xl,
    backgroundColor: colors.primaryDeep,
    padding: spacing[4],
    gap: spacing[4],
    overflow: "hidden"
  },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  heroIconWrap: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  heroIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center"
  },
  refreshButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)"
  },
  heroEyebrow: { color: colors.onHeroSoft, letterSpacing: 1.8, fontSize: 10 },
  heroBigTotal: { gap: spacing[2] },
  heroBigLabel: { color: "rgba(255,255,255,0.45)", letterSpacing: 2, fontSize: 10 },
  heroBigValue: { fontSize: 34, letterSpacing: -0.5 },
  heroBadgeRow: { flexDirection: "row", gap: spacing[2], marginTop: spacing[1] },
  heroBadge: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)"
  },
  heroBadgeShowing: { backgroundColor: "rgba(255,255,255,0.07)" },
  heroBadgeText: { color: colors.white, fontSize: 11, letterSpacing: 0.3 },
  heroBadgeTextMuted: { color: colors.onHeroSoft, fontSize: 11 },
  heroDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.10)" },
  heroStatRow: { flexDirection: "row", alignItems: "flex-start" },
  heroStatItem: { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: spacing[2] },
  heroStatSep: { width: 1, alignSelf: "stretch", backgroundColor: "rgba(255,255,255,0.10)", marginHorizontal: spacing[3] },
  heroStatDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: "#34d399",
    marginTop: 4
  },
  heroStatDotAmber: { backgroundColor: "#fbbf24" },
  heroStatLabel: { color: "rgba(255,255,255,0.45)", fontSize: 10, letterSpacing: 1, marginBottom: 2 },
  heroStatMeta: { color: "rgba(255,255,255,0.35)", fontSize: 10, marginTop: 2 },
  segmentWrap: { marginHorizontal: -spacing[3] },
  segmentScroll: { gap: spacing[2], paddingHorizontal: spacing[3] },
  segmentChip: {
    width: 130,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    gap: spacing[2],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1
  },
  segmentChipActive: {
    backgroundColor: colors.primaryDeep,
    borderColor: colors.primaryDeep,
    shadowColor: colors.primaryDeep,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  segmentChipTop: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  segmentDot: { width: 7, height: 7, borderRadius: radius.full },
  segmentChipBottom: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  segmentCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.full,
    minWidth: 22,
    alignItems: "center"
  },
  segmentCountBadgeIdle: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  segmentCountBadgeActive: { backgroundColor: "rgba(255,255,255,0.18)" },
  segmentCount: { color: colors.primaryDeep, fontSize: 11 },
  segmentCountActive: { color: colors.white, fontSize: 11 },
  segmentText: { color: colors.primaryDeep, fontSize: 13 },
  segmentTextActive: { color: colors.white, fontSize: 13 },
  segmentSub: { color: colors.softText, fontSize: 10 },
  segmentSubActive: { color: "rgba(255,255,255,0.5)", fontSize: 10 },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2]
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing[4],
    height: 48,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.ink,
    paddingVertical: 0
  },
  sortToggleBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1
  },
  sortToggleBtnActive: {
    backgroundColor: colors.primaryDeep,
    borderColor: colors.primaryDeep
  },
  sortActiveDot: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 7,
    height: 7,
    borderRadius: radius.full,
    backgroundColor: "#f59e0b",
    borderWidth: 1.5,
    borderColor: colors.white
  },
  ledgerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sortRow: {
    flexDirection: "row",
    gap: spacing[2],
    flexWrap: "wrap"
  },
  sortChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white
  },
  sortChipActive: {
    backgroundColor: colors.primaryDeep,
    borderColor: colors.primaryDeep
  },
  sortChipText: { color: colors.text, fontSize: 12 },
  sortChipTextActive: { color: colors.white, fontSize: 12 },
  errorBox: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    padding: spacing[3]
  },
  loadingBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing[6],
    alignItems: "center",
    gap: spacing[2]
  },
  list: { gap: spacing[3] },
  invoiceCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2
  },
  invoiceCardInner: { padding: spacing[4], gap: spacing[3] },
  invoiceCardDivider: { height: 1, backgroundColor: colors.border },
  cardTop: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  statusMark: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  cardTitle: { flex: 1, minWidth: 0 },
  invoiceNumber: { color: colors.primaryDeep, letterSpacing: 0.2 },
  invoiceStatusPill: {
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    flexShrink: 0
  },
  invoiceStatusText: { fontSize: 10, letterSpacing: 0.5 },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing[3]
  },
  amountBlock: { gap: 2 },
  amountLabel: { color: colors.softText, fontSize: 10, letterSpacing: 1 },
  amountText: { color: colors.primaryDeep },
  dateBlock: { alignItems: "flex-end", gap: 2 },
  dateLabel: { color: colors.softText, fontSize: 10, letterSpacing: 1 },
  dateValue: { color: colors.primaryDeep },
  invoiceCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[2]
  },
  receiptChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    flex: 1,
    minWidth: 0
  },
  receiptChipText: { color: colors.primary, fontSize: 11, flex: 1 },
  receiptActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.lg
  },
  receiptActionText: { color: colors.white, fontSize: 12 },
  rejectedNote: {
    borderRadius: radius.lg,
    backgroundColor: "#fff1f2",
    borderWidth: 1,
    borderColor: "#f43f5e22",
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2]
  },
  rejectedNoteText: { color: "#e11d48", fontSize: 11 },
  processTrack: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: spacing[1]
  },
  processStep: {
    flex: 1,
    alignItems: "center",
    position: "relative"
  },
  processDot: {
    width: 18,
    height: 18,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  processDotDone: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  processDotActive: {
    backgroundColor: colors.white,
    borderColor: "#f59e0b",
    borderWidth: 2
  },
  processLine: {
    position: "absolute",
    top: 8,
    left: "50%",
    right: "-50%",
    height: 1.5,
    backgroundColor: colors.border
  },
  processLineDone: { backgroundColor: colors.primary },
  processLabel: { fontSize: 10, marginTop: spacing[1], textAlign: "center" },
  processLabelDone: { color: colors.primaryDeep, fontWeight: "600" },
  processLabelIdle: { color: colors.softText },
  upperLabel: { letterSpacing: 0.8, fontSize: 10 },
  dateStack: { alignItems: "flex-end", minWidth: 96 },
  pressed: { opacity: 0.78 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.42)",
    justifyContent: "flex-end",
    paddingHorizontal: spacing[2],
    paddingBottom: spacing[3],
    paddingTop: spacing[6]
  },
  modalSheet: {
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    overflow: "hidden",
    maxHeight: "92%"
  },
  detailLoading: { padding: spacing[6], alignItems: "center", gap: spacing[2] },
  receiptScroll: { paddingBottom: spacing[4] },
  receiptCutLine: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3]
  },
  receiptCutDot: {
    width: 4,
    height: 4,
    borderRadius: radius.full,
    backgroundColor: colors.brand[200]
  },
  receiptHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4]
  },
  receiptCloseButton: {
    marginLeft: spacing[2],
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  modeTabs: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[1]
  },
  modeTabsTrack: {
    flexDirection: "row",
    borderRadius: radius.xl,
    backgroundColor: colors.brand[50],
    borderWidth: 1,
    borderColor: colors.brand[100],
    padding: 4,
    position: "relative"
  },
  modeTabsTrackSingle: {},
  modeTabActivePill: {
    position: "absolute",
    top: 4,
    bottom: 4,
    width: "50%",
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    shadowColor: colors.primaryDeep,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3
  },
  modeTabItem: {
    flex: 1,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    borderRadius: radius.lg,
    zIndex: 1
  },
  modeTabText: { color: colors.primary },
  modeTabTextActive: { color: colors.white },
  invoiceDetailWrap: {
    padding: spacing[4],
    gap: spacing[3]
  },
  invoiceHeroCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    overflow: "hidden"
  },
  invoiceHeroBand: {
    backgroundColor: colors.primaryDeep,
    padding: spacing[4],
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3]
  },
  invoiceHeroIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)"
  },
  invoiceHeroKicker: { color: colors.onHeroSoft, letterSpacing: 1.8, fontSize: 10 },
  invoiceHeroBody: { padding: spacing[4], gap: spacing[4] },
  invoiceTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing[3] },
  invoiceTitle: { color: colors.primaryDeep },
  invoiceMetricGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  metricTile: {
    flexBasis: "48%",
    flexGrow: 1,
    minWidth: 120,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing[3],
    gap: spacing[1]
  },
  metricTileAccent: {
    borderColor: colors.brand[100],
    backgroundColor: colors.brand[50]
  },
  metricTileWide: { flexBasis: "100%" },
  metricLabel: { letterSpacing: 1, fontSize: 10, textTransform: "uppercase" },
  metricValue: { color: colors.primaryDeep },
  metricValueAccent: { color: colors.primary },
  invoicePartiesCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fbfefd",
    overflow: "hidden"
  },
  partyBlock: {
    padding: spacing[4],
    gap: spacing[2]
  },
  invoicePartyDivider: {
    height: 1,
    backgroundColor: colors.border
  },
  partyHeader: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  partyIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.brand[50],
    alignItems: "center",
    justifyContent: "center"
  },
  partyLabel: { color: "#6da39b", letterSpacing: 1.8, textTransform: "uppercase", fontSize: 10 },
  partyLine: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  invoiceRowsCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    overflow: "hidden"
  },
  invoiceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[3],
    padding: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  invoiceRowLabel: { letterSpacing: 1, textTransform: "uppercase", fontSize: 10 },
  invoiceRowValue: { color: colors.primaryDeep, textAlign: "right", flex: 1 },
  invoiceRowMono: { letterSpacing: 1 },
  invoiceTotalCard: {
    borderRadius: radius.xl,
    backgroundColor: colors.primaryDeep,
    padding: spacing[4],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[3],
    overflow: "hidden"
  },
  invoiceTotalLabel: { color: colors.onHeroSoft, letterSpacing: 1.5, fontSize: 10 },
  invoiceTotalSub: { color: "rgba(255,255,255,0.5)" },
  invoiceTotalRight: { alignItems: "flex-end", gap: spacing[1], flex: 1 },
  invoicePaidPill: {
    color: "#bbf7d0",
    backgroundColor: "rgba(16,185,129,0.18)",
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.full,
    overflow: "hidden",
    letterSpacing: 1
  },
  invoicePendingPill: {
    color: colors.onHeroSoft,
    backgroundColor: "rgba(255,255,255,0.13)",
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.full,
    overflow: "hidden",
    letterSpacing: 1
  },
  invoiceReceiptCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.brand[100],
    backgroundColor: colors.brand[50],
    padding: spacing[4],
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3]
  },
  invoiceReceiptIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center"
  },
  invoiceReceiptTitle: { color: colors.primaryDeep },
  invoiceReceiptAction: { color: colors.primary, letterSpacing: 1 },
  timelineCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing[4],
    gap: spacing[4]
  },
  timelineHeader: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  timelineGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: spacing[4],
    columnGap: spacing[2]
  },
  timelineStep: {
    width: "48%",
    alignItems: "center",
    gap: spacing[1]
  },
  timelineNode: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center"
  },
  timelineNodeIdle: {
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  timelineIdleDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.border
  },
  timelineLabel: { letterSpacing: 1.2, textTransform: "uppercase", fontSize: 10 },
  timelineDate: { color: colors.primaryDeep, textAlign: "center" },
  timelineIdleText: { color: colors.softText, textAlign: "center" },
  receiptHero: {
    alignItems: "center",
    paddingHorizontal: spacing[4],
    paddingTop: spacing[6],
    paddingBottom: spacing[5],
    gap: spacing[2]
  },
  receiptEyebrow: { color: "#7ba7a0", letterSpacing: 3, fontSize: 10, textAlign: "center" },
  receiptTitle: { color: colors.primaryDeep, textAlign: "center" },
  receiptAmountLabel: { color: "#7ba7a0", letterSpacing: 2.2, fontSize: 10 },
  receiptAmountRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing[2] },
  receiptAmount: { color: colors.primary, lineHeight: 58, flexShrink: 1 },
  receiptCurrency: { color: "#5b948b", paddingBottom: spacing[2] },
  receiptPaidDate: { color: "#7ba7a0" },
  receiptProofCard: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[1],
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing[4],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.brand[100],
    backgroundColor: "#f3faf8",
    padding: spacing[4]
  },
  qrPanel: {
    width: 158,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2]
  },
  qrFrame: {
    width: 150,
    height: 150,
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.brand[100],
    alignItems: "center",
    justifyContent: "center",
    padding: spacing[2]
  },
  qrPlaceholder: { alignItems: "center", justifyContent: "center", gap: spacing[2], padding: spacing[2] },
  qrPlaceholderText: { textAlign: "center", fontSize: 10 },
  qrCaption: { color: colors.primary, letterSpacing: 1.5, fontSize: 10 },
  proofMeta: {
    flex: 1,
    minWidth: 0,
    gap: spacing[2],
    justifyContent: "center",
    borderLeftWidth: 1,
    borderLeftColor: colors.brand[100],
    paddingLeft: spacing[4]
  },
  proofTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  proofTitle: { color: colors.primary, letterSpacing: 1.3, fontSize: 10 },
  proofLine: {
    borderTopWidth: 1,
    borderTopColor: "#dcefed",
    paddingTop: spacing[2],
    gap: 2
  },
  proofValue: { color: colors.primaryDeep, letterSpacing: 0.3 },
  receiptGrid: {
    padding: spacing[4],
    gap: spacing[3]
  },
  receiptFooter: {
    alignItems: "center",
    paddingHorizontal: spacing[4],
    paddingTop: spacing[1],
    paddingBottom: spacing[3],
    gap: 2
  },
  receiptFooterText: {
    color: "#7ba7a0",
    fontSize: 11,
    fontStyle: "italic",
    textAlign: "center"
  },
  receiptInfoCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fbfefd",
    padding: spacing[4],
    gap: spacing[3]
  },
  infoCardHeader: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  infoCardTitle: { color: "#7ba7a0", letterSpacing: 2, textTransform: "uppercase" },
  infoRows: { gap: spacing[2] },
  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: spacing[3] },
  infoValue: { color: colors.primaryDeep, textAlign: "right", flex: 1 }
});
