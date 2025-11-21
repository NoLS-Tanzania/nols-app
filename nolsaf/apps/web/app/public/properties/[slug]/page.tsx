import Link from "next/link";

export default function PropertyDetailPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="h-64 bg-gray-200 rounded mb-4" />
            <h1 className="text-2xl font-bold">{slug.replace(/-/g,' ')}</h1>
            <p className="text-sm text-gray-600 mt-2">Full property description, amenities and host info.</p>
          </div>

          <aside className="bg-white border rounded p-4">
            <div className="text-sm text-gray-500">Price</div>
            <div className="text-2xl font-semibold">$45/night</div>
            <div className="mt-4">
              <Link href={`/public/booking/${slug}/start`} className="block text-center bg-emerald-600 text-white px-3 py-2 rounded">Book now</Link>
            </div>
          </aside>
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold">Recent reviews</h2>
          <div className="mt-2 text-sm text-gray-500">No reviews yet.</div>
        </div>
      </div>
    </main>
  );
}
