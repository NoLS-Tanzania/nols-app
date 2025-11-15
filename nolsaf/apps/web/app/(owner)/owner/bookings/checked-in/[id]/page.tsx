"use client";
import { useEffect, useState } from "react";
import axios from "axios";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

export default function CheckedInDetail({ params }: { params: { id: string } }) {
  const [b, setB] = useState<any>(null);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

  useEffect(() => {
    api.get(`/owner/bookings/${params.id}`).then(r => setB(r.data));
  }, [params.id]);

  if (!b) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Checked-In • #{b.id}</h1>

      <Section title="Personal Details">
        <GridRow label="Full name" value={b.guestName ?? "-"} />
        <GridRow label="Phone" value={b.guestPhone ?? "-"} />
        <GridRow label="Nationality" value={b.nationality ?? "-"} />
        <GridRow label="Sex" value={b.sex ?? "-"} />
        <GridRow label="Adult/Child" value={b.ageGroup ?? "-"} />
      </Section>

      <Section title="Booking Details">
        <GridRow label="Property" value={`${b.property?.title} • ${b.property?.type}`} />
        <GridRow label="Check-in" value={new Date(b.checkIn).toLocaleString()} />
        <GridRow label="Check-out" value={new Date(b.checkOut).toLocaleString()} />
        <GridRow label="Amount paid" value={`TZS ${b.totalAmount}`} />
        <GridRow label="NoLSAF Code" value={b.code?.codeVisible ?? "-"} />
      </Section>

      <div className="flex gap-2">
        <a href={`/owner/invoices/new?bookingId=${b.id}`} className="px-4 py-2 rounded-xl bg-brand-primary text-white">Generate Invoice</a>
        <a href="/owner/bookings/checked-in" className="px-4 py-2 rounded-xl border">Back to list</a>
      </div>
    </div>
  );
}

function Section({ title, children }: any) {
  return (
    <div className="rounded-xl overflow-hidden border border-brand-primary/30">
      <div className="bg-brand-primary text-white px-3 py-2 text-sm font-medium">{title}</div>
      <div className="divide-y">{children}</div>
    </div>
  );
}
function GridRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-2">
      <div className="px-3 py-2 text-sm bg-neutral-50 border-r">{label}</div>
      <div className="px-3 py-2 text-sm">{value}</div>
    </div>
  );
}
// Helper cell component