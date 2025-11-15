"use client";

import React, { useState } from 'react';
import { Download, FileText, HelpCircle } from 'lucide-react';

export default function AdminMiniFooter({ onExport } : { onExport?: ()=>void }){
  // activeId stores which icon label is revealed on touch for small screens
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleTouch = (id: string, cb?: ()=>void) => {
    if (activeId === id) {
      // second tap -> perform action
      setActiveId(null);
      cb?.();
    } else {
      // first tap -> reveal label
      setActiveId(id);
      // hide after a short delay so it doesn't stick around
      window.setTimeout(() => {
        setActiveId((v) => (v === id ? null : v));
      }, 3500);
    }
  };

  return (
    <div className="z-40 hidden md:block">
  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-md p-1 flex flex-col items-center gap-2 shadow-sm">
        {/* vertical icon button for export */}
        <div className="relative">
          <button
            aria-label="Export reports"
            className="w-9 h-9 flex items-center justify-center rounded-md bg-transparent text-[#02665e] hover:bg-transparent focus:bg-transparent focus:outline-none p-1.5"
            onClick={onExport}
            onTouchStart={(e) => { e.preventDefault(); handleTouch('export', onExport); }}
            title="Export reports"
          >
            <Download size={18} strokeWidth={2} className="w-4 h-4 text-[#02665e]" />
          </button>
          {/* label on hover/focus or touch */}
          <span className={`absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-black text-white text-xs px-2 py-1 ${activeId==='export' ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity`}>Export</span>
        </div>

        {/* vertical icon link for audit log */}
        <div className="relative">
          <a
            href="/admin/audit"
            aria-label="Audit log"
            className="w-9 h-9 flex items-center justify-center rounded-md bg-transparent text-[#02665e] hover:bg-transparent focus:bg-transparent focus:outline-none p-1.5"
            onTouchStart={(e) => { e.preventDefault(); handleTouch('audit', () => { window.location.href = '/admin/audit'; }); }}
            title="Audit log"
          >
            <FileText size={18} strokeWidth={2} className="w-4 h-4 text-[#02665e]" />
          </a>
          <span className={`absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-black text-white text-xs px-2 py-1 ${activeId==='audit' ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity`}>Audit</span>
        </div>

        {/* vertical icon link for support/help */}
        <div className="relative">
          <a
            href="/admin/support"
            aria-label="Support"
            className="w-9 h-9 flex items-center justify-center rounded-md bg-transparent text-[#02665e] hover:bg-transparent focus:bg-transparent focus:outline-none p-1.5"
            onTouchStart={(e) => { e.preventDefault(); handleTouch('support', () => { window.location.href = '/admin/support'; }); }}
            title="Support"
          >
            <HelpCircle size={18} strokeWidth={2} className="w-4 h-4 text-[#02665e]" />
          </a>
          <span className={`absolute left-full ml-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-black text-white text-xs px-2 py-1 ${activeId==='support' ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-opacity`}>Support</span>
        </div>
      </div>
    </div>
  );
}
