"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props { params: { id: string } }

export default function BookPage({ params }: Props) {
  const propertyId = params.id;
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [nationality, setNationality] = useState("");
  const [sex, setSex] = useState<"Male"|"Female"|"Other"|"">("");
  const [ageGroup, setAgeGroup] = useState<"Adult"|"Child"|"">("Adult");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
      const body = {
        propertyId: Number(propertyId),
        checkIn: checkIn || null,
        checkOut: checkOut || null,
        guestName: fullName,
        guestPhone: phone,
        nationality,
        sex,
        ageGroup,
      };
      const res = await fetch(`${API}/api/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Booking failed');
      setResult(data);
    } catch (err: any) {
      setResult({ error: err?.message || 'error' });
    } finally {
      setLoading(false);
    }
  }

  if (result && result.bookingId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
        <div className="card p-6 max-w-md w-full">
          <h2 className="text-xl font-semibold">Booking confirmed</h2>
          <p className="mt-2">Booking ID: <strong>{result.bookingId}</strong></p>
          <p>Booking code: <strong>{result.code}</strong></p>
          <div className="mt-4">
            <button className="btn" onClick={()=>router.push(`/property/${propertyId}`)}>Back to property</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <form onSubmit={onSubmit} className="card w-full max-w-md p-6 space-y-4">
        <h1 className="text-xl font-semibold">Book property</h1>
        <label className="block text-sm">
          <span className="block mb-1">Check-in</span>
          <input type="date" className="input w-full" value={checkIn} onChange={(e)=>setCheckIn(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="block mb-1">Check-out</span>
          <input type="date" className="input w-full" value={checkOut} onChange={(e)=>setCheckOut(e.target.value)} />
        </label>

        <h2 className="text-lg font-medium">Guest information</h2>
        <label className="block text-sm">
          <span className="block mb-1">Full name</span>
          <input className="input w-full" value={fullName} onChange={(e)=>setFullName(e.target.value)} required />
        </label>
        <label className="block text-sm">
          <span className="block mb-1">Phone</span>
          <input className="input w-full" value={phone} onChange={(e)=>setPhone(e.target.value)} required />
        </label>
        <label className="block text-sm">
          <span className="block mb-1">Nationality</span>
          <input className="input w-full" value={nationality} onChange={(e)=>setNationality(e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="block mb-1">Sex</span>
            <select className="select w-full" value={sex} onChange={(e)=>setSex(e.target.value as any)}>
              <option value="">Prefer not to say</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </label>
          <label className="block text-sm">
            <span className="block mb-1">Age group</span>
            <select className="select w-full" value={ageGroup} onChange={(e)=>setAgeGroup(e.target.value as any)}>
              <option value="Adult">Adult</option>
              <option value="Child">Child</option>
            </select>
          </label>
        </div>

        <div className="h-4" />
        {result && result.error && <div className="text-sm text-rose-700">{String(result.error)}</div>}
        <button className="btn btn-solid w-full" disabled={loading}>{loading ? 'Booking…' : 'Confirm booking'}</button>
      </form>
    </div>
  );
}
