"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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
      className="text-sm text-slate-600 hover:text-slate-900 no-underline"
      onClick={() => {
        if (typeof window !== "undefined") {
          const stored = (sessionStorage.getItem("navigationContext") || "").toLowerCase();
          if (stored === "agent") sessionStorage.setItem("navigationContext", "agent");
        }
      }}
    >
      Back to Help Center
    </Link>
  );
}
