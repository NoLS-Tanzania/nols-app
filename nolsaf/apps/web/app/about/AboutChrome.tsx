"use client";

import { useEffect, useState } from "react";

import AgentPortalHeader from "@/components/AgentPortalHeader";
import AgentFooter from "@/components/AgentFooter";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";

type NavContext = "agent" | "public";

function readNavContext(): NavContext {
  if (typeof window === "undefined") return "public";
  const queryCtx = new URLSearchParams(window.location.search).get("ctx")?.toLowerCase() || "";
  if (queryCtx === "agent") return "agent";

  const raw = (sessionStorage.getItem("navigationContext") || "").toLowerCase();
  if (raw === "agent") return "agent";

  const ref = (document.referrer || "").toLowerCase();
  if (ref.includes("/account/agent")) return "agent";

  return "public";
}

export function AboutHeader() {
  const [ctx, setCtx] = useState<NavContext | null>(null);

  useEffect(() => {
    const next = readNavContext();
    setCtx(next);
    if (next === "agent") sessionStorage.setItem("navigationContext", "agent");
  }, []);

  if (ctx === null) return null;
  return ctx === "agent" ? <AgentPortalHeader /> : <PublicHeader />;
}

export function AboutFooter() {
  const [ctx, setCtx] = useState<NavContext | null>(null);

  useEffect(() => {
    const next = readNavContext();
    setCtx(next);
    if (next === "agent") sessionStorage.setItem("navigationContext", "agent");
  }, []);

  if (ctx === null) return null;
  return ctx === "agent" ? <AgentFooter withRail={false} /> : <PublicFooter withRail={false} />;
}
