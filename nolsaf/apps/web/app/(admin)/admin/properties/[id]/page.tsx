"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { io, Socket } from "socket.io-client";
import PropertyPreview from "@/components/PropertyPreview";

export default function AdminPropertyDetail({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const router = useRouter();

  useEffect(() => {
    // Socket live refresh (status changes from other admins)
    const url = typeof window !== 'undefined'
      ? (process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000")
      : (process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "");
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const s: Socket = io(url, { auth: token ? { token } : undefined });
    
    const refreshIfMatch = (evt: any) => {
      if (evt?.id === id) {
        // Trigger a page refresh or reload
        window.location.reload();
      }
    };
    
    s.on("admin:property:status", refreshIfMatch);
    
    return () => {
      s.off("admin:property:status", refreshIfMatch);
      s.disconnect();
    };
  }, [id]);

  return (
      <PropertyPreview
        propertyId={id}
        mode="admin"
        onApproved={() => {
          // Optionally redirect or show success message
          router.refresh();
        }}
        onRejected={() => {
          router.refresh();
        }}
        onUpdated={() => {
          router.refresh();
        }}
      />
  );
}
