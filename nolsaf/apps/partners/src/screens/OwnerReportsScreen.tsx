import {
  AppText,
  MiniTrendChart,
  StateView,
  StatCard,
  StatusBadge,
  colors,
  radius,
  spacing
} from "@nolsaf/native-ui";
import {
  ArrowLeft,
  BarChart3,
  BedDouble,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Coins,
  Printer,
  RefreshCw,
  SlidersHorizontal,
  TrendingUp,
  Users
} from "lucide-react-native";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Linking, Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { useAuth } from "../auth";
import { env } from "../lib/env";
import {
  EMPTY_REPORT_DATA,
  OwnerReportData,
  OwnerReportFilters,
  OwnerReportGroupBy,
  OwnerReportProperty,
  OwnerReportTab,
  OwnerBookingsReport,
  OwnerCustomersReport,
  OwnerOccupancyReport,
  OwnerOverviewReport,
  OwnerRevenueReport,
  OwnerStaysReport,
  addDaysUtc,
  compactTzs,
  fetchOwnerReport,
  fetchOwnerReportPrintToken,
  fetchOwnerReportProperties,
  fmtDateOnly,
  formatTzsFull,
  monthStartUtc,
  numberValue,
  startOfTodayUtc
} from "../ownerReports";

type Props = {
  onBack?: () => void;
};

type RangeKey = "today" | "7d" | "30d" | "6m" | "1y";
type DateFieldKey = "from" | "to";

const MAX_REPORT_DAYS_INCLUSIVE = 366;

const TABS: Array<{ key: OwnerReportTab; label: string; dot: string }> = [
  { key: "overview", label: "Overview", dot: "#6366f1" },
  { key: "revenue", label: "Revenue", dot: colors.accent.green },
  { key: "bookings", label: "Bookings", dot: colors.accent.blue },
  { key: "stays", label: "Stays", dot: colors.accent.amber },
  { key: "occupancy", label: "Occupancy", dot: "#ef4444" },
  { key: "customers", label: "Customers", dot: "#8b5cf6" }
];

const GROUPS: Array<{ key: OwnerReportGroupBy; label: string }> = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" }
];

function createInitialFilters(): OwnerReportFilters {
  const currentDay = startOfTodayUtc();
  return {
    from: fmtDateOnly(monthStartUtc(currentDay)),
    to: fmtDateOnly(currentDay),
    propertyId: null,
    groupBy: "day"
  };
}

