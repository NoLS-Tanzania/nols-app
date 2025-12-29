"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfileTabRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to account page (profile is now merged into account)
    router.replace('/account');
  }, [router]);

  return null;
}
