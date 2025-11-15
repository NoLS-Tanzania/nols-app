"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import { useRouter, useSearchParams } from "next/navigation";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

export default function NewInvoice() {
  const sp = useSearchParams();
  const bookingId = Number(sp.get("bookingId"));
  const router = useRouter();
  const [preview, setPreview] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

  useEffect(() => {
    if (!bookingId) return;
    api.get(`/owner/bookings/${bookingId}`).then(r => setPreview(r.data));
  }, [bookingId]);

  const create = async () => {
    setCreating(true);
    try {
      const r = await api.post<{ invoiceId: string }>("/owner/invoices/from-booking", { bookingId });
      router.push(`/owner/invoices/${r.data.invoiceId}`);
    } catch (e) {
      setCreating(false);
      alert("Could not create invoice");
    }
  };

  if (!bookingId) return <div>Missing bookingId</div>;
  if (!preview) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Generate Invoice</h1>

      <div className="rounded-xl overflow-hidden border border-brand-primary/30">
        <div className="bg-brand-primary text-white px-3 py-2 text-sm font-medium">Invoice Preview</div>
        <div className="p-3">
          <div className="font-medium">{preview.property?.title} — Accommodation Invoice</div>
          <div className="text-sm opacity-70">{preview.property?.address ?? ""}</div>
        </div>
        <div className="grid md:grid-cols-2 gap-0 border-t">
          <Party title="Sender (Owner)">
            <p className="text-sm">{preview.property?.owner?.name ?? "Owner"}</p>
            <p className="text-sm">{preview.property?.owner?.phone ?? ""}</p>
          </Party>
          <Party title="Receiver (NoLSAF)">
            <p className="text-sm">NoLSAF</p>
            <p className="text-sm">Dar es Salaam, Tanzania</p>
          </Party>
        </div>

        <div className="border-t">
          <Table>
            <Trow k="Client" v={preview.guestName ?? "-"} />
            <Trow k="Phone" v={preview.guestPhone ?? "-"} />
            <Trow k="Nationality" v={preview.nationality ?? "-"} />
            <Trow k="NoLSAF Code" v={preview.code?.codeVisible ?? "-"} />
            <Trow k="Check-in" v={new Date(preview.checkIn).toLocaleString()} />
            <Trow k="Check-out" v={new Date(preview.checkOut).toLocaleString()} />
            <Trow k="Amount" v={`TZS ${preview.totalAmount}`} />
          </Table>
        </div>
      </div>

      <button onClick={create} disabled={creating} className="px-4 py-2 rounded-xl bg-brand-primary text-white">
        {creating ? "Creating..." : "Create Invoice"}
      </button>
    </div>
  );
}

function Party({ title, children }: any) {
  return (
    <div className="p-3 border-r last:border-r-0">
      <div className="text-sm font-semibold mb-2">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
function Table({ children }: any) { return <div className="divide-y">{children}</div>; }
function Trow({ k, v }: any) {
  return (
    <div className="grid grid-cols-2">
      <div className="px-3 py-2 text-sm bg-neutral-50 border-r">{k}</div>
      <div className="px-3 py-2 text-sm">{v}</div>
    </div>
  );
}
