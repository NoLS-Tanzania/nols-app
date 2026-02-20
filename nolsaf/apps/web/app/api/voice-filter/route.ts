import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

// This is a lightweight mock implementation for development.
// It accepts a multipart/form-data POST with field `file` (audio Blob),
// performs a simple (mock) transcription & keyword extraction, and
// returns a `query` or `redirect` that the client can follow.
// Uploaded audio is never persisted on disk here — it's processed in memory
// and discarded immediately (one-time use).

async function mockTranscribe(_buffer: ArrayBuffer): Promise<string> {
  // In production you'd call a speech-to-text service here.
  // For now return a predictable example to demonstrate flow.
  return 'quiet place far from road 2 bedrooms under 50000';
}

function extractFiltersFromText(text: string) {
  const t = text.toLowerCase();
  const params: Record<string, string> = {};

  if (t.includes('quiet') || t.includes('safe') || t.includes('away from road') || t.includes('far from road')) {
    params.filter = 'safe_quiet';
  }

  // bedrooms
  const bedMatch = t.match(/(\b(\d+)\s*(bedroom|bedrooms|br)\b)/i);
  if (bedMatch) params.bedrooms = bedMatch[2];

  // price (look for 'under X' or numbers with k)
  const underMatch = t.match(/under\s*(\d+[kK]?)/);
  if (underMatch) {
    let v = underMatch[1];
    if (v.toLowerCase().endsWith('k')) v = String(parseInt(v.slice(0, -1), 10) * 1000);
    params.max_price = v;
  } else {
    const numMatch = t.match(/(\d{3,6})/);
    if (numMatch) params.max_price = numMatch[1];
  }

  return params;
}

function toQueryString(params: Record<string, string>) {
  const s = new URLSearchParams(params as Record<string, string>);
  return s.toString();
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'no file' }, { status: 400 });

    // read buffer (but do NOT save it) — this simulates one-time processing
    const buffer = await file.arrayBuffer();
    // mock transcription
    const transcript = await mockTranscribe(buffer);
    const filters = extractFiltersFromText(transcript);

    // build query string — prefer a filter param if present
    const query = toQueryString(filters);

    // return the query; client can redirect to `/properties?${query}`
    return NextResponse.json({ query, note: 'audio processed and discarded' });
  } catch (err) {
    console.error('voice-filter error', err);
    return NextResponse.json({ error: 'server error' }, { status: 500 });
  }
}
