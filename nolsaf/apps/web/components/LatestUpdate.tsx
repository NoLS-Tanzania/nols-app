"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Megaphone, Calendar, Image as ImageIcon, Video, Play } from 'lucide-react';
import axios from 'axios';
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
  if (trimmed.startsWith('/')) return true;
  // Allow data URLs used by current in-memory updates implementation.
  if (trimmed.startsWith('data:image/')) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function isYouTubeEmbedUrl(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  // Admin updates UI stores YouTube embed URLs.
  return (
    trimmed.startsWith('https://www.youtube.com/embed/') ||
    trimmed.startsWith('https://www.youtube-nocookie.com/embed/')
  );
}

function getYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    const host = parsed.hostname.replace(/^www\./, '');

    // https://youtu.be/<id>
    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      return id || null;
    }

    // https://youtube.com/embed/<id> or /shorts/<id>
    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com') {
      const parts = parsed.pathname.split('/').filter(Boolean);
      const head = parts[0];
      const maybeId = parts[1];

      if (head === 'embed' && maybeId) return maybeId;
      if (head === 'shorts' && maybeId) return maybeId;

      // https://youtube.com/watch?v=<id>
      const v = parsed.searchParams.get('v');
      if (v) return v;
    }

    return null;
  } catch {
    // Some updates might store a non-URL string; ignore.
    return null;
  }
}

function getYouTubeThumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

export default function LatestUpdate({ hideTitle = false }: { hideTitle?: boolean }) {
  const [updates, setUpdates] = useState<Update[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUpdates() {
      try {
        const api = axios.create({ baseURL: "" });
        const res = await api.get<{ items: Update[] }>("/api/public/updates");
        setUpdates(res.data?.items || []);
      } catch (err) {
        console.error("Failed to load updates:", err);
      } finally {
        setLoading(false);
      }
    }
    loadUpdates();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <aside className="mt-6">
        <div className="public-container">
          <div className="flex items-center justify-center py-12">
            <LogoSpinner size="sm" ariaLabel="Loading updates" />
          </div>
        </div>
      </aside>
    );
  }

  if (updates.length === 0) {
    return (
      <aside className="mt-6">
        <div className="public-container">
          {hideTitle ? null : (
            <div className="mb-4 flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-emerald-700" />
              <h2 className="text-xl font-bold text-slate-900">Latest Updates</h2>
            </div>
          )}
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-700 font-medium">No updates yet.</p>
            <p className="text-xs text-slate-500 mt-1">
              Check back soon — we’ll post announcements here.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  // Display latest 3 updates
  const latestUpdates = updates.slice(0, 3);

  return (
    <aside className="mt-6">
      <div className="public-container">
        {hideTitle ? null : (
          <div className="mb-4 flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-emerald-700" />
            <h2 className="text-xl font-bold text-slate-900">Latest Updates</h2>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {latestUpdates.map((update) => {
            const safeImages = (update.images || []).filter((img) => typeof img === 'string' && isSafeMediaUrl(img));
            const youTubeUrl = (update.videos || []).find((v) => typeof v === 'string' && getYouTubeId(v) !== null);
            const youTubeId = youTubeUrl ? getYouTubeId(youTubeUrl) : null;
            const youTubeThumb = youTubeId ? getYouTubeThumbnailUrl(youTubeId) : null;
            const hasAnyVideo = (update.videos || []).length > 0;

            const mediaType: 'youtube' | 'image' | 'video' | 'none' =
              youTubeThumb ? 'youtube' : safeImages.length ? 'image' : hasAnyVideo ? 'video' : 'none';

            const mediaSrc = mediaType === 'youtube' ? youTubeThumb : mediaType === 'image' ? safeImages[0] : null;
            const overlayLogoSrc = mediaType === 'youtube' && safeImages.length ? safeImages[0] : null;
            const extraMediaCount =
              mediaType === 'youtube'
                ? Math.max(0, (update.videos?.length || 0) - 1)
                : mediaType === 'image'
                  ? Math.max(0, safeImages.length - 1)
                  : 0;

            return (
            <Link
              key={update.id}
              href="/updates"
              className="group block no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-200"
            >
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-200/70 via-white/60 to-emerald-200/40 p-[1px] shadow-sm will-change-transform motion-safe:transition-all motion-safe:duration-300 group-hover:-translate-y-0.5 group-hover:shadow-md">
                <div className="rounded-3xl border border-white/50 bg-white/70 p-3 backdrop-blur-xl">
                  <div className="flex gap-3">
                    {mediaType !== 'none' ? (
                      <div className="relative shrink-0">
                        <div className="relative h-20 w-32 overflow-hidden rounded-2xl border border-white/50 bg-slate-50">
                          {mediaSrc ? (
                            // Using <img> intentionally because update media can be data URLs
                            // and may include remote URLs without prior Next image config.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={mediaSrc}
                              alt={
                                mediaType === 'youtube'
                                  ? `${update.title} video thumbnail`
                                  : `${update.title} image`
                              }
                              className={
                                mediaType === 'youtube'
                                  ? 'h-full w-full object-cover'
                                  : 'h-full w-full object-contain bg-white'
                              }
                              loading="lazy"
                              decoding="async"
                              referrerPolicy={mediaType === 'youtube' ? 'no-referrer' : undefined}
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
                                  alt={`${update.title} logo`}
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

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
                        <Calendar className="h-3 w-3" />
                        <span>{formatDate(update.createdAt)}</span>
                        {hasAnyVideo ? (
                          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                            <Video className="h-3 w-3" />
                            <span>Video</span>
                          </span>
                        ) : null}
                      </div>

                      <h4 className="mt-2 text-[15px] font-bold leading-snug text-slate-900 line-clamp-2">
                        {update.title}
                      </h4>

                      <p className="mt-1 text-sm leading-relaxed text-slate-600 line-clamp-2">
                        {update.content}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          );
          })}
        </div>
        
        {updates.length > 0 && (
          <div className="mt-4 text-center">
            <Link
              href="/updates"
              className="inline-flex items-center text-sm font-medium text-emerald-700 no-underline group hover:underline"
            >
              <span>View all updates</span>
              <ExternalLink className="w-4 h-4 ml-1 motion-safe:transition-transform motion-safe:duration-300 group-hover:translate-x-0.5" />
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
