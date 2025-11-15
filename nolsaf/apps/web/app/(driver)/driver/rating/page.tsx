import React from "react";
import DriverPageHeader from "@/components/DriverPageHeader";

export default function DriverRatingPage() {
  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl">
        <DriverPageHeader />
      </div>

      <section className="mx-auto max-w-3xl bg-white rounded-lg p-6 border">
        <h1 className="text-xl font-semibold">Rating</h1>
        <p className="mt-2 text-sm text-gray-600">Your driver rating and feedback will appear here.</p>
      </section>
    </div>
  );
}
