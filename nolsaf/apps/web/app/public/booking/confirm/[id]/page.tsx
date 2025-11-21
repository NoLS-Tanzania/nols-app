import Link from "next/link";

export default function BookingConfirm({ params }: { params: { id: string } }) {
  const { id } = params;
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-semibold mb-4">Booking Confirmed</h1>
        <p className="text-gray-600 mb-6">Your booking <strong>{id}</strong> has been confirmed (test flow).</p>
        <Link href="/public/account" className="text-blue-600">Go to your account</Link>
      </div>
    </main>
  );
}
