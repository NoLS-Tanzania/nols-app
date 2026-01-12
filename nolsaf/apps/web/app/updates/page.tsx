"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { Calendar, ExternalLink, Image as ImageIcon, Loader2, Megaphone, Play, Video } from "lucide-react";

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

function isYouTubeEmbedUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  return (
    trimmed.startsWith("https://www.youtube.com/embed/") ||
    trimmed.startsWith("https://www.youtube-nocookie.com/embed/")
  );
}

function getYouTubeIdFromEmbedUrl(url: string): string | null {
  const trimmed = url.trim();
  const m = trimmed.match(/^https:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([^?/#]+)\b/);
  return m?.[1] ? m[1] : null;
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
          <Loader2 className="w-6 h-6 animate-spin text-emerald-700" />
        </div>
      ) : updates.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-800">No updates yet.</p>
          <p className="mt-1 text-xs text-slate-500">Check back soon — we’ll post announcements here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {updates.map((u) => (
            <article
              key={u.id}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 pb-6 shadow-sm will-change-transform motion-safe:transition-all motion-safe:duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              {u.videos && u.videos.length > 0 && isYouTubeEmbedUrl(u.videos[0]) && (
                <div className="mb-3">
                  {(() => {
                    const vid = getYouTubeIdFromEmbedUrl(u.videos![0]);
                    const thumb = vid ? getYouTubeThumbnailUrl(vid) : null;
                    return thumb ? (
                      <div className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={thumb}
                          alt={`${u.title} video thumbnail`}
                          className="w-full h-32 object-cover"
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 grid place-items-center">
                          <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white/90 border border-slate-200 shadow-sm">
                            <Play className="w-5 h-5 text-emerald-700" />
                          </span>
                        </div>
                      </div>
                    ) : null;
                  })()}
                </div>
              )}

              <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(u.createdAt)}</span>
              </div>

              <h2 className="text-base font-bold text-slate-900 mb-2">{u.title}</h2>
              <p className="text-sm text-slate-600 mb-3 line-clamp-3">{u.content}</p>

              {u.images && u.images.length > 0 && (
                <div className="mb-3">
                  <div className="grid grid-cols-2 gap-1">
                    {u.images
                      .filter((img) => typeof img === "string" && isSafeMediaUrl(img))
                      .slice(0, 2)
                      .map((img, idx) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={idx}
                          src={img}
                          alt={`${u.title} - Image ${idx + 1}`}
                          className="w-full h-20 object-cover rounded-lg border border-slate-200"
                          loading="lazy"
                          decoding="async"
                        />
                      ))}
                  </div>
                  {u.images.length > 2 && (
                    <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      <span>+{u.images.length - 2} more images</span>
                    </div>
                  )}
                </div>
              )}

              {u.videos && u.videos.length > 0 && (
                <div className="mb-3">
                  {isYouTubeEmbedUrl(u.videos[0]) ? (
                    <div className="w-full overflow-hidden rounded-lg border border-slate-200">
                      <iframe
                        src={u.videos[0]}
                        title={`${u.title} video`}
                        className="w-full h-32"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        allow="autoplay; encrypted-media; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <video
                      src={u.videos[0]}
                      controls
                      preload="none"
                      className="w-full h-32 object-cover rounded-lg border border-slate-200"
                    />
                  )}

                  {u.videos.length > 1 && (
                    <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                      <Video className="w-3 h-3" />
                      <span>+{u.videos.length - 1} more videos</span>
                    </div>
                  )}
                </div>
              )}

              <div className="absolute left-0 right-0 bottom-0 h-1 bg-emerald-600" aria-hidden />
            </article>
          ))}
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
