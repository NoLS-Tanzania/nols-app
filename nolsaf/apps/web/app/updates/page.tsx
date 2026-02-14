"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { Calendar, ExternalLink, Megaphone, Play, Video } from "lucide-react";
import LogoSpinner from "@/components/LogoSpinner";

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
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/")) return true;
  if (trimmed.startsWith("data:image/")) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function getYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id || null;
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
      const parts = parsed.pathname.split("/").filter(Boolean);
      const head = parts[0];
      const maybeId = parts[1];

      if (head === "embed" && maybeId) return maybeId;
      if (head === "shorts" && maybeId) return maybeId;

      const v = parsed.searchParams.get("v");
      if (v) return v;
    }

    return null;
  } catch {
    return null;
  }
}

function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function UpdatesIndexPage() {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <main className="public-container py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-emerald-700" />
          <h1 className="text-2xl font-bold text-slate-900">Updates</h1>
        </div>
        <Link
          href="/public"
          className="text-sm font-medium text-slate-600 hover:text-slate-900 no-underline"
        >
          Back to public
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <LogoSpinner size="sm" ariaLabel="Loading updates" />
        </div>
      ) : updates.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-800">No updates yet.</p>
          <p className="mt-1 text-xs text-slate-500">Check back soon — we’ll post announcements here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {updates.map((u) => {
            const safeImages = (u.images || []).filter((img) => typeof img === "string" && isSafeMediaUrl(img));
            const youTubeUrl = (u.videos || []).find((v) => typeof v === "string" && getYouTubeId(v) !== null);
            const youTubeId = youTubeUrl ? getYouTubeId(youTubeUrl) : null;
            const youTubeThumb = youTubeId ? getYouTubeThumbnailUrl(youTubeId) : null;
            const hasAnyVideo = (u.videos || []).length > 0;
            const hasAnyImage = safeImages.length > 0;

            const mediaType: "youtube" | "image" | "video" | "none" =
              youTubeThumb ? "youtube" : hasAnyImage ? "image" : hasAnyVideo ? "video" : "none";
            const mediaSrc = mediaType === "youtube" ? youTubeThumb : mediaType === "image" ? safeImages[0] : null;
            const overlayLogoSrc = mediaType === "youtube" && safeImages.length ? safeImages[0] : null;
            const extraMediaCount =
              mediaType === "youtube"
                ? Math.max(0, (u.videos?.length || 0) - 1)
                : mediaType === "image"
                  ? Math.max(0, safeImages.length - 1)
                  : 0;

            return (
              <Link
                key={u.id}
                href="/updates"
                className="group block no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-200"
              >
                <article className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-200/70 via-white/60 to-emerald-200/40 p-[1px] shadow-sm will-change-transform motion-safe:transition-all motion-safe:duration-300 group-hover:-translate-y-0.5 group-hover:shadow-md">
                  <div className="rounded-3xl border border-white/50 bg-white/70 p-3 backdrop-blur-xl">
                    {mediaType !== "none" ? (
                      <div className="relative">
                        <div className="relative h-20 w-full overflow-hidden rounded-2xl border border-white/50 bg-slate-50">
                          {mediaSrc ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={mediaSrc}
                              alt={
                                mediaType === "youtube"
                                  ? `${u.title} video thumbnail`
                                  : `${u.title} image`
                              }
                              className={
                                mediaType === "youtube"
                                  ? "h-full w-full object-cover"
                                  : "h-full w-full object-contain bg-white"
                              }
                              loading="lazy"
                              decoding="async"
                              referrerPolicy={mediaType === "youtube" ? "no-referrer" : undefined}
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-slate-500">
                              <Video className="h-5 w-5" />
                            </div>
                          )}

                          {overlayLogoSrc ? (
                            <div className="absolute left-2 top-2">
                              <span className="inline-flex items-center rounded-xl border border-white/70 bg-white/80 p-1 shadow-sm">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={overlayLogoSrc}
                                  alt={`${u.title} logo`}
                                  className="h-6 w-6 object-contain"
                                  loading="lazy"
                                  decoding="async"
                                />
                              </span>
                            </div>
                          ) : null}

                          {hasAnyVideo ? (
                            <div className="absolute inset-0 grid place-items-center">
                              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/90 shadow-sm">
                                <Play className="h-4 w-4 text-emerald-700" />
                              </span>
                            </div>
                          ) : null}

                          {extraMediaCount > 0 ? (
                            <div className="absolute right-2 top-2">
                              <span className="inline-flex items-center rounded-full border border-white/60 bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-slate-700 shadow-sm">
                                +{extraMediaCount}
                              </span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-2 flex items-center gap-2 text-[11px] font-medium text-slate-500">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(u.createdAt)}</span>
                    </div>

                    <h2 className="mt-2 text-[14px] font-bold leading-snug text-slate-900 line-clamp-2">
                      {u.title}
                    </h2>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 line-clamp-2">{u.content}</p>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>
      )}

      <div className="mt-8">
        <Link
          href="/public"
          className="inline-flex items-center text-sm font-medium text-emerald-700 no-underline group hover:underline"
        >
          <span>Explore public page</span>
          <ExternalLink className="w-4 h-4 ml-1 motion-safe:transition-transform motion-safe:duration-300 group-hover:translate-x-0.5" />
        </Link>
      </div>
    </main>
  );
}
