"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import AdminPageHeader from "@/components/AdminPageHeader";
import { Users as UsersIcon } from "lucide-react";

type UserRow = {
  id: number;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role: string;
  createdAt?: string;
  twoFactorEnabled?: boolean;
  isDisabled?: number | null;
};

// Use relative paths in browser to leverage Next.js rewrites (avoids CORS issues)
const API = typeof window === 'undefined' 
  ? (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000")
  : '';

export default function Page() {
  const api = useMemo(() => {
    const instance = axios.create({ baseURL: API });
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    return instance;
  }, []);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [page, setPage] = useState(1);
  const [perPage] = useState(25);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [reset2FA, setReset2FA] = useState(false);
  const [disableUser, setDisableUser] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, perPage };
      if (q) params.q = q;
      if (role) params.role = role;
      const res = await api.get('/admin/users', { params });
      setUsers(res.data.data || []);
      setTotal(res.data.meta?.total || 0);
    } catch (err) {
      console.error(err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [api, page, perPage, q, role]);

  useEffect(() => { load(); }, [load]);

  const openEdit = (u: UserRow) => {
    setEditing(u);
    setReset2FA(false);
    setDisableUser(Boolean(u.isDisabled));
  };

  const closeEdit = () => setEditing(null);

  async function saveEdit() {
    if (!editing) return;
    try {
      const body: any = {};
      // only allow role change, reset2FA, disable
      if (editing.role) body.role = editing.role;
      if (reset2FA) body.reset2FA = true;
      if (typeof disableUser !== 'undefined') body.disable = disableUser;
      await api.patch(`/admin/users/${editing.id}`, body);
      await load();
      closeEdit();
    } catch (err) {
      console.error('save error', err);
      alert('Failed to save user');
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader title="Users" subtitle="Manage platform users" breadcrumb={[{ label: 'Admin', href: '/admin' }, { label: 'Management', href: '/admin/management' }, { label: 'Users' }]} icon={<UsersIcon className="h-5 w-5" />} />

      <div className="card">
        <div className="card-section flex flex-col gap-4">
          <div className="flex gap-3 items-center">
            <input className="input" placeholder="Search name, email or phone" value={q} onChange={e=>{ setQ(e.target.value); setPage(1); }} />
            <select aria-label="Filter by role" className="input w-48" value={role} onChange={e=>{ setRole(e.target.value); setPage(1); }}>
              <option value="">All roles</option>
              <option value="ADMIN">Admin</option>
              <option value="OWNER">Owner</option>
              <option value="CUSTOMER">Customer</option>
            </select>
            <button className="btn btn-ghost" onClick={()=>{ setQ(''); setRole(''); setPage(1); }}>Reset</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500">
                  <th className="p-2">ID</th>
                  <th className="p-2">Name</th>
                  <th className="p-2">Email</th>
                  <th className="p-2">Phone</th>
                  <th className="p-2">Role</th>
                  <th className="p-2">2FA</th>
                  <th className="p-2">Disabled</th>
                  <th className="p-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="p-4">Loading...</td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={8} className="p-4">No users found</td></tr>
                ) : users.map(u => (
                  <tr key={u.id} className="border-t">
                    <td className="p-2">{u.id}</td>
                    <td className="p-2">{u.name || '—'}</td>
                    <td className="p-2">{u.email || '—'}</td>
                    <td className="p-2">{u.phone || '—'}</td>
                    <td className="p-2">{u.role}</td>
                    <td className="p-2">{u.twoFactorEnabled ? 'Yes' : 'No'}</td>
                    <td className="p-2">{u.isDisabled ? 'Yes' : 'No'}</td>
                    <td className="p-2">
                      <button className="btn btn-sm" onClick={()=>openEdit(u)}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">Total: {total}</div>
            <div className="flex items-center gap-2">
              <button className="btn" onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page<=1}>Prev</button>
              <div>Page {page}</div>
              <button className="btn" onClick={()=>setPage(p=>p+1)} disabled={page*perPage >= total}>Next</button>
            </div>
          </div>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-md shadow-lg w-[720px] p-6">
            <h3 className="text-lg font-medium mb-4">Edit user #{editing.id}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600">Name</label>
                <div className="mt-1">{editing.name}</div>
              </div>
              <div>
                <label className="block text-sm text-gray-600">Email</label>
                <div className="mt-1">{editing.email}</div>
              </div>
              <div>
                <label htmlFor="edit-role" className="block text-sm text-gray-600">Role</label>
                <select id="edit-role" className="input mt-1" value={editing.role} onChange={e=>setEditing({...editing, role: e.target.value})}>
                  <option value="ADMIN">Admin</option>
                  <option value="OWNER">Owner</option>
                  <option value="CUSTOMER">Customer</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600">Disable</label>
                <label className="mt-1 inline-flex items-center">
                  <input type="checkbox" checked={disableUser} onChange={e=>setDisableUser(e.target.checked)} /> <span className="ml-2">Disabled</span>
                </label>
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center gap-2"><input type="checkbox" checked={reset2FA} onChange={e=>setReset2FA(e.target.checked)} /> Reset 2FA (clear secret + disable)</label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button className="btn btn-ghost" onClick={closeEdit}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
