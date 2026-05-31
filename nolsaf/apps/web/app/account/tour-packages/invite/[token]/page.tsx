"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import apiClient from "@/lib/apiClient";
import LayoutFrame from "@/components/LayoutFrame";
import { CheckCircle2, Loader2, ShieldCheck, Users } from "lucide-react";

const api = apiClient;

export default function TourTimelineInvitePage() {
  const params = useParams<{ token: string }>();
  const token = String(params?.token || "");
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invite, setInvite] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);

  const invitePath = `/account/tour-packages/invite/${encodeURIComponent(token)}`;
  const registerHref = `/account/register?mode=register&role=traveller&next=${encodeURIComponent(invitePath)}`;
  const loginHref = `/account/register?mode=login&role=traveller&next=${encodeURIComponent(invitePath)}`;

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await api.get(`/api/customer/tour-bookings/timeline-invites/${encodeURIComponent(token)}`);
        if (!alive) return;
        setInvite(res.data || null);
        setNeedsAuth(false);
        setMessage(null);
      } catch (err: any) {
        if (!alive) return;
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          setNeedsAuth(true);
          setMessage("Register or login as a traveller to accept this shared timeline.");
        } else {
          setMessage(err?.response?.data?.error || "This timeline invite is not available.");
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  const acceptInvite = async () => {
    if (!token || accepting) return;
    setAccepting(true);
    setMessage(null);
    try {
      const res = await api.post(`/api/customer/tour-bookings/timeline-invites/${encodeURIComponent(token)}/accept`);
      const timelineUrl = String(res?.data?.timelineUrl || "");
      window.location.href = timelineUrl || "/account/tour-packages";
    } catch (err: any) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        setNeedsAuth(true);
        setMessage("Register or login as a traveller to accept this shared timeline.");
      } else {
        setMessage(err?.response?.data?.error || "Unable to accept this timeline invite.");
      }
    } finally {
      setAccepting(false);
    }
  };

  return (
    <main className="w-full max-w-[100vw] overflow-x-hidden py-4 sm:py-6">
      <LayoutFrame heightVariant="sm" topVariant="none" colorVariant="muted" variant="solid" className="mb-4" />
      <section className="mx-auto box-border flex min-h-[62vh] w-full max-w-5xl min-w-0 items-center justify-center px-3 sm:px-6">
        <div className="box-border w-full max-w-[calc(100vw-1.5rem)] min-w-0 overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-sm sm:max-w-2xl">
          <div className="min-w-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.22)_1px,transparent_0)] [background-size:16px_16px] bg-[#02665e] px-4 py-4 text-white sm:px-5">
            <div className="inline-flex max-w-full min-w-0 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide">
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 truncate">Shared Tour Timeline</span>
            </div>
            <h1 className="mt-3 min-w-0 break-words text-2xl font-bold leading-tight [overflow-wrap:anywhere] sm:text-3xl">
              {invite?.title || "Timeline invite"}
            </h1>
            <p className="mt-2 max-w-xl break-words text-sm leading-relaxed text-teal-50">
              Join as a traveller to track the timetable and provide your own event ratings.
            </p>
          </div>

        <div className="min-w-0 p-4 sm:p-5">
          {loading ? (
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin text-teal-700" />
              Loading invite...
            </div>
          ) : needsAuth ? (
            <div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {message}
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Link href={registerHref} className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white no-underline hover:bg-teal-700">
                  Register Traveller
                </Link>
                <Link href={loginHref} className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 no-underline hover:bg-slate-50">
                  Login
                </Link>
              </div>
            </div>
          ) : invite?.alreadyAccepted ? (
            <div>
              <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                You already have access to this timeline.
              </div>
              <div className="mt-4 flex w-full justify-center">
                <Link href={invite.timelineUrl || "/account/tour-packages"} className="inline-flex w-full max-w-sm items-center justify-center rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white no-underline hover:bg-teal-700">
                  Open Timeline
                </Link>
              </div>
            </div>
          ) : Number(invite?.remainingSlots || 0) <= 0 ? (
            <div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                This shared timeline has reached the traveller limit declared during booking.
              </div>
              <div className="mt-4 flex w-full justify-center">
                <Link href="/account/tour-packages" className="inline-flex w-full max-w-sm items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 no-underline hover:bg-slate-50">
                  Back to Tour Packages
                </Link>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                Access is protected. After accepting, this timeline is attached to your authenticated traveller account.
              </div>
              <div className="mt-3 rounded-xl border border-teal-100 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
                {Number(invite?.remainingSlots || 0)} traveller slot{Number(invite?.remainingSlots || 0) === 1 ? "" : "s"} remaining from {Number(invite?.travelerCount || 1)} declared traveller{Number(invite?.travelerCount || 1) === 1 ? "" : "s"}.
              </div>
              {message ? <div className="mt-3 text-sm text-rose-700">{message}</div> : null}
              <div className="mt-4 flex w-full justify-center">
                <button
                  type="button"
                  onClick={acceptInvite}
                  disabled={accepting}
                  className="inline-flex w-full max-w-sm items-center justify-center rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {accepting ? "Accepting..." : "Accept and Open Timeline"}
                </button>
              </div>
            </div>
          )}
        </div>
        </div>
      </section>
    </main>
  );
}
