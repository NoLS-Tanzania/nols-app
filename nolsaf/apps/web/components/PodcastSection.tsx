"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Play, User, } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

type Episode = {
  id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  thumbnailUrl: string | null;
  guestName: string | null;
  guestRole: string | null;
  tags: string[];
  duration: string | null;
  publishedAt: string | null;
};

function extractYouTubeId(url: string): string | null {
  try {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/,
    ];
    for (const p of patterns) {
      const m = url.match(p);
      if (m) return m[1];
    }
    return null;
  } catch {
    return null;
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PodcastSection() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    async function load() {
      try {
        const api = axios.create({ baseURL: "" });
        const res = await api.get<{ items: Episode[] }>("/api/public/podcasts?limit=6");
        setEpisodes(res.data?.items || []);
      } catch {
        // Silently fail — section just won't render
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Don't render section if no episodes or still loading
  if (loading || episodes.length === 0) return null;

  return (
    <section className="mt-14">
      {/* ── Section header ──────────────────────────────────────────────── */}
      <motion.div
        initial={prefersReduced ? undefined : { opacity: 0, y: 20 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex flex-col items-center text-center mb-10"
      >
        {/* Eyebrow pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#02665e]/8 border border-[#02665e]/15 mb-4">
          <div className="h-5 w-5 rounded-lg bg-[#02665e]/15 flex items-center justify-center">
            <Play className="h-3 w-3 text-[#02665e] fill-[#02665e] ml-px" aria-hidden />
          </div>
          <span className="text-[11px] font-bold tracking-[0.14em] text-[#02665e]">
            NoLSAF Media
          </span>
        </div>

        {/* Title */}
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight text-slate-900 mb-3">
          Podcast &{" "}
          <span className="bg-gradient-to-r from-[#02665e] to-[#02b4f5] bg-clip-text text-transparent">
            Insights
          </span>
        </h2>

        {/* Divider */}
        <div className="flex items-center gap-2 mb-4">
          <div className="h-px w-10 bg-gradient-to-r from-transparent to-[#02665e]/30" />
          <div className="h-1 w-1 rounded-full bg-[#02b4f5]/60" />
          <div className="h-px w-16 bg-[#02665e]/20" />
          <div className="h-1.5 w-1.5 rounded-full bg-[#02665e]/40" />
          <div className="h-px w-16 bg-[#02665e]/20" />
          <div className="h-1 w-1 rounded-full bg-[#02b4f5]/60" />
          <div className="h-px w-10 bg-gradient-to-l from-transparent to-[#02665e]/30" />
        </div>

        {/* Description */}
        <p className="max-w-[48ch] text-sm sm:text-[15px] leading-relaxed text-slate-500">
          Interviews with stakeholders, travel industry updates, and behind-the-scenes at NoLSAF.
        </p>
      </motion.div>

      {/* Episode cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-[0.75fr_1.5fr_0.75fr] gap-4 lg:items-start">
        {episodes.map((ep, idx) => {
          const videoId = extractYouTubeId(ep.youtubeUrl);
          const isCenter = idx % 3 === 1;
          const thumbHq = ep.thumbnailUrl || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null);
          const thumbMq = ep.thumbnailUrl || (videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null);
          const thumb = (idx === 0 || isCenter) ? thumbHq : thumbMq;
          const watchUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : ep.youtubeUrl;

          return (
            <motion.div
              key={ep.id}
              initial={prefersReduced ? undefined : { opacity: 0, y: 16 }}
              transition={{ duration: 0.35, delay: idx * 0.05, ease: "easeOut" }}
              className={isCenter ? "lg:-translate-y-3" : ""}
            >
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`group block overflow-hidden transition-all duration-300 no-underline ${
                isCenter
                  ? "rounded-2xl ring-2 ring-[#02665e]/20 bg-white shadow-[0_8px_32px_rgba(2,102,94,0.13)] hover:-translate-y-1 hover:shadow-[0_16px_48px_rgba(2,102,94,0.18)]"
                  : "rounded-xl ring-1 ring-slate-200 bg-white hover:shadow-[0_4px_16px_rgba(2,6,23,0.08)]"
              }`}
            >
              {isCenter ? (
                /* ── Center card: full vertical layout ── */
                <>
                  <div className="relative aspect-video bg-slate-100 overflow-hidden">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt=""
                        width={480}
                        height={360}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading={idx === 0 ? "eager" : "lazy"}
                        fetchPriority={idx === 0 ? "high" : "low"}
                        decoding="async"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50">
                        <Play className="h-10 w-10 text-slate-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors duration-300">
                      <div className="h-12 w-12 rounded-full bg-white/90 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 scale-90 group-hover:scale-100">
                        <Play className="h-5 w-5 text-slate-900 fill-slate-900 ml-0.5" />
                      </div>
                    </div>
                    {ep.duration && (
                      <span className="absolute bottom-2 right-2 rounded bg-black/75 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">
                        {ep.duration}
                      </span>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-[17px] leading-snug text-slate-900 line-clamp-2 group-hover:text-[#02665e] transition-colors duration-200">
                      {ep.title}
                    </h3>
                    {(ep.guestName || ep.guestRole) && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                        <User className="h-3 w-3 flex-shrink-0" aria-hidden />
                        <span>{ep.guestName}{ep.guestRole && <span className="text-slate-400"> · {ep.guestRole}</span>}</span>
                      </div>
                    )}
                    <p className="mt-2 text-[13px] leading-relaxed text-slate-500 line-clamp-2">{ep.description}</p>
                    <div className="mt-3 flex items-center justify-between">
                      {ep.publishedAt && <span className="text-[11px] text-slate-400 font-medium">{formatDate(ep.publishedAt)}</span>}
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#02665e] opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        Watch <Play className="h-3 w-3 fill-current" aria-hidden />
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                /* ── Side cards: compact horizontal mini-card ── */
                <div className="flex gap-0 overflow-hidden">
                  {/* Thumbnail — fixed small square */}
                  <div className="relative w-24 flex-shrink-0 bg-slate-100">
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt=""
                        width={320}
                        height={180}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        fetchPriority="low"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="h-5 w-5 text-slate-300" />
                      </div>
                    )}
                    {ep.duration && (
                      <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-px text-[9px] font-semibold text-white tabular-nums">
                        {ep.duration}
                      </span>
                    )}
                  </div>
                  {/* Text */}
                  <div className="flex-1 min-w-0 px-2.5 py-2.5">
                    <h3 className="font-semibold text-[12px] leading-snug text-slate-800 line-clamp-2 group-hover:text-[#02665e] transition-colors duration-200">
                      {ep.title}
                    </h3>
                    {ep.guestName && (
                      <p className="mt-1 text-[10px] text-slate-400 truncate">{ep.guestName}</p>
                    )}
                    {ep.publishedAt && (
                      <p className="mt-1.5 text-[10px] text-slate-300 font-medium">{formatDate(ep.publishedAt)}</p>
                    )}
                  </div>
                </div>
              )}
            </a>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
