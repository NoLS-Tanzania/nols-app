import { redirect } from "next/navigation";

export default async function ReferralRedirectPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const referralCode = String(code || "").trim();
  redirect(`/account/register?ref=${encodeURIComponent(referralCode)}`);
}
