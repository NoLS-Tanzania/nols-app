"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type NavContext = "agent" | "public";

function detectNavContext(): NavContext {
  if (typeof window === "undefined") return "public";

  const queryCtx = new URLSearchParams(window.location.search).get("ctx")?.toLowerCase() || "";
  if (queryCtx === "agent") return "agent";

  const stored = (sessionStorage.getItem("navigationContext") || "").toLowerCase();
  if (stored === "agent") return "agent";

  return "public";
}

export default function HelpBackLink() {
  const [href, setHref] = useState("/help");

  useEffect(() => {
    const next = detectNavContext();
    if (next === "agent") {
      sessionStorage.setItem("navigationContext", "agent");
      setHref("/help?ctx=agent");
    } else {
      setHref("/help");
    }
  }, []);

  return (
    <Link
      href={href}
      aria-label="Back to Help Center"
      className="no-underline inline-flex items-center justify-center h-9 w-9 rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:text-[#02665e] hover:border-[#02665e]/40 hover:shadow-md hover:-translate-x-0.5 transition-all duration-200"
      onClick={() => {
        if (typeof window !== "undefined") {
          const stored = (sessionStorage.getItem("navigationContext") || "").toLowerCase();
          if (stored === "agent") sessionStorage.setItem("navigationContext", "agent");
        }
      }}
    >
      <ArrowLeft className="h-4 w-4" />
    </Link>
  );
}
