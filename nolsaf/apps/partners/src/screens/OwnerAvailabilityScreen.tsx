import {
  AppButton,
  AppText,
  StateView,
  colors,
  radius,
  spacing
} from "@nolsaf/native-ui";
import { apiRequest } from "@nolsaf/native-ui";
import { ArrowLeft, BedDouble, Building2, CalendarDays, CalendarOff, Home, Layers, MoreHorizontal, Pencil, Plane, Plus, RefreshCw, Sparkles, Trash2, Umbrella, X } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Dimensions, Image, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

import { useAuth } from "../auth";

type Property = {
  id: number;
  title: string;
  photos?: string[] | null;
  regionName?: string | null;
  district?: string | null;
  city?: string | null;
  type?: string | null;
  status: string;
  roomsSpec?: any;
  buildingType?: string | null;
};

type AvailabilitySummary = {
  totalRooms: number;
  totalBookedRooms: number;
  totalBlockedRooms: number;
  totalAvailableRooms: number;
  overallAvailabilityPercentage: number;
};

type PeriodKey = "today" | "week" | "month";

function startOfDay(d: Date) {
  const x = new Date(d); x.setHours(0, 0, 0, 0); return x;
}
function startOfWeekMonday(d: Date) {
  const x = startOfDay(d); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x;
}
function startOfMonth(d: Date) {
  const x = startOfDay(d); x.setDate(1); return x;
}
function addDays(d: Date, n: number) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
function addMonths(d: Date, n: number) { const x = new Date(d); x.setMonth(x.getMonth() + n); return x; }

function getFloorCount(property: Property): number {
  const spec = Array.isArray(property.roomsSpec) ? property.roomsSpec : [];
  if (!spec.length) return 1;
  const isMulti = property.buildingType === "multi_storey";
  if (!isMulti) return 1;
  const floors = new Set<number>();
  spec.forEach((room: any) => {
    const fd = room?.floorDistribution;
    if (fd && typeof fd === "object") Object.keys(fd).forEach((k) => floors.add(Number(k)));
  });
  return floors.size || 1;
}

function getTotalRooms(property: Property): number {
  const spec = Array.isArray(property.roomsSpec) ? property.roomsSpec : [];
  return spec.reduce((sum: number, r: any) => sum + Number(r?.roomsCount || r?.count || 0), 0);
}

type Block = {
  id: number;
  startDate: string;
  endDate: string;
  roomCode?: string | null;
  notes?: string | null;
  source?: string | null;
};

