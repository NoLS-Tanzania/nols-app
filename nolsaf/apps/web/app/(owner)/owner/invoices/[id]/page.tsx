"use client";
import { useEffect, useState } from "react";
import axios from "axios";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

export default function InvoiceView({ params }: { params: { id: string } }) {
  const [inv, setInv] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

  useEffect(() => {
    api.get(`/owner/invoices/${params.id}`).then(r => setInv(r.data));
  }, [params.id]);

  const submit = async () => {
    setSubmitting(true);
    await api.post(`/owner/invoices/${params.id}/submit`);
    setSubmitting(false);
    alert("Invoice submitted to NoLSAF");
  };

  if (!inv) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Invoice {inv.invoiceNumber}</h1>
        <span className="text-sm px-2 py-1 rounded bg-neutral-200">{inv.status}</span>
      </div>

      <div className="rounded-xl overflow-hidden border border-brand-primary/30">
        <div className="bg-brand-primary text-white px-3 py-2 text-sm font-medium">{inv.title}</div>
        <div className="grid md:grid-cols-2 border-b">
          <Party title="Sender (Owner)">
            <p className="text-sm">{inv.senderName}</p>
            <p className="text-sm">{inv.senderPhone ?? ""}</p>
            <p className="text-sm">{inv.senderAddress ?? ""}</p>
          </Party>
          <Party title="Receiver (NoLSAF)">
            <p className="text-sm">{inv.receiverName}</p>
            <p className="text-sm">{inv.receiverPhone ?? ""}</p>
            <p className="text-sm">{inv.receiverAddress ?? ""}</p>
          </Party>
        </div>

        <div className="divide-y">
          {inv.items.map((it:any) => (
            <Row key={it.id} cols={[it.description, `x${it.quantity}`, `TZS ${it.unitPrice}`, `TZS ${it.amount}`]} />
          ))}
          <Row cols={["Subtotal", "", "", `TZS ${inv.subtotal}`]} />
          {Number(inv.taxAmount) > 0 && <Row cols={[`Tax (${inv.taxPercent}%)`, "", "", `TZS ${inv.taxAmount}`]} />}
          <Row cols={["Total", "", "", `TZS ${inv.total}`]} />
        </div>
      </div>

      {inv.status === "DRAFT" && (
        <button onClick={submit} disabled={submitting} className="px-4 py-2 rounded-xl bg-brand-primary text-white">
          {submitting ? "Submitting..." : "Send to NoLSAF"}
        </button>
      )}
    </div>
  );
}

function Party({ title, children }: any) {
  return (
    <div className="p-3">
      <div className="text-sm font-semibold mb-2">{title}</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
function Row({ cols }: { cols: string[] }) {
  return (
    <div className="grid grid-cols-4">
      {cols.map((c, i) => (
        <div key={i} className={`px-3 py-2 text-sm ${i<3 ? "border-r" : ""}`}>{c}</div>
      ))}
    </div>
  );
}
