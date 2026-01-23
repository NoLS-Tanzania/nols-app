"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Megaphone, Calendar, Image as ImageIcon, Video, Loader2, Play } from 'lucide-react';
import axios from 'axios';

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

function getYouTubeIdFromEmbedUrl(url: string): string | null {
  const trimmed = url.trim();
  const m = trimmed.match(/^https:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([^?/#]+)\b/);
  return m?.[1] ? m[1] : null;
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
            <Loader2 className="w-6 h-6 animate-spin text-emerald-700" />
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {latestUpdates.map((update) => {
            const firstVideo = update.videos?.[0];
            const youTubeId = firstVideo && isYouTubeEmbedUrl(firstVideo) ? getYouTubeIdFromEmbedUrl(firstVideo) : null;
            const youTubeThumb = youTubeId ? getYouTubeThumbnailUrl(youTubeId) : null;

            return (
            <Link
              key={update.id}
              href="/updates"
              className="group relative block overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 pb-6 shadow-sm will-change-transform motion-safe:transition-all motion-safe:duration-300 hover:-translate-y-1 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-200 no-underline"
            >
              <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(update.createdAt)}</span>
              </div>
              
              <h4 className="text-base font-bold text-slate-900 mb-2">{update.title}</h4>
              
              <p className="text-sm text-slate-600 mb-3 line-clamp-3">{update.content}</p>

              {update.images && update.images.length > 0 && (
                <div className="mb-3">
                  <div className="grid grid-cols-2 gap-1">
                    {update.images
                      .filter((img) => typeof img === 'string' && isSafeMediaUrl(img))
                      .slice(0, 2)
                      .map((img, idx) => (
                        // Using <img> intentionally because update images are currently data URLs
                        // and may include remote URLs without prior Next image config.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={idx}
                          src={img}
                          alt={`${update.title} - Image ${idx + 1}`}
                          className="w-full h-20 object-cover rounded-lg border border-slate-200"
                          loading="lazy"
                          decoding="async"
                        />
                      ))}
                  </div>
                  {update.images.length > 2 && (
                    <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                      <ImageIcon className="w-3 h-3" />
                      <span>+{update.images.length - 2} more images</span>
                    </div>
                  )}
                </div>
              )}

              {!update.images?.length && update.videos && update.videos.length > 0 && (
                <div className="mb-3">
                  {youTubeThumb ? (
                    <div className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={youTubeThumb}
                        alt={`${update.title} video thumbnail`}
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
                  ) : (
                    <div className="w-full h-32 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-500">
                      <Video className="w-5 h-5" />
                    </div>
                  )}
                  {update.videos.length > 1 && (
                    <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                      <Video className="w-3 h-3" />
                      <span>+{update.videos.length - 1} more videos</span>
                    </div>
                  )}
                </div>
              )}

              {/* bottom accent bar */}
              <div className="absolute left-0 right-0 bottom-0 h-1 bg-emerald-600" aria-hidden />
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