type CalBooking = { id: number; checkIn: string; checkOut: string; status: string; guestName: string; roomCode?: string | null };

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_LABELS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function fmtShort(iso: string) {
  try { return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" }); }
  catch { return iso; }
}
function toYMD(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function ManageLiveDots() {
  const COLORS = ["#34d399","#38bdf8","#f43f5e"];
  const opacities = COLORS.map(() => useRef(new Animated.Value(1)).current);
  useEffect(() => {
    COLORS.forEach((_, i) => {
      const anim = Animated.loop(Animated.sequence([
        Animated.delay(i * 400),
        Animated.timing(opacities[i], { toValue: 0.2, duration: 400, useNativeDriver: true }),
        Animated.timing(opacities[i], { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.delay(800)
      ]));
      anim.start();
    });
  }, []);
  return (
    <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
      {COLORS.map((c, i) => (
        <Animated.View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: c, opacity: opacities[i] }} />
      ))}
    </View>
  );
}

function DatePickerSheet({
  visible, value, minDate, title,
  onConfirm, onClose,
}: {
  visible: boolean;
  value: string;
  minDate?: string;
  title: string;
  onConfirm: (ymd: string) => void;
  onClose: () => void;
}) {
  const now = new Date();
  const parsed = value ? new Date(value + "T12:00:00") : now;
  const [month, setMonth] = useState(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
  const [selected, setSelected] = useState(value || toYMD(now));

  useEffect(() => {
    if (visible) {
      const d = value ? new Date(value + "T12:00:00") : now;
      setMonth(new Date(d.getFullYear(), d.getMonth(), 1));
      setSelected(value || toYMD(now));
    }
  }, [visible]);

  const cells = useMemo(() => {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1).getDay();
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    const arr: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(d);
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [month]);

  const todayYMD = toYMD(now);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end" }}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={dpS.sheet}>
          <View style={dpS.handle} />
          <AppText style={dpS.title}>{title}</AppText>

          {/* Month nav */}
          <View style={dpS.monthNav}>
            <Pressable onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} style={dpS.navBtn}>
              <ArrowLeft size={16} color="rgba(255,255,255,0.7)" />
            </Pressable>
            <AppText style={dpS.monthLabel}>{MONTHS[month.getMonth()]} {month.getFullYear()}</AppText>
            <Pressable onPress={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} style={dpS.navBtn}>
              <View style={{ transform: [{ rotate: "180deg" }] }}>
                <ArrowLeft size={16} color="rgba(255,255,255,0.7)" />
              </View>
            </Pressable>
          </View>

          {/* Day labels */}
          <View style={dpS.dayLabels}>
            {DAY_LABELS.map(d => <AppText key={d} style={dpS.dayLabel}>{d}</AppText>)}
          </View>

          {/* Grid */}
          <View style={dpS.grid}>
            {cells.map((day, idx) => {
              if (!day) return <View key={`e-${idx}`} style={dpS.cell} />;
              const ymd = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isSelected = ymd === selected;
              const isToday = ymd === todayYMD;
              const isPast = minDate ? ymd < minDate : false;
              return (
                <Pressable
                  key={ymd}
                  disabled={isPast}
                  onPress={() => setSelected(ymd)}
                  style={[dpS.cell, isSelected && dpS.cellSelected, isToday && !isSelected && dpS.cellToday, isPast && dpS.cellPast]}
                >
                  <AppText style={[dpS.cellText, isSelected && dpS.cellTextSelected, isPast && dpS.cellTextPast, isToday && !isSelected && { color: "#34d399" }]}>
                    {day}
                  </AppText>
                </Pressable>
              );
            })}
          </View>

          {/* Footer */}
          <View style={dpS.footer}>
            <Pressable onPress={onClose} style={dpS.cancelBtn}>
              <AppText style={dpS.cancelText}>Cancel</AppText>
            </Pressable>
            <Pressable onPress={() => { onConfirm(selected); onClose(); }} style={dpS.confirmBtn}>
              <AppText style={dpS.confirmText}>Confirm  {selected}</AppText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const dpS = StyleSheet.create({
  sheet: { backgroundColor: "#0b1929", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)" },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 17, fontWeight: "700", color: "#ffffff", marginBottom: 16, textAlign: "center" },
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  navBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center" },
  monthLabel: { fontSize: 15, fontWeight: "700", color: "#ffffff" },
  dayLabels: { flexDirection: "row", marginBottom: 4 },
  dayLabel: { flex: 1, textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  cellSelected: { backgroundColor: "#34d399", borderRadius: 50 },
  cellToday: { borderWidth: 1.5, borderColor: "#34d399", borderRadius: 50 },
  cellPast: { opacity: 0.25 },
  cellText: { fontSize: 14, color: "rgba(255,255,255,0.7)", fontWeight: "500" },
  cellTextSelected: { color: "#021a12", fontWeight: "800" },
  cellTextPast: { color: "rgba(255,255,255,0.3)" },
  footer: { flexDirection: "row", gap: 12, marginTop: 16 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 50, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", alignItems: "center" },
  cancelText: { fontSize: 14, fontWeight: "600", color: "rgba(255,255,255,0.6)" },
  confirmBtn: { flex: 2, paddingVertical: 14, borderRadius: 50, backgroundColor: "#059669", alignItems: "center" },
  confirmText: { fontSize: 14, fontWeight: "700", color: "#ffffff" },
});

type RoomOccupancy = {
  code: string;
  busy: boolean;
  occupancyPct: number;
  nightsBooked: number;
  nightsBlocked?: number;
  nightsOccupied?: number;
  nightsTotal: number;
  bookings: { id: number; checkIn: string; checkOut: string; status: string; guestName: string | null }[];
  blocks?: { id: number; startDate: string; endDate: string; source: string | null; nights: number }[];
};
type RoomNode = { id: string; code: string; name: string; amenities: string[]; capacity: { adults: number; children: number }; pricePerNight: number; accessible: boolean };
type FloorLayout = { id: string; label: string; rooms: RoomNode[] };
type LayoutData = { version: number; floors: FloorLayout[] };

function FloorPlanScreen({ property, token, onBack }: { property: Property; token: string | null; onBack: () => void }) {
  const now = new Date();
  const [layout, setLayout] = useState<LayoutData | null>(null);
  const [occupancy, setOccupancy] = useState<Record<string, RoomOccupancy>>({});
  const [layoutLoading, setLayoutLoading] = useState(true);
  const [occLoading, setOccLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [overlayFrom, setOverlayFrom] = useState(toYMD(now));
  const [overlayTo, setOverlayTo] = useState(toYMD(addDays(now, 1)));
  const [fpPickerTarget, setFpPickerTarget] = useState<"from" | "to" | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<{ room: RoomNode; occ: RoomOccupancy | null } | null>(null);

  const loadLayout = async () => {
    setLayoutLoading(true);
    try {
      const r = await apiRequest<any>(`/api/owner/properties/${property.id}/layout`, { token });
      setLayout(r ?? null);
    } catch { setLayout(null); }
    finally { setLayoutLoading(false); }
  };

  const loadOccupancy = async (from = overlayFrom, to = overlayTo) => {
    if (!from || !to) return;
    setOccLoading(true);
    try {
      const r = await apiRequest<any>(`/api/owner/properties/${property.id}/availability?from=${from}T00:00:00&to=${to}T23:59:59`, { token });
      const map: Record<string, RoomOccupancy> = {};
      (r?.rooms ?? []).forEach((rm: RoomOccupancy) => { map[rm.code] = rm; });
      setOccupancy(map);
    } catch { setOccupancy({}); }
    finally { setOccLoading(false); }
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const r = await apiRequest<any>(`/api/owner/properties/${property.id}/layout/generate`, { token, method: "POST" });
      setLayout(r ?? null);
      void loadOccupancy();
    } catch { Alert.alert("Error", "Could not generate floor plan."); }
    finally { setGenerating(false); }
  };

  useEffect(() => { void loadLayout(); }, [property.id]);
  useEffect(() => { if (layout) void loadOccupancy(); }, [layout]);

  const totalFloors = layout?.floors?.length ?? 0;
  const totalRooms  = layout?.floors?.reduce((s, f) => s + f.rooms.length, 0) ?? 0;

  const occColor = (occ: RoomOccupancy | undefined) => {
    if (!occ) return { bg: "rgba(255,255,255,0.05)", border: "rgba(255,255,255,0.1)", label: "rgba(255,255,255,0.4)", dot: "rgba(255,255,255,0.3)" };
    if (occ.occupancyPct >= 100) return { bg: "rgba(239,68,68,0.15)",   border: "rgba(239,68,68,0.4)",   label: "#fca5a5", dot: "#ef4444" };
    if (occ.occupancyPct > 0)    return { bg: "rgba(251,191,36,0.15)",  border: "rgba(251,191,36,0.4)",  label: "#fcd34d", dot: "#f59e0b" };
    return                               { bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.4)",  label: "#6ee7b7", dot: "#34d399" };
  };

  const fmtDate = (ymd: string) => { try { return new Date(ymd + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" }); } catch { return ymd; } };

  return (
    <View style={fp.root}>
      {/* ── Top bar ── */}
      <View style={fp.topBar}>
        <Pressable onPress={onBack} style={fp.backBtn}>
          <ArrowLeft size={16} color="rgba(255,255,255,0.75)" />
          <AppText style={fp.backBtnText}>Availability</AppText>
        </Pressable>
        <View style={fp.topRight}>
          <Pressable onPress={() => { void loadLayout(); void loadOccupancy(); }} style={fp.topIconBtn}>
            <RefreshCw size={15} color="rgba(255,255,255,0.65)" />
          </Pressable>
          <Pressable onPress={generate} style={({ pressed }) => [fp.regenerateBtn, pressed && { opacity: 0.82 }]}>
            {generating
              ? <ActivityIndicator color="#fff" size="small" />
              : <><Sparkles size={14} color="#fff" /><AppText style={fp.regenerateBtnText}>Regenerate</AppText></>}
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={fp.scroll}>

        {/* ── Hero card ── */}
        <View style={fp.heroCard}>
          <View style={fp.heroCardTop}>
            <View style={fp.heroIconBox}><Layers size={22} color="#34d399" /></View>
            <View style={{ flex: 1 }}>
              <AppText style={fp.heroCardTitle}>Floor Plan</AppText>
              <AppText style={fp.heroCardProp} numberOfLines={1}>{property.title}</AppText>
            </View>
          </View>
          <AppText style={fp.heroCardSub}>See occupancy overlay and quickly jump between floors.</AppText>
          <View style={fp.heroBadges}>
            <View style={fp.connectedBadge}><View style={fp.connectedDot} /><AppText style={fp.connectedText}>Connected</AppText></View>
            {totalFloors > 0 && <View style={fp.floorBadge}><Layers size={12} color="#34d399" /><AppText style={fp.floorBadgeText}>{totalFloors} floor{totalFloors !== 1 ? "s" : ""}</AppText></View>}
            {totalRooms > 0  && <View style={fp.floorBadge}><BedDouble size={12} color="rgba(255,255,255,0.55)" /><AppText style={fp.floorBadgeText}>{totalRooms} rooms</AppText></View>}
          </View>
        </View>

        {/* ── Overlay window ── */}
        <View style={fp.overlayCard}>
          <View style={fp.overlayCardHead}>
            <View style={fp.overlayIconWrap}><CalendarDays size={16} color="#34d399" /></View>
            <View style={{ flex: 1 }}>
              <AppText style={fp.overlayCardTitle}>Overlay window</AppText>
              <AppText style={fp.overlayCardSub}>Room colors update to show occupancy for this period.</AppText>
            </View>
            <View style={fp.livePillSmall}><View style={fp.liveDotSmall} /><AppText style={fp.liveTextSmall}>Live</AppText></View>
          </View>
          <View style={fp.overlayDates}>
            {([{ key: "from" as const, label: "From", val: overlayFrom }, { key: "to" as const, label: "To", val: overlayTo }]).map(({ key, label, val }) => (
              <Pressable key={key} onPress={() => setFpPickerTarget(key)} style={({ pressed }) => [fp.overlayDateBtn, pressed && { opacity: 0.75 }]}>
                <View style={fp.overlayDateBtnTop}>
                  <AppText style={fp.overlayDateLabel}>{label}</AppText>
                  <CalendarDays size={13} color="#34d399" />
                </View>
                <AppText style={fp.overlayDateValue}>{fmtDate(val)}</AppText>
              </Pressable>
            ))}
          </View>
          {occLoading && (
            <View style={fp.occLoadingRow}>
              <ActivityIndicator color="#34d399" size="small" />
              <AppText style={fp.occLoadingText}>Updating occupancy…</AppText>
            </View>
          )}
        </View>

        {/* ── Floor plan content ── */}
        {layoutLoading ? (
          <View style={fp.centerState}>
            <ActivityIndicator color="#34d399" size="large" />
            <AppText style={fp.centerText}>Loading floor plan…</AppText>
          </View>
        ) : !layout || layout.floors.length === 0 ? (
          <View style={fp.emptyCard}>
            <View style={fp.emptyIconRing}><Layers size={32} color="rgba(52,211,153,0.5)" /></View>
            <AppText style={fp.emptyCardTitle}>No floor plan yet</AppText>
            <AppText style={fp.emptyCardSub}>Generate a floor plan to see rooms organised by floor.</AppText>
            <Pressable onPress={generate} style={({ pressed }) => [fp.regenerateBtn, { paddingHorizontal: 28, paddingVertical: 14, marginTop: 4 }, pressed && { opacity: 0.8 }]}>
              {generating ? <ActivityIndicator color="#fff" size="small" /> : <>
                <Sparkles size={14} color="#fff" />
                <AppText style={fp.regenerateBtnText}>Generate floor plan</AppText>
              </>}
            </Pressable>
          </View>
        ) : (
          layout.floors.map((floor, fi) => {
            const rooms = floor.rooms as any[];
            const canvasW = Dimensions.get("window").width - spacing[4] * 2;
            const perRow = Math.ceil(rooms.length / 2);
            const topRooms = rooms.slice(0, perRow);
            const bottomRooms = rooms.slice(perRow);
            const roomW = Math.floor((canvasW - 12 - (perRow - 1) * 4) / perRow);

            return (
              <View key={floor.id} style={fp.floorSection}>
                {/* Floor label */}
                <View style={fp.floorHeader}>
                  <View style={fp.floorIconWrap}><Layers size={13} color="#34d399" /></View>
                  <AppText style={fp.floorLabel}>{floor.label}</AppText>
                  <View style={fp.floorBadgePill}><AppText style={fp.floorBadgePillText}>{floor.rooms.length} rooms</AppText></View>
                </View>
                <AppText style={fp.floorHint}>Tap any room to view bookings and manage blocks.</AppText>

                {/* Corridor floor plan */}
                <View style={[fp.corridor, { width: canvasW }]}>
                  <View style={fp.corridorRow}>
                    {topRooms.map((room: any) => {
                      const occ = occupancy[room.code];
                      const c = occColor(occ);
                      return (
                        <Pressable
                          key={room.id}
                          onPress={() => setSelectedRoom({ room, occ: occ ?? null })}
                          style={({ pressed }) => [fp.corridorRoom, fp.corridorRoomTop, { width: roomW, backgroundColor: c.bg, borderColor: c.border }, pressed && { opacity: 0.75 }]}
                        >
                          <View style={fp.corridorRoomInner}>
                            <AppText style={fp.corridorRoomName} numberOfLines={2}>{room.name}</AppText>
                            <View style={fp.corridorRoomBottom}>
                              <AppText style={[fp.corridorRoomPct, { color: c.dot }]}>{occ?.occupancyPct ?? 0}%</AppText>
                              <View style={[fp.corridorRoomDot, { backgroundColor: c.dot }]} />
                            </View>
                          </View>
                          <View style={[fp.doorNotch, { borderColor: c.border }]} />
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={fp.corridorHallway}>
                    <View style={fp.corridorHallwayLine} />
                    <AppText style={fp.corridorHallwayLabel}>CORRIDOR</AppText>
                    <View style={fp.corridorHallwayLine} />
                  </View>

                  <View style={fp.corridorRow}>
                    {bottomRooms.map((room: any) => {
                      const occ = occupancy[room.code];
                      const c = occColor(occ);
                      return (
                        <Pressable
                          key={room.id}
                          onPress={() => setSelectedRoom({ room, occ: occ ?? null })}
                          style={({ pressed }) => [fp.corridorRoom, fp.corridorRoomBot, { width: roomW, backgroundColor: c.bg, borderColor: c.border }, pressed && { opacity: 0.75 }]}
                        >
                          <View style={[fp.doorNotch, { borderColor: c.border }]} />
                          <View style={fp.corridorRoomInner}>
                            <AppText style={fp.corridorRoomName} numberOfLines={2}>{room.name}</AppText>
                            <View style={fp.corridorRoomBottom}>
                              <AppText style={[fp.corridorRoomPct, { color: c.dot }]}>{occ?.occupancyPct ?? 0}%</AppText>
                              <View style={[fp.corridorRoomDot, { backgroundColor: c.dot }]} />
                            </View>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              </View>
            );
          })
        )}

        {/* ── Legend ── */}
        {layout && layout.floors.length > 0 && (
          <View style={fp.legendCard}>
            <AppText style={fp.legendTitle}>Occupancy key</AppText>
            <View style={fp.legendRow}>
              {[
                { dot: "#34d399", label: "Available" },
                { dot: "#f59e0b", label: "Partial" },
                { dot: "#ef4444", label: "Full" },
                { dot: "rgba(255,255,255,0.25)", label: "No data" },
              ].map(({ dot, label }) => (
                <View key={label} style={fp.legendItem}>
                  <View style={[fp.legendDot, { backgroundColor: dot }]} />
                  <AppText style={fp.legendText}>{label}</AppText>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Room detail modal — web parity */}
      <Modal visible={!!selectedRoom} transparent animationType="slide" onRequestClose={() => setSelectedRoom(null)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.45)" }}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedRoom(null)} />
          {selectedRoom ? (
            <View style={fp.roomSheet}>
              {/* Header */}
              <View style={fp.roomSheetHeader}>
                <View style={fp.roomSheetHeaderIcon}>
                  <Home size={20} color="#ffffff" />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText style={fp.roomSheetName}>{selectedRoom.room.name}</AppText>
                  <AppText style={fp.roomSheetMeta} numberOfLines={1}>
                    Room Code: {selectedRoom.room.code}
                    {selectedRoom.room.pricePerNight ? `  •  TSh ${selectedRoom.room.pricePerNight.toLocaleString()} per night` : ""}
                  </AppText>
                </View>
                <Pressable onPress={() => setSelectedRoom(null)} style={fp.roomSheetX}>
                  <X size={15} color="#374151" />
                </Pressable>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ flexShrink: 1 }}>
                {(() => {
                  const occ = selectedRoom.occ;
                  const bookings = occ?.bookings ?? [];
                  const blocks   = occ?.blocks   ?? [];
                  const hasBookings = bookings.length > 0;
                  const hasBlocks   = blocks.length > 0;
                  const isAvailable = !hasBookings && !hasBlocks;

                  return (
                    <>
                      {/* RESERVATIONS IN THIS WINDOW */}
                      <View style={fp.roomSheetSection}>
                        <View style={fp.roomSheetSectionHead}>
                          <View style={fp.roomSheetSectionIcon}>
                            <CalendarDays size={16} color="#059669" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <AppText style={fp.roomSheetSectionTitle}>RESERVATIONS IN THIS WINDOW</AppText>
                            <AppText style={[fp.roomSheetWindowRange, { paddingLeft: 0, marginTop: 3 }]}>
                              {fmtDate(overlayFrom)} – {fmtDate(overlayTo)}
                              {"  "}<AppText style={fp.roomSheetWindowNote}>(end date is checkout)</AppText>
                            </AppText>
                          </View>
                        </View>
                      </View>

                      {hasBookings ? (
                        <View style={fp.roomSheetBookingList}>
                          {bookings.map(b => (
                            <View key={b.id} style={fp.roomSheetBookingRow}>
                              <View style={[fp.roomSheetBookingDot, { backgroundColor: "#10b981" }]} />
                              <View style={{ flex: 1 }}>
                                <AppText style={fp.roomSheetBookingGuest}>{b.guestName ?? "Guest"}</AppText>
                                <AppText style={fp.roomSheetBookingDates}>
                                  {fmtDate(b.checkIn)} – {fmtDate(b.checkOut)}  ·  {b.status}
                                </AppText>
                              </View>
                            </View>
                          ))}
                        </View>
                      ) : (
                        <View style={fp.roomSheetEmptyState}>
                          <View style={fp.roomSheetEmptyIcon}>
                            <View style={fp.roomSheetEmptyCheck} />
                          </View>
                          <AppText style={fp.roomSheetEmptyTitle}>No reservations found</AppText>
                          <AppText style={fp.roomSheetEmptyBody}>
                            {isAvailable
                              ? "This room is available for the selected period"
                              : "No guest bookings — room is blocked (see below)"}
                          </AppText>
                        </View>
                      )}

                      {/* EXTERNAL BLOCK */}
                      <View style={[fp.roomSheetSection, { borderTopWidth: 1, borderTopColor: "#f3f4f6" }]}>
                        <View style={fp.roomSheetSectionHead}>
                          <View style={[fp.roomSheetSectionIcon, { backgroundColor: "#fefce8", borderColor: "#fef08a" }]}>
                            <CalendarOff size={16} color="#ca8a04" />
                          </View>
                          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                            <AppText style={[fp.roomSheetSectionTitle, { color: "#92400e" }]}>EXTERNAL BLOCK</AppText>
                            {hasBlocks && (
                              <View style={fp.roomSheetBlockBadge}>
                                <AppText style={fp.roomSheetBlockBadgeText}>{blocks.length} block{blocks.length > 1 ? "s" : ""}</AppText>
                              </View>
                            )}
                          </View>
                        </View>
                        {hasBlocks ? (
                          <View style={{ gap: 6, marginTop: 6, paddingLeft: 40 }}>
                            {blocks.map(bl => (
                              <View key={bl.id} style={fp.roomSheetBlockRow}>
                                <View style={[fp.roomSheetBookingDot, { backgroundColor: "#f59e0b" }]} />
                                <View style={{ flex: 1 }}>
                                  <AppText style={fp.roomSheetBookingGuest}>
                                    {fmtDate(bl.startDate)} – {fmtDate(bl.endDate)}
                                  </AppText>
                                  <AppText style={fp.roomSheetBookingDates}>
                                    {bl.source ?? "MANUAL"}  ·  {bl.nights} night{bl.nights !== 1 ? "s" : ""}
                                  </AppText>
                                </View>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <AppText style={[fp.roomSheetWindowRange, { paddingLeft: 40, color: "#9ca3af", marginTop: 4 }]}>
                            No external blocks in this window.
                          </AppText>
                        )}
                      </View>

                      {/* Stats row */}
                      <View style={fp.roomSheetStatsRow}>
                        {[
                          { label: "Capacity",      value: `${(selectedRoom.room.capacity?.adults ?? 0) + (selectedRoom.room.capacity?.children ?? 0)} guests` },
                          { label: "Nights booked", value: String(occ?.nightsBooked ?? 0) },
                          { label: "Nights blocked",value: String(occ?.nightsBlocked ?? 0) },
                          { label: "Occupancy",     value: `${occ?.occupancyPct ?? 0}%` },
                        ].map((s, i, arr) => (
                          <View key={s.label} style={[fp.roomSheetStatCell, i < arr.length - 1 && { borderRightWidth: 1, borderRightColor: "#f3f4f6" }]}>
                            <AppText style={fp.roomSheetStatLabel}>{s.label}</AppText>
                            <AppText style={fp.roomSheetStatValue}>{s.value}</AppText>
                          </View>
                        ))}
                      </View>
                    </>
                  );
                })()}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>

      {/* Overlay date pickers */}
      <DatePickerSheet
        visible={fpPickerTarget === "from"}
        value={overlayFrom}
        title="Overlay from"
        onConfirm={(ymd) => {
          setOverlayFrom(ymd);
          // If the new FROM is on or after TO, push TO to FROM + 1 day
          const correctedTo = (overlayTo && overlayTo > ymd) ? overlayTo : toYMD(addDays(new Date(ymd + "T12:00:00"), 1));
          setOverlayTo(correctedTo);
          void loadOccupancy(ymd, correctedTo);
        }}
        onClose={() => setFpPickerTarget(null)}
      />
      <DatePickerSheet
        visible={fpPickerTarget === "to"}
        value={overlayTo}
        minDate={toYMD(addDays(new Date(overlayFrom + "T12:00:00"), 1))}
        title="Overlay to"
        onConfirm={(ymd) => { setOverlayTo(ymd); void loadOccupancy(overlayFrom, ymd); }}
        onClose={() => setFpPickerTarget(null)}
      />
    </View>
  );
}

const fp = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020b18" },
  // Top bar
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 50, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.06)" },
  backBtnText: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.75)" },
  topRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  topIconBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  regenerateBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 50, backgroundColor: "#059669" },
  regenerateBtnText: { fontSize: 13, fontWeight: "700", color: "#ffffff" },
  scroll: { padding: 16, gap: 16, paddingBottom: 48 },
  // Hero card
  heroCard: { borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)", padding: 18, gap: 12 },
  heroCardTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  heroIconBox: { width: 52, height: 52, borderRadius: 16, backgroundColor: "rgba(52,211,153,0.12)", borderWidth: 1, borderColor: "rgba(52,211,153,0.25)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  heroCardTitle: { fontSize: 24, fontWeight: "800", color: "#ffffff", letterSpacing: -0.3 },
  heroCardProp: { fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 2 },
  heroCardSub: { fontSize: 13, color: "rgba(255,255,255,0.4)", lineHeight: 19 },
  heroBadges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  connectedBadge: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 50, borderWidth: 1.5, borderColor: "rgba(52,211,153,0.4)", backgroundColor: "rgba(52,211,153,0.12)" },
  connectedDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#34d399" },
  connectedText: { fontSize: 13, fontWeight: "700", color: "#6ee7b7" },
  floorBadge: { flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 50, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.13)", backgroundColor: "rgba(255,255,255,0.06)" },
  floorBadgeText: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.65)" },
  // Overlay card
  overlayCard: { borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)", overflow: "hidden" },
  overlayCardHead: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  overlayIconWrap: { width: 38, height: 38, borderRadius: 11, backgroundColor: "rgba(52,211,153,0.12)", borderWidth: 1, borderColor: "rgba(52,211,153,0.2)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  overlayCardTitle: { fontSize: 15, fontWeight: "700", color: "#ffffff" },
  overlayCardSub: { fontSize: 12, color: "rgba(255,255,255,0.38)", marginTop: 2, lineHeight: 17 },
  livePillSmall: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 50, borderWidth: 1, borderColor: "rgba(52,211,153,0.35)", backgroundColor: "rgba(52,211,153,0.1)", flexShrink: 0 },
  liveDotSmall: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#34d399" },
  liveTextSmall: { fontSize: 11, fontWeight: "700", color: "#6ee7b7" },
  overlayDates: { flexDirection: "row", gap: 10, padding: 14 },
  overlayDateBtn: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.06)", padding: 12, gap: 6 },
  overlayDateBtnTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  overlayDateLabel: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.38)", letterSpacing: 1, textTransform: "uppercase" },
  overlayDateValue: { fontSize: 15, fontWeight: "700", color: "#ffffff" },
  occLoadingRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingBottom: 12 },
  occLoadingText: { fontSize: 12, color: "rgba(255,255,255,0.4)" },
  // States
  centerState: { alignItems: "center", gap: 12, paddingVertical: 48 },
  centerText: { fontSize: 15, color: "rgba(255,255,255,0.35)", textAlign: "center" },
  emptyCard: { borderRadius: 18, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)", alignItems: "center", padding: 32, gap: 12 },
  emptyIconRing: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: "rgba(52,211,153,0.25)", backgroundColor: "rgba(52,211,153,0.08)", alignItems: "center", justifyContent: "center" },
  emptyCardTitle: { fontSize: 17, fontWeight: "700", color: "#ffffff" },
  emptyCardSub: { fontSize: 13, color: "rgba(255,255,255,0.38)", textAlign: "center", lineHeight: 19 },
  // Floor section
  floorSection: { gap: 12 },
  floorHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  floorIconWrap: { width: 30, height: 30, borderRadius: 8, backgroundColor: "rgba(52,211,153,0.12)", borderWidth: 1, borderColor: "rgba(52,211,153,0.2)", alignItems: "center", justifyContent: "center" },
  floorLabel: { fontSize: 16, fontWeight: "700", color: "#ffffff", flex: 1 },
  floorBadgePill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 50, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  floorBadgePillText: { fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: "600" },
  floorHint: { fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: -4 },
  // Corridor floor plan
  corridor: { borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.03)", overflow: "hidden", padding: 6 },
  corridorRow: { flexDirection: "row", gap: 4 },
  corridorRoom: { borderWidth: 1.5, borderRadius: 8, overflow: "hidden", minHeight: 80 },
  corridorRoomTop: { borderBottomWidth: 0, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  corridorRoomBot: { borderTopWidth: 0, borderTopLeftRadius: 0, borderTopRightRadius: 0 },
  corridorRoomInner: { flex: 1, padding: 9, justifyContent: "space-between" },
  corridorRoomName: { fontSize: 12, fontWeight: "700", color: "#ffffff", lineHeight: 16 },
  corridorRoomBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  corridorRoomPct: { fontSize: 11, fontWeight: "700" },
  corridorRoomDot: { width: 7, height: 7, borderRadius: 3.5 },
  doorNotch: { height: 4, marginHorizontal: 10, borderBottomWidth: 1.5, borderLeftWidth: 0.5, borderRightWidth: 0.5 },
  corridorHallway: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 7, paddingHorizontal: 6 },
  corridorHallwayLine: { flex: 1, height: 1, backgroundColor: "rgba(255,255,255,0.08)" },
  corridorHallwayLabel: { fontSize: 9, fontWeight: "700", color: "rgba(255,255,255,0.22)", letterSpacing: 2.5 },
  // Legend card
  legendCard: { borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.03)", padding: 14, gap: 10 },
  legendTitle: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.35)", letterSpacing: 0.8, textTransform: "uppercase" },
  legendRow: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 7 },
  legendDot: { width: 9, height: 9, borderRadius: 4.5 },
  legendText: { fontSize: 13, color: "rgba(255,255,255,0.55)", fontWeight: "500" },
  // Room detail sheet — web parity (light theme)
  roomSheet: { backgroundColor: "#ffffff", borderTopLeftRadius: 22, borderTopRightRadius: 22, overflow: "hidden", maxHeight: Dimensions.get("window").height * 0.88, borderTopWidth: 1, borderTopColor: "#e5e7eb" },
  roomSheetHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  roomSheetHeaderIcon: { width: 46, height: 46, borderRadius: 14, backgroundColor: "#059669", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  roomSheetName: { fontSize: 18, fontWeight: "700", color: "#111827" },
  roomSheetMeta: { fontSize: 12, color: "#6b7280", marginTop: 3 },
  roomSheetX: { width: 32, height: 32, borderRadius: 9, backgroundColor: "#f3f4f6", borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  // Sections
  roomSheetSection: { paddingHorizontal: 18, paddingVertical: 14, gap: 8 },
  roomSheetSectionHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  roomSheetSectionIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  roomSheetSectionTitle: { fontSize: 12, fontWeight: "800", color: "#065f46", letterSpacing: 0.6 },
  roomSheetWindowRange: { fontSize: 14, fontWeight: "600", color: "#374151", paddingLeft: 40 },
  roomSheetWindowNote: { fontSize: 12, fontWeight: "400", color: "#9ca3af" },
  // Booking list
  roomSheetBookingList: { paddingHorizontal: 18, paddingBottom: 8, gap: 2 },
  roomSheetBookingRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#f9fafb" },
  roomSheetBookingDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5, flexShrink: 0 },
  roomSheetBookingGuest: { fontSize: 14, fontWeight: "600", color: "#111827" },
  roomSheetBookingDates: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  // Empty state
  roomSheetEmptyState: { alignItems: "center", gap: 8, paddingVertical: 28, paddingHorizontal: 18 },
  roomSheetEmptyIcon: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: "#34d399", alignItems: "center", justifyContent: "center" },
  roomSheetEmptyCheck: { width: 22, height: 12, borderLeftWidth: 3, borderBottomWidth: 3, borderColor: "#34d399", transform: [{ rotate: "-45deg" }], marginTop: 4 },
  roomSheetEmptyTitle: { fontSize: 16, fontWeight: "600", color: "#374151" },
  roomSheetEmptyBody: { fontSize: 13, color: "#9ca3af", textAlign: "center" },
  // Stats row
  roomSheetStatsRow: { flexDirection: "row", marginHorizontal: 18, marginVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "#f3f4f6", overflow: "hidden" },
  roomSheetBlockBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 50, backgroundColor: "#fef9c3", borderWidth: 1, borderColor: "#fde68a" },
  roomSheetBlockBadgeText: { fontSize: 10, fontWeight: "700", color: "#92400e" },
  roomSheetBlockRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: "#f9fafb" },
  roomSheetStatCell: { flex: 1, paddingVertical: 12, paddingHorizontal: 8, alignItems: "center", gap: 4 },
  roomSheetStatLabel: { fontSize: 9, fontWeight: "700", color: "#9ca3af", letterSpacing: 0.6, textAlign: "center" },
  roomSheetStatValue: { fontSize: 15, fontWeight: "700", color: "#111827" },
});

function OwnerAvailabilityManageScreen({ property, token, onBack }: { property: Property; token: string | null; onBack: () => void }) {
  const now = new Date();
  const [calMonth, setCalMonth] = useState(new Date(now.getFullYear(), now.getMonth(), 1));
  const [calData, setCalData] = useState<{ bookings: CalBooking[]; blocks: Block[] } | null>(null);
  const [calLoading, setCalLoading] = useState(true);
  const [filterStart, setFilterStart] = useState(toYMD(now));
  const [filterEnd, setFilterEnd] = useState(toYMD(new Date(now.getFullYear(), now.getMonth()+1, 0)));
  const [summary, setSummary] = useState<any>(null);
  const [byRoomType, setByRoomType] = useState<Record<string, any>>({});
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [selectedRoomType, setSelectedRoomType] = useState<string | null>(null);
  const [calFilter, setCalFilter] = useState<"all" | "bookings" | "blocks">("all");
  const [filterPickerTarget, setFilterPickerTarget] = useState<"from" | "to" | null>(null);
  const [showFloorPlan, setShowFloorPlan] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [blockStart, setBlockStart] = useState("");
  const [blockEnd, setBlockEnd] = useState("");
  const [blockNotes, setBlockNotes] = useState("");
  const [blockSource, setBlockSource] = useState("");
  const [blockRoomCode, setBlockRoomCode] = useState<string | null>(null);
  const [blockQuantity, setBlockQuantity] = useState(1);
  const [pickerTarget, setPickerTarget] = useState<"start" | "end" | null>(null);
  const [roomPickerOpen, setRoomPickerOpen] = useState(false);
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [tosAgreed, setTosAgreed] = useState(false);
  const [conflictData, setConflictData] = useState<{ conflictingBookings: any[]; conflictingBlocks: any[] } | null>(null);
  const [conflictChecking, setConflictChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<{ date: string; bookings: CalBooking[]; blocks: Block[] } | null>(null);

  const loadCalendar = async (month = calMonth) => {
    setCalLoading(true);
    const start = toYMD(new Date(month.getFullYear(), month.getMonth(), 1));
    const end   = toYMD(new Date(month.getFullYear(), month.getMonth()+1, 0));
    try {
      const r = await apiRequest<any>(`/api/owner/availability/calendar?propertyId=${property.id}&startDate=${start}T00:00:00&endDate=${end}T23:59:59`, { token });
      setCalData({ bookings: Array.isArray(r?.bookings) ? r.bookings : [], blocks: Array.isArray(r?.blocks) ? r.blocks : [] });
    } catch { setCalData({ bookings: [], blocks: [] }); }
    finally { setCalLoading(false); }
  };

  const loadSummary = async () => {
    if (!filterStart || !filterEnd) return;
    setSummaryLoading(true);
    try {
      const r = await apiRequest<any>(`/api/owner/availability/summary?propertyId=${property.id}&startDate=${filterStart}T00:00:00&endDate=${filterEnd}T23:59:59`, { token });
      setSummary(r?.summary ?? null);
      setByRoomType(r?.byRoomType ?? {});
    } catch { setSummary(null); setByRoomType({}); }
    finally { setSummaryLoading(false); }
  };

  useEffect(() => { void loadCalendar(); }, [property.id, calMonth]);
  useEffect(() => { void loadSummary(); }, [property.id]);

  const resetBlockForm = () => {
    setBlockStart(""); setBlockEnd(""); setBlockNotes("");
    setBlockSource(""); setBlockRoomCode(null); setBlockQuantity(1);
    setPickerTarget(null); setRoomPickerOpen(false); setSourcePickerOpen(false);
    setConfirmOpen(false); setTosAgreed(false); setConflictData(null);
  };

  const addBlock = async () => {
    if (!blockStart || !blockEnd) { setError("Please select start and end dates."); return; }
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const startD = new Date(blockStart + "T00:00:00");
    const endD   = new Date(blockEnd   + "T00:00:00");
    if (startD < today) { setError("Start date cannot be in the past."); return; }
    if (endD <= startD) { setError("End date must be after start date. Same-day blocks are not allowed."); return; }
    const roomTypes = Array.isArray(property.roomsSpec) ? property.roomsSpec : [];
    if (roomTypes.length > 0 && !blockRoomCode) { setError("Please select a room type."); return; }
    if (!blockSource) { setError("Please select a source."); return; }
    setError(null);
    setConflictChecking(true);
    try {
      const params = new URLSearchParams({
        propertyId: String(property.id),
        startDate: `${blockStart}T00:00:00`,
        endDate: `${blockEnd}T00:00:00`,
        ...(blockRoomCode ? { roomCode: blockRoomCode } : {}),
      });
      const result = await apiRequest<any>(`/api/owner/availability/check-conflicts?${params}`, { token });
      const bookingConflicts: any[] = result?.conflictingBookings ?? [];
      const blockConflicts: any[]   = result?.conflictingBlocks   ?? [];
      if (bookingConflicts.length > 0) {
        setError(`Cannot block: ${bookingConflicts.length} active booking${bookingConflicts.length > 1 ? "s" : ""} overlap these dates (${bookingConflicts.map(b => b.guestName).join(", ")}). Cancel them first.`);
        return;
      }
      setConflictData({ conflictingBookings: bookingConflicts, conflictingBlocks: blockConflicts });
    } catch {
      setConflictData(null);
    } finally {
      setConflictChecking(false);
    }
    setConfirmOpen(true);
  };

  const submitBlock = async () => {
    if (!tosAgreed) return;
    setSaving(true); setError(null);
    try {
      await apiRequest("/api/owner/availability/blocks", {
        token, method: "POST",
        body: {
          propertyId: property.id,
          startDate: `${blockStart}T00:00:00`,
          endDate: `${blockEnd}T00:00:00`,
          notes: blockNotes || undefined,
          source: blockSource,
          roomCode: blockRoomCode || undefined,
          quantity: blockQuantity,
        }
      });
      setAddOpen(false); resetBlockForm();
      void loadCalendar();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save block."); setConfirmOpen(false); }
    finally { setSaving(false); }
  };

  const deleteBlock = (block: Block) => {
    Alert.alert("Remove block", `Remove from ${fmtShort(block.startDate)} to ${fmtShort(block.endDate)}?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        try { await apiRequest(`/api/owner/availability/blocks/${block.id}`, { token, method: "DELETE" }); void loadCalendar(); }
        catch { Alert.alert("Error", "Could not delete block."); }
      }}
    ]);
  };

  // Build month grid
  const monthDays = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calMonth]);

  // Returns true when a roomCode belongs to the currently selected room type filter.
  // A block/booking with NO roomCode is shown only when "All rooms" is selected.
  const matchesRoomFilter = (roomCode: string | null | undefined): boolean => {
    if (!selectedRoomType) return true; // "All rooms" — show everything
    if (!roomCode) return false;        // no room code — hide when filtering by type
    const rtLower  = selectedRoomType.toLowerCase();
    const rcLower  = roomCode.toLowerCase();
    // Match if the code IS the type or STARTS WITH the type (e.g. "suite-1" matches "suite")
    return rcLower === rtLower || rcLower.startsWith(rtLower + "-") || rcLower.startsWith(rtLower + "_");
  };

  const getDayInfo = (day: number) => {
    const ymd = `${calMonth.getFullYear()}-${String(calMonth.getMonth()+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const bookings = (calData?.bookings || []).filter(b => {
      const ci = b.checkIn.slice(0,10); const co = b.checkOut.slice(0,10);
      return ymd >= ci && ymd < co && matchesRoomFilter(b.roomCode);
    });
    const blocks = (calData?.blocks || []).filter(b => {
      const bs = b.startDate.slice(0,10); const be = b.endDate.slice(0,10);
      return ymd >= bs && ymd < be && matchesRoomFilter(b.roomCode);
    });
    return { ymd, bookings, blocks };
  };

  const totalBookings = calData?.bookings?.length ?? 0;
  const totalBlocks = calData?.blocks?.length ?? 0;

  if (showFloorPlan) {
    return <FloorPlanScreen property={property} token={token} onBack={() => setShowFloorPlan(false)} />;
  }

  return (
    <View style={ms.root}>
      {/* Top nav bar */}
      <View style={ms.topBar}>
        <Pressable onPress={onBack} style={ms.backBtn} accessibilityRole="button">
          <ArrowLeft size={18} color="rgba(255,255,255,0.8)" />
          <AppText variant="caption" weight="bold" style={ms.backText}>Back</AppText>
        </Pressable>
        <View style={ms.topActions}>
          <Pressable onPress={() => loadCalendar()} style={ms.topBtn} accessibilityRole="button">
            <RefreshCw size={14} color="rgba(255,255,255,0.7)" />
            <AppText variant="caption" weight="bold" style={ms.topBtnText}>Refresh</AppText>
          </Pressable>
          <Pressable onPress={() => setShowFloorPlan(true)} style={ms.topBtn} accessibilityRole="button">
            <Layers size={14} color="rgba(255,255,255,0.7)" />
            <AppText variant="caption" weight="bold" style={ms.topBtnText}>Floor Plan</AppText>
          </Pressable>
          <Pressable onPress={() => { setAddOpen(true); setError(null); }} style={ms.addBtn} accessibilityRole="button">
            <Plus size={15} color={colors.white} />
            <AppText variant="caption" weight="bold" style={ms.addBtnText}>Add block</AppText>
          </Pressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ms.scroll}>

        {/* Header card */}
        <View style={ms.headerCard}>
          {/* Top row: icon + title + live pill */}
          <View style={ms.headerCardTop}>
            <View style={ms.headerIconBox}>
              <CalendarDays size={18} color="#34d399" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText style={ms.headerEyebrow}>OWNER CALENDAR</AppText>
              <AppText style={ms.headerTitle} numberOfLines={1}>Room Availability</AppText>
            </View>
            <View style={ms.headerLivePill}>
              <View style={ms.headerLiveDot} />
              <AppText style={ms.headerLiveText}>Live</AppText>
            </View>
          </View>

          {/* Property row */}
          <View style={ms.headerPropRow}>
            <AppText style={ms.headerPropLabel}>Property</AppText>
            <AppText style={ms.headerPropName} numberOfLines={1}>{property.title}</AppText>
          </View>

          {/* Stats row */}
          <View style={ms.headerStatsRow}>
            <View style={ms.headerStat}>
              <AppText style={ms.headerStatNum}>{totalBookings}</AppText>
              <AppText style={ms.headerStatLabel}>Bookings</AppText>
            </View>
            <View style={ms.headerStatDiv} />
            <View style={ms.headerStat}>
              <AppText style={[ms.headerStatNum, totalBlocks > 0 && { color: "#fbbf24" }]}>{totalBlocks}</AppText>
              <AppText style={ms.headerStatLabel}>Blocks</AppText>
            </View>
            <View style={ms.headerStatDiv} />
            <View style={ms.headerStat}>
              <AppText style={ms.headerStatNum}>{getTotalRooms(property)}</AppText>
              <AppText style={ms.headerStatLabel}>Total rooms</AppText>
            </View>
            <View style={ms.headerStatDiv} />
            <View style={ms.headerStat}>
              <AppText style={ms.headerStatHint}>Tap a day to view{"\n"}details or filter</AppText>
            </View>
          </View>
        </View>

        {error ? (
          <View style={ms.errorBox}>
            <AppText variant="caption" style={{ color: "#fca5a5" }}>{error}</AppText>
            <Pressable onPress={() => setError(null)}><X size={14} color="#f87171" /></Pressable>
          </View>
        ) : null}

        {/* Property card — Bookings / Blocks + Live indicator */}
        <View style={ms.propCard}>
          <View style={ms.propCardTop}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText variant="caption" style={ms.propCardLabel}>Property</AppText>
              <AppText variant="bodySmall" weight="bold" style={ms.propCardTitle} numberOfLines={1}>{property.title}</AppText>
              <AppText variant="caption" style={ms.propCardHint}>Tap a day to view details, or use filters below.</AppText>
            </View>
            <View style={ms.liveBadge}>
              <AppText variant="caption" style={ms.liveBadgeLabel}>Live</AppText>
              <ManageLiveDots />
              <AppText variant="caption" weight="bold" style={ms.liveBadgeStatus}>Connected</AppText>
            </View>
          </View>
          <View style={ms.bookingBlockRow}>
            <Pressable
              style={[ms.bookingTile, calFilter === "bookings" && ms.bookingTileActive]}
              onPress={() => setCalFilter(prev => prev === "bookings" ? "all" : "bookings")}
            >
              <AppText variant="caption" weight="bold" style={ms.bookingTileLabel}>Bookings</AppText>
              <AppText variant="title" weight="bold" style={ms.bookingTileCount}>{totalBookings}</AppText>
              <AppText variant="caption" style={ms.bookingTileHint}>{calFilter === "bookings" ? "Filtering…" : "Tap to filter"}</AppText>
            </Pressable>
            <Pressable
              style={[ms.blockTile, calFilter === "blocks" && ms.blockTileActive]}
              onPress={() => setCalFilter(prev => prev === "blocks" ? "all" : "blocks")}
            >
              <AppText variant="caption" weight="bold" style={ms.blockTileLabel}>Blocks</AppText>
              <AppText variant="title" weight="bold" style={ms.blockTileCount}>{totalBlocks}</AppText>
              <AppText variant="caption" style={ms.blockTileHint}>{calFilter === "blocks" ? "Filtering…" : "Tap to filter"}</AppText>
            </Pressable>
          </View>

          {/* Stats panel — expands when a tile is active */}
          {calFilter !== "all" && (() => {
            const isBookings = calFilter === "bookings";
            const accent = isBookings ? "#34d399" : "#fbbf24";
            const accentBg = isBookings ? "rgba(52,211,153,0.1)" : "rgba(251,191,36,0.1)";
            const accentBorder = isBookings ? "rgba(52,211,153,0.25)" : "rgba(251,191,36,0.25)";
            const total   = isBookings ? totalBookings : totalBlocks;
            const label   = isBookings ? "Bookings this month" : "Blocks this month";
            const roomBreakdown = Object.entries(byRoomType).map(([type, d]: [string, any]) => ({
              type,
              value: isBookings ? (d.bookedRooms ?? 0) : (d.blockedRooms ?? 0),
              total: d.totalRooms ?? 1,
            })).filter(r => r.value > 0);

            return (
              <View style={[ms.statsPanel, { borderColor: accentBorder, backgroundColor: accentBg }]}>
                {/* Header row */}
                <View style={ms.statsPanelHead}>
                  <View style={[ms.statsPanelDot, { backgroundColor: accent }]} />
                  <AppText style={[ms.statsPanelTitle, { color: accent }]}>{label}</AppText>
                  <AppText style={[ms.statsPanelTotal, { color: accent }]}>{total}</AppText>
                </View>

                {/* Summary stats */}
                {summary ? (
                  <View style={ms.statsPanelRow}>
                    {(isBookings ? [
                      { label: "Rooms booked",    value: summary.totalBookedRooms },
                      { label: "Available",        value: summary.totalAvailableRooms },
                      { label: "Availability",     value: `${summary.overallAvailabilityPercentage ?? 0}%` },
                    ] : [
                      { label: "Rooms blocked",   value: summary.totalBlockedRooms },
                      { label: "Available",        value: summary.totalAvailableRooms },
                      { label: "Total rooms",      value: summary.totalRooms },
                    ]).map(s => (
                      <View key={s.label} style={ms.statsPanelStat}>
                        <AppText style={ms.statsPanelStatLabel}>{s.label}</AppText>
                        <AppText style={[ms.statsPanelStatValue, { color: accent }]}>{s.value ?? "—"}</AppText>
                      </View>
                    ))}
                  </View>
                ) : null}

                {/* Per-room-type bar breakdown */}
                {roomBreakdown.length > 0 ? (
                  <View style={ms.statsPanelBars}>
                    {roomBreakdown.map(r => (
                      <View key={r.type} style={ms.statsPanelBarRow}>
                        <AppText style={ms.statsPanelBarLabel} numberOfLines={1}>{r.type}</AppText>
                        <View style={ms.statsPanelBarTrack}>
                          <View style={[ms.statsPanelBarFill, { width: `${Math.min(100, (r.value / r.total) * 100)}%`, backgroundColor: accent }]} />
                        </View>
                        <AppText style={[ms.statsPanelBarCount, { color: accent }]}>{r.value}</AppText>
                      </View>
                    ))}
                  </View>
                ) : (
                  <AppText style={ms.statsPanelEmpty}>No data for selected period.</AppText>
                )}
              </View>
            );
          })()}
        </View>

        {/* Date filter card */}
        <View style={ms.filterCard}>
          {/* Header */}
          <View style={ms.filterCardHead}>
            <View style={ms.filterCardIcon}>
              <CalendarDays size={16} color="#34d399" />
            </View>
            <View style={{ flex: 1 }}>
              <AppText style={ms.filterCardTitle}>Filter by Date Range</AppText>
              <AppText style={ms.filterCardSub}>Select dates to see availability</AppText>
            </View>
            <Pressable
              onPress={loadSummary}
              style={({ pressed }) => [ms.updateBtn, pressed && { opacity: 0.75 }]}
            >
              <RefreshCw size={13} color="#34d399" />
              <AppText style={ms.updateBtnText}>Update</AppText>
            </Pressable>
          </View>

          {/* Date pickers */}
          <View style={ms.dateInputRow}>
            {([
              { key: "from" as const, label: "FROM", value: filterStart },
              { key: "to"   as const, label: "TO",   value: filterEnd   },
            ]).map(({ key, label, value }) => (
              <View key={key} style={{ flex: 1, gap: spacing[1] }}>
                <AppText style={ms.dateInputLabel}>{label}</AppText>
                <Pressable
                  onPress={() => setFilterPickerTarget(key)}
                  style={({ pressed }) => [ms.dateInputWrap, pressed && { opacity: 0.75 }]}
                >
                  <CalendarDays size={14} color="#34d399" />
                  <AppText style={[ms.dateInput, !value && { color: "rgba(255,255,255,0.3)" }]} numberOfLines={1}>
                    {value
                      ? (() => { try { return new Date(value + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch { return value; } })()
                      : label === "FROM" ? "Start date" : "End date"}
                  </AppText>
                </Pressable>
              </View>
            ))}
          </View>

          {/* Stats — 4-column balanced bar */}
          {summaryLoading ? (
            <View style={ms.filterLoadingRow}>
              <ActivityIndicator color="#34d399" size="small" />
              <AppText style={ms.filterLoadingText}>Calculating…</AppText>
            </View>
          ) : summary ? (
            <>
              <View style={ms.filterStatBar}>
                {[
                  { label: "Total",     value: summary.totalRooms,          color: "rgba(255,255,255,0.8)", bg: "rgba(255,255,255,0.06)" },
                  { label: "Booked",    value: summary.totalBookedRooms,    color: "#34d399",               bg: "rgba(52,211,153,0.1)"   },
                  { label: "Blocked",   value: summary.totalBlockedRooms,   color: "#fbbf24",               bg: "rgba(251,191,36,0.1)"   },
                  { label: "Available", value: summary.totalAvailableRooms, color: "#38bdf8",               bg: "rgba(56,189,248,0.1)"   },
                ].map((s, i, arr) => (
                  <View key={s.label} style={[ms.filterStatCell, { backgroundColor: s.bg }, i < arr.length - 1 && ms.filterStatCellBorder]}>
                    <AppText style={[ms.filterStatNum, { color: s.color }]}>{s.value ?? "—"}</AppText>
                    <AppText style={ms.filterStatLabel}>{s.label}</AppText>
                  </View>
                ))}
              </View>
              {/* Availability bar */}
              {summary.totalRooms > 0 && (
                <View style={ms.filterAvailRow}>
                  <View style={ms.filterAvailTrack}>
                    <View style={[ms.filterAvailFillBooked,   { flex: summary.totalBookedRooms }]} />
                    <View style={[ms.filterAvailFillBlocked,  { flex: summary.totalBlockedRooms }]} />
                    <View style={[ms.filterAvailFillAvail,    { flex: summary.totalAvailableRooms }]} />
                  </View>
                  <AppText style={ms.filterAvailPct}>{summary.overallAvailabilityPercentage ?? 0}% avail.</AppText>
                </View>
              )}
            </>
          ) : null}
        </View>

        {/* byRoomType breakdown */}
        {Object.keys(byRoomType).length > 0 ? (
          <>
            <AppText variant="bodySmall" weight="bold" style={ms.sectionTitle}>Room type breakdown</AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={176}
              snapToAlignment="start"
              contentContainerStyle={{ gap: spacing[3], paddingRight: spacing[6] }}
            >
              {Object.entries(byRoomType).map(([roomType, data]: [string, any]) => (
                <View key={roomType} style={ms.roomTypeTile}>
                  <View style={ms.roomTypeTileHead}>
                    <AppText variant="bodySmall" weight="bold" style={ms.roomTypeName}>{roomType}</AppText>
                    <AppText variant="caption" style={ms.roomTypePct}>{data.availabilityPercentage ?? "—"}%</AppText>
                  </View>
                  {[
                    { label: "Total",     value: data.totalRooms,     color: "rgba(255,255,255,0.8)" },
                    { label: "Booked",    value: data.bookedRooms,    color: "#fbbf24" },
                    { label: "Blocked",   value: data.blockedRooms,   color: "#f87171" },
                    { label: "Available", value: data.availableRooms, color: "#34d399" },
                  ].map((row) => (
                    <View key={row.label} style={ms.roomTypeRow}>
                      <AppText variant="caption" style={ms.roomTypeRowLabel}>{row.label}:</AppText>
                      <AppText variant="caption" weight="bold" style={[ms.roomTypeRowValue, { color: row.color }]}>{row.value ?? "—"}</AppText>
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}

        {/* Rooms & Types filter */}
        {(() => {
          const roomTypes = Array.isArray(property.roomsSpec) ? property.roomsSpec : [];
          const PALETTE = ["#064e3b","#78350f","#0c4a6e","#3b0764","#7c2d12","#134e4a"];
          const DOTS    = ["#34d399","#fbbf24","#38bdf8","#a78bfa","#fb923c","#22d3ee"];
          if (!roomTypes.length) return null;
          return (
            <>
              <View style={ms.sectionHead}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
                  <BedDouble size={15} color="rgba(255,255,255,0.6)" />
                  <AppText variant="bodySmall" weight="bold" style={ms.sectionTitle}>Rooms & Types</AppText>
                </View>
                <AppText variant="caption" style={ms.sectionCount}>Filter the calendar</AppText>
              </View>

              {/* All rooms — full width */}
              <Pressable
                onPress={() => setSelectedRoomType(null)}
                style={({ pressed }) => [ms.rfAllCard, { backgroundColor: !selectedRoomType ? "#065f46" : "#022c22", borderColor: !selectedRoomType ? "rgba(52,211,153,0.5)" : "rgba(52,211,153,0.12)" }, pressed && { opacity: 0.8 }]}
              >
                <View style={ms.rfRow}>
                  <View style={[ms.roomFilterDot, { backgroundColor: "#34d399" }]} />
                  <AppText variant="bodySmall" weight="bold" style={ms.roomFilterName}>All rooms</AppText>
                  <AppText variant="caption" style={[ms.roomFilterSub, { flex: 1 }]} numberOfLines={1}>All sources</AppText>
                </View>
                <View style={ms.rfAllRight}>
                  <AppText variant="caption" style={{ color: "rgba(52,211,153,0.5)", fontSize: 10 }}>types</AppText>
                  <AppText style={{ color: "#34d399", fontSize: 22, fontWeight: "700" }}>{roomTypes.length}</AppText>
                </View>
              </Pressable>

              {/* Room types — 2 columns */}
              <View style={ms.roomFilterGrid}>
                {roomTypes.map((rt: any, i: number) => {
                  const key    = rt.roomType || rt.name || "Room";
                  const active = selectedRoomType === key;
                  const bg     = PALETTE[i % PALETTE.length];
                  const dot    = DOTS[i % DOTS.length];
                  const count  = Number(rt.roomsCount || rt.count || 0);
                  const code   = rt.roomCode || "Type name";
                  return (
                    <Pressable
                      key={key}
                      onPress={() => setSelectedRoomType(active ? null : key)}
                      style={({ pressed }) => [ms.rfTypeCard, { backgroundColor: bg, borderColor: active ? `${dot}70` : `${dot}18` }, pressed && { opacity: 0.8 }]}
                    >
                      <View style={ms.rfRow}>
                        <View style={[ms.roomFilterDot, { backgroundColor: dot }]} />
                        <AppText variant="bodySmall" weight="bold" style={[ms.roomFilterName, { fontSize: 13 }]} numberOfLines={1}>{key}</AppText>
                      </View>
                      <AppText variant="caption" style={[ms.roomFilterSub, { fontSize: 10 }]} numberOfLines={1}>{code}</AppText>
                      <View style={ms.rfTypeBottom}>
                        <AppText style={{ color: `${dot}99`, fontSize: 9, fontWeight: "700", letterSpacing: 0.5 }}>rooms</AppText>
                        <AppText style={{ color: dot, fontSize: 20, fontWeight: "700", lineHeight: 24 }}>{count}</AppText>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </>
          );
        })()}

        {/* Month calendar — Window */}
        <View style={ms.windowHeader}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
            <Layers size={14} color="rgba(255,255,255,0.5)" />
            <AppText variant="caption" weight="bold" style={ms.sectionTitle}>Window</AppText>
          </View>
          <Pressable onPress={() => { void loadCalendar(); }} style={ms.refreshSmallBtn}>
            <RefreshCw size={13} color="rgba(255,255,255,0.6)" />
            <AppText variant="caption" style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>Refresh</AppText>
          </Pressable>
        </View>

        <View style={ms.calCard}>
          <View style={ms.calHeader}>
            <Pressable onPress={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth()-1, 1))} style={ms.calNavBtn}>
              <ArrowLeft size={16} color="rgba(255,255,255,0.6)" />
            </Pressable>
            <AppText variant="bodySmall" weight="bold" style={ms.calMonthLabel}>
              {MONTHS[calMonth.getMonth()]} {calMonth.getFullYear()}
            </AppText>
            <Pressable onPress={() => setCalMonth(new Date(calMonth.getFullYear(), calMonth.getMonth()+1, 1))} style={ms.calNavBtn}>
              <View style={{ transform: [{ rotate: "180deg" }] }}>
                <ArrowLeft size={16} color="rgba(255,255,255,0.6)" />
              </View>
            </Pressable>
          </View>
          <View style={ms.calDayLabels}>
            {DAY_LABELS.map(d => <AppText key={d} variant="caption" style={ms.calDayLabel}>{d}</AppText>)}
          </View>
          {calLoading ? (
            <ActivityIndicator color="#34d399" style={{ paddingVertical: spacing[6] }} />
          ) : (
            <View style={ms.calGrid}>
              {monthDays.map((day, idx) => {
                if (!day) return <View key={`e-${idx}`} style={ms.calCell} />;
                const { ymd, bookings, blocks } = getDayInfo(day);
                const hasBooking = bookings.length > 0;
                const hasBlock = blocks.length > 0;
                const isToday = ymd === toYMD(now);
                return (
                  <Pressable
                    key={ymd}
                    onPress={() => setSelectedDay({ date: ymd, bookings, blocks })}
                    style={[ms.calCell, hasBlock && ms.calCellBlocked, hasBooking && ms.calCellBooked, isToday && ms.calCellToday]}
                  >
                    <AppText variant="caption" weight={isToday ? "bold" : "semiBold"} style={[
                      ms.calCellText,
                      hasBlock && ms.calCellTextBlocked,
                      hasBooking && ms.calCellTextBooked,
                      isToday && ms.calCellTextToday
                    ]}>{day}</AppText>
                    {hasBooking && hasBlock ? <View style={ms.calDotRow}><View style={[ms.calDot, { backgroundColor: "#34d399" }]} /><View style={[ms.calDot, { backgroundColor: "#fbbf24" }]} /></View>
                    : hasBooking ? <View style={ms.calDotRow}><View style={[ms.calDot, { backgroundColor: "#34d399" }]} /></View>
                    : hasBlock   ? <View style={ms.calDotRow}><View style={[ms.calDot, { backgroundColor: "#fbbf24" }]} /></View>
                    : null}
                  </Pressable>
                );
              })}
            </View>
          )}
          <View style={ms.calLegend}>
            <View style={ms.calLegendItem}><View style={[ms.calDot, { backgroundColor: "#34d399" }]} /><AppText variant="caption" style={ms.calLegendText}>Booked</AppText></View>
            <View style={ms.calLegendItem}><View style={[ms.calDot, { backgroundColor: "#fbbf24" }]} /><AppText variant="caption" style={ms.calLegendText}>Blocked</AppText></View>
          </View>
        </View>

        {/* Blocks list */}
        <View style={ms.sectionHead}>
          <AppText variant="bodySmall" weight="bold" style={ms.sectionTitle}>Active blocks</AppText>
          <AppText variant="caption" style={ms.sectionCount}>{totalBlocks} total</AppText>
        </View>

        {(calData?.blocks ?? []).length === 0 ? (
          <View style={ms.emptyState}>
            <CalendarOff size={28} color="rgba(255,255,255,0.2)" />
            <AppText variant="bodySmall" style={ms.emptyText}>No blocks. Tap + Add block to block dates.</AppText>
          </View>
        ) : (
          <View style={ms.blockList}>
            {(calData?.blocks ?? []).map((block) => (
              <View key={block.id} style={ms.blockCard}>
                <View style={ms.blockIconWrap}><CalendarOff size={14} color="#fbbf24" /></View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText variant="bodySmall" weight="bold" style={ms.blockDates}>
                    {fmtShort(block.startDate)} → {fmtShort(block.endDate)}
                  </AppText>
                  {block.notes ? <AppText variant="caption" style={ms.blockNotes} numberOfLines={1}>{block.notes}</AppText> : null}
                  {block.source ? <AppText variant="caption" style={ms.blockSource}>{block.source}</AppText> : null}
                </View>
                <Pressable onPress={() => deleteBlock(block)} style={ms.deleteBtn} accessibilityRole="button">
                  <Trash2 size={14} color="#f87171" />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Filter date pickers */}
      <DatePickerSheet
        visible={filterPickerTarget === "from"}
        value={filterStart}
        title="Select from date"
        onConfirm={(ymd) => { setFilterStart(ymd); if (!filterEnd || filterEnd <= ymd) setFilterEnd(ymd); }}
        onClose={() => setFilterPickerTarget(null)}
      />
      <DatePickerSheet
        visible={filterPickerTarget === "to"}
        value={filterEnd}
        minDate={filterStart || undefined}
        title="Select to date"
        onConfirm={(ymd) => { setFilterEnd(ymd); void loadSummary(); }}
        onClose={() => setFilterPickerTarget(null)}
      />

      {/* Day detail modal — exact web copy */}
      <Modal visible={!!selectedDay} transparent animationType="slide" onRequestClose={() => setSelectedDay(null)}>
        <View style={ms.sheetOverlay}>
          <Pressable style={ms.sheetBackdrop} onPress={() => setSelectedDay(null)} />
          {selectedDay ? (
            <View style={ms.daySheet}>

              {/* ── Header ── */}
              <View style={ms.dayHeader}>
                <View style={ms.dayHeaderIcon}>
                  <CalendarDays size={22} color="#ffffff" />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <AppText style={ms.dayHeaderDate}>
                    {(() => { try { return new Date(selectedDay.date + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }); } catch { return selectedDay.date; } })()}
                  </AppText>
                  <AppText style={ms.dayHeaderSub} numberOfLines={1}>
                    {selectedRoomType ?? "All rooms"} · Review bookings before adding a block
                  </AppText>
                </View>
                <Pressable onPress={() => setSelectedDay(null)} style={ms.dayHeaderX}>
                  <X size={16} color="#374151" />
                </Pressable>
              </View>

              {/* ── Status row ── */}
              <View style={ms.dayStatusRow}>
                <View style={[ms.dayStatusDot, { backgroundColor: selectedDay.blocks.length > 0 ? "#f59e0b" : "#3b82f6" }]} />
                <AppText style={ms.dayStatusLabel}>
                  {selectedDay.blocks.length > 0
                    ? `${selectedDay.blocks.length} BLOCK${selectedDay.blocks.length > 1 ? "S" : ""}`
                    : "NO BLOCKS"}
                </AppText>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} bounces={false} style={{ flexShrink: 1 }}>
                {(() => {
                  const nb = selectedDay.bookings.length;
                  const ne = selectedDay.blocks.length;
                  const total = nb + ne;
                  const pctB = total > 0 ? Math.round((nb / total) * 100) : 0;
                  const pctE = total > 0 ? Math.round((ne / total) * 100) : 0;

                  return (
                    <>
                      {/* ── 3 stat cards ── */}
                      <View style={ms.dayStatRow}>
                        {[
                          { label: "NOLSAF BOOKINGS", value: nb, pct: pctB, color: "#10b981", bg: "#f0fdf4", border: "#bbf7d0" },
                          { label: "EXTERNAL BLOCKS",  value: ne, pct: pctE, color: "#f59e0b", bg: "#fffbeb", border: "#fde68a" },
                          { label: "TOTAL ITEMS",       value: total, pct: null, color: "#6366f1", bg: "#f5f3ff", border: "#ddd6fe" },
                        ].map((s, i) => (
                          <View key={i} style={[ms.dayStatCard, { borderColor: s.border, backgroundColor: s.bg }]}>
                            <AppText style={[ms.dayStatCardLabel, { color: s.color }]}>{s.label}</AppText>
                            <View style={ms.dayStatCardBottom}>
                              <AppText style={[ms.dayStatCardNum, { color: "#111827" }]}>{s.value}</AppText>
                              {s.pct !== null && (
                                <AppText style={[ms.dayStatCardPct, { color: s.color }]}>({s.pct}%)</AppText>
                              )}
                            </View>
                            <View style={[ms.dayStatCardBar, { backgroundColor: `${s.color}20` }]}>
                              <View style={[ms.dayStatCardFill, { backgroundColor: s.color, width: s.pct !== null ? `${s.pct}%` : "100%" }]} />
                            </View>
                          </View>
                        ))}
                      </View>

                      {/* ── Day graph ── */}
                      <View style={ms.dayGraphSection}>
                        <View style={ms.dayGraphHead}>
                          <AppText style={ms.dayGraphTitle}>Day graph</AppText>
                          <AppText style={ms.dayGraphSub}>Stacked breakdown</AppText>
                        </View>
                        {/* Bookings bar */}
                        <View style={ms.dayGraphRow}>
                          <AppText style={ms.dayGraphRowLabel}>BOOKINGS</AppText>
                          <AppText style={ms.dayGraphRowCount}>{nb}</AppText>
                        </View>
                        <View style={ms.dayGraphBarTrack}>
                          <View style={[ms.dayGraphBarFill, { flex: nb, backgroundColor: "#10b981" }]} />
                          <View style={[ms.dayGraphBarFill, { flex: Math.max(total - nb, 0) || 1, backgroundColor: "#e5e7eb" }]} />
                        </View>
                        {nb === 0 && (
                          <View style={ms.dayGraphEmptyRow}>
                            <View style={[ms.dayCellDot, { backgroundColor: "#3b82f6" }]} />
                            <AppText style={ms.dayGraphEmptyLabel}>NO BOOKINGS</AppText>
                          </View>
                        )}
                        {/* Blocks bar */}
                        <View style={[ms.dayGraphRow, { marginTop: 12 }]}>
                          <AppText style={ms.dayGraphRowLabel}>EXTERNAL BLOCKS</AppText>
                          <AppText style={ms.dayGraphRowCount}>{ne}</AppText>
                        </View>
                        <View style={ms.dayGraphBarTrack}>
                          <View style={[ms.dayGraphBarFill, { flex: ne, backgroundColor: "#f59e0b" }]} />
                          <View style={[ms.dayGraphBarFill, { flex: Math.max(total - ne, 0) || 1, backgroundColor: "#e5e7eb" }]} />
                        </View>
                        {ne === 0 && (
                          <View style={ms.dayGraphEmptyRow}>
                            <View style={[ms.dayCellDot, { backgroundColor: "#3b82f6" }]} />
                            <AppText style={ms.dayGraphEmptyLabel}>NO BLOCKS</AppText>
                          </View>
                        )}
                      </View>

                      {/* ── Row 1: by status / by source ── */}
                      <View style={[ms.dayRow, ms.dayRowBorderTop]}>
                        <View style={ms.dayCell}>
                          <AppText style={ms.dayCellLabel}>BOOKINGS BY STATUS</AppText>
                          {nb === 0
                            ? <AppText style={ms.dayCellEmpty}>No bookings for this date.</AppText>
                            : Object.entries(selectedDay.bookings.reduce((acc: Record<string, number>, b) => { acc[b.status] = (acc[b.status] || 0) + 1; return acc; }, {}))
                                .map(([s, n]) => (
                                  <View key={s} style={ms.dayCellStatRow}>
                                    <AppText style={ms.dayCellStatKey}>{s}</AppText>
                                    <AppText style={ms.dayCellStatVal}>{n}</AppText>
                                  </View>
                                ))}
                        </View>
                        <View style={[ms.dayCell, ms.dayCellBorderLeft]}>
                          <AppText style={ms.dayCellLabel}>EXTERNAL BLOCKS BY SOURCE</AppText>
                          {ne === 0
                            ? <AppText style={ms.dayCellEmpty}>No external blocks for this date.</AppText>
                            : Object.entries(selectedDay.blocks.reduce((acc: Record<string, number>, b) => { const src = b.source ?? "MANUAL"; acc[src] = (acc[src] || 0) + 1; return acc; }, {}))
                                .map(([s, n]) => (
                                  <View key={s} style={ms.dayCellStatRow}>
                                    <AppText style={ms.dayCellStatKey}>{s}</AppText>
                                    <AppText style={ms.dayCellStatVal}>{n}</AppText>
                                  </View>
                                ))}
                        </View>
                      </View>

                      {/* ── Row 2: item lists ── */}
                      <View style={[ms.dayRow, ms.dayRowBorderTop]}>
                        <View style={ms.dayCell}>
                          <View style={ms.dayCellCountHead}>
                            <AppText style={ms.dayCellLabel}>NOLSAF BOOKINGS</AppText>
                            <AppText style={ms.dayCellCountNum}>{nb}</AppText>
                          </View>
                          {nb === 0
                            ? <AppText style={ms.dayCellEmpty}>No bookings on this date.</AppText>
                            : selectedDay.bookings.map(b => (
                                <View key={b.id} style={ms.dayCellItem}>
                                  <View style={[ms.dayCellDot, { backgroundColor: "#10b981" }]} />
                                  <AppText style={ms.dayCellItemText} numberOfLines={1}>{b.guestName} · {b.status}</AppText>
                                </View>
                              ))}
                        </View>
                        <View style={[ms.dayCell, ms.dayCellBorderLeft]}>
                          <View style={ms.dayCellCountHead}>
                            <AppText style={ms.dayCellLabel}>EXTERNAL BLOCKS</AppText>
                            <AppText style={ms.dayCellCountNum}>{ne}</AppText>
                          </View>
                          {ne === 0
                            ? <AppText style={ms.dayCellEmpty}>No external blocks on this date.</AppText>
                            : selectedDay.blocks.map(b => (
                                <View key={b.id} style={ms.dayCellItem}>
                                  <View style={[ms.dayCellDot, { backgroundColor: "#f59e0b" }]} />
                                  <AppText style={ms.dayCellItemText} numberOfLines={1}>{fmtShort(b.startDate)} · {b.source ?? "MANUAL"}</AppText>
                                </View>
                              ))}
                        </View>
                      </View>
                    </>
                  );
                })()}
              </ScrollView>

              {/* ── Footer ── */}
              <View style={ms.dayFooter}>
                <Pressable
                  onPress={() => { if (selectedDay) { setBlockStart(selectedDay.date); setBlockEnd(selectedDay.date); } setSelectedDay(null); setAddOpen(true); setError(null); }}
                  style={({ pressed }) => [ms.dayAddBtn, pressed && { opacity: 0.82 }]}
                >
                  <Plus size={16} color="#ffffff" />
                  <AppText style={ms.dayAddBtnText}>Add external block</AppText>
                </Pressable>
                <Pressable onPress={() => setSelectedDay(null)} style={({ pressed }) => [ms.dayCloseBtn, pressed && { opacity: 0.75 }]}>
                  <AppText style={ms.dayCloseBtnText}>Close</AppText>
                </Pressable>
              </View>

            </View>
          ) : null}
        </View>
      </Modal>

      {/* Add block sheet */}
      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => { setAddOpen(false); resetBlockForm(); }}>
        <View style={ms.sheetOverlay}>
          <Pressable style={ms.sheetBackdrop} onPress={() => { setAddOpen(false); resetBlockForm(); }} />
          <ScrollView
            style={ms.addSheet}
            contentContainerStyle={ms.addSheetContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Handle + header */}
            <View style={ms.addSheetHandle} />
            <View style={ms.addSheetHead}>
              <View>
                <AppText style={ms.addSheetTitle}>Block dates</AppText>
                <AppText style={ms.addSheetSub}>Prevent bookings for a date range</AppText>
              </View>
              <Pressable onPress={() => { setAddOpen(false); resetBlockForm(); }} style={ms.addSheetX}>
                <X size={15} color="rgba(255,255,255,0.7)" />
              </Pressable>
            </View>

            {/* ── ROOM & SOURCE ── */}
            <View style={ms.addSection}>
              <View style={ms.addSectionHeader}>
                <View style={ms.addSectionIcon}><Home size={14} color="#34d399" /></View>
                <AppText style={ms.addSectionTitle}>ROOM & SOURCE</AppText>
              </View>
              <View style={ms.addFieldRow}>
                {/* Room Type dropdown */}
                {(() => {
                  const roomTypes = Array.isArray(property.roomsSpec) ? property.roomsSpec : [];
                  const selected = roomTypes.find((rt: any) => (rt.roomCode || rt.roomType || rt.name) === blockRoomCode);
                  const label = selected ? (selected.roomType || selected.name || "Room") : null;
                  return (
                    <View style={{ flex: 1 }}>
                      <View style={ms.addDropLabel}>
                        <AppText style={ms.addLabel}>Room Type</AppText>
                        <AppText style={ms.addRequired}> *</AppText>
                      </View>
                      <Pressable onPress={() => setRoomPickerOpen(true)} style={({ pressed }) => [ms.addDropBtn, pressed && { opacity: 0.8 }]}>
                        <AppText style={label ? ms.addDropValue : ms.addDropPlaceholder} numberOfLines={1}>
                          {label ?? "Select Room Type"}
                        </AppText>
                        <View style={{ transform: [{ rotate: "90deg" }] }}>
                          <ArrowLeft size={16} color="rgba(255,255,255,0.4)" />
                        </View>
                      </Pressable>
                    </View>
                  );
                })()}
                {/* Source dropdown */}
                {(() => {
                  const SOURCE_LABELS: Record<string, string> = { MANUAL: "Manual", AIRBNB: "Airbnb", BOOKING_COM: "Booking.com", VRBO: "Vrbo", EXPEDIA: "Expedia", OTHER: "Other" };
                  return (
                    <View style={{ flex: 1 }}>
                      <View style={ms.addDropLabel}>
                        <AppText style={ms.addLabel}>Source</AppText>
                        <AppText style={ms.addRequired}> *</AppText>
                      </View>
                      <Pressable onPress={() => setSourcePickerOpen(true)} style={({ pressed }) => [ms.addDropBtn, pressed && { opacity: 0.8 }]}>
                        <AppText style={blockSource ? ms.addDropValue : ms.addDropPlaceholder} numberOfLines={1}>
                          {blockSource ? (SOURCE_LABELS[blockSource] ?? blockSource) : "Select source"}
                        </AppText>
                        <View style={{ transform: [{ rotate: "90deg" }] }}>
                          <ArrowLeft size={16} color="rgba(255,255,255,0.4)" />
                        </View>
                      </Pressable>
                    </View>
                  );
                })()}
              </View>
            </View>

            {/* ── DATE RANGE ── */}
            <View style={ms.addSection}>
              <View style={ms.addSectionHeader}>
                <View style={ms.addSectionIcon}><CalendarDays size={14} color="#34d399" /></View>
                <AppText style={ms.addSectionTitle}>DATE RANGE</AppText>
              </View>
              <View style={ms.addFieldRow}>
                {(["start", "end"] as const).map((which) => {
                  const val = which === "start" ? blockStart : blockEnd;
                  const label = which === "start" ? "Start Date" : "End Date";
                  const placeholder = which === "start" ? "Select start date" : "Select end date";
                  return (
                    <View key={which} style={{ flex: 1 }}>
                      <View style={ms.addDropLabel}>
                        <AppText style={ms.addLabel}>{label}</AppText>
                        <AppText style={ms.addRequired}> *</AppText>
                      </View>
                      <Pressable onPress={() => setPickerTarget(which)} style={({ pressed }) => [ms.addDropBtn, pressed && { opacity: 0.75 }]}>
                        <AppText style={val ? ms.addDropValue : ms.addDropPlaceholder} numberOfLines={1}>
                          {val ? (() => { try { return new Date(val + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch { return val; } })() : placeholder}
                        </AppText>
                        <CalendarDays size={15} color="#34d399" />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* ── QUANTITY ── */}
            <View style={ms.addSection}>
              <View style={ms.addSectionHeader}>
                <View style={ms.addSectionIcon}><BedDouble size={14} color="#34d399" /></View>
                <AppText style={ms.addSectionTitle}>QUANTITY</AppText>
              </View>
              <View style={ms.addDropLabel}>
                <AppText style={ms.addLabel}>Beds/Rooms Blocked</AppText>
                <AppText style={ms.addRequired}> *</AppText>
              </View>
              <View style={ms.addQtyRow}>
                <Pressable onPress={() => setBlockQuantity(q => Math.max(1, q - 1))} style={ms.addQtyBtn}>
                  <AppText style={ms.addQtyBtnText}>−</AppText>
                </Pressable>
                <View style={ms.addQtyDisplay}>
                  <AppText style={ms.addQtyValue}>{blockQuantity}</AppText>
                </View>
                <Pressable onPress={() => setBlockQuantity(q => q + 1)} style={ms.addQtyBtn}>
                  <AppText style={ms.addQtyBtnText}>+</AppText>
                </Pressable>
              </View>
            </View>


            {error ? (
              <View style={ms.addError}>
                <AppText style={ms.addErrorText}>{error}</AppText>
              </View>
            ) : null}

            <Pressable onPress={addBlock} style={({ pressed }) => [ms.addSubmitBtn, pressed && { opacity: 0.82 }]}>
              {conflictChecking || saving
                ? <ActivityIndicator color="#ffffff" size="small" />
                : <AppText style={ms.addSubmitText}>Review & block</AppText>}
            </Pressable>
          </ScrollView>
        </View>
      </Modal>

      {/* Confirmation modal */}
      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
        <View style={ms.confirmOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setConfirmOpen(false)} />
          <View style={ms.confirmSheet}>
            {/* Header */}
            <View style={ms.confirmHead}>
              <View style={ms.confirmHeadIcon}>
                <Sparkles size={20} color="#ffffff" />
              </View>
              <View style={{ flex: 1 }}>
                <AppText style={ms.confirmTitle}>Confirm creation</AppText>
                <AppText style={ms.confirmSub}>Please confirm you want to create this availability block.</AppText>
              </View>
              <Pressable onPress={() => setConfirmOpen(false)} style={ms.confirmX}>
                <X size={15} color="#374151" />
              </Pressable>
            </View>

            {/* Room Type + Source */}
            {blockRoomCode || blockSource ? (
              <View style={ms.confirmGrid}>
                {blockRoomCode ? (
                  <View style={ms.confirmCell}>
                    <AppText style={ms.confirmCellLabel}>ROOM TYPE</AppText>
                    <AppText style={ms.confirmCellValue}>{blockRoomCode}</AppText>
                  </View>
                ) : null}
                {blockSource ? (
                  <View style={[ms.confirmCell, blockRoomCode ? ms.confirmCellBorderLeft : null]}>
                    <AppText style={ms.confirmCellLabel}>SOURCE</AppText>
                    <AppText style={ms.confirmCellValue}>{blockSource}</AppText>
                  </View>
                ) : null}
              </View>
            ) : null}

            {/* Check-in + Check-out */}
            <View style={ms.confirmGrid}>
              <View style={ms.confirmCell}>
                <AppText style={ms.confirmCellLabel}>CHECK-IN</AppText>
                <AppText style={ms.confirmCellValue}>
                  {blockStart ? (() => { try { return new Date(blockStart + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch { return blockStart; } })() : "—"}
                </AppText>
              </View>
              <View style={[ms.confirmCell, ms.confirmCellBorderLeft]}>
                <AppText style={ms.confirmCellLabel}>CHECK-OUT</AppText>
                <AppText style={ms.confirmCellValue}>
                  {blockEnd ? (() => { try { return new Date(blockEnd + "T12:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch { return blockEnd; } })() : "—"}
                </AppText>
              </View>
            </View>

            {/* Quantity card */}
            <View style={ms.confirmQtyCard}>
              <View style={{ flex: 1 }}>
                <AppText style={ms.confirmQtyLabel}>BEDS/ROOMS BLOCKED</AppText>
                <AppText style={ms.confirmQtyValue}>{blockQuantity}</AppText>
              </View>
              <AppText style={ms.confirmQtyNote}>This affects availability{"\n"}on your public calendar.</AppText>
            </View>

            {/* Block overlap warning */}
            {conflictData && conflictData.conflictingBlocks.length > 0 ? (
              <View style={ms.confirmWarnCard}>
                <AppText style={ms.confirmWarnTitle}>
                  Overlapping block{conflictData.conflictingBlocks.length > 1 ? "s" : ""} detected
                </AppText>
                {conflictData.conflictingBlocks.map((b: any) => (
                  <View key={b.id} style={ms.confirmWarnRow}>
                    <View style={ms.confirmWarnDot} />
                    <AppText style={ms.confirmWarnText}>
                      {fmtShort(b.startDate)} to {fmtShort(b.endDate)}
                      {b.source ? ` · ${b.source}` : ""}
                      {b.bedsBlocked ? ` · ${b.bedsBlocked} bed${b.bedsBlocked > 1 ? "s" : ""}` : ""}
                    </AppText>
                  </View>
                ))}
                <AppText style={ms.confirmWarnNote}>Proceeding will create a duplicate block. You can still continue.</AppText>
              </View>
            ) : null}

            {/* ToS */}
            <View style={ms.confirmTosRow}>
              <View style={{ flex: 1 }}>
                <AppText style={ms.confirmTosText}>
                  I agree to the <AppText style={ms.confirmTosLink}>Terms of Service</AppText>.
                </AppText>
                <AppText style={ms.confirmTosSub}>Required before you can create this block.</AppText>
              </View>
              <Pressable
                onPress={() => setTosAgreed(v => !v)}
                style={[ms.confirmToggle, tosAgreed && ms.confirmToggleOn]}
              >
                <View style={[ms.confirmToggleThumb, tosAgreed && ms.confirmToggleThumbOn]} />
              </Pressable>
            </View>

            {error ? (
              <View style={ms.addError}>
                <AppText style={ms.addErrorText}>{error}</AppText>
              </View>
            ) : null}

            {/* Footer */}
            <View style={ms.confirmFooter}>
              <Pressable onPress={() => setConfirmOpen(false)} style={ms.confirmCancelBtn}>
                <AppText style={ms.confirmCancelText}>Cancel</AppText>
              </Pressable>
              <Pressable
                onPress={submitBlock}
                style={({ pressed }) => [ms.confirmSubmitBtn, !tosAgreed && ms.confirmSubmitDisabled, pressed && { opacity: 0.82 }]}
              >
                {saving
                  ? <ActivityIndicator color="#ffffff" size="small" />
                  : <AppText style={ms.confirmSubmitText}>Yes, create</AppText>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Room Type picker */}
      {(() => {
        const roomTypes = Array.isArray(property.roomsSpec) ? property.roomsSpec : [];
        const DOTS = ["#34d399","#fbbf24","#38bdf8","#a78bfa","#fb923c","#22d3ee"];
        return (
          <Modal visible={roomPickerOpen} transparent animationType="slide" onRequestClose={() => setRoomPickerOpen(false)}>
            <View style={{ flex: 1, justifyContent: "flex-end" }}>
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setRoomPickerOpen(false)} />
              <View style={ms.miniSheet}>
                <View style={ms.miniSheetHandle} />
                <AppText style={ms.miniSheetTitle}>Select Room Type</AppText>
                {roomTypes.map((rt: any, i: number) => {
                  const key  = rt.roomType || rt.name || "Room";
                  const code = rt.roomCode || key;
                  const count = Number(rt.roomsCount || rt.count || 0);
                  const dot  = DOTS[i % DOTS.length];
                  const active = blockRoomCode === code;
                  return (
                    <Pressable key={key} onPress={() => { setBlockRoomCode(code); setRoomPickerOpen(false); }} style={[ms.miniSheetRow, active && { backgroundColor: `${dot}12` }]}>
                      <View style={[ms.miniSheetDot, { backgroundColor: dot }]} />
                      <AppText style={[ms.miniSheetRowText, active && { color: dot, fontWeight: "700" }]}>{key}</AppText>
                      <AppText style={[ms.miniSheetRowSub, active && { color: dot }]}>{count} rooms</AppText>
                      {active && <View style={[ms.miniSheetCheck, { backgroundColor: dot }]} />}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Modal>
        );
      })()}

      {/* Source picker */}
      {(() => {
        const SOURCES = [
          { key: "MANUAL",      label: "Manual",      sub: "Manually blocked",       color: "#34d399" },
          { key: "AIRBNB",      label: "Airbnb",      sub: "Synced from Airbnb",     color: "#ff5a5f" },
          { key: "BOOKING_COM", label: "Booking.com", sub: "Synced from Booking.com",color: "#003580" },
          { key: "VRBO",        label: "Vrbo",        sub: "Synced from Vrbo",       color: "#1a6de0" },
          { key: "EXPEDIA",     label: "Expedia",     sub: "Synced from Expedia",    color: "#ffd700" },
          { key: "OTHER",       label: "Other",       sub: "Other external source",  color: "#9ca3af" },
        ];
        return (
          <Modal visible={sourcePickerOpen} transparent animationType="slide" onRequestClose={() => setSourcePickerOpen(false)}>
            <View style={{ flex: 1, justifyContent: "flex-end" }}>
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setSourcePickerOpen(false)} />
              <View style={ms.miniSheet}>
                <View style={ms.miniSheetHandle} />
                <AppText style={ms.miniSheetTitle}>Select Source</AppText>
                {SOURCES.map(({ key, label, sub, color }) => {
                  const active = blockSource === key;
                  return (
                    <Pressable key={key} onPress={() => { setBlockSource(key); setSourcePickerOpen(false); }} style={[ms.miniSheetRow, active && { backgroundColor: `${color}12` }]}>
                      <View style={[ms.miniSheetDot, { backgroundColor: color }]} />
                      <View style={{ flex: 1 }}>
                        <AppText style={[ms.miniSheetRowText, active && { color, fontWeight: "700" }]}>{label}</AppText>
                        <AppText style={ms.miniSheetRowSub}>{sub}</AppText>
                      </View>
                      {active && <View style={[ms.miniSheetCheck, { backgroundColor: color }]} />}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </Modal>
        );
      })()}

      {/* Date pickers */}
      <DatePickerSheet
        visible={pickerTarget === "start"}
        value={blockStart}
        minDate={toYMD(now)}
        title="Select start date"
        onConfirm={(ymd) => {
          setBlockStart(ymd);
          // end must be strictly after start — clear end if it's same day or earlier
          if (!blockEnd || blockEnd <= ymd) setBlockEnd("");
        }}
        onClose={() => setPickerTarget(null)}
      />
      <DatePickerSheet
        visible={pickerTarget === "end"}
        value={blockEnd}
        minDate={blockStart ? (() => { const d = new Date(blockStart + "T00:00:00"); d.setDate(d.getDate() + 1); return toYMD(d); })() : toYMD(addDays(now, 1))}
        title="Select end date"
        onConfirm={(ymd) => setBlockEnd(ymd)}
        onClose={() => setPickerTarget(null)}
      />
    </View>
  );
}

const ms = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#020b18" },
  // Property card
  propCard: { borderRadius: radius.xl, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.05)", padding: spacing[4], gap: spacing[3] },
  propCardTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing[3] },
  propCardLabel: { color: "rgba(255,255,255,0.4)", fontSize: 10, letterSpacing: 1 },
  propCardTitle: { color: colors.white, fontSize: 16 },
  propCardHint: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 3 },
  liveBadge: { borderRadius: radius.lg, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.06)", padding: spacing[3], alignItems: "center", gap: spacing[1], flexShrink: 0 },
  liveBadgeLabel: { color: "rgba(255,255,255,0.4)", fontSize: 9 },
  liveBadgeStatus: { color: "#34d399", fontSize: 10 },
  // Stats expansion panel
  statsPanel: { borderRadius: radius.xl, borderWidth: 1, padding: spacing[4], gap: spacing[3] },
  statsPanelHead: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  statsPanelDot: { width: 8, height: 8, borderRadius: 4 },
  statsPanelTitle: { flex: 1, fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  statsPanelTotal: { fontSize: 20, fontWeight: "800" },
  statsPanelRow: { flexDirection: "row", gap: spacing[2] },
  statsPanelStat: { flex: 1, gap: 3, borderRadius: radius.lg, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", backgroundColor: "rgba(255,255,255,0.04)", padding: spacing[3] },
  statsPanelStatLabel: { fontSize: 9, fontWeight: "700", color: "rgba(255,255,255,0.35)", letterSpacing: 0.7, textTransform: "uppercase" },
  statsPanelStatValue: { fontSize: 18, fontWeight: "800" },
  statsPanelBars: { gap: spacing[2] },
  statsPanelBarRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  statsPanelBarLabel: { width: 64, fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: "500" },
  statsPanelBarTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  statsPanelBarFill: { height: 6, borderRadius: 3 },
  statsPanelBarCount: { width: 24, fontSize: 12, fontWeight: "700", textAlign: "right" },
  statsPanelEmpty: { fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center", paddingVertical: spacing[2] },
  bookingBlockRow: { flexDirection: "row", gap: spacing[3] },
  bookingTile: { flex: 1, borderRadius: radius.xl, borderWidth: 1, borderColor: "rgba(52,211,153,0.25)", backgroundColor: "#022c22", padding: spacing[3], gap: spacing[1] },
  bookingTileActive: { backgroundColor: "#064e3b", borderColor: "rgba(52,211,153,0.5)" },
  bookingTileLabel: { color: "#6ee7b7", fontSize: 11 },
  bookingTileCount: { color: colors.white, fontSize: 24 },
  bookingTileHint: { color: "rgba(52,211,153,0.45)", fontSize: 10 },
  blockTile: { flex: 1, borderRadius: radius.xl, borderWidth: 1, borderColor: "rgba(251,191,36,0.25)", backgroundColor: "#3a1a05", padding: spacing[3], gap: spacing[1] },
  blockTileActive: { backgroundColor: "#78350f", borderColor: "rgba(251,191,36,0.5)" },
  blockTileLabel: { color: "#fcd34d", fontSize: 11 },
  blockTileCount: { color: colors.white, fontSize: 24 },
  blockTileHint: { color: "rgba(251,191,36,0.45)", fontSize: 10 },
  // Room type tiles
  roomTypeTile: { width: 160, borderRadius: radius.xl, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.05)", padding: spacing[4], gap: spacing[2] },
  roomTypeTileHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  roomTypeName: { color: colors.white, fontSize: 13, flex: 1 },
  roomTypePct: { color: "rgba(255,255,255,0.4)", fontSize: 11 },
  roomTypeRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 2 },
  roomTypeRowLabel: { color: "rgba(255,255,255,0.5)", fontSize: 11 },
  roomTypeRowValue: { fontSize: 11 },
  // Room filter cards
  // All rooms — full-width horizontal card
  rfAllCard: {
    width: "100%",
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
  },
  rfAllRight: { alignItems: "flex-end", gap: 1, marginLeft: "auto" },
  // Room type — 2-column compact card
  roomFilterGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  rfTypeCard: {
    width: "48.5%",
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing[3],
    gap: spacing[1],
  },
  rfTypeBottom: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", marginTop: spacing[2] },
  // Keep old name so any remaining references compile
  roomFilterCard: {
    width: "47.5%",
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing[4],
    gap: spacing[1],
    minHeight: 110
  },
  roomFilterDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  rfRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  roomFilterName: { color: colors.white, fontSize: 14, flex: 1 },
  roomFilterSub: { color: "rgba(255,255,255,0.4)", fontSize: 11, marginLeft: 16 },
  rfCountRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: "auto",
    paddingTop: spacing[3]
  },
  rfCountLabel: { fontSize: 10, letterSpacing: 0.5, paddingBottom: 3 },
  rfCountNum: { fontSize: 32, fontWeight: "700", lineHeight: 36 },
  // Window header
  windowHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  refreshSmallBtn: { flexDirection: "row", alignItems: "center", gap: spacing[1], paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderRadius: radius.full, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.05)" },
  topBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing[4], paddingTop: spacing[4], paddingBottom: spacing[3],
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)"
  },
  backBtn: { flexDirection: "row", alignItems: "center", gap: spacing[2], paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radius.xl, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.06)" },
  backText: { color: "rgba(255,255,255,0.8)", fontSize: 13 },
  topActions: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  topBtn: { flexDirection: "row", alignItems: "center", gap: spacing[2], paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radius.xl, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.06)" },
  topBtnText: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing[2], paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radius.xl, backgroundColor: "#059669" },
  addBtnText: { color: colors.white, fontSize: 12 },
  scroll: { padding: spacing[4], gap: spacing[4], paddingBottom: spacing[8] },
  // Header card — replaces the old title block
  headerCard: { borderRadius: radius.xl, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)", overflow: "hidden" },
  headerCardTop: { flexDirection: "row", alignItems: "center", gap: spacing[3], paddingHorizontal: spacing[4], paddingTop: spacing[4], paddingBottom: spacing[3] },
  headerIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(52,211,153,0.12)", borderWidth: 1, borderColor: "rgba(52,211,153,0.22)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  headerEyebrow: { fontSize: 9, fontWeight: "700", color: "rgba(255,255,255,0.35)", letterSpacing: 1.5, textTransform: "uppercase" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#ffffff", letterSpacing: -0.2, marginTop: 1 },
  headerLivePill: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 50, borderWidth: 1, borderColor: "rgba(52,211,153,0.3)", backgroundColor: "rgba(52,211,153,0.1)", flexShrink: 0 },
  headerLiveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#34d399" },
  headerLiveText: { fontSize: 11, fontWeight: "700", color: "#6ee7b7" },
  headerPropRow: { flexDirection: "row", alignItems: "center", gap: spacing[2], paddingHorizontal: spacing[4], paddingBottom: spacing[3], borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  headerPropLabel: { fontSize: 10, fontWeight: "600", color: "rgba(255,255,255,0.3)", letterSpacing: 0.5 },
  headerPropName: { flex: 1, fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.7)" },
  headerStatsRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  headerStat: { flex: 1, alignItems: "center", gap: 2 },
  headerStatNum: { fontSize: 20, fontWeight: "800", color: "#34d399" },
  headerStatLabel: { fontSize: 10, fontWeight: "600", color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 0.5 },
  headerStatDiv: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.08)" },
  headerStatHint: { fontSize: 10, color: "rgba(255,255,255,0.3)", textAlign: "center", lineHeight: 14 },
  // Legacy (kept for any other references)
  titleBlock: { gap: spacing[2] },
  mainTitle: { color: colors.white, fontSize: 28 },
  propertyName: { color: "rgba(255,255,255,0.6)", fontSize: 15 },
  statusRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2], marginTop: spacing[1] },
  livePill: { flexDirection: "row", alignItems: "center", gap: spacing[2], paddingHorizontal: spacing[3], paddingVertical: 5, borderRadius: radius.full, borderWidth: 1, borderColor: "rgba(52,211,153,0.3)", backgroundColor: "rgba(52,211,153,0.1)" },
  livePillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#34d399" },
  livePillText: { color: "#a7f3d0", fontSize: 11 },
  countPill: { flexDirection: "row", alignItems: "center", gap: spacing[2], paddingHorizontal: spacing[3], paddingVertical: 5, borderRadius: radius.full, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.06)" },
  countPillText: { color: "rgba(255,255,255,0.6)", fontSize: 11 },
  errorBox: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing[3], borderRadius: radius.lg, borderWidth: 1, borderColor: "rgba(239,68,68,0.3)", backgroundColor: "rgba(239,68,68,0.1)" },
  filterCard: { borderRadius: radius.xl, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)", overflow: "hidden" },
  filterCardHead: { flexDirection: "row", alignItems: "center", gap: spacing[3], padding: spacing[4], borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  filterCardIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(52,211,153,0.12)", borderWidth: 1, borderColor: "rgba(52,211,153,0.2)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  filterCardTitle: { color: colors.white, fontSize: 14, fontWeight: "700" },
  filterCardSub: { color: "rgba(255,255,255,0.38)", fontSize: 11, marginTop: 2 },
  updateBtn: { flexDirection: "row", alignItems: "center", gap: spacing[2], paddingHorizontal: spacing[3], paddingVertical: spacing[2], borderRadius: radius.xl, borderWidth: 1, borderColor: "rgba(52,211,153,0.3)", backgroundColor: "rgba(52,211,153,0.12)" },
  updateBtnText: { color: "#34d399", fontSize: 12, fontWeight: "700" },
  // Filter stat bar
  filterLoadingRow: { flexDirection: "row", alignItems: "center", gap: spacing[2], padding: spacing[4] },
  filterLoadingText: { fontSize: 12, color: "rgba(255,255,255,0.35)" },
  filterStatBar: { flexDirection: "row", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)" },
  filterStatCell: { flex: 1, paddingVertical: spacing[3], alignItems: "center", gap: 3 },
  filterStatCellBorder: { borderRightWidth: 1, borderRightColor: "rgba(255,255,255,0.07)" },
  filterStatNum: { fontSize: 22, fontWeight: "800", lineHeight: 26 },
  filterStatLabel: { fontSize: 9, fontWeight: "700", color: "rgba(255,255,255,0.35)", letterSpacing: 0.8, textTransform: "uppercase" },
  // Availability stacked bar
  filterAvailRow: { flexDirection: "row", alignItems: "center", gap: spacing[3], paddingHorizontal: spacing[4], paddingBottom: spacing[3] },
  filterAvailTrack: { flex: 1, height: 6, borderRadius: 3, flexDirection: "row", overflow: "hidden", backgroundColor: "rgba(255,255,255,0.06)" },
  filterAvailFillBooked:  { backgroundColor: "#34d399" },
  filterAvailFillBlocked: { backgroundColor: "#fbbf24" },
  filterAvailFillAvail:   { backgroundColor: "#38bdf8" },
  filterAvailPct: { fontSize: 11, fontWeight: "700", color: "#38bdf8", flexShrink: 0 },
  dateInputRow: { flexDirection: "row", gap: spacing[3], padding: spacing[4] },
  dateInputLabel: { color: "rgba(255,255,255,0.45)", fontSize: 10, letterSpacing: 1.2, marginBottom: spacing[1] },
  dateInputWrap: { flexDirection: "row", alignItems: "center", gap: spacing[2], borderRadius: radius.lg, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: spacing[3], paddingVertical: spacing[2] },
  dateInput: { flex: 1, color: colors.white, fontSize: 13, padding: 0 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  summaryTile: { width: "48%", borderRadius: radius.lg, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)", padding: spacing[3], gap: spacing[1] },
  summaryTileLabel: { color: "rgba(255,255,255,0.35)", fontSize: 10, letterSpacing: 0.8 },
  summaryTileValue: { color: colors.white },
  calCard: { borderRadius: radius.xl, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.04)", overflow: "hidden" },
  calHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: spacing[4], borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  calNavBtn: { width: 32, height: 32, borderRadius: radius.full, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.06)" },
  calMonthLabel: { color: colors.white, fontSize: 14 },
  calDayLabels: { flexDirection: "row", paddingVertical: spacing[2], borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.06)" },
  calDayLabel: { flex: 1, textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 10 },
  calGrid: { flexDirection: "row", flexWrap: "wrap", padding: spacing[2] },
  calCell: { width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center", padding: 2 },
  calCellBooked: { backgroundColor: "rgba(52,211,153,0.15)", borderRadius: radius.md },
  calCellBlocked: { backgroundColor: "rgba(251,191,36,0.15)", borderRadius: radius.md },
  calCellToday: { borderWidth: 1.5, borderColor: "#34d399", borderRadius: radius.md },
  calCellText: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
  calCellTextBooked: { color: "#34d399" },
  calCellTextBlocked: { color: "#fbbf24" },
  calCellTextToday: { color: "#34d399", fontWeight: "700" },
  calDotRow: { flexDirection: "row", gap: 2, marginTop: 2 },
  calDot: { width: 4, height: 4, borderRadius: 2 },
  calLegend: { flexDirection: "row", gap: spacing[4], padding: spacing[3], borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.06)" },
  calLegendItem: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  calLegendText: { color: "rgba(255,255,255,0.4)", fontSize: 11 },
  sectionHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle: { color: colors.white },
  sectionCount: { color: "rgba(255,255,255,0.4)", fontSize: 11 },
  emptyState: { alignItems: "center", gap: spacing[2], paddingVertical: spacing[6] },
  emptyText: { color: "rgba(255,255,255,0.3)", textAlign: "center" },
  blockList: { gap: spacing[2] },
  blockCard: { flexDirection: "row", alignItems: "center", gap: spacing[3], borderRadius: radius.xl, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.05)", padding: spacing[3] },
  blockIconWrap: { width: 32, height: 32, borderRadius: radius.md, backgroundColor: "rgba(251,191,36,0.15)", alignItems: "center", justifyContent: "center" },
  blockDates: { color: colors.white, fontSize: 13 },
  blockNotes: { color: "rgba(255,255,255,0.45)", fontSize: 11 },
  blockSource: { color: "rgba(255,255,255,0.3)", fontSize: 10 },
  deleteBtn: { width: 32, height: 32, borderRadius: radius.md, backgroundColor: "rgba(239,68,68,0.12)", alignItems: "center", justifyContent: "center" },
  sheetOverlay: { flex: 1, justifyContent: "flex-end" },
  sheetBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(2,11,24,0.7)" },
  sheet: { backgroundColor: "#0f172a", borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing[5], paddingBottom: spacing[8], gap: spacing[3], borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)" },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)", alignSelf: "center", marginBottom: spacing[2] },
  sheetTitle: { color: colors.white },
  sheetSub: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: -spacing[2] },
  sheetSection: { color: "rgba(255,255,255,0.5)", fontSize: 10, letterSpacing: 1.2, textTransform: "uppercase" },
  sheetRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  sheetRowText: { color: "rgba(255,255,255,0.75)", flex: 1 },
  sheetClose: { alignItems: "center", paddingVertical: spacing[3], borderRadius: radius.xl, backgroundColor: "rgba(255,255,255,0.08)" },
  // Day detail sheet — exact web copy
  daySheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    overflow: "hidden",
    borderTopWidth: 1, borderTopColor: "#e5e7eb",
    maxHeight: Dimensions.get("window").height * 0.88,
  },
  // Header
  dayHeader: {
    flexDirection: "row", alignItems: "center", gap: 14,
    paddingHorizontal: 20, paddingVertical: 18,
    borderBottomWidth: 1, borderBottomColor: "#e5e7eb",
    backgroundColor: "#ffffff"
  },
  dayHeaderIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: "#0f2d2a",
    alignItems: "center", justifyContent: "center", flexShrink: 0
  },
  dayHeaderDate: {
    fontSize: 20, fontWeight: "700", color: "#111827", letterSpacing: -0.3
  },
  dayHeaderSub: { fontSize: 13, color: "#6b7280", lineHeight: 18 },
  dayHeaderX: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "#f3f4f6", borderWidth: 1, borderColor: "#e5e7eb",
    alignItems: "center", justifyContent: "center", flexShrink: 0
  },
  // Status row
  dayStatusRow: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1, borderBottomColor: "#e5e7eb"
  },
  dayStatusDot: { width: 8, height: 8, borderRadius: 4 },
  dayStatusLabel: { fontSize: 13, fontWeight: "700", color: "#111827", letterSpacing: 0.4 },
  // Grid rows
  dayRow: { flexDirection: "row" },
  dayRowBorderTop: { borderTopWidth: 1, borderTopColor: "#e5e7eb" },
  dayCell: { flex: 1, padding: 16, gap: 8, backgroundColor: "#ffffff" },
  dayCellBorderLeft: { borderLeftWidth: 1, borderLeftColor: "#e5e7eb" },
  dayCellLabel: {
    fontSize: 11, fontWeight: "700", color: "#111827",
    letterSpacing: 0.6, textTransform: "uppercase"
  },
  dayCellEmpty: { fontSize: 14, color: "#6b7280", lineHeight: 20, marginTop: 2 },
  dayCellStatRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 2 },
  dayCellStatKey: { fontSize: 13, color: "#6b7280" },
  dayCellStatVal: { fontSize: 13, fontWeight: "600", color: "#111827" },
  dayCellCountHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dayCellCountNum: { fontSize: 18, fontWeight: "700", color: "#111827" },
  dayCellItem: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  dayCellDot: { width: 7, height: 7, borderRadius: 3.5, flexShrink: 0 },
  dayCellItemText: { fontSize: 13, color: "#374151", flex: 1 },
  // Footer
  dayFooter: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: "#e5e7eb",
    backgroundColor: "#ffffff"
  },
  dayAddBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 15,
    borderRadius: 50, backgroundColor: "#0d9488"
  },
  dayAddBtnText: { fontSize: 15, fontWeight: "700", color: "#ffffff" },
  dayCloseBtn: {
    paddingHorizontal: 20, paddingVertical: 15,
    borderRadius: 50, borderWidth: 1.5, borderColor: "#d1d5db",
    backgroundColor: "#ffffff"
  },
  dayCloseBtnText: { fontSize: 15, fontWeight: "600", color: "#111827" },
  // 3 stat cards
  dayStatRow: { flexDirection: "row", gap: 8, padding: 12, backgroundColor: "#f9fafb", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  dayStatCard: { flex: 1, borderRadius: 12, borderWidth: 1, padding: 10, gap: 4 },
  dayStatCardLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 0.6, textTransform: "uppercase" },
  dayStatCardBottom: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  dayStatCardNum: { fontSize: 22, fontWeight: "800", lineHeight: 26 },
  dayStatCardPct: { fontSize: 11, fontWeight: "600" },
  dayStatCardBar: { height: 4, borderRadius: 2, overflow: "hidden", marginTop: 4 },
  dayStatCardFill: { height: 4, borderRadius: 2, minWidth: 4 },
  // Day graph
  dayGraphSection: { padding: 16, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", gap: 6 },
  dayGraphHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  dayGraphTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  dayGraphSub: { fontSize: 12, color: "#9ca3af" },
  dayGraphRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dayGraphRowLabel: { fontSize: 11, fontWeight: "700", color: "#374151", letterSpacing: 0.5 },
  dayGraphRowCount: { fontSize: 13, fontWeight: "700", color: "#111827" },
  dayGraphBarTrack: { flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden", marginTop: 4 },
  dayGraphBarFill: { height: 8 },
  dayGraphEmptyRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  dayGraphEmptyLabel: { fontSize: 12, fontWeight: "600", color: "#6b7280", letterSpacing: 0.4 },
  fieldGroup: { gap: spacing[1] },
  fieldLabel: { color: "rgba(255,255,255,0.45)", fontSize: 10, letterSpacing: 1, textTransform: "uppercase" },
  input: { borderRadius: radius.lg, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: spacing[4], paddingVertical: spacing[3], fontSize: 14, color: colors.white },
  // Add block sheet
  addSheet: { backgroundColor: "#0b1929", borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: "90%", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)" },
  addSheetContent: { padding: 20, gap: 20, paddingBottom: 40 },
  addSheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "center", marginBottom: 4 },
  addSheetHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  addSheetTitle: { fontSize: 22, fontWeight: "700", color: "#ffffff" },
  addSheetSub: { fontSize: 13, color: "rgba(255,255,255,0.45)", marginTop: 3 },
  addSheetX: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  addFieldRow: { flexDirection: "row", gap: 12 },
  addDateBtn: { flex: 1, borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.06)", padding: 14, gap: 6 },
  addDateBtnTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  addDateBtnValue: { fontSize: 14, fontWeight: "600", color: "#ffffff" },
  addDateBtnPlaceholder: { fontSize: 13, color: "rgba(255,255,255,0.25)" },
  addFieldGroup: { gap: 10 },
  addLabel: { fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.45)", letterSpacing: 1.2, marginBottom: 2 },
  addInputWrap: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 14, paddingVertical: 12 },
  addInput: { flex: 1, color: "#ffffff", fontSize: 14, padding: 0 },
  addSourceChip: {
    alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 16, borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.05)",
    minWidth: 76
  },
  addSourceIconWrap: {
    width: 38, height: 38, borderRadius: 10,
    alignItems: "center", justifyContent: "center"
  },
  addSourceChipText: { fontSize: 12, color: "rgba(255,255,255,0.45)", fontWeight: "500", textAlign: "center" },
  // Confirmation modal
  confirmOverlay: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20, backgroundColor: "rgba(0,0,0,0.45)" },
  confirmSheet: { width: "100%", backgroundColor: "#ffffff", borderRadius: 18, overflow: "hidden" },
  confirmHead: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  confirmHeadIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#059669", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  confirmTitle: { fontSize: 15, fontWeight: "700", color: "#111827", flex: 1 },
  confirmSub: { fontSize: 11, color: "#9ca3af", marginTop: 1 },
  confirmX: { width: 28, height: 28, borderRadius: 8, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  confirmGrid: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  confirmCell: { flex: 1, paddingHorizontal: 14, paddingVertical: 10, gap: 3 },
  confirmCellBorderLeft: { borderLeftWidth: 1, borderLeftColor: "#f3f4f6" },
  confirmCellLabel: { fontSize: 9, fontWeight: "700", color: "#9ca3af", letterSpacing: 0.9, textTransform: "uppercase" },
  confirmCellValue: { fontSize: 14, fontWeight: "700", color: "#111827" },
  confirmQtyCard: { flexDirection: "row", alignItems: "center", marginHorizontal: 12, marginVertical: 10, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0" },
  confirmQtyLabel: { fontSize: 9, fontWeight: "700", color: "#059669", letterSpacing: 0.9, textTransform: "uppercase" },
  confirmQtyValue: { fontSize: 20, fontWeight: "800", color: "#111827", marginTop: 2 },
  confirmQtyNote: { fontSize: 11, color: "#6b7280", textAlign: "right", lineHeight: 16, flex: 1 },
  confirmTosRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  confirmTosText: { fontSize: 12, color: "#374151", flex: 1 },
  confirmTosLink: { fontSize: 12, color: "#059669", fontWeight: "600" },
  confirmTosSub: { fontSize: 10, color: "#9ca3af", marginTop: 1 },
  confirmToggle: { width: 40, height: 22, borderRadius: 11, backgroundColor: "#d1d5db", padding: 2, justifyContent: "center", flexShrink: 0 },
  confirmToggleOn: { backgroundColor: "#059669" },
  confirmToggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: "#ffffff", shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 2, elevation: 2 },
  confirmToggleThumbOn: { alignSelf: "flex-end" },
  confirmWarnCard: { marginHorizontal: 12, marginBottom: 6, padding: 10, borderRadius: 10, backgroundColor: "#fffbeb", borderWidth: 1, borderColor: "#fde68a", gap: 5 },
  confirmWarnTitle: { fontSize: 11, fontWeight: "700", color: "#92400e" },
  confirmWarnRow: { flexDirection: "row", alignItems: "flex-start", gap: 6 },
  confirmWarnDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#f59e0b", marginTop: 4, flexShrink: 0 },
  confirmWarnText: { fontSize: 11, color: "#78350f", flex: 1 },
  confirmWarnNote: { fontSize: 10, color: "#a16207", marginTop: 2 },
  confirmFooter: { flexDirection: "row", gap: 8, paddingHorizontal: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  confirmCancelBtn: { flex: 1, paddingVertical: 11, borderRadius: 50, borderWidth: 1.5, borderColor: "#e5e7eb", alignItems: "center" },
  confirmCancelText: { fontSize: 13, fontWeight: "600", color: "#6b7280" },
  confirmSubmitBtn: { flex: 2, paddingVertical: 11, borderRadius: 50, backgroundColor: "#059669", alignItems: "center" },
  confirmSubmitDisabled: { backgroundColor: "#6ee7b7" },
  confirmSubmitText: { fontSize: 13, fontWeight: "700", color: "#ffffff" },
  // Section headers
  addSection: { gap: 12 },
  addSectionHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  addSectionIcon: { width: 26, height: 26, borderRadius: 7, backgroundColor: "rgba(52,211,153,0.12)", borderWidth: 1, borderColor: "rgba(52,211,153,0.2)", alignItems: "center", justifyContent: "center" },
  addSectionTitle: { fontSize: 11, fontWeight: "800", color: "rgba(255,255,255,0.7)", letterSpacing: 1.2 },
  // Dropdown fields
  addDropLabel: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  addRequired: { fontSize: 13, fontWeight: "700", color: "#f87171" },
  addDropBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, borderRadius: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", backgroundColor: "rgba(255,255,255,0.06)", paddingHorizontal: 14, paddingVertical: 14 },
  addDropValue: { flex: 1, fontSize: 14, fontWeight: "600", color: "#ffffff" },
  addDropPlaceholder: { flex: 1, fontSize: 14, color: "rgba(255,255,255,0.28)" },
  // Quantity stepper
  addQtyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  addQtyBtn: { width: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", backgroundColor: "rgba(255,255,255,0.07)", alignItems: "center", justifyContent: "center" },
  addQtyBtnText: { fontSize: 22, fontWeight: "300", color: "#ffffff", lineHeight: 26 },
  addQtyDisplay: { flex: 1, height: 44, borderRadius: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.14)", backgroundColor: "rgba(255,255,255,0.06)", alignItems: "center", justifyContent: "center" },
  addQtyValue: { fontSize: 18, fontWeight: "700", color: "#ffffff" },
  // Mini picker sheet
  miniSheet: { backgroundColor: "#0b1929", borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingBottom: 36, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.1)" },
  miniSheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.2)", alignSelf: "center", marginTop: 12, marginBottom: 4 },
  miniSheetTitle: { fontSize: 15, fontWeight: "700", color: "#ffffff", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)" },
  miniSheetRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  miniSheetDot: { width: 10, height: 10, borderRadius: 5, flexShrink: 0 },
  miniSheetRowText: { flex: 1, fontSize: 15, color: "rgba(255,255,255,0.8)", fontWeight: "500" },
  miniSheetRowSub: { fontSize: 12, color: "rgba(255,255,255,0.35)" },
  miniSheetCheck: { width: 8, height: 8, borderRadius: 4 },
  // Legacy (kept for reference)
  addRoomHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  addRoomRequired: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 50, backgroundColor: "rgba(239,68,68,0.15)", borderWidth: 1, borderColor: "rgba(239,68,68,0.3)" },
  addRoomRequiredText: { fontSize: 10, fontWeight: "700", color: "#f87171", letterSpacing: 0.3 },
  addRoomCard: { width: 88, alignItems: "center", gap: 8, paddingVertical: 14, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.05)" },
  addRoomCardIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  addRoomCardName: { fontSize: 12, fontWeight: "700", color: "rgba(255,255,255,0.55)", textAlign: "center" },
  addRoomCardBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 50, minWidth: 28, alignItems: "center" },
  addRoomCardBadgeText: { fontSize: 11, fontWeight: "700" },
  addError: { borderRadius: 10, borderWidth: 1, borderColor: "rgba(239,68,68,0.3)", backgroundColor: "rgba(239,68,68,0.1)", padding: 12 },
  addErrorText: { color: "#fca5a5", fontSize: 13 },
  addSubmitBtn: { borderRadius: 50, backgroundColor: "#059669", paddingVertical: 16, alignItems: "center", justifyContent: "center" },
  addSubmitText: { fontSize: 15, fontWeight: "700", color: "#ffffff" },
});

const manageStyles = StyleSheet.create({
  blockCard: {
    flexDirection: "row", alignItems: "center", gap: spacing[3],
    backgroundColor: colors.white, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing[4],
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1
  },
  blockIcon: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: "#fef3c7", alignItems: "center", justifyContent: "center"
  },
  blockDates: { color: colors.primaryDeep },
  deleteBtn: {
    width: 34, height: 34, borderRadius: radius.md,
    backgroundColor: "#fff1f2", borderWidth: 1, borderColor: "#fecdd3",
    alignItems: "center", justifyContent: "center"
  },
  sheetOverlay: { flex: 1, justifyContent: "flex-end" },
  sheetBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(15,23,42,0.45)" },
  sheet: {
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    backgroundColor: colors.white, padding: spacing[5], paddingBottom: spacing[8],
    gap: spacing[3]
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: "center", marginBottom: spacing[2]
  },
  sheetTitle: { color: colors.primaryDeep },
  fieldGroup: { gap: spacing[1] },
  fieldLabel: { color: colors.softText, fontSize: 10, letterSpacing: 1, textTransform: "uppercase" },
  input: {
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, paddingHorizontal: spacing[4],
    paddingVertical: spacing[3], fontSize: 14, color: colors.ink
  }
});

function LiveDot() {
  const COLORS = ["#f43f5e", "#3b82f6", "#22c55e"];
  const idx = useRef(0);
  const opacity = useRef(new Animated.Value(1)).current;
  const [color, setColor] = useState(COLORS[0]);

  useEffect(() => {
    let handle: ReturnType<typeof setTimeout>;
    const cycle = () => {
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true })
      ]).start(() => {
        idx.current = (idx.current + 1) % COLORS.length;
        setColor(COLORS[idx.current]);
        handle = setTimeout(cycle, 700);
      });
    };
    handle = setTimeout(cycle, 700);
    return () => clearTimeout(handle);
  }, []);

  return <Animated.View style={[styles.liveDot, { backgroundColor: color, opacity }]} />;
}

export function OwnerAvailabilityScreen() {
  const { token } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [managingProperty, setManagingProperty] = useState<Property | null>(null);

  const ranges = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeekMonday(now);
    const monthStart = startOfMonth(now);
    return {
      today: { startDate: todayStart.toISOString(), endDate: addDays(todayStart, 1).toISOString() },
      week:  { startDate: weekStart.toISOString(),  endDate: addDays(weekStart, 7).toISOString() },
      month: { startDate: monthStart.toISOString(), endDate: addMonths(monthStart, 1).toISOString() }
    };
  }, []);

  const [summaries, setSummaries] = useState<Record<number, Partial<Record<PeriodKey, AvailabilitySummary>>>>({});
  const [sumLoading, setSumLoading] = useState<Record<number, Partial<Record<PeriodKey, boolean>>>>({});

  const fetchProperties = async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await apiRequest<any>("/api/owner/properties/mine?status=APPROVED&pageSize=50", { token });
      const items: Property[] = Array.isArray(data) ? data : (data?.items || []);
      setProperties(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load properties.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { void fetchProperties(); }, [token]);

  useEffect(() => {
    if (!properties.length) return;
    let cancelled = false;
    const periods: PeriodKey[] = ["today", "week", "month"];

    const fetchOne = async (propertyId: number, period: PeriodKey) => {
      if (cancelled) return;
      setSumLoading((prev) => ({ ...prev, [propertyId]: { ...prev[propertyId], [period]: true } }));
      try {
        const r = await apiRequest<any>(
          `/api/owner/availability/summary?propertyId=${propertyId}&startDate=${ranges[period].startDate}&endDate=${ranges[period].endDate}`,
          { token }
        );
        if (cancelled) return;
        const s: AvailabilitySummary = r?.summary;
        if (s) setSummaries((prev) => ({ ...prev, [propertyId]: { ...prev[propertyId], [period]: s } }));
      } catch { /* show — in table */ }
      finally {
        if (!cancelled) setSumLoading((prev) => ({ ...prev, [propertyId]: { ...prev[propertyId], [period]: false } }));
      }
    };

    // Sequential per-property with a 250ms stagger to avoid bursting the rate limiter.
    // Within each property the 3 period calls run in series (not parallel).
    const runQueue = async () => {
      for (let i = 0; i < properties.length; i++) {
        if (cancelled) break;
        for (const period of periods) {
          if (cancelled) break;
          await fetchOne(properties[i].id, period);
        }
        if (i < properties.length - 1 && !cancelled) {
          await new Promise<void>((r) => setTimeout(r, 250));
        }
      }
    };
    void runQueue();
    return () => { cancelled = true; };
  }, [properties, token]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <AppText variant="bodySmall" tone="muted" style={{ marginTop: spacing[3] }}>
          Loading properties…
        </AppText>
      </View>
    );
  }

  if (error) {
    return (
      <StateView
        title="Could not load"
        message={error}
        actionLabel="Retry"
        onAction={() => fetchProperties()}
      />
    );
  }

  if (!properties.length) {
    return (
      <StateView
        title="No approved properties"
        message="You need at least one approved property to manage room availability."
      />
    );
  }

  const totalFloors = properties.reduce((sum, p) => sum + getFloorCount(p), 0);

  if (managingProperty) {
    return (
      <OwnerAvailabilityManageScreen
        property={managingProperty}
        token={token}
        onBack={() => setManagingProperty(null)}
      />
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Hero */}
        <View style={styles.hero}>
          {/* Top row */}
          <View style={styles.heroTop}>
            <View style={styles.heroIconWrap}>
              <CalendarDays size={20} color={colors.primary} />
            </View>
            <View style={styles.heroTitleBlock}>
              <AppText variant="caption" weight="bold" style={styles.heroEyebrow}>
                OWNER DASHBOARD
              </AppText>
              <AppText variant="title" weight="bold" style={styles.heroTitle}>
                Room Availability
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Refresh"
              onPress={() => fetchProperties(true)}
              style={({ pressed }) => [styles.refreshBtn, pressed && styles.pressed]}
            >
              <RefreshCw size={16} color={colors.softText} />
            </Pressable>
          </View>

          <AppText variant="bodySmall" style={styles.heroSub}>
            Monitor bookings, block dates and keep every room's calendar up to date.
          </AppText>

          <View style={styles.heroDivider} />

          {/* Stats */}
          <View style={styles.heroStatRow}>
            <View style={styles.heroStatItem}>
              <AppText variant="caption" weight="bold" style={styles.heroStatLabel}>PROPERTIES</AppText>
              <AppText variant="titleSm" weight="bold" style={styles.heroStatValue}>{properties.length}</AppText>
            </View>
            <View style={styles.heroStatSep} />
            <View style={styles.heroStatItem}>
              <AppText variant="caption" weight="bold" style={styles.heroStatLabel}>TOTAL FLOORS</AppText>
              <AppText variant="titleSm" weight="bold" style={styles.heroStatValue}>{totalFloors}</AppText>
            </View>
            <View style={styles.heroStatSep} />
            <View style={styles.heroStatItem}>
              <AppText variant="caption" weight="bold" style={styles.heroStatLabel}>LIVE SYNC</AppText>
              <View style={styles.syncPill}>
                <LiveDot />
                <AppText variant="caption" weight="bold" style={styles.syncText}>Active</AppText>
              </View>
            </View>
          </View>
        </View>

        {refreshing ? (
          <View style={styles.refreshingRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <AppText variant="caption" tone="muted">Refreshing…</AppText>
          </View>
        ) : null}

        {/* Property cards */}
        {properties.map((property) => {
          const floors = getFloorCount(property);
          const rooms  = getTotalRooms(property);
          const avail  = summaries[property.id];
          const aload  = sumLoading[property.id];
          const location = [property.city, property.district, property.regionName].filter(Boolean).join(", ") || "Location not set";
          const cover = Array.isArray(property.photos) && property.photos.length > 0 ? property.photos[0] : null;
          const availPct = avail?.today?.overallAvailabilityPercentage;

          const fmt = (v: number | undefined, loading?: boolean) => {
            if (typeof v === "number") return String(v);
            return loading ? "…" : "—";
          };

          return (
            <View key={property.id} style={styles.propertyCard}>

              {/* Banner with cover photo */}
              <View style={styles.cardBanner}>
                {cover ? (
                  <Image source={{ uri: cover }} style={styles.cardBannerImage} resizeMode="cover" />
                ) : (
                  <View style={styles.cardBannerFallback} />
                )}
                {/* Dark gradient overlay */}
                <View style={styles.cardBannerOverlay} />

                {/* Top badges */}
                <View style={styles.cardBannerBadges}>
                  <View style={styles.approvedBadge}>
                    <AppText variant="caption" weight="bold" style={styles.approvedBadgeText}>APPROVED</AppText>
                  </View>
                  <View style={styles.roomsBadge}>
                    <BedDouble size={10} color="rgba(255,255,255,0.7)" />
                    <AppText variant="caption" weight="bold" style={styles.roomsBadgeText}>{rooms} rooms</AppText>
                  </View>
                </View>

                {/* Property identity */}
                <View style={styles.cardBannerBottom}>
                  <View style={styles.cardBannerIcon}>
                    <BedDouble size={18} color="rgba(255,255,255,0.8)" />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText variant="bodySmall" weight="extraBold" tone="inverse" numberOfLines={1}>
                      {property.title}
                    </AppText>
                    <AppText variant="caption" numberOfLines={1} style={styles.cardLocation}>
                      {location}
                    </AppText>
                  </View>
                </View>
              </View>

              {/* Dark stat row */}
              <View style={styles.statRow}>
                <DarkStatTile icon={<Layers size={13} color="#34d399" />} label="Floors" value={String(floors)} />
                <View style={styles.statSep} />
                <DarkStatTile icon={<BedDouble size={13} color="#22d3ee" />} label="Rooms" value={String(rooms)} />
                <View style={styles.statSep} />
                <DarkStatTile
                  icon={<Sparkles size={13} color={availPct != null && availPct >= 50 ? "#34d399" : "#fbbf24"} />}
                  label="Avail. today"
                  value={availPct != null ? `${availPct}%` : fmt(undefined, aload?.today)}
                  valueColor={availPct != null && availPct >= 50 ? "#34d399" : "#fbbf24"}
                />
              </View>

              {/* Dark table */}
              <View style={styles.table}>
                <View style={styles.tableHead}>
                  <View style={styles.tableCell} />
                  <AppText variant="caption" weight="bold" style={[styles.tableCellRight, styles.tableHeaderText]}>Today</AppText>
                  <AppText variant="caption" weight="bold" style={[styles.tableCellRight, styles.tableHeaderText]}>Week</AppText>
                  <AppText variant="caption" weight="bold" style={[styles.tableCellRight, styles.tableHeaderText]}>Month</AppText>
                </View>
                <View style={styles.tableRow}>
                  <View style={[styles.tableCell, styles.tableLabelCell]}>
                    <View style={[styles.tableRowDot, { backgroundColor: "#10b981" }]} />
                    <AppText variant="caption" weight="semiBold" style={styles.tableRowLabel}>NoLSAF</AppText>
                  </View>
                  <AppText variant="bodySmall" weight="bold" style={[styles.tableCellRight, styles.tableGreen]}>{fmt(avail?.today?.totalBookedRooms, aload?.today)}</AppText>
                  <AppText variant="bodySmall" weight="bold" style={[styles.tableCellRight, styles.tableGreen]}>{fmt(avail?.week?.totalBookedRooms,  aload?.week)}</AppText>
                  <AppText variant="bodySmall" weight="bold" style={[styles.tableCellRight, styles.tableGreen]}>{fmt(avail?.month?.totalBookedRooms, aload?.month)}</AppText>
                </View>
                <View style={[styles.tableRow, styles.tableRowBorder]}>
                  <View style={[styles.tableCell, styles.tableLabelCell]}>
                    <View style={[styles.tableRowDot, { backgroundColor: "#f59e0b" }]} />
                    <AppText variant="caption" weight="semiBold" style={styles.tableRowLabel}>Blocked</AppText>
                  </View>
                  <AppText variant="bodySmall" weight="bold" style={[styles.tableCellRight, styles.tableAmber]}>{fmt(avail?.today?.totalBlockedRooms, aload?.today)}</AppText>
                  <AppText variant="bodySmall" weight="bold" style={[styles.tableCellRight, styles.tableAmber]}>{fmt(avail?.week?.totalBlockedRooms,  aload?.week)}</AppText>
                  <AppText variant="bodySmall" weight="bold" style={[styles.tableCellRight, styles.tableAmber]}>{fmt(avail?.month?.totalBlockedRooms, aload?.month)}</AppText>
                </View>
              </View>

              {/* CTA */}
              <View style={styles.cardFooter}>
                <AppText variant="caption" style={styles.cardFooterHint}>Tap to manage calendar</AppText>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setManagingProperty(property)}
                  style={({ pressed }) => [styles.manageBtn, pressed && styles.pressed]}
                >
                  <CalendarDays size={14} color={colors.white} />
                  <AppText variant="caption" weight="bold" style={styles.manageBtnText}>Manage</AppText>
                </Pressable>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function DarkStatTile({ icon, label, value, valueColor }: { icon: React.ReactNode; label: string; value: string; valueColor?: string }) {
  return (
    <View style={styles.statTile}>
      <View style={styles.statTileRow}>
        {icon}
        <AppText variant="caption" weight="bold" style={styles.statTileLabel}>{label}</AppText>
      </View>
      <AppText variant="titleSm" weight="bold" style={[styles.statDefault, valueColor ? { color: valueColor } : null]}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing[3], paddingBottom: spacing[8], gap: spacing[3] },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Hero — light mode
  hero: {
    borderRadius: radius.xl,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    gap: spacing[3],
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  heroTop: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  heroIconWrap: {
    width: 44, height: 44, borderRadius: radius.xl,
    backgroundColor: colors.brand[50],
    borderWidth: 1, borderColor: colors.brand[100],
    alignItems: "center", justifyContent: "center",
    flexShrink: 0
  },
  heroTitleBlock: { flex: 1, minWidth: 0, gap: 2 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveDotBadge: { position: "absolute", top: 5, right: 5 },
  heroEyebrow: { color: colors.softText, fontSize: 10, letterSpacing: 1.8 },
  heroTitle: { color: colors.primaryDeep },
  heroSub: { color: colors.softText, fontSize: 13 },
  refreshBtn: {
    width: 36, height: 36, borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center"
  },
  heroDivider: { height: 1, backgroundColor: colors.border },
  heroStatRow: { flexDirection: "row", alignItems: "center" },
  heroStatItem: { flex: 1, gap: 3 },
  heroStatSep: { width: 1, height: 32, backgroundColor: colors.border, marginHorizontal: spacing[3] },
  heroStatLabel: { color: colors.softText, fontSize: 9, letterSpacing: 1.2 },
  heroStatValue: { color: colors.primaryDeep },
  syncPill: { flexDirection: "row", alignItems: "center", gap: spacing[1] },
  syncDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#10b981" },
  syncText: { color: "#059669", fontSize: 12 },

  refreshingRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing[2] },

  // Property card — dark
  propertyCard: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: colors.primaryDeep,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6
  },

  // Banner
  cardBanner: {
    height: 160,
    justifyContent: "space-between",
    padding: spacing[4],
    gap: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    overflow: "hidden"
  },
  cardBannerImage: {
    ...StyleSheet.absoluteFill
  },
  cardBannerFallback: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#023a35"
  },
  cardBannerOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(2,10,26,0.55)"
  },
  cardBannerBadges: { flexDirection: "row", gap: spacing[2], zIndex: 1 },
  approvedBadge: {
    paddingHorizontal: spacing[2], paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: "rgba(52,211,153,0.15)",
    borderWidth: 1, borderColor: "rgba(52,211,153,0.3)"
  },
  approvedBadgeText: { color: "#34d399", fontSize: 9, letterSpacing: 0.8 },
  roomsBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: spacing[2], paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.12)"
  },
  roomsBadgeText: { color: "rgba(255,255,255,0.7)", fontSize: 9 },
  cardBannerBottom: { flexDirection: "row", alignItems: "center", gap: spacing[3], zIndex: 1 },
  cardBannerIcon: {
    width: 38, height: 38, borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center", flexShrink: 0
  },
  cardLocation: { color: "rgba(255,255,255,0.45)", fontSize: 12 },

  // Stat row — dark
  statRow: {
    flexDirection: "row",
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)"
  },
  statSep: { width: 1, backgroundColor: "rgba(255,255,255,0.10)", marginHorizontal: spacing[3] },
  statTile: { flex: 1, gap: spacing[1] },
  statTileRow: { flexDirection: "row", alignItems: "center", gap: spacing[1] },
  statTileLabel: { color: "rgba(255,255,255,0.4)", fontSize: 9, letterSpacing: 1 },
  statDefault: { color: colors.white },

  // Table — dark
  table: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)"
  },
  tableHead: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: spacing[2],
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.08)"
  },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing[2] },
  tableRowBorder: { borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" },
  tableCell: { flex: 1 },
  tableHeaderText: { color: "rgba(255,255,255,0.35)", fontSize: 10, letterSpacing: 0.8 },
  tableCellRight: { flex: 1, textAlign: "right" },
  tableLabelCell: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing[2] },
  tableRowDot: { width: 6, height: 6, borderRadius: 3 },
  tableRowLabel: { color: "rgba(255,255,255,0.6)", fontSize: 11 },
  tableGreen: { color: "#34d399" },
  tableAmber: { color: "#fbbf24" },

  // Card footer + Manage button
  cardFooter: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: spacing[4], paddingVertical: spacing[3]
  },
  cardFooterHint: { color: "rgba(255,255,255,0.3)", fontSize: 11 },
  manageBtn: {
    flexDirection: "row", alignItems: "center",
    gap: spacing[2],
    paddingHorizontal: spacing[4], paddingVertical: spacing[2],
    borderRadius: radius.xl,
    backgroundColor: "#059669"
  },
  manageBtnText: { color: colors.white, fontSize: 12 },

  pressed: { opacity: 0.75 }
});
