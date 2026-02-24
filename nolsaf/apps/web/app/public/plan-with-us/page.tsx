"use client";

import React from "react";
import {
  Calendar, BookOpen, GraduationCap, Users, Plane, MoreHorizontal,
  MapPin, FileText, Phone, Clock, ArrowRight, CheckCircle2, Sparkles
} from 'lucide-react';
import PlanRequestForm from "../../../components/PlanRequestForm";

const ROLES: {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  iconBg: string;
  iconColor: string;
  accentBar: string;
  hoverRing: string;
  activeColor: string;
}[] = [
  {
    id: 'Tourist',
    label: 'Tourist',
    icon: <Plane className="w-5 h-5" />,
    description: 'Plan a safari, beach break or cultural trip',
    iconBg: 'bg-sky-50',
    iconColor: 'text-sky-600',
    accentBar: 'bg-sky-500',
    hoverRing: 'hover:border-sky-400 hover:shadow-sky-100',
    activeColor: 'bg-sky-600 text-white border-sky-600',
  },
  {
    id: 'Event planner',
    label: 'Event Planner',
    icon: <Calendar className="w-5 h-5" />,
    description: 'Conferences, weddings, workshops & retreats',
    iconBg: 'bg-violet-50',
    iconColor: 'text-violet-600',
    accentBar: 'bg-violet-500',
    hoverRing: 'hover:border-violet-400 hover:shadow-violet-100',
    activeColor: 'bg-violet-600 text-white border-violet-600',
  },
  {
    id: 'School / Teacher',
    label: 'School / Teacher',
    icon: <BookOpen className="w-5 h-5" />,
    description: 'Educational day-trips or multi-day excursions',
    iconBg: 'bg-amber-50',
    iconColor: 'text-amber-600',
    accentBar: 'bg-amber-500',
    hoverRing: 'hover:border-amber-400 hover:shadow-amber-100',
    activeColor: 'bg-amber-500 text-white border-amber-500',
  },
  {
    id: 'University',
    label: 'University',
    icon: <GraduationCap className="w-5 h-5" />,
    description: 'Research expeditions and field studies',
    iconBg: 'bg-rose-50',
    iconColor: 'text-rose-600',
    accentBar: 'bg-rose-500',
    hoverRing: 'hover:border-rose-400 hover:shadow-rose-100',
    activeColor: 'bg-rose-600 text-white border-rose-600',
  },
  {
    id: 'Community group',
    label: 'Community Group',
    icon: <Users className="w-5 h-5" />,
    description: 'NGO programs, volunteer and social initiatives',
    iconBg: 'bg-teal-50',
    iconColor: 'text-teal-600',
    accentBar: 'bg-teal-500',
    hoverRing: 'hover:border-teal-400 hover:shadow-teal-100',
    activeColor: 'bg-teal-600 text-white border-teal-600',
  },
  {
    id: 'Other',
    label: 'Other',
    icon: <MoreHorizontal className="w-5 h-5" />,
    description: "Something else? We'll still make it work",
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-500',
    accentBar: 'bg-slate-400',
    hoverRing: 'hover:border-slate-400 hover:shadow-slate-100',
    activeColor: 'bg-slate-700 text-white border-slate-700',
  },
];

const HOW_IT_WORKS = [
  { icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />, label: 'Pick your role', detail: 'We tailor the questions to your group type.' },
  { icon: <FileText className="w-5 h-5 text-emerald-500" />, label: 'Fill the form', detail: 'Destinations, dates, budget — takes ~3 minutes.' },
  { icon: <Sparkles className="w-5 h-5 text-emerald-500" />, label: 'Get a plan', detail: 'Itinerary, budget estimate and permit checklist in 48 h.' },
];

