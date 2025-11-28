"use client";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Users, ChevronLeft, ChevronRight } from "lucide-react";
import axios from "axios";
import { io, Socket } from "socket.io-client";

const api = axios.create({ baseURL: process.env.NEXT_PUBLIC_API_URL });
function authify(){ const t = typeof window!=="undefined" ? localStorage.getItem("token"):null; if(t) api.defaults.headers.common["Authorization"]=`Bearer ${t}`;}

type Row = { id:number; name:string|null; email:string; phone?:string|null; createdAt:string; suspendedAt?:string|null; _count?: { bookings?: number } };

export default function AdminUsersPage(){
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  const scrollRef = useRef<HTMLDivElement|null>(null);
  const [showScrollControls, setShowScrollControls] = useState(false);
  const [suggestions, setSuggestions] = useState<Row[]>([]);
  const itemsCount = items?.length ?? 0;

  const load = useCallback(async ()=>{
    const r = await api.get<{ items: Row[]; total:number }>('/admin/users', { params: { q, status, page, pageSize } });
    setItems(r.data.items); setTotal(r.data.total);
  }, [q, status, page]);

  useEffect(()=>{ authify(); load(); }, [load]);
  useEffect(()=>{ load(); }, [status, page, load]);

  useEffect(()=>{
    const el = scrollRef.current; if(!el) return; let timeout: any;
    const check = ()=> setShowScrollControls(el.scrollWidth > el.clientWidth + 4);
    check(); const onResize = ()=>{ clearTimeout(timeout); timeout = setTimeout(check, 120); };
    el.addEventListener('scroll', check); window.addEventListener('resize', onResize);
    const mo = new MutationObserver(()=>{ clearTimeout(timeout); timeout = setTimeout(check, 80); });
    mo.observe(el, { childList:true, subtree:true });
    return ()=>{ clearTimeout(timeout); el.removeEventListener('scroll', check); window.removeEventListener('resize', onResize); mo.disconnect(); };
  }, [itemsCount, status, q]);

  useEffect(()=>{
    const term = q; if(!term || term.trim()===""){ setSuggestions([]); return; }
    const t = setTimeout(()=>{ (async ()=>{ try{ const r = await api.get<{ items: Row[] }>("/admin/users", { params: { status, q: term, page:1, pageSize:5 } }); setSuggestions(r.data.items ?? []); }catch(e){ setSuggestions([]); } try{ await load(); }catch(e){} })(); }, 400);
    return ()=> clearTimeout(t);
  }, [q, status, load]);

  useEffect(()=>{ authify(); 
    // Use relative paths in browser to leverage Next.js rewrites (avoids CORS issues)
    const url = typeof window === 'undefined' 
      ? (process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "")
      : undefined;
    const token = typeof window!=="undefined" ? localStorage.getItem("token"):null; 
    const s: Socket = io(url, { transports:['websocket'], auth: token? { token } : undefined }); 
    s.on("admin:user:updated", load); 
    return ()=>{ s.off("admin:user:updated", load); s.disconnect(); }; 
  }, [load]);

  const pages = useMemo(()=> Math.max(1, Math.ceil(total / pageSize)), [total]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-col items-center text-center">
        <div className="rounded-full bg-blue-50 p-3 inline-flex items-center justify-center"><Users className="h-6 w-6 text-blue-600"/></div>
        <h1 className="mt-3 text-2xl font-semibold">Users</h1>
        <div className="mt-2 w-full max-w-3xl flex flex-col sm:flex-row items-center sm:items-center justify-between gap-3">
          <p className="text-sm text-gray-500 m-0">Manage platform users</p>
          <div className="flex items-center"><div className="relative w-full max-w-md"><div className="border rounded-full bg-white shadow-sm"><input className="w-full px-4 py-2 pr-4 rounded-full outline-none text-sm" placeholder="Search name/email/phone" value={q} onChange={(e)=>setQ(e.target.value)} aria-label="Search users" onKeyDown={(e)=>{ if(e.key==='Enter'){ e.preventDefault(); setPage(1); load(); } }} /></div>
            {suggestions.length > 0 && (<div className="absolute left-0 right-0 mt-2 z-10"><div className="bg-white border rounded shadow max-h-56 overflow-auto">{suggestions.map(s=> (<button key={s.id} type="button" onClick={()=>{ setQ(s.name ?? s.email); setSuggestions([]); setPage(1); load(); }} className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"><div className="font-medium">{s.name ?? s.email}</div><div className="text-xs opacity-60">{s.email}</div></button>))}</div></div>)}
          </div></div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-2 justify-center">
        <div className="w-full max-w-3xl mx-auto flex justify-center"><div className="relative w-full"><div ref={scrollRef} className="flex gap-2 justify-center overflow-x-auto px-2 -mx-2 sm:flex-wrap snap-x snap-mandatory">{[ { label: 'All', value: '' }, { label: 'Active', value: 'ACTIVE' }, { label: 'Suspended', value: 'SUSPENDED' } ].map(s=> (<button key={s.value} type="button" onClick={()=>{ setStatus(s.value); setPage(1); }} className={"px-3 py-1 rounded-full border text-sm flex items-center gap-2 flex-shrink-0 " + (status === s.value ? 'bg-gray-100 border-gray-300' : 'bg-white hover:bg-gray-50')}><span>{s.label}</span></button> ))}</div>
          {showScrollControls && (<><div className="pointer-events-none absolute left-0 top-0 bottom-0 w-8 sm:hidden bg-gradient-to-r from-white to-transparent"/><div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 sm:hidden bg-gradient-to-l from-white to-transparent"/><button type="button" onClick={()=>scrollRef.current?.scrollBy({ left: -200, behavior: 'smooth' })} className="sm:hidden absolute left-1 top-1/2 -translate-y-1/2 bg-white border rounded-full p-1 shadow opacity-40 hover:opacity-100 focus:opacity-100 transition-opacity" aria-label="Scroll left"><ChevronLeft className="h-4 w-4"/></button><button type="button" onClick={()=>scrollRef.current?.scrollBy({ left: 200, behavior: 'smooth' })} className="sm:hidden absolute right-1 top-1/2 -translate-y-1/2 bg-white border rounded-full p-1 shadow opacity-40 hover:opacity-100 focus:opacity-100 transition-opacity" aria-label="Scroll right"><ChevronRight className="h-4 w-4"/></button></>) }
        </div></div>
      </div>

      <div className="border rounded-xl overflow-hidden">
        <table className="w-full text-sm"><thead className="bg-gray-50"><tr><th className="text-left p-2">User</th><th className="text-left p-2 hidden md:table-cell">Contact</th><th className="text-left p-2">Status</th><th className="text-left p-2 hidden md:table-cell">Joined</th><th className="text-right p-2">Actions</th></tr></thead>
          <tbody>{(items || []).map(u=> (<tr key={u.id} className="border-t"><td className="p-2"><div className="font-medium truncate">{u.name ?? '-'}</div><div className="text-xs text-gray-500 md:hidden">{u.email} {u.phone ? `• ${u.phone}` : ''}</div></td><td className="p-2 hidden md:table-cell"><div>{u.email}</div><div className="opacity-70">{u.phone ?? '-'}</div></td><td className="p-2">{u.suspendedAt ? <span className="px-2 py-0.5 rounded border text-xs bg-red-50 border-red-200 text-red-700">Suspended</span> : <span className="px-2 py-0.5 rounded border text-xs bg-emerald-50 border-emerald-200 text-emerald-700">Active</span>}</td><td className="p-2 hidden md:table-cell">{new Date(u.createdAt).toLocaleDateString()}</td><td className="p-2 text-right"><a href={`/admin/users/${u.id}`} className="px-3 py-1 rounded bg-emerald-600 text-white">Open</a></td></tr>))}{(items?.length ?? 0)===0 && (<tr><td colSpan={5} className="p-4 text-center opacity-60">No users found.</td></tr>)}</tbody>
        </table>
      </div>

      <div className="flex items-center justify-between"><div className="text-xs opacity-70">Total: {total}</div><div className="flex gap-2"><button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 rounded border disabled:opacity-50">Prev</button><div className="text-sm px-2 py-1">Page {page} / {pages}</div><button disabled={page>=pages} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 rounded border disabled:opacity-50">Next</button></div></div>
    </div>
  );
}
