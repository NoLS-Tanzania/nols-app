"use client";
import { useEffect, useState } from "react";

export default function ProfileTabRedirect() {
  const [msg, setMsg] = useState('Redirecting…');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const t = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
        if (!t) {
          if (typeof window !== 'undefined') window.location.href = '/login';
          return;
        }

        // Prefer using the public API URL if provided, otherwise use relative path
        const base = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
        const url = base ? `${base}/account/me` : '/account/me';

        const res = await fetch(url, { headers: { Authorization: `Bearer ${t}` } });
        if (!mounted) return;
        if (!res.ok) {
          // If unauthorized, send to login
          if (res.status === 401 || res.status === 403) {
            window.location.href = '/login';
            return;
          }
          // fallback to public profile
          window.location.href = '/public/profile';
          return;
        }
        const data = await res.json();
        // data may be the user object or { user: {...} }
        const user = data?.user ?? data;
        const roleRaw = (user?.role || user?.roles || user?.type || '') as any;
        let role = '';
        if (Array.isArray(roleRaw)) role = String(roleRaw[0] || '').toLowerCase();
        else role = String(roleRaw || '').toLowerCase();

        // Normalize some common role names
        if (!role && user?.isAdmin) role = 'admin';

        if (role.includes('admin')) {
          window.location.href = '/admin';
        } else if (role.includes('owner')) {
          // owner dashboard exists at /owner
          window.location.href = '/owner';
        } else if (role.includes('driver')) {
          // driver has a detailed profile page
          window.location.href = '/driver/profile';
        } else {
          // default: public/traveller
          window.location.href = '/public/profile';
        }
      } catch (e) {
        try { if (typeof window !== 'undefined') window.location.href = '/public/profile'; } catch {};
      }
    })();
    return () => { mounted = false; };
  }, []);

  return <div>{msg}</div>;
}
