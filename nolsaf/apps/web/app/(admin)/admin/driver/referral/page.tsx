"use client";

// Reuse the admin referrals management UI at /admin/driver/referral
// so admins can decide whether collected driver referral credits
// are paid as bonus or approved for withdrawal.
import AdminReferralsPage from "../../referrals/page";

export default function DriverReferralActionsPage() {
  return <AdminReferralsPage />;
}

