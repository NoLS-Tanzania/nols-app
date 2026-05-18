"use client";

import { useParams } from "next/navigation";
import { OperatorProfilePreviewScreen } from "@/app/account/agent/profile/preview/page";
import LogoSpinner from "@/components/LogoSpinner";

export default function SubmittedProfileSlugPage() {
  const params = useParams<{ id?: string | string[] }>();
  const idParam = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const adminAgentId = Number(idParam);

  if (!Number.isFinite(adminAgentId) || adminAgentId <= 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <LogoSpinner size="lg" />
      </div>
    );
  }

  return <OperatorProfilePreviewScreen adminAgentId={adminAgentId} />;
}
