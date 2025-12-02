import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function Page() {
  const items = [
    { id: 's1', date: '2025-11-12', title: 'Calfex Enterprises scaled sales', text: 'Calvin increased SKU counts and improved inventory tracking using Ramani.' },
    { id: 's2', date: '2025-08-30', title: 'Community group trip to Kilimanjaro', text: 'A local group used NoLSAF to organise an affordable group climb.' }
  ];

  return (
    <main className="public-container py-6">
      <div className="max-w-3xl mx-auto text-center mb-8">
        <div className="text-sm uppercase tracking-wider text-slate-500 mb-2">Success Stories</div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-violet-600 to-pink-500">Stories of impact</h1>
        <p className="mt-3 text-sm text-slate-600">Stories from users and partners who found success with our platform.</p>
      </div>

      <ul className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((i) => (
          <li key={i.id} className="rounded-lg border p-3 bg-white shadow-sm hover:shadow-md transition-colors flex flex-col">
            <h3 className="text-sm font-semibold text-slate-900 leading-tight mb-2 line-clamp-2">
              <span className="no-underline text-slate-900">{i.title}</span>
            </h3>
            <p className="text-xs text-slate-600 line-clamp-2">{i.text}</p>
            <div className="mt-3 text-2xs text-slate-500">{i.date}</div>
          </li>
        ))}
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
