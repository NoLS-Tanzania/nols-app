"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { ArrowLeft, Calendar, ExternalLink, Megaphone, Play, X } from "lucide-react";
import LogoSpinner from "@/components/LogoSpinner";
import UpdateRadialFan, { type RadialItem } from "@/components/UpdateRadialFan";

interface Update {
  id: string;
  title: string;
  content: string;
  images?: string[];
  videos?: string[];
  createdAt: string;
  updatedAt: string;
}

function isSafeMediaUrl(url: string): boolean {
  const t = url.trim();
  if (!t) return false;
  if (t.startsWith("/")) return true;
  if (t.startsWith("data:image/")) return true;
  try {
    const p = new URL(t);
    return p.protocol === "http:" || p.protocol === "https:";
  } catch { return false; }
}

function getYouTubeId(url: string): string | null {
  const t = url.trim();
  if (!t) return null;
  try {
    const p = new URL(t);
    const h = p.hostname.replace(/^www\./, "");
    if (h === "youtu.be") return p.pathname.split("/").filter(Boolean)[0] || null;
    if (h === "youtube.com" || h === "m.youtube.com") {
      const parts = p.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" && parts[1]) return parts[1];
      if (parts[0] === "shorts" && parts[1]) return parts[1];
      return p.searchParams.get("v");
    }
    return null;
  } catch { return null; }
}

