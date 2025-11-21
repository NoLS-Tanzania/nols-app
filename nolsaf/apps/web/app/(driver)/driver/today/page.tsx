import React from "react";
import DriverPageHeader from "@/components/DriverPageHeader";

export default function DriverTodayPage() {
  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-3xl">
        <DriverPageHeader title="Today's Schedule" />
      </div>

      <section className="mx-auto max-w-3xl bg-white rounded-lg p-6 border">
  <h1 className="text-xl font-semibold">Today&apos;s Rides</h1>
        <p className="mt-2 text-sm text-gray-600">You have no rides scheduled for today.</p>
      </section>
    </div>
  );
}