export default function PlanWithUsPage() {
  const [selectedRole, setSelectedRole] = React.useState<string | null>(null);

  return (
    <main className="min-h-screen bg-[#f8f9fb] pt-20 text-slate-900">

      {/* ── Hero ── */}
      <div className="public-container pt-6 pb-2">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white shadow-xl">
          {/* decorative circles */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/5" aria-hidden />
          <div className="pointer-events-none absolute bottom-0 left-0 h-40 w-40 rounded-full bg-white/5" aria-hidden />

          <div className="relative px-6 sm:px-10 py-12 sm:py-16 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-xs font-semibold tracking-wide uppercase mb-4">
              <MapPin className="w-3.5 h-3.5" aria-hidden />
              East Africa Travel Planning
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
              Plan your next adventure<br className="hidden sm:block" /> with NoLSAF
            </h1>
            <p className="mt-4 max-w-2xl mx-auto text-sm sm:text-lg text-white/80 leading-relaxed">
              Tell us about your group and goals. We will send you tailored itineraries, estimated budgets, and
              a clear checklist of permits and documents — all within 48 hours.
            </p>

            {/* How it works strip */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
              {HOW_IT_WORKS.map((step, i) => (
                <div key={step.label} className="flex items-start gap-3 rounded-2xl bg-white/10 border border-white/15 px-4 py-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold">
                    {i + 1}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{step.label}</div>
                    <div className="text-xs text-white/70 mt-0.5">{step.detail}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Role selector ── */}
      <div className="public-container py-10">
          {!selectedRole && (
            <>
              <div className="text-center mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Who are you planning for?</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Select your role — this unlocks the right questions for your group.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {ROLES.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRole(role.id)}
                    className={[
                      'group relative flex flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm',
                      'transition-all duration-200 hover:-translate-y-1 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2',
                      role.hoverRing,
                    ].join(' ')}
                  >
                    {/* colored accent bar at top */}
                    <div className={['absolute inset-x-0 top-0 h-[3px] rounded-t-2xl', role.accentBar].join(' ')} aria-hidden />

                    {/* icon bubble */}
                    <div className={['flex h-10 w-10 items-center justify-center rounded-xl', role.iconBg, role.iconColor].join(' ')}>
                      {role.icon}
                    </div>

                    {/* text */}
                    <div className="flex-1">
                      <div className="text-sm font-bold text-slate-900 leading-tight">{role.label}</div>
                      <div className="text-[11px] mt-1 leading-snug text-slate-500">{role.description}</div>
                    </div>

                    {/* hover arrow */}
                    <ArrowRight className={['absolute bottom-4 right-4 w-4 h-4 opacity-0 translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0', role.iconColor].join(' ')} aria-hidden />
                  </button>
                ))}
              </div>

              <div className="mt-5 flex items-center justify-center gap-2 text-sm text-slate-400">
                <ArrowRight className="w-4 h-4 animate-bounce-x" aria-hidden />
                Select a role above to continue
              </div>
            </>
          )}

          {selectedRole && (() => {
            const active = ROLES.find(r => r.id === selectedRole)!;
            return (
              <div className="flex items-center gap-4">
                <div className={['flex items-center gap-3 flex-1 rounded-2xl border-2 p-4', active.activeColor].join(' ')}>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20 text-white">
                    {active.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white leading-tight">{active.label}</div>
                    <div className="text-[11px] text-white/75 mt-0.5 leading-snug">{active.description}</div>
                  </div>
                  <CheckCircle2 className="ml-auto w-5 h-5 text-white/80 shrink-0" aria-hidden />
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRole(null)}
                  className="shrink-0 text-xs font-semibold text-slate-500 hover:text-slate-900 border border-slate-200 bg-white rounded-xl px-4 py-2 transition hover:shadow-sm"
                >
                  Change
                </button>
              </div>
            );
          })()}
      </div>

      {/* ── Info strip (shown while no role selected) ── */}
      {!selectedRole && (
        <div className="public-container pb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-100">
                <FileText className="w-4 h-4 text-emerald-600" aria-hidden />
              </div>
              <div>
                <div className="font-semibold text-slate-800">What you'll receive</div>
                <ul className="mt-2 space-y-1 text-slate-600 text-xs">
                  <li className="flex items-start gap-2"><MapPin className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" /> Suggested itineraries with estimated prices</li>
                  <li className="flex items-start gap-2"><FileText className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" /> Permit &amp; document checklist</li>
                  <li className="flex items-start gap-2"><Calendar className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" /> Timelines and booking windows</li>
                  <li className="flex items-start gap-2"><Phone className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" /> Dedicated agent contact</li>
                </ul>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 border border-amber-100">
                <Clock className="w-4 h-4 text-amber-500" aria-hidden />
              </div>
              <div>
                <div className="font-semibold text-slate-800">Response time</div>
                <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                  Most requests receive a tailored reply within <strong>48 hours</strong>.
                  For urgent planning, include the word <strong>urgent</strong> in the notes field.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Form ── */}
      <div id="request" className="public-container pb-16">
        <PlanRequestForm selectedRole={selectedRole} />
      </div>

    </main>
  );
}