function parseUpdate(u: Update) {
  const safeImages = (u.images || []).filter((img) => typeof img === "string" && isSafeMediaUrl(img));
  const ytUrl = (u.videos || []).find((v) => typeof v === "string" && getYouTubeId(v) !== null);
  const ytId = ytUrl ? getYouTubeId(ytUrl) : null;
  const hasVideo = !!ytId || (u.videos || []).length > 0;
  const mediaSrc = ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : safeImages[0] ?? null;
  return { safeImages, ytId, hasVideo, mediaSrc };
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function formatDateShort(d: string) {
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

// ── Detail modal ──────────────────────────────────────────────────────────────
function DetailModal({ item, onClose }: { item: Update; onClose: () => void }) {
  const { safeImages, ytId, mediaSrc } = parseUpdate(item);
  const embedUrl = ytId ? `https://www.youtube-nocookie.com/embed/${ytId}` : null;
  const watchUrl = ytId ? `https://www.youtube.com/watch?v=${ytId}` : null;
  const thumbSrc = embedUrl ? mediaSrc : safeImages[0] ?? null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6"
      style={{ background: "rgba(0,0,0,0.55)" }}
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      onClick={onClose}
    >
      <div
        className="relative w-full sm:max-w-xl overflow-y-auto bg-white"
        style={{ maxHeight: "94dvh", borderRadius: "28px 28px 0 0" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Rounded corners on desktop */}
        <style>{`@media (min-width: 640px) { .detail-sheet { border-radius: 24px !important; } }`}</style>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full text-white transition-colors hover:bg-black/50"
          style={{ background: "rgba(0,0,0,0.28)" }}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Media */}
        {embedUrl ? (
          <div className="aspect-video w-full overflow-hidden bg-black" style={{ borderRadius: "28px 28px 0 0" }}>
            <iframe
              src={embedUrl}
              className="h-full w-full"
              frameBorder="0"
              loading="lazy"
              referrerPolicy="no-referrer"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              title={item.title}
            />
          </div>
        ) : thumbSrc ? (
          <div className="aspect-video w-full overflow-hidden bg-slate-100" style={{ borderRadius: "28px 28px 0 0" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={thumbSrc}
              alt={item.title}
              className="h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : (
          <div
            className="aspect-video w-full flex items-center justify-center"
            style={{ borderRadius: "28px 28px 0 0", background: "linear-gradient(135deg, #d6eeec 0%, #f0fffe 100%)" }}
          >
            <Megaphone className="h-14 w-14 text-[#02665e]/20" />
          </div>
        )}

        {/* Body */}
        <div className="px-5 pt-5 pb-8">
          <div className="flex items-center gap-1.5 mb-2 text-[11px]" style={{ color: "#94a3b8" }}>
            <Calendar className="h-3 w-3" />
            <span>{formatDate(item.createdAt)}</span>
          </div>
          <h2 className="text-[19px] font-bold text-slate-900 leading-snug mb-3">{item.title}</h2>
          <p className="whitespace-pre-line text-slate-600" style={{ fontSize: 14, lineHeight: "1.72" }}>
            {item.content}
          </p>

          {safeImages.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {safeImages.map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={img}
                  alt={`${item.title} image ${i + 1}`}
                  className="aspect-video w-full rounded-xl object-cover bg-slate-100"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />
              ))}
            </div>
          )}

          {watchUrl && (
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-[14px] font-bold text-white no-underline transition-opacity hover:opacity-85"
              style={{ background: "#FF0000" }}
            >
              <Play className="h-4 w-4 fill-white" />
              Watch on YouTube
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Compact grid card (for items beyond the fan) ──────────────────────────────
function GridCard({ item, onClick }: { item: Update; onClick: () => void }) {
  const { ytId, hasVideo, mediaSrc } = parseUpdate(item);
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e] focus-visible:ring-offset-1"
      style={{ borderRadius: 18 }}
    >
      <div
        className="overflow-hidden bg-white border border-slate-100 transition-all duration-200 group-hover:-translate-y-0.5"
        style={{ borderRadius: 18, boxShadow: "0 2px 10px rgba(0,0,0,0.05)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 6px 20px rgba(0,0,0,0.10)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 2px 10px rgba(0,0,0,0.05)"; }}
      >
        <div className="relative aspect-video w-full overflow-hidden bg-slate-100" style={{ borderRadius: "18px 18px 0 0" }}>
          {mediaSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaSrc}
              alt={item.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center" style={{ background: "linear-gradient(135deg, #d6eeec 0%, #f5fffe 100%)" }}>
              <Megaphone className="h-7 w-7 text-[#02665e]/20" />
            </div>
          )}
          {(ytId || hasVideo) && (
            <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.10)" }}>
              <div
                className="flex items-center justify-center rounded-full ring-2 ring-white/80 shadow-lg transition-transform duration-200 group-hover:scale-110"
                style={{ width: 34, height: 34, background: ytId ? "#FF0000" : "rgba(255,255,255,0.92)" }}
              >
                <Play className="h-3.5 w-3.5 ml-0.5" style={{ fill: ytId ? "#fff" : "#02665e", color: ytId ? "#fff" : "#02665e" }} />
              </div>
            </div>
          )}
        </div>
        <div className="px-3 pt-2.5 pb-3">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{formatDateShort(item.createdAt)}</p>
          <h3 className="text-[13px] font-bold leading-snug text-slate-900 line-clamp-2">{item.title}</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-500 line-clamp-1">{item.content}</p>
        </div>
      </div>
    </button>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function UpdatesIndexPage() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Update | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const api = axios.create({ baseURL: "" });
        const res = await api.get<{ items: Update[] }>("/api/public/updates");
        setUpdates(res.data?.items || []);
      } catch (err) {
        console.error("Failed to load updates:", err);
        setUpdates([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Map Update → RadialItem for the fan component
  const radialItems: RadialItem[] = updates.slice(0, 5).map((u) => ({
    id: u.id,
    title: u.title,
    content: u.content,
    createdAt: u.createdAt,
  }));

  // When user selects from the radial fan, find the full Update to open the modal
  function handleFanSelect(ri: RadialItem) {
    const full = updates.find((u) => u.id === ri.id);
    if (full) setSelected(full);
  }

  const gridItems = updates.slice(5);

  return (
    <main style={{ minHeight: "100dvh", background: "#f7f8fa" }}>
      <div className="public-container py-8">

        {/* Page header */}
        <div className="mb-7 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="flex h-9 w-9 flex-none items-center justify-center rounded-xl shadow-sm"
              style={{ background: "#02665e" }}
            >
              <Megaphone className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold leading-none text-slate-900">Updates</h1>
              <p className="mt-0.5 text-[11px] text-slate-400">News &amp; announcements from NOLSAF</p>
            </div>
          </div>
          <Link
            href="/public"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 no-underline shadow-sm transition-colors hover:border-slate-300 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <LogoSpinner size="sm" ariaLabel="Loading updates" />
          </div>
        )}

        {/* Empty */}
        {!loading && updates.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Megaphone className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No updates yet</p>
            <p className="mt-1 text-xs text-slate-400">Check back soon — we will post announcements here.</p>
          </div>
        )}

        {/* Content */}
        {!loading && updates.length > 0 && (
          <>
            {/* ── Radial fan section (top 5) ── */}
            <div
              className="mb-8 overflow-hidden"
              style={{
                background: "white",
                borderRadius: 24,
                boxShadow: "0 4px 24px rgba(0,0,0,0.07)",
                border: "1px solid #f0f0f1",
              }}
            >
              {/* Section label */}
              <div
                className="flex items-center gap-2 px-5 pt-5 pb-2"
                style={{ borderBottom: "1px solid #f4f4f5" }}
              >
                <span
                  className="inline-block rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white"
                  style={{ background: "#02665e" }}
                >
                  Featured
                </span>
                <p className="text-[12px] text-slate-400">
                  Latest {Math.min(updates.length, 5)} update{updates.length !== 1 ? "s" : ""}
                </p>
              </div>

              {/* Radial fan — scrollable on narrow viewports */}
              <div style={{ overflowX: "auto", padding: "6px 8px 10px 0" }}>
                <UpdateRadialFan
                  items={radialItems}
                  onSelect={handleFanSelect}
                />
              </div>
            </div>

            {/* ── Grid for items beyond the top 5 ── */}
            {gridItems.length > 0 && (
              <>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-slate-400">
                  More Updates
                </p>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  {gridItems.map((u) => (
                    <GridCard key={u.id} item={u} onClick={() => setSelected(u)} />
                  ))}
                </div>
              </>
            )}
          </>
        )}

      </div>

      {/* Detail modal */}
      {selected && <DetailModal item={selected} onClose={() => setSelected(null)} />}
    </main>
  );
}
