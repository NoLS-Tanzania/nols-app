"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import axios from "axios";
import { ArrowLeft, Calendar, CheckCircle, ClipboardList, Clock, User } from "lucide-react";
import LogoSpinner from "@/components/LogoSpinner";

const api = axios.create({ baseURL: "", withCredentials: true });

type AssignmentDetail = {
  id: string | number;
  title?: string;
  description?: string | null;
  status?: string;
  createdAt?: string;
  completedAt?: string | null;
  assignedBy?: { name?: string | null; email?: string | null } | string | null;
  reviewedBy?: { name?: string | null; email?: string | null } | string | null;
  notes?: Array<{ id?: string | number; text?: string; createdAt?: string; createdBy?: { name?: string } | string }>; 
};

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="h-10 w-10 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
        {icon}
      </div>
      <div>
        <div className="text-xs font-semibold text-slate-600">{label}</div>
        <div className="text-sm font-bold text-slate-900 mt-0.5">{value}</div>
      </div>
    </div>
  );
}

export default function AgentAssignmentDetailPage() {
  const params = useParams();
  const assignmentId = (params as any)?.id ? String((params as any).id) : "";

  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState<AssignmentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setError(null);
        setAuthRequired(false);

        await api.get("/api/account/me");

        const res = await api.get(`/api/agent/assignments/${encodeURIComponent(assignmentId)}`);
        if (!alive) return;

        setItem(res.data?.item ?? res.data?.data?.item ?? res.data);
      } catch (e: any) {
        if (!alive) return;
        if (e?.response?.status === 401) {
          setAuthRequired(true);
          setItem(null);
          setError(null);
        } else {
          const msg = e?.response?.data?.error || "Failed to load assignment";
          setError(String(msg));
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [assignmentId]);

  const title = item?.title || (assignmentId ? `Assignment #${assignmentId}` : "Assignment");
  const status = item?.status || "Pending";

  const createdAt = item?.createdAt
    ? new Date(item.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  const completedAt = item?.completedAt
    ? new Date(item.completedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—";

  const assignedByName =
    typeof item?.assignedBy === "string"
      ? item.assignedBy
      : (item?.assignedBy as any)?.name || "—";

  const reviewedByName =
    typeof item?.reviewedBy === "string"
      ? item.reviewedBy
      : (item?.reviewedBy as any)?.name || "—";

  return (
    <div className="w-full py-2 sm:py-4">
      <div className="mb-6 rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-card overflow-hidden">
        <div className="p-5 sm:p-7">
        <Link
          href="/account/agent/assignments"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-brand transition-colors mb-5 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
          Back to Assignments
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
            <p className="text-sm sm:text-base text-slate-600 mt-1">#{assignmentId} • {status}</p>
          </div>
          <Link
            href="/account/agent/assignments"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white/70 backdrop-blur text-slate-800 font-semibold no-underline hover:shadow-card transition-shadow"
          >
            Assignment list
            <ArrowLeft className="w-4 h-4 rotate-180" aria-hidden />
          </Link>
        </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <LogoSpinner size="lg" className="mb-4" ariaLabel="Loading assignment" />
          <p className="text-sm text-slate-600">Loading assignment...</p>
        </div>
      ) : authRequired ? (
        <div className="rounded-2xl border border-slate-200 bg-white/70 backdrop-blur p-6 shadow-card">
          <div className="text-sm font-bold text-slate-900">Sign in required</div>
          <div className="text-sm text-slate-600 mt-1">Log in to view assignment details.</div>
          <div className="mt-4">
            <Link
              href="/account/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand text-white font-semibold no-underline hover:bg-brand-700 shadow-card transition-colors"
            >
              Sign in
              <ArrowLeft className="w-4 h-4 rotate-180" aria-hidden />
            </Link>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-900">
          <div className="font-bold">Couldn’t load assignment</div>
          <div className="text-sm mt-1 text-rose-800">{error}</div>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow icon={<ClipboardList className="w-5 h-5" aria-hidden />} label="Status" value={status} />
              <InfoRow icon={<Calendar className="w-5 h-5" aria-hidden />} label="Created" value={createdAt} />
              <InfoRow icon={<CheckCircle className="w-5 h-5" aria-hidden />} label="Completed" value={completedAt} />
              <InfoRow icon={<User className="w-5 h-5" aria-hidden />} label="Assigned by" value={assignedByName} />
            </div>
          </div>

          <div className="p-5 sm:p-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="text-sm font-bold text-slate-900">Description</div>
              <div className="text-sm text-slate-600 mt-2">
                {item?.description ? item.description : "No description provided."}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-bold text-slate-900">Staff context</div>
                  <div className="text-sm text-slate-600 mt-1">Visible staff linked to this assignment.</div>
                </div>
                <div className="inline-flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 text-slate-700">
                  <Clock className="w-4 h-4 text-slate-500" aria-hidden />
                  Premium-ready
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow icon={<User className="w-5 h-5" aria-hidden />} label="Reviewed by" value={reviewedByName} />
                <InfoRow icon={<User className="w-5 h-5" aria-hidden />} label="Assigned by" value={assignedByName} />
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="text-sm font-bold text-slate-900">Notes</div>
              <div className="text-sm text-slate-600 mt-1">Assignment notes and audit trail will render here once connected.</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
