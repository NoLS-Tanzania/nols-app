"use client";

import { useEffect } from "react";

function openBrandedLoginPrompt(message: string) {
  const existing = document.getElementById("global-alert-guard-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.id = "global-alert-guard-overlay";
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "9999";
  overlay.style.background = "rgba(2, 6, 23, 0.42)";
  overlay.style.backdropFilter = "blur(2px)";
  overlay.style.padding = "16px";
  overlay.style.display = "flex";
  overlay.style.alignItems = "flex-start";
  overlay.style.justifyContent = "center";

  const card = document.createElement("div");
  card.style.width = "100%";
  card.style.maxWidth = "460px";
  card.style.marginTop = "10vh";
  card.style.borderRadius = "24px";
  card.style.overflow = "hidden";
  card.style.background = "#ffffff";
  card.style.border = "1px solid rgba(2, 102, 94, 0.25)";
  card.style.boxShadow = "0 20px 64px rgba(2, 102, 94, 0.30)";

  const header = document.createElement("div");
  header.style.padding = "18px 22px";
  header.style.color = "#ffffff";
  header.style.fontWeight = "800";
  header.style.fontSize = "18px";
  header.style.backgroundColor = "#02665e";
  header.style.backgroundImage =
    "repeating-linear-gradient(-32deg, rgba(255,255,255,0.18) 0px, rgba(255,255,255,0.18) 2px, rgba(255,255,255,0) 2px, rgba(255,255,255,0) 14px)";
  header.textContent = "Please log in";

  const body = document.createElement("div");
  body.style.padding = "20px 22px 18px";

  const text = document.createElement("p");
  text.style.margin = "0";
  text.style.color = "#334155";
  text.style.fontSize = "14px";
  text.style.lineHeight = "1.55";
  text.textContent = message || "Please log in to save properties.";

  const actions = document.createElement("div");
  actions.style.marginTop = "16px";
  actions.style.display = "flex";
  actions.style.justifyContent = "flex-end";
  actions.style.gap = "10px";

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.textContent = "Not now";
  closeBtn.style.borderRadius = "12px";
  closeBtn.style.border = "1px solid #e2e8f0";
  closeBtn.style.background = "#ffffff";
  closeBtn.style.padding = "8px 14px";
  closeBtn.style.fontSize = "14px";
  closeBtn.style.fontWeight = "700";
  closeBtn.style.color = "#334155";
  closeBtn.style.cursor = "pointer";

  const loginBtn = document.createElement("button");
  loginBtn.type = "button";
  loginBtn.textContent = "Log in";
  loginBtn.style.borderRadius = "12px";
  loginBtn.style.border = "1px solid #02665e";
  loginBtn.style.background = "#02665e";
  loginBtn.style.padding = "8px 14px";
  loginBtn.style.fontSize = "14px";
  loginBtn.style.fontWeight = "700";
  loginBtn.style.color = "#ffffff";
  loginBtn.style.cursor = "pointer";

  const close = () => overlay.remove();

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  closeBtn.addEventListener("click", close);
  loginBtn.addEventListener("click", () => {
    close();
    const next = encodeURIComponent(`${window.location.pathname}${window.location.search}`);
    window.location.href = `/login?next=${next}`;
  });

  actions.appendChild(closeBtn);
  actions.appendChild(loginBtn);
  body.appendChild(text);
  body.appendChild(actions);
  card.appendChild(header);
  card.appendChild(body);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

export default function GlobalAlertGuard() {
  useEffect(() => {
    const originalAlert = window.alert;

    window.alert = (message?: any) => {
      const raw = String(message ?? "");
      const normalized = raw.toLowerCase();
      const isSaveLoginPrompt =
        normalized.includes("please log in to save propert") ||
        normalized.includes("please login to save propert") ||
        normalized.includes("log in to save propert") ||
        normalized.includes("login to save propert");

      if (isSaveLoginPrompt) {
        openBrandedLoginPrompt(raw || "Please log in to save properties.");
        return;
      }

      originalAlert(message as any);
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  return null;
}
