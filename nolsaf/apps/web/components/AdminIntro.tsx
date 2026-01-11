"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import NextImage from "next/image";

// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

type Me = { id: number; name?: string | null; email?: string | null; role?: string | null };

type Props = {
  /** Override default image path (public URL). Leave empty to use default or hide. */
  imageSrc?: string;
  /** Override default video path (public URL). If provided, takes priority over image. */
  videoSrc?: string;
};

export default function AdminIntro({ imageSrc = "/admin/welcome.jpg", videoSrc = "/admin/welcome.mp4" }: Props) {
  const [me, setMe] = useState<Me | null>(null);
  const [hidden, setHidden] = useState<boolean>(false);
  const [hasImage, setHasImage] = useState<boolean>(false);
  const [hasVideo, setHasVideo] = useState<boolean>(false);

  useEffect(() => {
    setHidden(sessionStorage.getItem("adminIntroHidden") === "1");
    api.get<Me>("/api/account/me").then(r => setMe(r.data)).catch(() => {});
  }, []);

  // Probe whether the media actually exists (so empty slots don’t render)
  useEffect(() => {
    let cancelled = false;

    async function check(url: string) {
      try {
        // HEAD request is nice-to-have, but browsers may block; just try to load via Image/Video.
        if (url.endsWith(".mp4") || url.endsWith(".webm")) {
          const v = document.createElement("video");
          v.src = url;
          v.addEventListener("loadeddata", () => !cancelled && setHasVideo(true));
          v.addEventListener("error", () => !cancelled && setHasVideo(false));
        } else {
          const img = new window.Image();
          img.onload = () => !cancelled && setHasImage(true);
          img.onerror = () => !cancelled && setHasImage(false);
          img.src = url;
        }
      } catch {
        // ignore
      }
    }

    if (videoSrc) check(videoSrc);
    if (imageSrc) check(imageSrc);

    return () => { cancelled = true; };
  }, [imageSrc, videoSrc]);

  const mediaType = useMemo<"video" | "image" | "none">(() => {
    if (hasVideo) return "video";
    if (hasImage) return "image";
    return "none";
  }, [hasVideo, hasImage]);

  if (hidden) return null;

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
      <div className="flex items-start gap-4">
        {/* Left: icon + text */}
        <div className="flex-1 flex items-start gap-3">
          <div className="mt-0.5 h-8 w-8 rounded-full bg-emerald-600 flex items-center justify-center text-white text-sm shrink-0">
            N
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-emerald-900 text-base sm:text-lg">
              Welcome to <span className="tracking-wide">NoLSAF</span> <span className="uppercase">Admin Dashboard</span>
            </div>
            <div className="text-sm text-emerald-900/80 mt-1">
              You’re logged in
              {me?.name ? <> as <b>{me.name}</b></> : null}
              {me?.email ? <> (<span className="font-mono">{me.email}</span>)</> : null}.
              &nbsp;Use the quick links or the left menu to navigate: <b>Dashboard</b>, <b>Bookings</b>, <b>Revenue</b>, <b>Owners</b>, <b>Properties</b>, <b>Settings</b>.
            </div>
          </div>
        </div>

        {/* Right: media (video takes priority if available) */}
        {mediaType !== "none" && (
          <div className="hidden sm:block shrink-0">
            <div className="w-[220px] h-[120px] rounded-lg overflow-hidden shadow-card border border-emerald-100 bg-white">
              {mediaType === "video" ? (
                <video
                  className="w-full h-full object-cover"
                  src={videoSrc}
                  autoPlay
                  muted
                  playsInline
                  loop
                  preload="metadata"
                  aria-label="Welcome video"
                />
              ) : (
                <NextImage
                  src={imageSrc}
                  alt="Welcome"
                  className="w-full h-full object-cover"
                  fill
                  priority
                  style={{ objectFit: "cover" }}
                />
              )}
            </div>
          </div>
        )}

        {/* Dismiss */}
        <button
          aria-label="Dismiss"
          className="btn-ghost !p-1 rounded-md self-start"
          onClick={() => {
            sessionStorage.setItem("adminIntroHidden", "1");
            setHidden(true);
          }}
          title="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
