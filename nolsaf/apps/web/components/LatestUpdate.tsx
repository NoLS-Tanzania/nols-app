"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Megaphone, Calendar, Image as ImageIcon, Video, Loader2 } from 'lucide-react';
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

export default function LatestUpdate() {
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
            <Loader2 className="w-6 h-6 animate-spin text-[#02665e]" />
          </div>
        </div>
      </aside>
    );
  }

  if (updates.length === 0) {
    return null; // Don't show section if no updates
  }

  // Display latest 3 updates
  const latestUpdates = updates.slice(0, 3);

  return (
    <aside className="mt-6">
      <div className="public-container">
        <div className="mb-4 flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-[#02665e]" />
          <h2 className="text-xl font-bold text-slate-900">Latest Updates</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {latestUpdates.map((update) => (
            <div
              key={update.id}
              className="relative overflow-hidden rounded-lg border border-slate-200 border-l-4 border-l-[#02665e] bg-white p-4 pb-6 shadow-sm transform-gpu transition-transform duration-150 ease-in-out hover:-translate-y-1 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-300"
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
                    {update.images.slice(0, 2).map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`${update.title} - Image ${idx + 1}`}
                        className="w-full h-20 object-cover rounded border"
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

              {update.videos && update.videos.length > 0 && (
                <div className="mb-3">
                  <video
                    src={update.videos[0]}
                    controls
                    className="w-full h-32 object-cover rounded border"
                  >
                    Your browser does not support the video tag.
                  </video>
                  {update.videos.length > 1 && (
                    <div className="mt-1 text-xs text-slate-500 flex items-center gap-1">
                      <Video className="w-3 h-3" />
                      <span>+{update.videos.length - 1} more videos</span>
                    </div>
                  )}
                </div>
              )}

              {/* bottom color bar */}
              <div className="absolute left-0 right-0 bottom-0 h-1 bg-[#02665e]" aria-hidden />
            </div>
          ))}
        </div>
        
        {updates.length > 3 && (
          <div className="mt-4 text-center">
            <Link
              href="/updates"
              className="inline-flex items-center text-sm font-medium text-[#02665e] no-underline group hover:underline"
            >
              <span>View all updates</span>
              <ExternalLink className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
