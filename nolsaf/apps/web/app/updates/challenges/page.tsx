import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function Page() {
  const items = [
    // make first item active (future date) so the page demonstrates both states
    { id: 'c1', date: '2025-12-05', title: 'Group Booking Challenge', text: 'Try coordinated bookings for lower per-person cost.' },
    { id: 'c2', date: '2025-09-10', title: 'Referral Sprint', text: 'Invite friends and unlock discounts during the sprint.' }
  ];

  // determine which challenges are active (date on or after today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const itemsSorted = [...items].sort((a, b) => {
    const aActive = new Date(a.date) >= today ? 1 : 0;
    const bActive = new Date(b.date) >= today ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive; // active first
    // then newest first
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  return (
    <main className="public-container py-6">
      <div className="max-w-3xl mx-auto text-center mb-8">
        <div className="text-sm uppercase tracking-wider text-slate-500 mb-2">Challenges</div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500">Active & Past Challenges</h1>
        <p className="mt-3 text-sm text-slate-600">Try these short challenges to unlock discounts and perks.</p>
      </div>

      <ul className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {itemsSorted.map((i) => {
          const isActive = new Date(i.date) >= today;
          return (
            <li key={i.id} className={`rounded-lg border p-3 bg-white shadow-sm hover:shadow-md transition-colors flex flex-col ${isActive ? 'border-l-4 border-emerald-500' : 'opacity-80'} `}>
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-sm font-semibold text-slate-900 leading-tight mb-2 line-clamp-2">
                  <span className="no-underline text-slate-900">{i.title}</span>
                </h3>
                <div className="ml-2">
                  {isActive ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Active</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">Past</span>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-600 line-clamp-2">{i.text}</p>
              <div className="mt-3 text-2xs text-slate-500">{i.date}</div>
            </li>
          );
        })}
      </ul>

      <div className="mt-6">
        <Link href="/public" className="inline-flex items-center no-underline group text-slate-700">
          <ChevronLeft className="w-5 h-5" aria-hidden />
          <span className="sr-only">Back</span>
          <span aria-hidden className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">Back</span>
        </Link>
      </div>
    </main>
  );
}
