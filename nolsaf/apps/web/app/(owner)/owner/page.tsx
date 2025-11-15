"use client";
import { useEffect, useState } from "react";
import OwnerPageHeader from "@/components/OwnerPageHeader";
import Link from "next/link";
import { Building2, LineChart, FileText, MessageCircle, User } from "lucide-react";

function readOwnerName(): string | null {
  if (typeof window === "undefined") return null;
  // Try several common localStorage keys that might store the owner's name
  const tryKeys = ["ownerName", "name", "fullName", "displayName", "userName", "user"];
  for (const k of tryKeys) {
    try {
      const v = localStorage.getItem(k);
      if (!v) continue;
      // if value looks like JSON, attempt to parse and extract a name field
      if (v.trim().startsWith("{") || v.trim().startsWith("[")) {
        try {
          const obj = JSON.parse(v);
          if (obj?.name) return String(obj.name);
          if (obj?.fullName) return String(obj.fullName);
          if (obj?.displayName) return String(obj.displayName);
          if (obj?.firstName || obj?.lastName) return `${obj.firstName ?? ""} ${obj.lastName ?? ""}`.trim();
        } catch (e) {
          // ignore parse error
        }
      } else {
        return v;
      }
    } catch (e) {
      // ignore
    }
  }
  return null;
}

export default function OwnerPage() {
  const [ownerName, setOwnerName] = useState<string | null>(null);

  useEffect(() => {
    const n = readOwnerName();
    if (n) setOwnerName(n);
  }, []);

  return (
    <div className="">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      <OwnerPageHeader
        icon={<User className="h-10 w-10 text-blue-600" />}
        title={(
          <>
            {ownerName ? (
              <>
                <div className="text-sm text-blue-600">Welcome {ownerName}</div>
                <div className="text-2xl font-bold text-gray-900">Owner Dashboard</div>
              </>
            ) : (
              <div className="text-2xl font-bold">Owner Dashboard</div>
            )}
          </>
        )}
        subtitle="Now you can overview your properties and performance"
      />

  {/* Decorative quick-stats row under the header */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white p-4 rounded-lg shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
            <LineChart className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <div className="text-xs text-gray-500">Occupancy</div>
            <div className="text-lg font-semibold">—</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <div className="text-xs text-gray-500">Revenue</div>
            <div className="text-lg font-semibold">—</div>
          </div>
        </div>
      </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
  <Link href="/owner/properties/approved" className="qlink relative overflow-hidden flex items-center gap-3 bg-white text-gray-900 border rounded-md pl-4 pr-3 py-2">
          <div className="absolute left-0 top-0 h-full w-3 md:w-4 bg-blue-600 rounded-l-md" aria-hidden />
          <Building2 className="h-4 w-4 text-blue-600" aria-hidden />
          <span className="ml-1">My Properties</span>
        </Link>

        <Link href="/owner/reports/overview" className="qlink relative overflow-hidden flex items-center gap-3 bg-white text-gray-900 border rounded-md pl-4 pr-3 py-2">
          <div className="absolute left-0 top-0 h-full w-3 md:w-4 bg-emerald-600 rounded-l-md" aria-hidden />
          <LineChart className="h-4 w-4 text-emerald-600" aria-hidden />
          <span className="ml-1">Reports</span>
        </Link>

  <Link href="/owner/revenue/paid" className="qlink relative overflow-hidden flex items-center gap-3 bg-white text-gray-900 border rounded-md pl-4 pr-3 py-2">
          <div className="absolute left-0 top-0 h-full w-3 md:w-4 bg-yellow-400 rounded-l-md" aria-hidden />
          <FileText className="h-4 w-4 text-yellow-400" aria-hidden />
          <span className="ml-1">Invoices</span>
        </Link>

        <Link href="/owner/messages" className="qlink relative overflow-hidden flex items-center gap-3 bg-white text-gray-900 border rounded-md pl-4 pr-3 py-2">
          <div className="absolute left-0 top-0 h-full w-3 md:w-4 bg-violet-600 rounded-l-md" aria-hidden />
          <MessageCircle className="h-4 w-4 text-violet-600" aria-hidden />
          <span className="ml-1">Messages</span>
        </Link>
      </div>

      <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
        <div className="card h-32" />
        <div className="card h-32" />
      </div>
      </div>
    </div>
  );
}
