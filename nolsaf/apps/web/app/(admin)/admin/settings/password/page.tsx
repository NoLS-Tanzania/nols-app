"use client";

import PasswordChangeForm from "@/components/security/PasswordChangeForm";

export default function AdminPasswordPage() {
  return (
    <PasswordChangeForm
      apiUrl="/api/account/password/change"
      redirectHref="/admin/profile"
      backHref="/admin/profile"
      roleLabel="ADMIN"
      variant="page"
      minLength={8}
      maxLength={12}
      requireCurrentPassword
      submitLabel="Update Password"
    />
  );
}
