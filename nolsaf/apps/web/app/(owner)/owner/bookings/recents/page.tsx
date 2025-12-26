"use client";
import { useEffect, useState } from "react";
import axios from "axios";
// Use same-origin calls + secure httpOnly cookie session.
const api = axios.create({ baseURL: "", withCredentials: true });

export default function RecentBookings() {
  const [list, setList] = useState<any[]>([]);

  useEffect(() => {
    api.get<any[]>("/owner/bookings/recent").then(r => setList(r.data));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Recent Bookings</h1>
      <div className="grid gap-3">
        {list.map(b => (
          <div key={b.id} className="bg-white border rounded-2xl p-3 flex justify-between">
            <div>
              <div className="font-medium">#{b.id} • {b.property?.title}</div>
              <div className="text-xs opacity-70">{new Date(b.createdAt).toLocaleString()}</div>
            </div>
            <div className="text-sm">TZS {b.totalAmount}</div>
          </div>
        ))}
        {list.length === 0 && <div className="text-sm opacity-70">No recent activity.</div>}
      </div>
    </div>
  );
}
