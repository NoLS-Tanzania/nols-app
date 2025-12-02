"use client";

import React from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

export default function LatestUpdate() {
  const youtubeUpdates = [
    { id: 'y1', date: '2025-11-01', title: 'New: How to Plan Group Trips', text: 'Short walkthrough video showing the new Plan With Us flow.', thumbnail: 'https://img.youtube.com/vi/NO22xxk4E6s/hqdefault.jpg', videoId: 'NO22xxk4E6s' },
    { id: 'y2', date: '2025-10-15', title: 'Driver Safety Tips', text: 'A short clip about driver verification and safety best practices.', thumbnail: '/assets/nolsaf%20picture%2022.jpg', videoId: 'REPLACE_WITH_VIDEO_ID_2' }
  ];

  const challengeUpdates = [
    { id: 'c1', date: '2025-11-20', title: 'Group Booking Challenge', text: 'Encouraging groups to try coordinated bookings for lower per-person cost.' },
    { id: 'c2', date: '2025-09-10', title: 'Referral Sprint', text: 'A month-long challenge to invite friends and unlock discounts.' }
  ];

  const successStories = [
    { id: 's1', date: '2025-11-12', title: 'Calfex Enterprises scaled sales', text: 'Calvin increased SKU counts and improved inventory tracking using Ramani.' },
    { id: 's2', date: '2025-08-30', title: 'Community group trip to Kilimanjaro', text: 'A local group used NoLSAF to organise an affordable group climb.' }
  ];

  const Card = ({ heading, items, href, color }: { heading: string; items: { id: string; date: string; title: string; text: string }[]; href: string; color?: 'youtube' | 'challenge' | 'success' }) => {
    const accentColorClass = color === 'youtube' ? 'border-l-[#FF0000]' : color === 'challenge' ? 'border-l-[#F97316]' : 'border-l-[#02665e]';
    const headingColorClass = color === 'youtube' ? 'text-[#FF0000]' : color === 'challenge' ? 'text-[#F97316]' : 'text-[#02665e]';
    const bottomColorClass = color === 'youtube' ? 'bg-[#FF0000]' : color === 'challenge' ? 'bg-[#F97316]' : 'bg-[#02665e]';

    return (
      <div tabIndex={0} className={`relative overflow-hidden rounded-lg border border-slate-200 ${accentColorClass} bg-white p-4 pb-6 shadow-sm transform-gpu transition-transform duration-150 ease-in-out hover:-translate-y-1 active:scale-95 active:translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-300`}>
        <h4 className={`text-sm font-semibold ${headingColorClass} mb-2`}>{heading}</h4>
      <ul className="list-none space-y-3">
        {items.map((u) => (
          <li key={u.id} className="text-sm">
            <div className="flex items-start gap-3">
              <div>
                <div className="text-xs text-slate-500">{u.date}</div>
                <div className="font-medium">{('videoId' in u) && (u as any).videoId ? (
                    <a href={`https://www.youtube.com/watch?v=${(u as any).videoId}`} target="_blank" rel="noopener noreferrer" className="text-slate-900 no-underline font-bold">{u.title}</a>
                  ) : (
                    <span className="font-bold">{u.title}</span>
                  )}</div>
                <div className="text-slate-600">{u.text}</div>
              </div>
            </div>
          </li>
        ))}
      </ul>
        <div className="mt-3">
          <Link href={href} className={`inline-flex items-center text-sm font-medium ${headingColorClass} no-underline group`}>
            <ExternalLink className="w-4 h-4" aria-hidden />
            <span className="sr-only">View all</span>
            <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-sm">View all</span>
          </Link>
        </div>

        {/* bottom color bar to visually distinguish cards (flush with card edge) */}
        <div className={`absolute left-0 right-0 bottom-0 h-1 ${bottomColorClass}`} aria-hidden />
      </div>
    );
  };

  return (
    <aside className="mt-6">
      <div className="public-container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card heading="Our Updates" items={youtubeUpdates} href="/updates/youtube" color="youtube" />
          <Card heading="Challenges" items={challengeUpdates} href="/updates/challenges" color="challenge" />
          <Card heading="Success Stories" items={successStories} href="/updates/success-stories" color="success" />
        </div>
      </div>
    </aside>
  );
}
