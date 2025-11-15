"use client";
import { useEffect, useState } from "react";
import axios from "axios";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });
function authify(){ const t = typeof window!=="undefined" ? localStorage.getItem("token") : null; if (t) api.defaults.headers.common["Authorization"]=`Bearer ${t}`; }

type Inv = {
  id:number; invoiceNumber:string|null; receiptNumber:string|null; status:string;
  issuedAt:string; total:number; commissionPercent:number; commissionAmount:number; taxPercent:number; netPayable:number;
  booking: { id:number; property: { id:number; title:string } };
  notes?:string|null; paidAt?:string|null; paymentMethod?:string|null; paymentRef?:string|null;
};

export default function Page({ params }:{ params:{ id:string } }){
  const id = Number(params.id);
  const [inv, setInv] = useState<Inv| null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState("");
  const [overrideCommission, setOverrideCommission] = useState<string>("");
  const [overrideTax, setOverrideTax] = useState<string>("");
  const [payMethod, setPayMethod] = useState("BANK");
  const [payRef, setPayRef] = useState("");

  async function load(){
    setLoading(true);
    const r = await api.get<Inv>(`/admin/revenue/invoices/${id}`);
    setInv(r.data);
    setLoading(false);
  }
  useEffect(()=>{ authify(); load(); },[id]);

  async function verify(){
    await api.post(`/admin/revenue/invoices/${id}/verify`, { notes });
    await load();
  }
  async function approve(){
    await api.post(`/admin/revenue/invoices/${id}/approve`, {
      commissionPercent: overrideCommission===""? undefined : Number(overrideCommission),
      taxPercent: overrideTax===""? undefined : Number(overrideTax),
    });
    await load();
  }
  async function markPaid(){
    await api.post(`/admin/revenue/invoices/${id}/mark-paid`, { method: payMethod, ref: payRef });
    await load();
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (!inv) return <div className="p-6">Not found</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{inv.invoiceNumber ?? `Invoice #${inv.id}`}</h1>
  <a className="link text-sm" href="/admin/revenue">Back</a>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="border rounded-xl p-4 bg-white space-y-2">
          <div><b>Property:</b> {inv.booking.property.title}</div>
          <div><b>Status:</b> {inv.status}</div>
          <div><b>Issued:</b> {new Date(inv.issuedAt).toLocaleString()}</div>
          <div><b>Gross:</b> {fmt(inv.total)}</div>
          <div><b>Commission:</b> {inv.commissionPercent}% ({fmt(inv.commissionAmount)})</div>
          <div><b>Tax:</b> {inv.taxPercent}%</div>
          <div><b>Net payable:</b> <b>{fmt(inv.netPayable)}</b></div>
          <div><b>Receipt:</b> {inv.receiptNumber ?? "-"}</div>
          {inv.receiptNumber && (
            <div className="mt-2">
              <img
                src={`${process.env.NEXT_PUBLIC_API_URL}/admin/revenue/invoices/${inv.id}/receipt.png`}
                alt="Receipt QR"
                className="w-40 h-40 border rounded"
              />
            </div>
          )}
        </div>

        <div className="border rounded-xl p-4 bg-white space-y-4">
          {inv.status==="REQUESTED" && (
            <div className="space-y-2">
              <div className="font-medium">Verify</div>
              <textarea className="w-full border rounded p-2" placeholder="Verification notes (optional)" value={notes} onChange={e=>setNotes(e.target.value)} />
              <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={verify}>Mark VERIFIED</button>
            </div>
          )}

          {(inv.status==="VERIFIED" || inv.status==="REQUESTED") && (
            <div className="space-y-2">
              <div className="font-medium">Approve (override rates optional)</div>
              <div className="flex gap-2">
                <input className="border rounded px-2 py-1" type="number" step="0.01" placeholder={`Commission % (cur ${inv.commissionPercent})`} value={overrideCommission} onChange={e=>setOverrideCommission(e.target.value)} />
                <input className="border rounded px-2 py-1" type="number" step="0.01" placeholder={`Tax % (cur ${inv.taxPercent})`} value={overrideTax} onChange={e=>setOverrideTax(e.target.value)} />
              </div>
              <button className="px-3 py-2 rounded bg-emerald-600 text-white" onClick={approve}>Approve</button>
            </div>
          )}

          {(inv.status==="APPROVED") && (
            <div className="space-y-2">
              <div className="font-medium">Mark Paid</div>
              <div className="flex gap-2">
                <select className="border rounded px-2 py-1" value={payMethod} onChange={e=>setPayMethod(e.target.value)}>
                  {["BANK","MOBILE","CASH","PAYMENT_GATEWAY"].map(m=><option key={m}>{m}</option>)}
                </select>
                <input className="border rounded px-2 py-1" placeholder="Payment Ref" value={payRef} onChange={e=>setPayRef(e.target.value)} />
              </div>
              <button className="px-3 py-2 rounded bg-purple-600 text-white" onClick={markPaid}>Mark PAID & Generate Receipt</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function fmt(n:any){ return new Intl.NumberFormat(undefined,{style:"currency",currency:"TZS"}).format(Number(n||0)); }
