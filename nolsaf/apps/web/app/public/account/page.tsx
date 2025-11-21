import Link from "next/link";

export default function AccountPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-2xl font-semibold mb-4">Your account</h1>
        <div className="bg-white p-6 rounded shadow">
          <p className="text-sm text-gray-600">Bookings</p>
          <div className="mt-3">No bookings yet.</div>
          <div className="mt-6">
            <Link href="/" className="text-blue-600">Back to home</Link>
          </div>
        </div>
      </div>
    </main>
  );
}
