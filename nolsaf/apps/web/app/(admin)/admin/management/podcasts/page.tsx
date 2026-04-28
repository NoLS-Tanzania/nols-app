"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import {
  Play,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  X,
  ExternalLink,
  Radio,
  Search,
  Youtube,
  MoreHorizontal,
  CheckCircle2,
  User,
  Monitor,
} from "lucide-react";

const api = axios.create({ baseURL: "" });

interface Episode {
  id: string;
  title: string;
  description: string;
  youtubeUrl: string;
  thumbnailUrl: string | null;
  guestName: string | null;
  guestRole: string | null;
  tags: string[];
  duration: string | null;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const EMPTY_FORM = {
  title: "",
  description: "",
  youtubeUrl: "",
  guestName: "",
  guestRole: "",
  duration: "",
  tags: "",
  published: false,
};

type FilterTab = "all" | "published" | "draft";

function extractYouTubeId(url: string): string | null {
  try {
    const m = url.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
    );
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/* ——— Toggle switch ——— */
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer select-none group">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#02665e]/40 ${
          checked ? "bg-[#02665e]" : "bg-slate-200"
        }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
        {label}
      </span>
    </label>
  );
}

export default function AdminPodcastsPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [search, setSearch] = useState("");
  const [actionsOpen, setActionsOpen] = useState<string | null>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadEpisodes();
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    if (!actionsOpen) return;
    const handler = () => setActionsOpen(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [actionsOpen]);

  const loadEpisodes = async () => {
    try {
      setLoading(true);
      const res = await api.get("/api/admin/podcasts", { withCredentials: true });
      setEpisodes(res.data?.items || []);
    } catch {
      setError("Failed to load episodes");
    } finally {
      setLoading(false);
    }
  };

  const filteredEpisodes = useMemo(() => {
    let list = episodes;
    if (filterTab === "published") list = list.filter((e) => e.published);
    if (filterTab === "draft") list = list.filter((e) => !e.published);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          e.guestName?.toLowerCase().includes(q) ||
          (e.tags || []).some((t) => t.toLowerCase().includes(q))
      );
    }
    return list;
  }, [episodes, filterTab, search]);

  const stats = useMemo(
    () => ({
      total: episodes.length,
      published: episodes.filter((e) => e.published).length,
      drafts: episodes.filter((e) => !e.published).length,
    }),
    [episodes]
  );

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
    setShowPreview(false);
    setError(null);
  };

  const openEdit = (ep: Episode) => {
    setForm({
      title: ep.title,
      description: ep.description,
      youtubeUrl: ep.youtubeUrl,
      guestName: ep.guestName || "",
      guestRole: ep.guestRole || "",
      duration: ep.duration || "",
      tags: (ep.tags || []).join(", "),
      published: ep.published,
    });
    setEditingId(ep.id);
    setShowForm(true);
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) return setError("Title is required");
    if (!form.youtubeUrl.trim()) return setError("YouTube URL is required");

    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        youtubeUrl: form.youtubeUrl.trim(),
        guestName: form.guestName.trim() || null,
        guestRole: form.guestRole.trim() || null,
        duration: form.duration.trim() || null,
        tags: form.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        published: form.published,
      };

      if (editingId) {
        await api.put(`/api/admin/podcasts/${editingId}`, payload, { withCredentials: true });
        setSuccess("Episode updated successfully");
      } else {
        await api.post("/api/admin/podcasts", payload, { withCredentials: true });
        setSuccess("Episode created successfully");
      }

      resetForm();
      loadEpisodes();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to save episode");
    } finally {
      setSaving(false);
    }
  };

  const togglePublish = async (ep: Episode) => {
    try {
      await api.put(
        `/api/admin/podcasts/${ep.id}`,
        { published: !ep.published },
        { withCredentials: true }
      );
      loadEpisodes();
      setSuccess(ep.published ? "Episode moved to drafts" : "Episode is now live");
      setTimeout(() => setSuccess(null), 4000);
    } catch {
      setError("Failed to update publish status");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/admin/podcasts/${id}`, { withCredentials: true });
      setDeleteConfirmId(null);
      setActionsOpen(null);
      loadEpisodes();
      setSuccess("Episode deleted");
      setTimeout(() => setSuccess(null), 4000);
    } catch {
      setError("Failed to delete episode");
    }
  };

  const previewVideoId = extractYouTubeId(form.youtubeUrl);
  const previewThumb = previewVideoId
    ? `https://img.youtube.com/vi/${previewVideoId}/hqdefault.jpg`
    : null;

  const deleteTarget = deleteConfirmId ? episodes.find(e => e.id === deleteConfirmId) : null;
  const actionsTarget = actionsOpen ? episodes.find(e => e.id === actionsOpen) : null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

      {/* ─── Fixed actions dropdown popup ─── */}
      {actionsOpen && actionsTarget && dropdownPos && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setActionsOpen(null)} />
          <div
            className="fixed z-50 w-48 rounded-xl bg-white border border-slate-200 shadow-xl shadow-slate-200/50 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150"
            style={{ top: dropdownPos.top, right: dropdownPos.right }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => { openEdit(actionsTarget); setActionsOpen(null); }}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              <Pencil className="h-3.5 w-3.5 text-slate-400" />
              Edit Episode
            </button>
            <button
              onClick={() => { togglePublish(actionsTarget); setActionsOpen(null); }}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              {actionsTarget.published ? (
                <><EyeOff className="h-3.5 w-3.5 text-slate-400" />Move to Drafts</>
              ) : (
                <><Eye className="h-3.5 w-3.5 text-slate-400" />Publish Now</>
              )}
            </button>
            <a
              href={actionsTarget.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition no-underline"
              onClick={() => setActionsOpen(null)}
            >
              <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              View on YouTube
            </a>
            <div className="my-1.5 border-t border-slate-100" />
            <button
              onClick={() => { setDeleteConfirmId(actionsTarget.id); setActionsOpen(null); }}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-[13px] font-medium text-red-600 hover:bg-red-50 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Episode
            </button>
          </div>
        </>
      )}

      {/* ─── Delete confirmation modal ─── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDeleteConfirmId(null)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          {/* Dialog */}
          <div
            className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-50 flex items-center justify-center">
              <Trash2 className="h-5 w-5 text-red-500" />
            </div>
            <h2 className="text-center text-[15px] font-bold text-slate-900 mb-1">Delete this episode?</h2>
            {deleteTarget && (
              <p className="text-center text-[13px] text-slate-500 mb-5 line-clamp-2">
                &ldquo;{deleteTarget.title}&rdquo;
              </p>
            )}
            <p className="text-center text-[12px] text-slate-400 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition active:scale-[0.98]"
              >
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Page header ─── */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#02b4f5] to-[#02665e] flex items-center justify-center shadow-lg shadow-[#02665e]/20">
            <Radio className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Podcast & Media</h1>
            <p className="text-[13px] text-slate-500">Manage episodes on the public homepage</p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="inline-flex items-center gap-2 rounded-lg bg-[#02665e] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#025550] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" /> New Episode
        </button>
      </div>

      {/* ─── Stats row ─── */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        {[
          { label: "Total", value: stats.total, color: "text-slate-900", bg: "bg-slate-50" },
          { label: "Published", value: stats.published, color: "text-emerald-700", bg: "bg-emerald-50" },
          { label: "Drafts", value: stats.drafts, color: "text-amber-700", bg: "bg-amber-50" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-xl px-4 py-3.5 border border-slate-200/60`}>
            <p className={`text-2xl font-extrabold tabular-nums ${color}`}>{value}</p>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ─── Feedback ─── */}
      {success && (
        <div className="mb-5 flex items-center gap-2.5 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <span className="text-sm font-medium text-emerald-700">{success}</span>
        </div>
      )}
      {error && (
        <div className="mb-5 flex items-center justify-between rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <span className="text-sm font-medium text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* ─── Create / Edit form (modal) ─── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">
            {/* ── Accent bar ── */}
            <div className="h-1 w-full bg-gradient-to-r from-[#02665e] via-emerald-400 to-[#02665e] flex-shrink-0" />

            {/* ── Sticky header ── */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10 flex-shrink-0">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2.5">
                {editingId ? <Pencil className="h-4 w-4 text-[#02665e]" /> : <Plus className="h-4 w-4 text-[#02665e]" />}
                {editingId ? "Edit Episode" : "New Episode"}
              </h2>
              <button onClick={resetForm} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* ── Tab bar ── */}
            <div className="flex border-b border-gray-200 px-6 bg-gray-50/50 flex-shrink-0">
              <button
                onClick={() => setShowPreview(false)}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${
                  !showPreview
                    ? "border-[#02665e] text-[#02665e]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Edit
              </button>
              <button
                onClick={() => setShowPreview(true)}
                className={`px-4 py-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                  showPreview
                    ? "border-[#02665e] text-[#02665e]"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                Preview
              </button>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8">

              {/* ══ PREVIEW MODE ══ */}
              {showPreview ? (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">How it will appear on the homepage</p>
                  <div className="flex justify-center">
                    <div className="w-full max-w-sm rounded-2xl ring-1 ring-slate-200/80 bg-white overflow-hidden shadow-sm">
                      {/* Thumbnail */}
                      <div className="relative aspect-video bg-slate-100 overflow-hidden">
                        {previewThumb ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={previewThumb} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-colors">
                              <div className="h-12 w-12 rounded-full bg-white/90 shadow-lg flex items-center justify-center">
                                <Play className="h-5 w-5 text-slate-900 fill-slate-900 ml-0.5" />
                              </div>
                            </div>
                            {form.duration && (
                              <span className="absolute bottom-2 right-2 rounded bg-black/75 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">{form.duration}</span>
                            )}
                          </>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-50">
                            <Play className="h-10 w-10 text-slate-300" />
                          </div>
                        )}
                      </div>
                      {/* Content */}
                      <div className="p-4">
                        <h3 className="font-bold text-[15px] leading-snug text-slate-900 line-clamp-2">
                          {form.title || <span className="text-slate-300 italic font-normal">Episode title...</span>}
                        </h3>
                        {(form.guestName || form.guestRole) && (
                          <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                            <User className="h-3 w-3 flex-shrink-0" />
                            <span>
                              {form.guestName}
                              {form.guestRole && <span className="text-slate-400"> · {form.guestRole}</span>}
                            </span>
                          </div>
                        )}
                        {form.description && (
                          <p className="mt-2 text-[13px] leading-relaxed text-slate-500 line-clamp-2">{form.description}</p>
                        )}
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-[11px] text-slate-400 font-medium">
                            {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#02665e]">
                            Watch <Play className="h-3 w-3 fill-current" />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  {!form.title.trim() && !form.youtubeUrl.trim() && (
                    <p className="mt-4 text-center text-sm text-gray-400">Fill in the form fields to see changes reflected here.</p>
                  )}
                </div>
              ) : (
              /* ══ EDIT MODE ══ */
              <>

              {/* Section: Episode Details */}
              <div>
                <div className="pb-2.5 border-b border-gray-200 mb-5">
                  <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <Radio className="h-4 w-4 text-[#02665e]" />
                    Episode Details
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">Core info about this episode</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Title <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. Interview with Tanzania Tourism Board"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] transition-colors text-sm box-border"
                      maxLength={300}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">YouTube URL <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <Youtube className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500 pointer-events-none" />
                      <input
                        type="url"
                        value={form.youtubeUrl}
                        onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
                        placeholder="https://www.youtube.com/watch?v=..."
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] transition-colors text-sm box-border"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Brief summary of this episode..."
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] transition-colors text-sm resize-none box-border"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Guest Information */}
              <div>
                <div className="pb-2.5 border-b border-gray-200 mb-5">
                  <h3 className="text-base font-semibold text-gray-900">Guest Information</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Optional guest details</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Guest Name</label>
                    <input
                      type="text"
                      value={form.guestName}
                      onChange={(e) => setForm({ ...form, guestName: e.target.value })}
                      placeholder="e.g. John Mtui"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] transition-colors text-sm box-border"
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Guest Role</label>
                    <input
                      type="text"
                      value={form.guestRole}
                      onChange={(e) => setForm({ ...form, guestRole: e.target.value })}
                      placeholder="e.g. Director of Tourism"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] transition-colors text-sm box-border"
                    />
                  </div>
                </div>
              </div>

              {/* Section: Metadata */}
              <div>
                <div className="pb-2.5 border-b border-gray-200 mb-5">
                  <h3 className="text-base font-semibold text-gray-900">Metadata</h3>
                  <p className="text-sm text-gray-500 mt-0.5">Duration and tags for categorization</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration</label>
                    <input
                      type="text"
                      value={form.duration}
                      onChange={(e) => setForm({ ...form, duration: e.target.value })}
                      placeholder="e.g. 12:34"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] transition-colors text-sm box-border"
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags <span className="text-gray-400 font-normal">(comma-separated)</span></label>
                    <input
                      type="text"
                      value={form.tags}
                      onChange={(e) => setForm({ ...form, tags: e.target.value })}
                      placeholder="interview, tourism, update"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] transition-colors text-sm box-border"
                    />
                  </div>
                </div>
              </div>

              </>
              )}
            </div>

            {/* ── Sticky footer ── */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <Toggle
                checked={form.published}
                onChange={(v) => setForm({ ...form, published: v })}
                label="Publish immediately"
              />
              <div className="flex items-center gap-3">
                <button
                  onClick={resetForm}
                  className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="px-5 py-2.5 bg-[#02665e] text-white rounded-lg text-sm font-semibold hover:bg-[#024d47] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingId ? "Save Changes" : "Create Episode"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Filter bar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        {/* Tabs */}
        <div className="flex rounded-xl bg-slate-100 p-1 gap-0.5">
          {(
            [
              { key: "all", label: "All", count: stats.total },
              { key: "published", label: "Published", count: stats.published },
              { key: "draft", label: "Drafts", count: stats.drafts },
            ] as const
          ).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilterTab(key)}
              className={`rounded-lg px-4 py-2 text-[13px] font-semibold transition-all ${
                filterTab === key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {label}
              <span
                className={`ml-1.5 text-[11px] tabular-nums ${
                  filterTab === key ? "text-slate-500" : "text-slate-400"
                }`}
              >
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search episodes..."
            className="rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] w-full sm:w-72 transition-all"
          />
        </div>
      </div>

      {/* ─── Episodes table ─── */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-[#02665e]" />
            <span className="text-sm text-slate-400 font-medium">Loading episodes...</span>
          </div>
        </div>
      ) : episodes.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
            <Radio className="h-7 w-7 text-slate-300" />
          </div>
          <p className="text-lg font-bold text-slate-700">No episodes yet</p>
          <p className="text-sm text-slate-400 mt-1.5 max-w-[36ch] mx-auto">
            Create your first podcast episode to share media content with users on the homepage.
          </p>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#02665e] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#025550]"
          >
            <Plus className="h-4 w-4" />
            Create First Episode
          </button>
        </div>
      ) : filteredEpisodes.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
          <Search className="h-8 w-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold">No matching episodes</p>
          <p className="text-sm text-slate-400 mt-1">
            Try adjusting your search or filter.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-[minmax(0,1fr)_140px_120px_120px_52px] items-center gap-4 px-5 py-3 bg-slate-50/80 border-b border-slate-100 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">
            <span>Episode</span>
            <span>Status</span>
            <span>Duration</span>
            <span>Date</span>
            <span></span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-slate-100">
            {filteredEpisodes.map((ep) => {
              const videoId = extractYouTubeId(ep.youtubeUrl);
              const thumb =
                ep.thumbnailUrl ||
                (videoId
                  ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
                  : null);

              return (
                <div
                  key={ep.id}
                  className="group grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_140px_120px_120px_52px] items-center gap-3 md:gap-4 px-5 py-4 hover:bg-slate-50/60 transition-colors"
                >
                  {/* Episode info */}
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Thumbnail */}
                    <div className="relative flex-shrink-0 w-20 h-[45px] rounded-lg overflow-hidden bg-slate-100">
                      {thumb ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={thumb}
                          alt=""
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Play className="h-4 w-4 text-slate-300" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <Play className="h-4 w-4 text-white opacity-0 group-hover:opacity-80 transition-opacity fill-white" />
                      </div>
                    </div>

                    {/* Title + meta */}
                    <div className="min-w-0">
                      <h3 className="text-[13px] font-bold text-slate-900 truncate leading-tight">
                        {ep.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        {(ep.guestName || ep.guestRole) && (
                          <span className="text-[11px] text-slate-400 truncate">
                            {ep.guestName}
                            {ep.guestRole && ` · ${ep.guestRole}`}
                          </span>
                        )}
                        {(ep.tags || []).length > 0 && (
                          <div className="hidden lg:flex gap-1">
                            {ep.tags.slice(0, 2).map((t) => (
                              <span
                                key={t}
                                className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 uppercase tracking-wider"
                              >
                                {t}
                              </span>
                            ))}
                            {ep.tags.length > 2 && (
                              <span className="text-[9px] text-slate-400 font-medium">
                                +{ep.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    <button
                      onClick={() => togglePublish(ep)}
                      className={`inline-flex items-center gap-1.5 rounded-full pl-2 pr-3 py-1 text-[11px] font-bold transition-all ring-1 ${
                        ep.published
                          ? "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100"
                          : "bg-slate-50 text-slate-500 ring-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full flex-shrink-0 ${
                          ep.published ? "bg-emerald-500" : "bg-slate-300"
                        }`}
                      />
                      {ep.published ? "Published" : "Draft"}
                    </button>
                  </div>

                  {/* Duration */}
                  <div className="text-[13px] text-slate-500 tabular-nums font-medium">
                    {ep.duration || (
                      <span className="text-slate-300">—</span>
                    )}
                  </div>

                  {/* Date */}
                  <div className="text-[12px] text-slate-400 font-medium">
                    {ep.publishedAt ? fmtDate(ep.publishedAt) : fmtDate(ep.createdAt)}
                  </div>

                  {/* Actions dropdown */}
                  <div className="relative flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (actionsOpen === ep.id) {
                          setActionsOpen(null);
                        } else {
                          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                          setDropdownPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                          setActionsOpen(ep.id);
                        }
                      }}
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table footer */}
          <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100 bg-slate-50/50">
            <span className="text-[12px] text-slate-400 font-medium">
              {filteredEpisodes.length} episode{filteredEpisodes.length !== 1 ? "s" : ""}
              {filterTab !== "all" && ` (${filterTab})`}
            </span>
            <span className="text-[11px] text-slate-400">
              Sorted by most recent
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
