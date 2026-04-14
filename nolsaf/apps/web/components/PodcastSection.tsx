"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Play, User, Clock } from "lucide-react";
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
      {/* Heading — left-aligned editorial with a distinct accent */}
      <div className="flex items-start gap-3 mb-2">
        <div className="mt-1.5 flex-shrink-0 h-9 w-9 rounded-xl bg-gradient-to-br from-[#02b4f5] to-[#02665e] flex items-center justify-center shadow-sm">
          <Play className="h-4 w-4 text-white fill-white" aria-hidden />
        </div>
        <div>
          <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-slate-400 mb-1">NoLSAF Media</p>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-[1.15] text-slate-900">
            Podcast & <span className="bg-gradient-to-r from-[#02b4f5] to-[#02665e] bg-clip-text text-transparent">Insights</span>
          </h2>
        </div>
      </div>
      <p className="max-w-[56ch] text-sm sm:text-[15px] leading-relaxed text-slate-500 mb-8">
        Interviews with stakeholders, travel industry updates, and behind-the-scenes at NoLSAF.
      </p>

      {/* Episode cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {episodes.map((ep, idx) => {
          const videoId = extractYouTubeId(ep.youtubeUrl);
          const thumb = ep.thumbnailUrl || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null);
          const watchUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : ep.youtubeUrl;

          return (
            <motion.div
              key={ep.id}
              initial={prefersReduced ? undefined : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-30px' }}
              transition={{ duration: 0.45, delay: idx * 0.1, ease: [0.2, 0.8, 0.2, 1] }}
            >
            <a
              href={watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-2xl ring-1 ring-slate-200/80 bg-white overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(2,6,23,0.10)] no-underline"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-slate-100 overflow-hidden">
                {thumb ? (
                  <img
                    src={thumb}
                    alt=""
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50">
                    <Play className="h-10 w-10 text-slate-300" />
                  </div>
                )}
                {/* Play overlay */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors duration-300">
                  <div className="h-12 w-12 rounded-full bg-white/90 shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 scale-90 group-hover:scale-100">
                    <Play className="h-5 w-5 text-slate-900 fill-slate-900 ml-0.5" />
                  </div>
                </div>
                {/* Duration badge */}
                {ep.duration && (
                  <span className="absolute bottom-2 right-2 rounded bg-black/75 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">
                    {ep.duration}
                  </span>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <h3 className="font-bold text-[15px] leading-snug text-slate-900 line-clamp-2 group-hover:text-[#02665e] transition-colors duration-200">
                  {ep.title}
                </h3>

                {(ep.guestName || ep.guestRole) && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <User className="h-3 w-3 flex-shrink-0" aria-hidden />
                    <span>
                      {ep.guestName}
                      {ep.guestRole && <span className="text-slate-400"> · {ep.guestRole}</span>}
                    </span>
                  </div>
                )}

                <p className="mt-2 text-[13px] leading-relaxed text-slate-500 line-clamp-2">
                  {ep.description}
                </p>

                <div className="mt-3 flex items-center justify-between">
                  {ep.publishedAt && (
                    <span className="text-[11px] text-slate-400 font-medium">
                      {formatDate(ep.publishedAt)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#02665e] opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    Watch
                    <Play className="h-3 w-3 fill-current" aria-hidden />
                  </span>
                </div>
              </div>
            </a>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
