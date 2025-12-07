"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import TableRow from "@/components/TableRow";
import { Users, ChevronLeft, ChevronRight, Edit, Search, X } from "lucide-react";

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

  function getRoleBadgeClass(role: string) {
    const roleLower = role.toLowerCase();
    if (roleLower === 'admin') {
      return "inline-flex items-center px-2 py-1 rounded-md bg-purple-50 text-purple-700 text-xs font-medium";
    }
    if (roleLower === 'owner') {
      return "inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium";
    }
    return "inline-flex items-center px-2 py-1 rounded-md bg-gray-50 text-gray-700 text-xs font-medium";
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center mb-4">
          <Users className="h-8 w-8 text-gray-400 mb-3" />
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
            Users
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage platform users
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 items-stretch sm:items-center justify-center max-w-4xl mx-auto">
          <div className="relative w-full sm:max-w-md sm:flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none text-sm box-border" 
              placeholder="Search name, email or phone" 
              value={q} 
              onChange={e=>{ setQ(e.target.value); setPage(1); }} 
            />
            {q && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                onClick={()=>{ setQ(''); setPage(1); }}
                title="Clear search"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <select 
            aria-label="Filter by role" 
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none text-sm w-full sm:w-48 sm:flex-shrink-0 box-border" 
            value={role} 
            onChange={e=>{ setRole(e.target.value); setPage(1); }}
          >
              <option value="">All roles</option>
              <option value="ADMIN">Admin</option>
              <option value="OWNER">Owner</option>
              <option value="CUSTOMER">Customer</option>
            </select>
        </div>
          </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">2FA</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Disabled</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
            <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                <TableRow hover={false}>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                    Loading…
                  </td>
                </TableRow>
                ) : users.length === 0 ? (
                <TableRow hover={false}>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500">
                    No users found
                  </td>
                </TableRow>
                ) : users.map(u => (
                <TableRow key={u.id}>
                  <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    {u.id}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                    {u.name || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {u.email || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">
                    {u.phone || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={getRoleBadgeClass(u.role)}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {u.twoFactorEnabled ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs font-medium">Yes</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-50 text-gray-700 text-xs font-medium">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {u.isDisabled ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-red-50 text-red-700 text-xs font-medium">Yes</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-green-50 text-green-700 text-xs font-medium">No</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button 
                      className="px-3 py-1 text-xs font-medium text-gray-700 border border-gray-300 rounded hover:border-blue-500 hover:text-blue-600 transition-all duration-200 active:border-blue-500 active:text-blue-600 touch-manipulation flex items-center gap-1 cursor-pointer"
                      onClick={()=>openEdit(u)}
                    >
                      <Edit className="h-3 w-3" />
                      Edit
                    </button>
                    </td>
                </TableRow>
                ))}
              </tbody>
            </table>
        </div>
          </div>

      <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="text-sm text-gray-600">
          Total: <span className="font-semibold text-gray-900">{total}</span>
        </div>
            <div className="flex items-center gap-2">
          <button 
            className="p-2 border border-gray-300 rounded-lg hover:border-[#02665e] hover:text-[#02665e] transition-all duration-200 active:border-[#02665e] active:text-[#02665e] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
            onClick={()=>setPage(p=>Math.max(1,p-1))} 
            disabled={page<=1 || loading}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="text-sm text-gray-600">
            Page <span className="font-semibold text-gray-900">{page}</span>
          </div>
          <button 
            className="p-2 border border-gray-300 rounded-lg hover:border-[#02665e] hover:text-[#02665e] transition-all duration-200 active:border-[#02665e] active:text-[#02665e] touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center cursor-pointer"
            onClick={()=>setPage(p=>p+1)} 
            disabled={page*perPage >= total || loading}
            aria-label="Next page"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl border border-gray-200">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit user #{editing.id}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">{editing.name || '—'}</div>
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">{editing.email || '—'}</div>
              </div>
              <div>
                  <label htmlFor="edit-role" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select 
                    id="edit-role" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] outline-none" 
                    value={editing.role} 
                    onChange={e=>setEditing({...editing, role: e.target.value})}
                  >
                  <option value="ADMIN">Admin</option>
                  <option value="OWNER">Owner</option>
                  <option value="CUSTOMER">Customer</option>
                </select>
              </div>
              <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={disableUser} 
                      onChange={e=>setDisableUser(e.target.checked)}
                      className="w-4 h-4 text-[#02665e] border-gray-300 rounded focus:ring-[#02665e]"
                    />
                    <span className="text-sm text-gray-700">Disable user</span>
                </label>
              </div>
            </div>

              <div className="mt-4 p-3 border border-gray-200 rounded-lg">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={reset2FA} 
                    onChange={e=>setReset2FA(e.target.checked)}
                    className="w-4 h-4 text-[#02665e] border-gray-300 rounded focus:ring-[#02665e]"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">Reset 2FA</span>
                    <p className="text-xs text-gray-500 mt-1">Clear secret and disable two-factor authentication</p>
                  </div>
                </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
                <button 
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 cursor-pointer"
                  onClick={closeEdit}
                >
                  Cancel
                </button>
                <button 
                  className="px-4 py-2 text-sm font-medium text-white bg-[#02665e] rounded-lg hover:bg-[#015b54] transition-all duration-200 cursor-pointer"
                  onClick={saveEdit}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
