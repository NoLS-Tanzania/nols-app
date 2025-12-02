import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, Play } from 'lucide-react';

// thumbnails removed per request

export default function Page() {
  const items = [
    { id: 'y1', date: '2025-11-01', title: 'How to Plan Group Trips', text: 'Short walkthrough video showing the new Plan With Us flow.', thumbnail: 'https://img.youtube.com/vi/NO22xxk4E6s/hqdefault.jpg', videoId: 'NO22xxk4E6s' },
    { id: 'y2', date: '2025-10-15', title: 'Driver Safety Tips', text: 'A short clip about driver verification and safety best practices.', thumbnail: '/assets/nolsaf%20picture%2022.jpg', videoId: 'REPLACE_WITH_VIDEO_ID_2' }
  ];

  return (
    <main className="public-container py-6">
      <div className="max-w-3xl mx-auto text-center mb-8">
        <div className="text-sm uppercase tracking-wider text-slate-500 mb-2">Latest videos</div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-red-600 via-pink-600 to-rose-500">Our Updates</h1>
        <p className="mt-3 text-sm text-slate-600">Latest videos and short clips from our YouTube channel.</p>
      </div>

      <ul className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((i) => (
          <li key={i.id} className={`rounded-lg border p-3 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col ${ (i as any).videoId ? 'border-l-4 border-[#FF0000]' : ''}`}>
            <div className="w-full">
              <h3 className="text-sm font-semibold text-slate-900 leading-tight mb-2 line-clamp-2">{(i as any).videoId ? (
                <a href={`https://www.youtube.com/watch?v=${(i as any).videoId}`} target="_blank" rel="noopener noreferrer" className="no-underline text-slate-900 hover:text-slate-800">
                  {i.title}
                </a>
              ) : (
                <span className="text-slate-900">{i.title}</span>
              )}</h3>

              {/* Thumbnail / play - compact */}
              {(i as any).thumbnail && (
                <div className="w-full relative mb-2">
                  <a href={`https://www.youtube.com/watch?v=${(i as any).videoId || ''}`} target="_blank" rel="noopener noreferrer" className="group block rounded-md overflow-hidden" aria-label={`Watch ${i.title} on YouTube`}>
                    <Image src={(i as any).thumbnail} alt={i.title} width={480} height={270} className="w-full h-28 object-cover rounded-md" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow">
                        <Play className="w-5 h-5 text-red-600" />
                      </div>
                    </div>
                  </a>
                </div>
              )}

              <p className="text-xs text-slate-600 line-clamp-2">{i.text}</p>
              <div className="text-2xs text-slate-500 mt-2">{i.date}</div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <Link href="/public" className="inline-flex items-center no-underline group text-slate-700">
          <ChevronLeft className="w-5 h-5" aria-hidden />
          <span className="sr-only">Back</span>
          <span className="ml-2 opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity">Back</span>
        </Link>
      </div>
    </main>
  );
}
