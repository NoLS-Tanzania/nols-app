'use client';
import { useEffect, useState } from 'react';

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  useEffect(() => {}, []);
  return (
    <div className="fixed bottom-4 right-4">
      {open && (
        <div className="w-72 h-96 bg-white text-black shadow-lg rounded p-3 mb-2">
          <div className="font-semibold mb-2">Chat</div>
          <div className="text-sm text-gray-600">No messages yet.</div>
        </div>
      )}
      <button className="bg-blue-600 text-white rounded-full px-4 py-2" onClick={() => setOpen(!open)}>
        {open ? 'Close' : 'Chat'}
      </button>
    </div>
  );
}
