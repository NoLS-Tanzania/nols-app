"use client";

// This page has been replaced by /admin/agents/twiga
// Redirecting to the new modern dashboard
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function TwigaConversationsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin/agents/twiga");
  }, [router]);
  return null;
}

