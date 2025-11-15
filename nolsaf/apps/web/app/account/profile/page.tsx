"use client";
import { useEffect } from "react";

// This page was deprecated in favor of the driver-scoped profile page.
// Redirect the user to `/driver/profile` to keep a single canonical profile entry point.
export default function ProfileTabRedirect(){
  useEffect(()=>{ if (typeof window !== 'undefined') window.location.href = '/driver/profile'; }, []);
  return <div>Redirecting to driver profile…</div>;
}
