"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import axios from "axios";
import {
  Calendar, Wallet, FileText, PlusSquare, LayoutDashboard,
  ChevronDown, ChevronRight, Users, HandHeart, CalendarDays,
  CheckCircle2, Building2, BadgeCheck, TrendingUp, LogIn, LogOut, BarChart3,
} from "lucide-react";

const api = axios.create({ baseURL: "", withCredentials: true });

/* ═══════════════════════════════════════════════════════
   NAV ITEM CARD
═══════════════════════════════════════════════════════ */
function Item({
  href, label, Icon, isSubItem = false, count, collapsed = false,
}: {
  href: string; label: string;
  Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  isSubItem?: boolean; count?: number; collapsed?: boolean;
}) {
  const path = usePathname();
  const active = path === href || (href !== "/owner" && path?.startsWith(href + "/"));

  if (collapsed) {
    return (
      <Link
        href={href}
        title={label}
        className="group relative no-underline flex items-center justify-center rounded-xl p-2.5 transition-all duration-200"
        style={active
          ? { background: "linear-gradient(135deg,#024d47,#02665e)", boxShadow: "0 2px 8px rgba(2,102,94,0.35)" }
          : { background: "transparent" }
        }
      >
        {Icon && (
          <Icon
            className="h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110"
            style={{ color: active ? "#ffffff" : "#02665e" }}
            aria-hidden
          />
        )}
        {/* Badge */}
        {count !== undefined && count > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-black text-white"
            style={{ background: "#e11d48" }}>
            {count > 9 ? "9+" : count}
          </span>
        )}
        {/* Tooltip */}
        <span className="absolute left-full ml-2.5 px-2.5 py-1.5 text-xs font-semibold text-white rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-150 shadow-lg"
          style={{ background: "#0f172a" }}>
          {label}{count !== undefined && count > 0 && ` · ${count}`}
        </span>
      </Link>
    );
  }

  if (isSubItem) {
    return (
      <Link
        href={href}
        className="group no-underline flex items-center justify-between rounded-xl px-3 py-2 ml-3 transition-all duration-200"
        style={active
          ? { background: "linear-gradient(135deg,#024d47,#02665e)", boxShadow: "0 2px 8px rgba(2,102,94,0.28)" }
          : { background: "rgba(2,102,94,0.04)" }
        }
      >
        <div className="flex items-center gap-2.5 min-w-0">
          {/* icon chip */}
          <span className="flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200"
            style={active
              ? { background: "rgba(255,255,255,0.18)" }
              : { background: "rgba(2,102,94,0.10)" }
            }>
            {Icon && <Icon className="w-3 h-3" style={{ color: active ? "#ffffff" : "#02665e" }} aria-hidden />}
          </span>
          <span className="text-[12.5px] font-semibold truncate"
            style={{ color: active ? "#ffffff" : "#1e3a38" }}>
            {label}
          </span>
          {count !== undefined && count > 0 && (
            <span className="ml-1 px-2 py-px rounded-full text-[10px] font-black leading-none"
              style={active
                ? { background: "rgba(255,255,255,0.22)", color: "#ffffff" }
                : { background: "#dcfce7", color: "#02665e", border: "1px solid #bbf7d0" }
              }>
              {count}
            </span>
          )}
        </div>
        <ChevronRight className="h-3 w-3 flex-shrink-0 opacity-40 group-hover:opacity-70 transition-opacity"
          style={{ color: active ? "#ffffff" : "#02665e" }} aria-hidden />
      </Link>
    );
  }

  /* Top-level link */
  return (
    <Link
      href={href}
      className="group no-underline flex items-center justify-between rounded-2xl px-3.5 py-3 transition-all duration-200"
      style={active
        ? { background: "linear-gradient(135deg,#024d47,#02665e)", boxShadow: "0 4px 14px rgba(2,102,94,0.3)" }
        : { background: "rgba(2,102,94,0.04)" }
      }
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* icon badge */}
        <span className="flex-shrink-0 w-7 h-7 rounded-xl flex items-center justify-center transition-all duration-200"
          style={active
            ? { background: "rgba(255,255,255,0.18)" }
            : { background: "rgba(2,102,94,0.08)" }
          }>
          {Icon && (
            <Icon className="w-4 h-4 transition-transform duration-200 group-hover:scale-110"
              style={{ color: active ? "#ffffff" : "#02665e" }} aria-hidden />
          )}
        </span>
        <span className="text-[13.5px] font-bold truncate"
          style={{ color: active ? "#ffffff" : "#1e3a38" }}>
          {label}
        </span>
        {count !== undefined && count > 0 && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-black leading-none flex-shrink-0"
            style={active
              ? { background: "rgba(255,255,255,0.22)", color: "#ffffff" }
              : { background: "#dcfce7", color: "#02665e", border: "1px solid #bbf7d0" }
            }>
            {count}
          </span>
        )}
      </div>
      <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 opacity-35 group-hover:opacity-60 transition-opacity"
        style={{ color: active ? "#ffffff" : "#02665e" }} aria-hidden />
    </Link>
  );
}

