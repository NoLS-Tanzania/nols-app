import React from "react";
import DriverPageHeader from "@/components/DriverPageHeader";

export default function DriverBonusPage() {
  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl">
        <DriverPageHeader title="Bonus" />
      </div>

      <section className="mx-auto max-w-3xl bg-white rounded-lg p-6 border text-center">
        <p className="mt-2 text-sm text-gray-600">View bonus history and eligibility here.</p>
      </section>
    </div>
  );
}
