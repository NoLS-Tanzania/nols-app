"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Megaphone } from "lucide-react";
import axios from "axios";
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

export default function LatestUpdate({ hideTitle = false }: { hideTitle?: boolean }) {
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
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <aside className="mt-6">
        <div className="public-container">
          <div className="flex items-center justify-center py-10">
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
          {!hideTitle && (
            <div className="mb-3 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#02665e]" />
              <h2 className="text-base font-bold tracking-tight text-slate-900">Latest Updates</h2>
            </div>
          )}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">No updates yet. Check back soon.</p>
          </div>
        </div>
      </aside>
    );
  }

  const radialItems: RadialItem[] = updates.slice(0, 5).map((u) => ({
    id: u.id,
    title: u.title,
    content: u.content,
    createdAt: u.createdAt,
  }));

  // (mobile fallback removed — fan scales to all screen sizes)

  return (
    <aside className="mt-6">
      <div className="public-container">

        {/* ── Section header ── */}
        {!hideTitle && (
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-[#02665e]" />
              <h2 className="text-base font-bold tracking-tight text-slate-900">Latest Updates</h2>
            </div>
            <Link
              href="/updates"
              className="flex items-center gap-1 text-xs font-semibold no-underline transition-opacity hover:opacity-60"
              style={{ color: "#02665e" }}
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        )}

        {/* ── Radial fan — scales to fit any screen width ── */}
        <div
          style={{
            background: "white",
            borderRadius: 20,
            padding: "12px 12px 12px 0",
            boxShadow: "0 2px 16px rgba(0,0,0,0.06)",
            border: "1px solid #f0f0f1",
          }}
        >
          <UpdateRadialFan items={radialItems} />
        </div>

      </div>
    </aside>
  );
}
