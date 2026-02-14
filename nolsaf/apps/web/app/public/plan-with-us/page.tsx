"use client";

import React from "react";
import { Calendar, BookOpen, GraduationCap, Users, Plane, MoreHorizontal, Check, Clock, MapPin, FileText, Phone } from 'lucide-react';
import PlanRequestForm from "../../../components/PlanRequestForm";

export default function PlanWithUsPage() {
  const [selectedRole, setSelectedRole] = React.useState<string | null>(null);
  const getPersonaIcon = (p: string) => {
    switch (p) {
      case 'Event planner':
        return <Calendar className="w-5 h-5 mr-2 flex-shrink-0" />;
      case 'School / Teacher':
        return <BookOpen className="w-5 h-5 mr-2 flex-shrink-0" />;
      case 'University':
        return <GraduationCap className="w-5 h-5 mr-2 flex-shrink-0" />;
      case 'Community group':
        return <Users className="w-5 h-5 mr-2 flex-shrink-0" />;
      case 'Tourist':
        return <Plane className="w-5 h-5 mr-2 flex-shrink-0" />;
      default:
        return <MoreHorizontal className="w-5 h-5 mr-2 flex-shrink-0" />;
    }
  };
  return (
    <main className="min-h-screen bg-gray-50 pt-20 text-slate-900">
      <section className="public-container py-8">
        {/* Page title */}
        <div className="w-full flex justify-center mb-1">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-emerald-800">Welcome to Plan with NoLSAF</h1>
        </div>

        {/* Hero block (plain — no card) */}
        <div className="w-full flex justify-center">
          <div className="w-full relative py-2 sm:py-4">
            <div className="text-center max-w-3xl mx-auto px-4">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Tell us where you want to go</h2>
              <p className="mt-1 text-sm sm:text-lg text-slate-700">Tell us about your group and goals. We will provide tailored itineraries, estimated budgets, and a clear checklist of permits, documents and preparations to help you plan with confidence.</p>

              {/* Persona prompt and cards (selectable) */}
              <div className="mt-5 flex flex-col items-center">
                <div className="text-sm text-slate-500 mb-2 text-center font-medium">Are you?</div>
                <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
                  {['Event planner', 'School / Teacher', 'University', 'Community group', 'Tourist', 'Other'].map((p) => (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={selectedRole === p}
                      onClick={() => setSelectedRole(prev => prev === p ? null : p)}
                      className={
                        `px-4 py-2 rounded-xl text-sm border transition transform duration-150 ease-out hover:-translate-y-0.5 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-1 flex items-center justify-center w-full sm:w-auto sm:flex-initial max-w-xs` +
                        (selectedRole === p
                          ? ' bg-emerald-600 text-white border-emerald-700 shadow-md'
                          : ' bg-white text-slate-800 border-gray-200')
                      }
                    >
                      {getPersonaIcon(p)}
                      <span className="leading-tight">{p}</span>
                    </button>
                  ))}
                </div>
                {!selectedRole && (
                  <p className="mt-4 text-sm text-slate-500">Select a role above to see tailored questions for your group.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Persona chips moved into the hero; removed duplicate group here. */}

        <div id="request" className={"mt-8 grid grid-cols-1 " + (selectedRole ? 'md:grid-cols-1' : 'md:grid-cols-3') + " gap-6 items-start"}>
          {!selectedRole && (
            <div>
              <div
                className="rounded-lg border p-4 bg-white shadow-sm transform-gpu transition duration-200 ease-out hover:-translate-y-1 hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                tabIndex={0}
                role="button"
                aria-label="What we will provide"
              >
                <h3 className="flex items-center gap-2 font-semibold text-slate-800"><Check className="w-5 h-5 text-emerald-600"/> What we will provide</h3>
                  <ul className="mt-3 space-y-2 text-sm text-slate-700">
                    <li className="flex items-start gap-2"><MapPin className="w-4 h-4 text-emerald-500 mt-1"/> <span>Suggested itineraries with prices</span></li>
                    <li className="flex items-start gap-2"><FileText className="w-4 h-4 text-emerald-500 mt-1"/> <span>Checklist of required permits and documents</span></li>
                    <li className="flex items-start gap-2"><Calendar className="w-4 h-4 text-emerald-500 mt-1"/> <span>Estimated timelines and booking windows</span></li>
                    <li className="flex items-start gap-2"><Phone className="w-4 h-4 text-emerald-500 mt-1"/> <span>Contact options and agent assignment</span></li>
                  </ul>
              </div>
            </div>
          )}

          <div className="w-full">
            <PlanRequestForm selectedRole={selectedRole} />
          </div>

          {!selectedRole && (
            <div>
              <div
                className="rounded-lg border p-4 bg-white shadow-sm transform-gpu transition duration-200 ease-out hover:-translate-y-1 hover:shadow-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                tabIndex={0}
                role="button"
                aria-label="Response time"
              >
                <h3 className="flex items-center gap-2 font-semibold text-slate-800"><Clock className="w-5 h-5 text-amber-500"/> Response time</h3>
                <p className="mt-2 text-sm text-slate-700">Most requests receive a tailored reply within 48 hours. For urgent planning, include the word <strong>urgent</strong> in the notes.</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
