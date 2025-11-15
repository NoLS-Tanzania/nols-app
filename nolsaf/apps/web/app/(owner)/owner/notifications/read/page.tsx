"use client";
import React, { useState } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import BackIcon from "@/components/BackIcon";

type Note = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
};

const initial: Note[] = [];

export default function ReadNotificationsPage() {
  const [items, setItems] = useState<Note[]>(initial);

  function markUnread(id: string) {
    setItems((prev) => prev.filter((n) => n.id !== id));
  }

  return (
    <div className="min-h-[60vh] px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto text-center space-y-4 py-8">
        <div className="flex justify-center">
          <Bell className="h-10 w-10 text-gray-600" aria-hidden />
        </div>

        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-gray-900">
          Showing 0 read notifications
        </h1>

        <p className="text-sm text-gray-600">These are your read notifications.</p>
      </div>

      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-4 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-8 text-gray-600">No read notifications.</div>
          ) : (
            items.map((n) => (
              <div key={n.id} className="border rounded-md p-4 flex items-start justify-between">
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{n.title}</h4>
                  <p className="text-xs text-gray-500">{new Date(n.createdAt).toLocaleString()}</p>
                  <p className="mt-2 text-sm text-gray-700">{n.body}</p>
                </div>

                <div className="ml-4 flex-shrink-0 flex flex-col gap-2">
                  <button
                    onClick={() => markUnread(n.id)}
                    className="inline-flex items-center px-3 py-1.5 bg-white border border-gray-200 text-sm rounded"
                  >
                    Mark as unread
                  </button>
                  <Link href="/owner/notifications" className="text-sm text-gray-500">
                    Details
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="text-right">
          <BackIcon href="/owner/notifications" label="Back to notifications" />
        </div>
      </div>
    </div>
  );
}