export function OwnerReportsScreen({ onBack }: Props) {
  const { token } = useAuth();
  const [tab, setTab] = useState<OwnerReportTab>("overview");
  const [filters, setFilters] = useState<OwnerReportFilters>(() => createInitialFilters());
  const [properties, setProperties] = useState<OwnerReportProperty[]>([]);
  const [data, setData] = useState<OwnerReportData>(EMPTY_REPORT_DATA);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [datePicker, setDatePicker] = useState<{ field: DateFieldKey; month: string } | null>(null);

  const selectedProperty = useMemo(
    () => properties.find((property) => property.id === filters.propertyId) ?? null,
    [filters.propertyId, properties]
  );

  const load = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const propertyPromise = properties.length === 0
        ? fetchOwnerReportProperties({ token }).catch(() => [])
        : Promise.resolve(properties);

      const [nextProperties, overview, revenue, bookings, stays, occupancy, customers] = await Promise.all([
        propertyPromise,
        fetchOwnerReport<OwnerOverviewReport>({ token, tab: "overview", filters }),
        fetchOwnerReport<OwnerRevenueReport>({ token, tab: "revenue", filters }),
        fetchOwnerReport<OwnerBookingsReport>({ token, tab: "bookings", filters }),
        fetchOwnerReport<OwnerStaysReport>({ token, tab: "stays", filters }),
        fetchOwnerReport<OwnerOccupancyReport>({ token, tab: "occupancy", filters }),
        fetchOwnerReport<OwnerCustomersReport>({ token, tab: "customers", filters })
      ]);
      setProperties(nextProperties);
      setData({ overview, revenue, bookings, stays, occupancy, customers });
    } catch (err) {
      setData(EMPTY_REPORT_DATA);
      setError(err instanceof Error ? err.message : "Could not load reports.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.from, filters.to, filters.groupBy, filters.propertyId]);

  const kpis = data.overview?.kpis ?? {};
  const gross = numberValue(kpis.gross);
  const net = numberValue(kpis.net);
  const bookingsCount = numberValue(kpis.bookings);
  const nights = numberValue(kpis.nights);
  const adr = numberValue(kpis.adr);
  const occupancyAverage = average((data.occupancy?.heat ?? []).map((item) => numberValue(item.occupancy)));

  const revenueSeries = (data.overview?.series ?? []).map((point) => ({
    key: String(point.key ?? ""),
    gross: numberValue(point.gross),
    net: numberValue(point.net),
    bookings: numberValue(point.bookings)
  }));
  const revenueValues = revenueSeries.map((point) => point.gross);
  const netValues = revenueSeries.map((point) => point.net);
  const bookingValues = (data.bookings?.series ?? []).map((point) => numberValue(point.count));
  const occupancyValues = (data.occupancy?.heat ?? []).map((point) => numberValue(point.occupancy));

  const printReport = async () => {
    try {
      const handoff = await fetchOwnerReportPrintToken({ token });
      if (!handoff.token) throw new Error("Missing print handoff token.");
      const url = buildOwnerReportsPrintUrl(filters, handoff.token);
      await Linking.openURL(url);
    } catch {
      setError("Could not open the print report. Please try again.");
    }
  };

  const openDatePicker = (field: DateFieldKey) => {
    const selected = parseIsoDateOnly(filters[field]);
    const month = Number.isNaN(selected.getTime()) ? startOfTodayUtc() : monthStartUtc(selected);
    setDatePicker({ field, month: fmtDateOnly(month) });
  };

  const applySelectedDate = (field: DateFieldKey, iso: string) => {
    setFilters((current) => normalizeManualRange({ ...current, [field]: iso }, field));
    setDatePicker(null);
  };

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.heroTitleRow}>
              {onBack ? (
                <Pressable accessibilityRole="button" accessibilityLabel="Back to owner home" onPress={onBack} style={({ pressed }) => [styles.heroIconButton, pressed && styles.pressed]}>
                  <ArrowLeft size={18} color={colors.onHeroSoft} />
                </Pressable>
              ) : null}
              <View style={styles.heroMark}>
                <BarChart3 size={22} color={colors.white} />
              </View>
            </View>
            <View style={styles.heroActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Refresh reports" onPress={() => load(true)} style={({ pressed }) => [styles.heroIconButton, pressed && styles.pressed]}>
                {refreshing ? <ActivityIndicator size="small" color={colors.onHeroSoft} /> : <RefreshCw size={18} color={colors.onHeroSoft} />}
              </Pressable>
            </View>
          </View>

          <View style={styles.heroHeading}>
            <AppText variant="caption" weight="bold" style={styles.heroEyebrow}>ANALYTICS</AppText>
            <AppText variant="headline" weight="extraBold" tone="inverse" numberOfLines={1}>Reports</AppText>
            <AppText variant="bodySmall" style={styles.heroSubtitle}>
              Overview of reports and analytics
            </AppText>
          </View>

          <View style={styles.heroDivider} />

          <View style={styles.heroTabsWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
              {TABS.map((item) => {
                const active = tab === item.key;
                return (
                  <Pressable
                    key={item.key}
                    accessibilityRole="button"
                    onPress={() => setTab(item.key)}
                    style={({ pressed }) => [styles.heroTab, active && styles.heroTabActive, pressed && styles.pressed]}
                  >
                    <View style={[styles.tabDot, { backgroundColor: active ? item.dot : "rgba(255,255,255,0.42)" }]} />
                    <AppText variant="caption" weight="bold" style={active ? styles.heroTabTextActive : styles.heroTabText}>
                      {item.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>

        <View style={styles.filterCard}>
          <View style={styles.filterHead}>
            <View style={styles.filterHeadLeft}>
              <View style={styles.filterIcon}>
                <SlidersHorizontal size={15} color={colors.primary} />
              </View>
              <AppText variant="caption" weight="bold" style={styles.upperMuted}>FILTERS</AppText>
            </View>
            {loading || refreshing ? <ActivityIndicator size="small" color={colors.primary} /> : null}
          </View>

          <View style={styles.dateGrid}>
            <DateTile
              label="From"
              value={formatReadableDate(filters.from)}
              active={datePicker?.field === "from"}
              onPress={() => openDatePicker("from")}
            />
            <DateTile
              label="To"
              value={formatReadableDate(filters.to)}
              active={datePicker?.field === "to"}
              onPress={() => openDatePicker("to")}
            />
          </View>

          <View style={styles.filterOptionsGrid}>
            <View style={[styles.filterOptionCard, styles.filterOptionWide]}>
              <View style={styles.filterOptionHead}>
                <AppText variant="caption" weight="bold" style={styles.upperMuted}>QUICK RANGE</AppText>
                <AppText variant="caption" tone="muted">Choose a shortcut</AppText>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                {([
                  { key: "today" as const, label: "Today", dot: "#10b981" },
                  { key: "7d" as const, label: "7D", dot: "#0ea5e9" },
                { key: "30d" as const, label: "30D", dot: "#8b5cf6" },
                { key: "6m" as const, label: "6M", dot: colors.accent.amber },
                { key: "1y" as const, label: "1Y", dot: "#64748b" }
                ]).map((item) => {
                  const range = getRange(item.key);
                  const active = filters.from === range.from && filters.to === range.to;
                  return (
                    <Chip
                      key={item.key}
                      label={item.label}
                      dot={item.dot}
                      active={active}
                      variant="range"
                      onPress={() => setFilters((current) => ({ ...current, ...range }))}
                    />
                  );
                })}
              </ScrollView>
            </View>

            <View style={[styles.filterOptionCard, styles.filterOptionWide]}>
              <View style={styles.filterOptionHead}>
                <AppText variant="caption" weight="bold" style={styles.upperMuted}>PROPERTY</AppText>
                <AppText variant="caption" tone="muted" numberOfLines={1}>{selectedProperty?.title || "All properties"}</AppText>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.propertyChipScroll}>
                <Chip label="All properties" active={!filters.propertyId} variant="property" icon={<Building2 size={14} color={colors.primary} />} onPress={() => setFilters((current) => ({ ...current, propertyId: null }))} />
                {properties.map((property) => (
                  <Chip
                    key={property.id}
                    label={property.title || `Property #${property.id}`}
                    active={filters.propertyId === property.id}
                    variant="property"
                    onPress={() => setFilters((current) => ({ ...current, propertyId: property.id }))}
                  />
                ))}
              </ScrollView>
            </View>

            <View style={[styles.filterOptionCard, styles.filterOptionWide]}>
              <View style={styles.filterOptionHead}>
                <AppText variant="caption" weight="bold" style={styles.upperMuted}>GROUP BY</AppText>
                <AppText variant="caption" tone="muted">Chart detail</AppText>
              </View>
              <View style={styles.groupByRow}>
                {GROUPS.map((group) => (
                  <Chip
                    key={group.key}
                    label={group.label}
                    active={filters.groupBy === group.key}
                    variant="group"
                    onPress={() => setFilters((current) => ({ ...current, groupBy: group.key }))}
                  />
                ))}
              </View>
            </View>
          </View>
        </View>

        <DatePickerSheet
          visible={Boolean(datePicker)}
          field={datePicker?.field ?? "from"}
          monthIso={datePicker?.month ?? filters.from}
          valueIso={datePicker ? filters[datePicker.field] : filters.from}
          minIso={datePicker?.field === "to" ? filters.from : undefined}
          maxIso={datePicker?.field === "from" ? filters.to : fmtDateOnly(startOfTodayUtc())}
          onChangeMonth={(month) => setDatePicker((current) => current ? { ...current, month } : current)}
          onSelect={applySelectedDate}
          onClose={() => setDatePicker(null)}
        />

        {error ? (
          <View style={styles.errorBox}>
            <AppText variant="bodySmall" tone="danger">{error}</AppText>
          </View>
        ) : null}

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} />
            <AppText variant="bodySmall" tone="muted">Loading owner reports</AppText>
          </View>
        ) : (
          <>
            <View style={styles.contextRow}>
              <View style={styles.contextIcon}>
                <CalendarDays size={16} color={colors.primary} />
              </View>
              <View style={styles.contextContent}>
                <View style={styles.contextLine}>
                  <AppText variant="caption" weight="bold" style={styles.contextLabel}>DATE RANGE</AppText>
                  <AppText variant="bodySmall" weight="extraBold" style={styles.contextText} numberOfLines={1}>
                    {formatReadableDate(filters.from)} - {formatReadableDate(filters.to)}
                  </AppText>
                </View>
                <View style={styles.contextDivider} />
                <View style={styles.contextLine}>
                  <AppText variant="caption" weight="bold" style={styles.contextLabel}>PROPERTY</AppText>
                  <View style={styles.contextPropertyValue}>
                    <Building2 size={14} color={colors.primary} />
                    <AppText variant="bodySmall" weight="extraBold" style={styles.contextText} numberOfLines={1}>
                      {selectedProperty?.title || "All properties"}
                    </AppText>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.statGrid}>
              <View style={styles.statRow}>
                <StatCard label="Gross Revenue" value={compactTzs(gross)} icon={<Coins size={18} color={colors.accent.green} />} iconBg={colors.accent.greenSoft} caption="Customer-paid total" />
                <StatCard label="Net Revenue" value={compactTzs(net)} icon={<TrendingUp size={18} color={colors.primary} />} iconBg={colors.brand[50]} caption="Owner payout view" />
              </View>
              <View style={styles.statRow}>
                <StatCard label="Bookings" value={bookingsCount} icon={<BarChart3 size={18} color={colors.accent.blue} />} iconBg={colors.accent.blueSoft} caption={`${nights} nights`} />
                <StatCard label="ADR" value={compactTzs(adr)} icon={<BedDouble size={18} color={colors.accent.amberDark} />} iconBg={colors.accent.amberSoft} caption={`${Math.round(occupancyAverage)}% occupancy est.`} />
              </View>
            </View>

            {tab === "overview" ? (
              <OverviewPanel
                gross={revenueValues}
                net={netValues}
                status={data.overview?.status ?? []}
                properties={data.overview?.topProperties ?? []}
              />
            ) : null}
            {tab === "revenue" ? <RevenuePanel data={data.revenue} /> : null}
            {tab === "bookings" ? <BookingsPanel data={data.bookings} bookingValues={bookingValues} /> : null}
            {tab === "stays" ? <StaysPanel data={data.stays} onPrint={printReport} /> : null}
            {tab === "occupancy" ? <OccupancyPanel data={data.occupancy} values={occupancyValues} /> : null}
            {tab === "customers" ? <CustomersPanel data={data.customers} /> : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function OverviewPanel({
  gross,
  net,
  status,
  properties
}: {
  gross: number[];
  net: number[];
  status: Array<{ status?: string; count?: number }>;
  properties: Array<{ propertyId?: number; title?: string; net?: number }>;
}) {
  return (
    <View style={styles.panelStack}>
      <MiniTrendChart
        title="Revenue & Net Trend"
        meta="Gross vs net"
        series={[
          { values: gross, color: colors.chart.total },
          { values: net, color: colors.chart.active, dashed: true }
        ]}
        legend={[
          { label: "Gross", color: colors.chart.total },
          { label: "Net", color: colors.chart.active }
        ]}
      />
      <SectionCard title="Bookings by Status" subtitle="Status distribution for the selected period">
        {status.length === 0 ? <EmptyInline /> : status.map((item) => (
          <BarRow key={String(item.status)} label={friendlyStatus(item.status)} value={numberValue(item.count)} color={statusColor(item.status)} max={maxCount(status.map((s) => numberValue(s.count)))} />
        ))}
      </SectionCard>
      <TopProperties properties={properties} />
    </View>
  );
}

function RevenuePanel({ data }: { data: OwnerReportData["revenue"] }) {
  const series = (data?.series ?? []).map((point) => ({
    gross: numberValue(point.gross),
    net: numberValue(point.net),
    commission: numberValue(point.commission)
  }));
  const byProperty = data?.byProperty ?? [];
  const table = data?.table ?? [];
  const [propertyPage, setPropertyPage] = useState(0);
  const [invoicePage, setInvoicePage] = useState(0);
  const revenuePageSize = 8;
  const propertyPageCount = Math.max(1, Math.ceil(byProperty.length / revenuePageSize));
  const invoicePageCount = Math.max(1, Math.ceil(table.length / revenuePageSize));
  const normalizedPropertyPage = Math.min(propertyPage, propertyPageCount - 1);
  const normalizedInvoicePage = Math.min(invoicePage, invoicePageCount - 1);
  const propertyStart = normalizedPropertyPage * revenuePageSize;
  const invoiceStart = normalizedInvoicePage * revenuePageSize;
  const pagedProperties = byProperty.slice(propertyStart, propertyStart + revenuePageSize);
  const pagedInvoices = table.slice(invoiceStart, invoiceStart + revenuePageSize);

  useEffect(() => {
    setPropertyPage(0);
  }, [byProperty.length]);

  useEffect(() => {
    setInvoicePage(0);
  }, [table.length]);

  return (
    <View style={styles.panelStack}>
      <MiniTrendChart
        title="Revenue Breakdown"
        meta="Gross, net and commission"
        series={[
          { values: series.map((point) => point.gross), color: colors.chart.total },
          { values: series.map((point) => point.net), color: colors.chart.done },
          { values: series.map((point) => point.commission), color: colors.accent.amber, dashed: true }
        ]}
        legend={[
          { label: "Gross", color: colors.chart.total },
          { label: "Net", color: colors.chart.done },
          { label: "Commission", color: colors.accent.amber }
        ]}
      />
      <SectionCard title="Revenue by Property" subtitle="Net and gross totals">
        {byProperty.length === 0 ? (
          <EmptyInline />
        ) : (
          <>
            {pagedProperties.map((property, index) => (
              <ValueRow
                key={`${String(property.title || "Property")}-${propertyStart + index}`}
                label={property.title || "Property"}
                value={formatTzsFull(property.net)}
                meta={`Gross ${formatTzsFull(property.gross)}`}
              />
            ))}
            <PaginationFooter
              page={normalizedPropertyPage}
              pageCount={propertyPageCount}
              total={byProperty.length}
              from={propertyStart + 1}
              to={Math.min(propertyStart + revenuePageSize, byProperty.length)}
              onPrevious={() => setPropertyPage((page) => Math.max(0, page - 1))}
              onNext={() => setPropertyPage((page) => Math.min(propertyPageCount - 1, page + 1))}
            />
          </>
        )}
      </SectionCard>
      <SectionCard title="Invoice Detail" subtitle={`${table.length} invoices in range`}>
        {table.length === 0 ? (
          <EmptyInline />
        ) : (
          <>
            {pagedInvoices.map((invoice) => (
              <ValueRow
                key={String(invoice.id)}
                label={String(invoice.invoiceNumber || `Invoice #${invoice.id}`)}
                value={formatTzsFull(invoice.net)}
                meta={`${invoice.property || "Property"} - ${friendlyStatus(invoice.status)}`}
              />
            ))}
            <PaginationFooter
              page={normalizedInvoicePage}
              pageCount={invoicePageCount}
              total={table.length}
              from={invoiceStart + 1}
              to={Math.min(invoiceStart + revenuePageSize, table.length)}
              onPrevious={() => setInvoicePage((page) => Math.max(0, page - 1))}
              onNext={() => setInvoicePage((page) => Math.min(invoicePageCount - 1, page + 1))}
            />
          </>
        )}
      </SectionCard>
    </View>
  );
}

function BookingsPanel({ data, bookingValues }: { data: OwnerReportData["bookings"]; bookingValues: number[] }) {
  const table = data?.table ?? [];
  const [bookingPage, setBookingPage] = useState(0);
  const bookingPageSize = 8;
  const bookingPageCount = Math.max(1, Math.ceil(table.length / bookingPageSize));
  const normalizedBookingPage = Math.min(bookingPage, bookingPageCount - 1);
  const bookingStart = normalizedBookingPage * bookingPageSize;
  const pagedBookings = table.slice(bookingStart, bookingStart + bookingPageSize);
  const totalOwner = table.reduce((sum, item) => sum + numberValue(item.ownerBaseAmount), 0);

  useEffect(() => {
    setBookingPage(0);
  }, [table.length]);

  return (
    <View style={styles.panelStack}>
      <MiniTrendChart
        title="Booking Volume"
        meta={`${table.length} bookings`}
        series={[{ values: bookingValues, color: colors.chart.active }]}
        legend={[{ label: "Bookings", color: colors.chart.active }]}
      />
      <View style={styles.statRow}>
        <StatCard label="Bookings" value={table.length} icon={<BarChart3 size={18} color={colors.accent.blue} />} iconBg={colors.accent.blueSoft} caption="NoLSAF stays" />
        <StatCard label="Owner Value" value={compactTzs(totalOwner)} icon={<Coins size={18} color={colors.accent.green} />} iconBg={colors.accent.greenSoft} caption="Accommodation payout" />
      </View>
      <SectionCard title="Booking Detail" subtitle="Recent stays in the selected range">
        {table.length === 0 ? (
          <EmptyInline />
        ) : (
          <>
            {pagedBookings.map((booking) => (
              <ValueRow
                key={String(booking.id)}
                label={String(booking.property || "Property")}
                value={formatTzsFull(booking.ownerBaseAmount)}
                meta={`${formatShortDate(booking.checkIn)} - ${formatShortDate(booking.checkOut)} - ${friendlyStatus(booking.status)}`}
              />
            ))}
            <PaginationFooter
              page={normalizedBookingPage}
              pageCount={bookingPageCount}
              total={table.length}
              from={bookingStart + 1}
              to={Math.min(bookingStart + bookingPageSize, table.length)}
              onPrevious={() => setBookingPage((page) => Math.max(0, page - 1))}
              onNext={() => setBookingPage((page) => Math.min(bookingPageCount - 1, page + 1))}
            />
          </>
        )}
      </SectionCard>
    </View>
  );
}

function StaysPanel({ data, onPrint }: { data: OwnerReportData["stays"]; onPrint: () => void }) {
  const stats = data?.stats ?? {};
  const series = data?.series ?? [];
  return (
    <View style={styles.panelStack}>
      <View style={styles.staysPrintCard}>
        <View style={styles.staysPrintCopy}>
          <View style={styles.staysPrintIcon}>
            <Printer size={18} color={colors.primary} />
          </View>
          <View style={styles.staysPrintText}>
            <AppText variant="bodySmall" weight="bold">Official stays report</AppText>
            <AppText variant="caption" tone="muted" numberOfLines={2}>Print a certified stays report with verification details.</AppText>
          </View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Print stays report" onPress={onPrint} style={({ pressed }) => [styles.staysPrintButton, pressed && styles.pressed]}>
          <Printer size={15} color={colors.white} />
          <AppText variant="caption" weight="bold" tone="inverse">Print</AppText>
        </Pressable>
      </View>
      <View style={styles.statRow}>
        <StatCard label="NoLSAF Bookings" value={numberValue(stats.nolsafBookings)} icon={<BedDouble size={18} color={colors.primary} />} iconBg={colors.brand[50]} caption={`${numberValue(stats.nightsBooked)} booked nights`} />
        <StatCard label="External Holds" value={numberValue(stats.externalReservations)} icon={<CalendarDays size={18} color={colors.accent.amberDark} />} iconBg={colors.accent.amberSoft} caption={`${numberValue(stats.nightsBlocked)} blocked nights`} />
      </View>
      <View style={styles.statRow}>
        <StatCard label="Group Stays" value={numberValue(stats.groupStaysReceived)} icon={<Users size={18} color={colors.accent.blue} />} iconBg={colors.accent.blueSoft} caption={`${numberValue(stats.groupStayNights)} group nights`} />
        <StatCard label="Auction Claims" value={numberValue(stats.auctionClaimsSubmitted)} icon={<BarChart3 size={18} color={colors.accent.green} />} iconBg={colors.accent.greenSoft} caption={`${numberValue(stats.auctionClaimsAccepted)} accepted`} />
      </View>
      <MiniTrendChart
        title="Stay Activity"
        meta={formatTzsFull(stats.revenueTzs)}
        series={[
          { values: series.map((point) => numberValue(point.nolsaf)), color: colors.chart.active },
          { values: series.map((point) => numberValue(point.external)), color: colors.accent.amber, dashed: true },
          { values: series.map((point) => numberValue(point.groupStays)), color: colors.chart.done }
        ]}
        legend={[
          { label: "NoLSAF", color: colors.chart.active },
          { label: "External", color: colors.accent.amber },
          { label: "Groups", color: colors.chart.done }
        ]}
      />
      <SectionCard title="Operational Detail" subtitle="Bookings, holds, group stays and claims">
        <ValueRow label="NoLSAF bookings" value={String((data?.bookings ?? []).length)} meta="Direct property bookings" />
        <ValueRow label="External reservations" value={String((data?.external ?? []).length)} meta="Owner calendar blocks" />
        <ValueRow label="Group stays received" value={String((data?.groupStays ?? []).length)} meta="Assigned group bookings" />
        <ValueRow label="Auction claims" value={String((data?.auctionClaims ?? []).length)} meta="Submitted offers" />
      </SectionCard>
    </View>
  );
}

function OccupancyPanel({ data, values }: { data: OwnerReportData["occupancy"]; values: number[] }) {
  const averageOccupancy = Math.round(average(values));
  return (
    <View style={styles.panelStack}>
      <View style={styles.statRow}>
        <StatCard label="Avg Occupancy" value={`${averageOccupancy}%`} icon={<BedDouble size={18} color={colors.danger} />} iconBg="#fee2e2" caption="Estimated from room capacity" />
        <StatCard label="Tracked Days" value={values.length} icon={<CalendarDays size={18} color={colors.primary} />} iconBg={colors.brand[50]} caption="Selected range" />
      </View>
      <MiniTrendChart
        title="Occupancy Estimate"
        meta={`${averageOccupancy}% avg`}
        series={[{ values, color: "#fb7185" }]}
        legend={[{ label: "Occupancy", color: "#fb7185" }]}
      />
      <SectionCard title="Net by Property" subtitle="Revenue attached to occupied dates">
        {(data?.byProperty ?? []).length === 0 ? <EmptyInline /> : (data?.byProperty ?? []).map((property) => (
          <ValueRow key={String(property.propertyId)} label={property.title || "Property"} value={formatTzsFull(property.net)} meta="Net revenue" />
        ))}
      </SectionCard>
    </View>
  );
}

function CustomersPanel({ data }: { data: OwnerReportData["customers"] }) {
  const nationalities = data?.byNationality ?? [];
  const customers = data?.topCustomers ?? [];
  const [nationalityPage, setNationalityPage] = useState(0);
  const [customerPage, setCustomerPage] = useState(0);
  const nationalityPageSize = 8;
  const customerPageSize = 8;
  const nationalityPageCount = Math.max(1, Math.ceil(nationalities.length / nationalityPageSize));
  const customerPageCount = Math.max(1, Math.ceil(customers.length / customerPageSize));
  const normalizedNationalityPage = Math.min(nationalityPage, nationalityPageCount - 1);
  const normalizedCustomerPage = Math.min(customerPage, customerPageCount - 1);
  const nationalityStart = normalizedNationalityPage * nationalityPageSize;
  const customerStart = normalizedCustomerPage * customerPageSize;
  const pagedNationalities = nationalities.slice(nationalityStart, nationalityStart + nationalityPageSize);
  const pagedCustomers = customers.slice(customerStart, customerStart + customerPageSize);

  useEffect(() => {
    setNationalityPage(0);
  }, [nationalities.length]);

  useEffect(() => {
    setCustomerPage(0);
  }, [customers.length]);

  return (
    <View style={styles.panelStack}>
      <SectionCard title="Customers by Nationality" subtitle="Guest origin distribution">
        {nationalities.length === 0 ? (
          <EmptyInline />
        ) : (
          <>
            {pagedNationalities.map((item, index) => (
              <BarRow
                key={`${String(item.nationality || "Unknown")}-${nationalityStart + index}`}
                label={item.nationality || "Unknown"}
                value={numberValue(item.count)}
                color={colors.primary}
                max={maxCount(nationalities.map((n) => numberValue(n.count)))}
              />
            ))}
            <PaginationFooter
              page={normalizedNationalityPage}
              pageCount={nationalityPageCount}
              total={nationalities.length}
              from={nationalityStart + 1}
              to={Math.min(nationalityStart + nationalityPageSize, nationalities.length)}
              onPrevious={() => setNationalityPage((page) => Math.max(0, page - 1))}
              onNext={() => setNationalityPage((page) => Math.min(nationalityPageCount - 1, page + 1))}
            />
          </>
        )}
      </SectionCard>
      <SectionCard title="Top Customers" subtitle="Ranked by spend in this range">
        {customers.length === 0 ? (
          <EmptyInline />
        ) : (
          <>
            {pagedCustomers.map((customer, index) => (
              <ValueRow
                key={`${String(customer.name || "Guest")}-${customerStart + index}`}
                label={customer.name || "Guest"}
                value={formatTzsFull(customer.spend)}
                meta={`${numberValue(customer.stays)} stay${numberValue(customer.stays) === 1 ? "" : "s"}`}
              />
            ))}
            <PaginationFooter
              page={normalizedCustomerPage}
              pageCount={customerPageCount}
              total={customers.length}
              from={customerStart + 1}
              to={Math.min(customerStart + customerPageSize, customers.length)}
              onPrevious={() => setCustomerPage((page) => Math.max(0, page - 1))}
              onNext={() => setCustomerPage((page) => Math.min(customerPageCount - 1, page + 1))}
            />
          </>
        )}
      </SectionCard>
    </View>
  );
}

function TopProperties({ properties }: { properties: Array<{ propertyId?: number; title?: string; net?: number }> }) {
  const max = Math.max(1, ...properties.map((property) => numberValue(property.net)));
  return (
    <SectionCard title="Top Properties" subtitle="Highest net revenue within this range">
      {properties.length === 0 ? <EmptyInline /> : properties.map((property) => (
        <BarRow
          key={String(property.propertyId)}
          label={property.title || "Property"}
          value={numberValue(property.net)}
          formattedValue={formatTzsFull(property.net)}
          color={colors.accent.green}
          max={max}
        />
      ))}
    </SectionCard>
  );
}

function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <View>
          <AppText variant="bodySmall" weight="bold">{title}</AppText>
          {subtitle ? <AppText variant="caption" tone="muted">{subtitle}</AppText> : null}
        </View>
      </View>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function DateTile({ label, value, active, onPress }: { label: string; value: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Select ${label.toLowerCase()} date`}
      onPress={onPress}
      style={({ pressed }) => [styles.dateTile, active && styles.dateTileActive, pressed && styles.pressed]}
    >
      <View style={styles.dateTileTop}>
        <AppText variant="caption" weight="bold" style={styles.upperMuted}>{label}</AppText>
        <View style={[styles.dateTileIcon, active && styles.dateTileIconActive]}>
          <CalendarDays size={15} color={active ? colors.white : colors.primary} />
        </View>
      </View>
      <AppText variant="titleSm" weight="extraBold" numberOfLines={1} style={styles.dateTileValue}>{value}</AppText>
    </Pressable>
  );
}

function Chip({
  label,
  active,
  onPress,
  dot,
  icon,
  variant = "default"
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  dot?: string;
  icon?: ReactNode;
  variant?: "default" | "range" | "property" | "group";
}) {
  const styleVariant = variant === "property"
    ? styles.chipProperty
    : variant === "group"
      ? styles.chipGroup
      : variant === "range"
        ? styles.chipRange
        : null;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.chip, styleVariant, active && styles.chipActive, active && variant === "property" && styles.chipActiveSoft, pressed && styles.pressed]}
    >
      {icon}
      {dot ? <View style={[styles.chipDot, { backgroundColor: dot, opacity: active ? 1 : 0.85 }]} /> : null}
      <AppText variant="caption" weight="bold" numberOfLines={1} style={active ? styles.chipTextActive : styles.chipText}>
        {label}
      </AppText>
    </Pressable>
  );
}

function BarRow({
  label,
  value,
  formattedValue,
  color,
  max
}: {
  label: string;
  value: number;
  formattedValue?: string;
  color: string;
  max: number;
}) {
  const pct = Math.max(3, Math.min(100, (value / Math.max(1, max)) * 100));
  return (
    <View style={styles.barRow}>
      <View style={styles.barTop}>
        <AppText variant="bodySmall" weight="semiBold" numberOfLines={1}>{label}</AppText>
        <AppText variant="caption" weight="bold" tone="primary">{formattedValue ?? String(value)}</AppText>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function ValueRow({ label, value, meta }: { label: string; value: string; meta?: string }) {
  return (
    <View style={styles.valueRow}>
      <View style={styles.valueRowText}>
        <AppText variant="bodySmall" weight="semiBold" numberOfLines={1}>{label}</AppText>
        {meta ? <AppText variant="caption" tone="muted" numberOfLines={1}>{meta}</AppText> : null}
      </View>
      <StatusBadge status="approved" label={value} />
    </View>
  );
}

function PaginationFooter({
  page,
  pageCount,
  total,
  from,
  to,
  onPrevious,
  onNext
}: {
  page: number;
  pageCount: number;
  total: number;
  from: number;
  to: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const atStart = page <= 0;
  const atEnd = page >= pageCount - 1;
  return (
    <View style={styles.paginationFooter}>
      <AppText variant="caption" tone="muted" numberOfLines={1}>
        Showing {from}-{to} of {total}
      </AppText>
      <View style={styles.paginationActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous customers page"
          disabled={atStart}
          onPress={onPrevious}
          style={({ pressed }) => [styles.pageButton, atStart && styles.pageButtonDisabled, pressed && !atStart && styles.pressed]}
        >
          <ChevronLeft size={16} color={atStart ? colors.softText : colors.primary} />
        </Pressable>
        <View style={styles.pageCountPill}>
          <AppText variant="caption" weight="bold" tone="primary">
            {page + 1}/{pageCount}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next customers page"
          disabled={atEnd}
          onPress={onNext}
          style={({ pressed }) => [styles.pageButton, atEnd && styles.pageButtonDisabled, pressed && !atEnd && styles.pressed]}
        >
          <ChevronRight size={16} color={atEnd ? colors.softText : colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

function EmptyInline() {
  return <StateView title="No report data" message="Try a wider range or another property." />;
}

function DatePickerSheet({
  visible,
  field,
  monthIso,
  valueIso,
  minIso,
  maxIso,
  onChangeMonth,
  onSelect,
  onClose
}: {
  visible: boolean;
  field: DateFieldKey;
  monthIso: string;
  valueIso: string;
  minIso?: string;
  maxIso?: string;
  onChangeMonth: (month: string) => void;
  onSelect: (field: DateFieldKey, iso: string) => void;
  onClose: () => void;
}) {
  const monthDate = monthStartUtc(parseIsoDateOnly(monthIso));
  const days = getCalendarCells(monthDate);
  const minDate = minIso ? parseIsoDateOnly(minIso) : null;
  const maxDate = maxIso ? parseIsoDateOnly(maxIso) : startOfTodayUtc();
  const selectedDate = parseIsoDateOnly(valueIso);
  const monthTitle = monthDate.toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" });

  const shiftMonth = (offset: number) => {
    onChangeMonth(fmtDateOnly(addMonthsUtc(monthDate, offset)));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.calendarSheet}>
          <View style={styles.calendarHeader}>
            <View>
              <AppText variant="caption" weight="bold" style={styles.upperMuted}>SELECT {field.toUpperCase()}</AppText>
              <AppText variant="titleSm" weight="extraBold">{monthTitle}</AppText>
            </View>
            <View style={styles.calendarNav}>
              <Pressable accessibilityRole="button" accessibilityLabel="Previous month" onPress={() => shiftMonth(-1)} style={({ pressed }) => [styles.calendarNavButton, pressed && styles.pressed]}>
                <ChevronLeft size={18} color={colors.primaryDeep} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Next month" onPress={() => shiftMonth(1)} style={({ pressed }) => [styles.calendarNavButton, pressed && styles.pressed]}>
                <ChevronRight size={18} color={colors.primaryDeep} />
              </Pressable>
            </View>
          </View>

          <View style={styles.weekdayRow}>
            {getWeekdayLabels().map((day) => (
              <AppText key={day} variant="caption" weight="bold" style={styles.weekdayText}>{day}</AppText>
            ))}
          </View>

          <View style={styles.calendarGrid}>
            {chunkWeeks(days).map((week, weekIndex) => (
              <View key={`week-${weekIndex}`} style={styles.calendarWeekRow}>
                {week.map((day, dayIndex) => {
                  if (!day) return <View key={`blank-${weekIndex}-${dayIndex}`} style={styles.dayCell} />;
                  const iso = fmtDateOnly(day);
                  const disabled = (minDate && day.getTime() < minDate.getTime()) || (maxDate && day.getTime() > maxDate.getTime());
                  const selected = sameDate(day, selectedDate);
                  const today = sameDate(day, startOfTodayUtc());
                  return (
                    <Pressable
                      key={iso}
                      accessibilityRole="button"
                      accessibilityLabel={`Select ${formatReadableDate(iso)}`}
                      disabled={Boolean(disabled)}
                      onPress={() => onSelect(field, iso)}
                      style={({ pressed }) => [
                        styles.dayCell,
                        today && styles.dayCellToday,
                        selected && styles.dayCellSelected,
                        disabled && styles.dayCellDisabled,
                        pressed && !disabled && styles.pressed
                      ]}
                    >
                      <AppText
                        variant="bodySmall"
                        weight={selected ? "extraBold" : "semiBold"}
                        style={[
                          styles.dayText,
                          today && styles.dayTextToday,
                          selected && styles.dayTextSelected,
                          disabled && styles.dayTextDisabled
                        ]}
                      >
                        {day.getUTCDate()}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>

          <View style={styles.calendarFooter}>
            <Pressable accessibilityRole="button" onPress={onClose} style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
              <AppText variant="bodySmall" weight="bold" tone="primary">Cancel</AppText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => onSelect(field, fmtDateOnly(startOfTodayUtc()))}
              style={({ pressed }) => [styles.todayButton, pressed && styles.pressed]}
            >
              <AppText variant="bodySmall" weight="bold" tone="inverse">Today</AppText>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function getRange(key: RangeKey) {
  const end = startOfTodayUtc();
  if (key === "today") return { from: fmtDateOnly(end), to: fmtDateOnly(end) };
  if (key === "7d") return { from: fmtDateOnly(addDaysUtc(end, -6)), to: fmtDateOnly(end) };
  if (key === "30d") return { from: fmtDateOnly(addDaysUtc(end, -29)), to: fmtDateOnly(end) };
  if (key === "6m") return { from: fmtDateOnly(addMonthsUtc(end, -6)), to: fmtDateOnly(end) };
  return { from: fmtDateOnly(addMonthsUtc(end, -12)), to: fmtDateOnly(end) };
}

function buildOwnerReportsPrintUrl(filters: OwnerReportFilters, handoffToken: string) {
  const base = getOwnerWebBaseUrl();
  const params = new URLSearchParams({
    from: filters.from,
    to: filters.to,
    groupBy: filters.groupBy,
    print: "1"
  });
  if (filters.propertyId) params.set("propertyId", String(filters.propertyId));
  const next = `/owner/reports/stays?${params.toString()}`;
  const handoff = new URLSearchParams({
    token: handoffToken,
    next
  });
  return `${base}/api/auth/owner-report-print-handoff?${handoff.toString()}`;
}

function getOwnerWebBaseUrl() {
  if (env.webUrl) return env.webUrl.replace(/\/+$/, "");
  const apiUrl = env.apiUrl.replace(/\/+$/, "");
  if (/^https:\/\/api\.nolsaf\.com$/i.test(apiUrl)) return "https://www.nolsaf.com";
  if (/^https?:\/\/(localhost|127\.0\.0\.1):4000$/i.test(apiUrl)) return apiUrl.replace(":4000", ":3000");
  return "https://www.nolsaf.com";
}

function normalizeManualRange(next: OwnerReportFilters, changed: DateFieldKey): OwnerReportFilters {
  let from = parseIsoDateOnly(next.from);
  let to = parseIsoDateOnly(next.to);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return next;

  if (from.getTime() > to.getTime()) {
    if (changed === "from") to = from;
    else from = to;
  }

  const maxTo = addDaysUtc(from, MAX_REPORT_DAYS_INCLUSIVE - 1);
  if (to.getTime() > maxTo.getTime()) to = maxTo;

  const today = startOfTodayUtc();
  if (to.getTime() > today.getTime()) to = today;
  if (from.getTime() > to.getTime()) from = to;

  return { ...next, from: fmtDateOnly(from), to: fmtDateOnly(to) };
}

function parseIsoDateOnly(iso: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ""));
  if (!match) return new Date(NaN);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function addMonthsUtc(date: Date, months: number) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
}

function getCalendarCells(monthDate: Date) {
  const start = monthStartUtc(monthDate);
  const leadingBlanks = start.getUTCDay();
  const daysInMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
  const cells: Array<Date | null> = [];
  for (let i = 0; i < leadingBlanks; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function chunkWeeks(days: Array<Date | null>) {
  const weeks: Array<Array<Date | null>> = [];
  for (let index = 0; index < days.length; index += 7) {
    weeks.push(days.slice(index, index + 7));
  }
  return weeks;
}

function getWeekdayLabels() {
  const base = new Date(Date.UTC(2026, 1, 1));
  return Array.from({ length: 7 }, (_, index) => addDaysUtc(base, index).toLocaleDateString(undefined, { weekday: "short", timeZone: "UTC" }).slice(0, 2));
}

function sameDate(a: Date, b: Date) {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
}

function formatReadableDate(iso: string) {
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

function formatShortDate(value: unknown) {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "short" });
}

function friendlyStatus(status: unknown) {
  const raw = String(status ?? "UNKNOWN").replace(/_/g, " ").toLowerCase();
  return raw.replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusColor(status: unknown) {
  switch (String(status ?? "").toUpperCase()) {
    case "CONFIRMED":
      return colors.primary;
    case "CHECKED_IN":
      return colors.success;
    case "CHECKED_OUT":
      return colors.accent.amber;
    case "CANCELED":
      return colors.danger;
    default:
      return colors.softText;
  }
}

function average(values: number[]) {
  const clean = values.filter((value) => Number.isFinite(value));
  if (clean.length === 0) return 0;
  return clean.reduce((sum, value) => sum + value, 0) / clean.length;
}

function maxCount(values: number[]) {
  return Math.max(1, ...values.map((value) => numberValue(value)));
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing[3], paddingBottom: spacing[8], gap: spacing[3] },
  hero: {
    borderRadius: radius.xl,
    backgroundColor: colors.primaryDeep,
    padding: spacing[3],
    overflow: "hidden",
    gap: spacing[3]
  },
  heroTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing[2] },
  heroTitleRow: { flexDirection: "row", alignItems: "center", gap: spacing[2], flex: 1, minWidth: 0 },
  heroHeading: { gap: spacing[1], paddingHorizontal: spacing[1] },
  heroTitleText: { flex: 1, minWidth: 0 },
  heroActions: { flexDirection: "row", alignItems: "center", gap: spacing[2], flexShrink: 0 },
  heroMark: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.13)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
    alignItems: "center",
    justifyContent: "center"
  },
  heroIconButton: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center"
  },
  heroEyebrow: { color: colors.onHeroSoft, letterSpacing: 2.4, fontSize: 10 },
  heroSubtitle: { color: "rgba(255,255,255,0.60)" },
  heroDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.13)", marginHorizontal: spacing[1] },
  heroTabsWrap: {
    borderRadius: radius.lg,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    padding: 3
  },
  tabScroll: { gap: spacing[2], paddingRight: spacing[1] },
  heroTab: {
    minWidth: 104,
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: "transparent",
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2]
  },
  heroTabActive: {
    backgroundColor: colors.white,
    borderColor: colors.white
  },
  tabDot: { width: 7, height: 7, borderRadius: radius.full },
  heroTabText: { color: "rgba(255,255,255,0.70)" },
  heroTabTextActive: { color: colors.primaryDeep },
  filterCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing[4],
    gap: spacing[4]
  },
  filterHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  filterHeadLeft: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  filterIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: colors.brand[50],
    alignItems: "center",
    justifyContent: "center"
  },
  upperMuted: { color: colors.softText, letterSpacing: 1.6, fontSize: 10 },
  dateGrid: { flexDirection: "row", gap: spacing[2] },
  dateTile: {
    flex: 1,
    minWidth: 0,
    minHeight: 94,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fbfefd",
    padding: spacing[3],
    justifyContent: "space-between"
  },
  dateTileActive: {
    borderColor: colors.brand[200],
    backgroundColor: colors.brand[50]
  },
  dateTileTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing[2] },
  dateTileIcon: {
    width: 30,
    height: 30,
    borderRadius: radius.md,
    backgroundColor: colors.brand[50],
    alignItems: "center",
    justifyContent: "center"
  },
  dateTileIconActive: {
    backgroundColor: colors.primary
  },
  dateTileValue: { color: colors.primaryDeep },
  chipScroll: { gap: spacing[2], paddingRight: spacing[2] },
  chipScrollTight: { gap: spacing[2], paddingRight: spacing[2] },
  propertyChipScroll: { gap: spacing[2], paddingRight: spacing[3] },
  filterOptionsGrid: {
    gap: spacing[3]
  },
  filterOptionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "#fbfefd",
    padding: spacing[3],
    gap: spacing[3]
  },
  filterOptionWide: { width: "100%" },
  filterOptionHead: { gap: 2 },
  filterSection: { gap: spacing[2] },
  groupByRow: {
    alignSelf: "flex-start",
    flexDirection: "row",
    gap: spacing[2],
    borderRadius: radius.full,
    backgroundColor: "transparent"
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    minHeight: 40,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    maxWidth: 210
  },
  chipRange: {
    minWidth: 82,
    justifyContent: "center",
    paddingHorizontal: spacing[3]
  },
  chipProperty: {
    minHeight: 40,
    paddingHorizontal: spacing[3],
    borderColor: colors.brand[100],
    backgroundColor: colors.white,
    shadowColor: "#0f172a",
    shadowOpacity: 0.025,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1
  },
  chipGroup: {
    minWidth: 86,
    minHeight: 40,
    justifyContent: "center",
    paddingHorizontal: spacing[3]
  },
  chipActive: {
    backgroundColor: colors.brand[50],
    borderColor: colors.primary
  },
  chipActiveSoft: {
    shadowOpacity: 0,
    elevation: 0
  },
  chipDot: { width: 6, height: 6, borderRadius: radius.full },
  chipText: { color: colors.primaryDeep },
  chipTextActive: { color: colors.primary },
  contextRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.brand[100],
    backgroundColor: colors.white,
    padding: spacing[3]
  },
  contextIcon: {
    width: 42,
    minHeight: 64,
    borderRadius: radius.md,
    backgroundColor: colors.brand[50],
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  contextContent: {
    flex: 1,
    minWidth: 0,
    gap: spacing[2]
  },
  contextLine: {
    minWidth: 0,
    gap: 2
  },
  contextLabel: {
    color: colors.softText,
    letterSpacing: 1.4,
    fontSize: 9
  },
  contextText: {
    color: colors.primaryDeep,
    minWidth: 0
  },
  contextDivider: {
    height: 1,
    backgroundColor: colors.border
  },
  contextPropertyValue: {
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2]
  },
  statGrid: { gap: spacing[2] },
  statRow: { flexDirection: "row", gap: spacing[2] },
  panelStack: { gap: spacing[3] },
  staysPrintCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.brand[100],
    backgroundColor: colors.white,
    padding: spacing[3],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[3]
  },
  staysPrintCopy: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3]
  },
  staysPrintIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: colors.brand[50],
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  staysPrintText: {
    flex: 1,
    minWidth: 0,
    gap: 2
  },
  staysPrintButton: {
    minHeight: 40,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[4],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    flexShrink: 0
  },
  sectionCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    overflow: "hidden"
  },
  sectionHeader: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  sectionBody: { padding: spacing[4], gap: spacing[3] },
  barRow: { gap: spacing[2] },
  barTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing[3] },
  barTrack: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    overflow: "hidden"
  },
  barFill: { height: "100%", borderRadius: radius.full },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[3],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  valueRowText: { flex: 1, minWidth: 0 },
  paginationFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[3],
    paddingTop: spacing[2]
  },
  paginationActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2]
  },
  pageButton: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.brand[100],
    backgroundColor: colors.brand[50],
    alignItems: "center",
    justifyContent: "center"
  },
  pageButtonDisabled: {
    opacity: 0.45,
    backgroundColor: colors.surface,
    borderColor: colors.border
  },
  pageCountPill: {
    minWidth: 46,
    height: 32,
    borderRadius: radius.full,
    backgroundColor: colors.brand[50],
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[2]
  },
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.42)",
    justifyContent: "center",
    padding: spacing[3],
    paddingTop: spacing[5],
    paddingBottom: spacing[5]
  },
  calendarSheet: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
    maxHeight: "94%",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[4],
    gap: spacing[3]
  },
  calendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing[3]
  },
  calendarNav: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  calendarNavButton: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center"
  },
  weekdayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  weekdayText: {
    width: `${100 / 7}%`,
    textAlign: "center",
    color: colors.softText,
    letterSpacing: 1,
    fontSize: 10
  },
  calendarGrid: {
    gap: spacing[1]
  },
  calendarWeekRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[1]
  },
  dayCell: {
    flex: 1,
    minWidth: 0,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md
  },
  dayCellToday: {
    backgroundColor: colors.brand[50]
  },
  dayCellSelected: {
    backgroundColor: colors.primary
  },
  dayCellDisabled: {
    opacity: 0.28
  },
  dayText: { color: colors.primaryDeep },
  dayTextToday: { color: colors.primary },
  dayTextSelected: { color: colors.white },
  dayTextDisabled: { color: colors.softText },
  calendarFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing[3],
    marginTop: spacing[1]
  },
  cancelButton: {
    minHeight: 44,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing[4],
    alignItems: "center",
    justifyContent: "center"
  },
  todayButton: {
    minHeight: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[4],
    alignItems: "center",
    justifyContent: "center"
  },
  pressed: { opacity: 0.78 }
});
