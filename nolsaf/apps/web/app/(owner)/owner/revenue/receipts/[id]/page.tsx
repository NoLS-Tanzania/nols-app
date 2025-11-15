"use client";
import { useEffect, useState } from "react";
import axios from "axios";
const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });

export default function Receipt({ params }:{ params:{ id:string }}) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    api.get(`/owner/revenue/invoices/${params.id}/receipt`).then(r => setData(r.data));
  }, [params.id]);

  if (!data) return <div>Loading...</div>;
  const { invoice: inv, qrPayload } = data;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Receipt {inv.receiptNumber}</h1>
        <span className="text-xs px-2 py-1 rounded border bg-green-100 text-green-700 border-green-300">PAID</span>
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
          <Row cols={["Gross", `TZS ${inv.total}`]} />
          <Row cols={[`Commission (${inv.commissionPercent}%)`, `TZS ${inv.commissionAmount}`]} />
          <Row cols={["Net Paid", `TZS ${inv.netPayable}`]} />
          <Row cols={["Payment Ref", inv.paymentRef ?? "-"]} />
          <Row cols={["Paid On", new Date(inv.paidAt).toLocaleString()]} />
          <Row cols={["NoLSAF Code", inv.checkinCode?.codeVisible ?? "-"]} />
        </div>

        <div className="p-3">
          <div className="text-sm font-semibold mb-1">Receipt QR Payload</div>
          <pre className="p-3 bg-neutral-100 rounded-xl text-xs overflow-auto">{JSON.stringify(qrPayload, null, 2)}</pre>
        </div>
        <div className="p-3">
          <div className="text-sm font-semibold mb-2">Receipt QR</div>
          <img
            src={`${process.env.NEXT_PUBLIC_API_URL}/owner/revenue/invoices/${inv.id}/receipt/qr.png`}
            alt="Receipt QR"
    className="w-40 h-40 border rounded-xl"
  />
  <div className="text-xs opacity-70 mt-2">Scan to verify receipt.</div>
</div>
      </div>
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
function Row({ cols }:{ cols:[string,string]}) {
  return (
    <div className="grid grid-cols-2">
      <div className="px-3 py-2 text-sm bg-neutral-50 border-r">{cols[0]}</div>
      <div className="px-3 py-2 text-sm">{cols[1]}</div>
    </div>
  );
}