/* ═══════════════════════════════════════════════════════
   SECTION GROUP — wraps a collapsible group in a card
═══════════════════════════════════════════════════════ */
function SectionGroup({
  label, Icon, isOpen, active, onClick, collapsed, children,
}: {
  label: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  isOpen: boolean;
  active?: boolean;
  onClick: () => void;
  collapsed: boolean;
  children: React.ReactNode;
}) {
  if (collapsed) {
    return (
      <button
        onClick={onClick}
        title={label}
        className="group relative w-full flex items-center justify-center rounded-xl p-2.5 transition-all duration-200"
        style={active
          ? { background: "rgba(2,102,94,0.12)" }
          : { background: "transparent" }
        }
      >
        <Icon className="h-5 w-5 flex-shrink-0" style={{ color: "#02665e" }} aria-hidden />
        <span className="absolute left-full ml-2.5 px-2.5 py-1.5 text-xs font-semibold text-white rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity duration-150 shadow-lg"
          style={{ background: "#0f172a" }}>
          {label}
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{ background: "rgba(255,255,255,0.75)" }}>
      {/* section header button */}
      <button
        onClick={onClick}
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between px-3.5 py-3 transition-all duration-200 group"
        style={isOpen || active
          ? { background: "rgba(2,102,94,0.06)" }
          : { background: "transparent" }
        }
      >
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200"
            style={isOpen || active
              ? { background: "linear-gradient(135deg,#024d47,#02665e)", boxShadow: "0 2px 6px rgba(2,102,94,0.3)" }
              : { background: "rgba(2,102,94,0.08)" }
            }>
            <Icon className="w-4 h-4 transition-transform duration-200 group-hover:scale-110"
              style={{ color: isOpen || active ? "#ffffff" : "#02665e" }} aria-hidden />
          </span>
          <span className="text-[13.5px] font-bold"
            style={{ color: "#1e3a38" }}>
            {label}
          </span>
        </div>
        <ChevronDown
          className="h-4 w-4 flex-shrink-0 transition-transform duration-300"
          style={{ color: "#02665e", opacity: 0.6, transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)" }}
          aria-hidden
        />
      </button>

      {/* accordion body */}
      <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
        <div className="min-h-0 overflow-hidden">
          {/* subtle top divider */}
          <div className="mx-3 h-px" style={{ background: "rgba(2,102,94,0.08)" }} />
          <div className="px-2 pt-2 pb-2.5 space-y-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════════════════════ */
export default function OwnerSidebar({ collapsed = false }: { collapsed?: boolean }) {
  const [propOpen, setPropOpen] = useState(true);
  const [bookOpen, setBookOpen] = useState(true);
  const [revenueOpen, setRevenueOpen] = useState(true);
  const [groupStaysOpen, setGroupStaysOpen] = useState(true);
  const [checkedInCount, setCheckedInCount] = useState<number>(0);
  const [checkoutDueCount, setCheckoutDueCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    const abortController = new AbortController();
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const normalizeArray = (raw: any) =>
      Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : (Array.isArray(raw?.items) ? raw.items : []));

    const fetchCounts = async () => {
      if (!mounted) return;
      try {
        const [r1, r2] = await Promise.all([
          api.get("/api/owner/bookings/checked-in", { signal: abortController.signal, timeout: 10000 }),
          api.get("/api/owner/bookings/for-checkout", { signal: abortController.signal, timeout: 10000 }),
        ]);
        if (!mounted) return;
        setCheckedInCount(normalizeArray((r1 as any).data).length);
        setCheckoutDueCount(normalizeArray((r2 as any).data).length);
      } catch (err: any) {
        if (!mounted) return;
        if (err.code === "ECONNABORTED" || err.name === "AbortError" || err.message === "Request aborted") return;
      }
    };

    fetchCounts();
    intervalId = setInterval(() => { if (mounted) fetchCounts(); }, 30000);

    const onChanged = () => { if (mounted) fetchCounts(); };
    window.addEventListener("nols:checkedin-changed", onChanged);
    window.addEventListener("nols:checkout-changed", onChanged);

    return () => {
      mounted = false;
      abortController.abort();
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener("nols:checkedin-changed", onChanged);
      window.removeEventListener("nols:checkout-changed", onChanged);
    };
  }, []);

  const path = usePathname();
  const sectionActive = {
    properties: path === "/owner/properties" || path.startsWith("/owner/properties/"),
    bookings: path === "/owner/bookings" || path.startsWith("/owner/bookings/"),
    groupStays: path === "/owner/group-stays" || path.startsWith("/owner/group-stays/"),
    revenue: path === "/owner/revenue" || path.startsWith("/owner/revenue/") || path === "/owner/reports" || path.startsWith("/owner/reports/"),
  };

  return (
    <div
      className={`rounded-3xl overflow-hidden ${collapsed ? "p-1.5" : "p-3"}`}
      style={{
        background: "linear-gradient(160deg,#f7fbfa 0%,#ffffff 50%,#f2f9f8 100%)",
        boxShadow: "0 2px 16px rgba(2,102,94,0.08), 0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <div className={`space-y-2 ${collapsed ? "space-y-1.5" : ""}`}>

        {/* ── Dashboard ── */}
        <Item href="/owner" label="Dashboard" Icon={LayoutDashboard} collapsed={collapsed} />

        {!collapsed && (
          <div className="h-px mx-1" style={{ background: "rgba(2,102,94,0.07)" }} />
        )}

        {/* ── My Properties ── */}
        {collapsed ? (
          <Item href="/owner/properties/approved" label="My Properties" Icon={Building2} collapsed={collapsed} />
        ) : (
          <SectionGroup
            label="My Properties" Icon={Building2}
            isOpen={propOpen} active={sectionActive.properties}
            onClick={() => setPropOpen(v => !v)}
            collapsed={collapsed}
          >
            <Item href="/owner/properties/approved" label="Approved" Icon={BadgeCheck} isSubItem collapsed={false} />
            <Item href="/owner/properties/pending" label="Pending" Icon={FileText} isSubItem collapsed={false} />
            <Item href="/owner/properties/availability" label="Room Availability" Icon={CalendarDays} isSubItem collapsed={false} />
            <Item href="/owner/properties/add" label="Add New" Icon={PlusSquare} isSubItem collapsed={false} />
          </SectionGroup>
        )}

        {/* ── Bookings ── */}
        {collapsed ? (
          <Item href="/owner/bookings" label="Bookings" Icon={Calendar} collapsed={collapsed} />
        ) : (
          <SectionGroup
            label="Bookings" Icon={Calendar}
            isOpen={bookOpen} active={sectionActive.bookings}
            onClick={() => setBookOpen(v => !v)}
            collapsed={collapsed}
          >
            <Item href="/owner/bookings/validate" label="Check-in" Icon={LogIn} isSubItem collapsed={false} />
            <Item href="/owner/bookings/checked-in" label="Checked-In" Icon={CheckCircle2} isSubItem count={checkedInCount} collapsed={false} />
            <Item href="/owner/bookings/check-out" label="Check-out" Icon={LogOut} isSubItem count={checkoutDueCount} collapsed={false} />
            <Item href="/owner/bookings/checked-out" label="Checked-Out" Icon={CheckCircle2} isSubItem collapsed={false} />
          </SectionGroup>
        )}

        {/* ── Group Stays ── */}
        {collapsed ? (
          <Item href="/owner/group-stays" label="Group Stays" Icon={Users} collapsed={collapsed} />
        ) : (
          <SectionGroup
            label="Group Stays" Icon={Users}
            isOpen={groupStaysOpen} active={sectionActive.groupStays}
            onClick={() => setGroupStaysOpen(v => !v)}
            collapsed={collapsed}
          >
            <Item href="/owner/group-stays" label="Assigned to Me" Icon={Users} isSubItem collapsed={false} />
            <Item href="/owner/group-stays/claims" label="Available to Claim" Icon={HandHeart} isSubItem collapsed={false} />
            <Item href="/owner/group-stays/claims/my-claims" label="My Claims" Icon={FileText} isSubItem collapsed={false} />
          </SectionGroup>
        )}

        {/* ── My Revenue ── */}
        {collapsed ? (
          <Item href="/owner/revenue/requested" label="My Revenue" Icon={Wallet} collapsed={collapsed} />
        ) : (
          <SectionGroup
            label="My Revenue" Icon={Wallet}
            isOpen={revenueOpen} active={sectionActive.revenue}
            onClick={() => setRevenueOpen(v => !v)}
            collapsed={collapsed}
          >
            <Item href="/owner/revenue/requested" label="Requested" Icon={TrendingUp} isSubItem collapsed={false} />
            <Item href="/owner/revenue/paid" label="Paid Invoices" Icon={BadgeCheck} isSubItem collapsed={false} />
            <Item href="/owner/revenue/rejected" label="Rejected" Icon={FileText} isSubItem collapsed={false} />
            <Item href="/owner/reports/overview" label="Reports" Icon={BarChart3} isSubItem collapsed={false} />
          </SectionGroup>
        )}

      </div>
    </div>
  );
}
