"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardRole({ params }: { params: { role: string } }) {
  const role = (params.role || '').toLowerCase();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  // driver fields
  
  const [plateNumber, setPlateNumber] = useState('');
  const [licenseFile, setLicenseFile] = useState<File | null>(null);
  // new driver onboarding fields
  const [gender, setGender] = useState('');
  const [nationality, setNationality] = useState('Tanzanian');
  const [nin, setNin] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<string>(''); // single pick: Bajaji, Bodaboda, Vehicle
  const [operationArea, setOperationArea] = useState('');
  const [paymentPhone, setPaymentPhone] = useState('');
  const [idFile, setIdFile] = useState<File | null>(null);
  const [vehicleRegFile, setVehicleRegFile] = useState<File | null>(null);
  const [stepIndex, setStepIndex] = useState<number>(1); // 1..4 for driver onboarding steps
  // owner fields removed: owner uses existing owner dashboard for property creation
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  const title = role === 'driver' ? 'Welcome, Driver' : role === 'owner' ? 'Welcome, Property Owner' : 'Welcome, Traveller';
  const help = role === 'driver'
    ? 'Please provide driver details, vehicle information, and verification documents.'
    : role === 'owner'
      ? 'Add your property details, rates, and availability to start receiving bookings.'
      : 'Update your profile and start searching for stays.';

  const submitProfile = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setSuccess(null);
    // Basic validation: require name/email at minimum
    if (!name || !email) {
      setError('Please provide both name and email');
      return;
    }
    setLoading(true);
    try {
      // Build FormData to include files and all driver fields
      const fd = new FormData();
      fd.append('role', role);
      fd.append('name', name);
      fd.append('email', email);
      if (role === 'driver') {
      fd.append('gender', gender || '');
      fd.append('nationality', nationality || '');
      fd.append('nin', nin || '');
      fd.append('licenseNumber', licenseNumber || '');
      fd.append('plateNumber', plateNumber || '');
      fd.append('vehicleType', vehicleType || '');
      fd.append('operationArea', operationArea || '');
      fd.append('paymentPhone', paymentPhone || '');
        if (licenseFile) fd.append('licenseFile', licenseFile, licenseFile.name);
        if (idFile) fd.append('idFile', idFile, idFile.name);
        if (vehicleRegFile) fd.append('vehicleRegFile', vehicleRegFile, vehicleRegFile.name);
      }

      const resp = await fetch('/api/auth/profile', { method: 'POST', body: fd });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to save profile');
      }
      setSuccess('Profile saved');
      // navigate to role dashboard or public account area
      setTimeout(() => {
        if (role === 'driver') router.push('/driver');
        else if (role === 'owner') router.push('/owner');
        else router.push('/account');
      }, 800);
    } catch (err: any) {
      setError(err?.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-2xl w-full bg-white border border-[#02665e] rounded-lg p-6 shadow">
        <h1 className="text-2xl font-semibold mb-2">{title}</h1>
        <p className="text-sm text-gray-600 mb-6">{help}</p>

        {error && <div className="mb-4 text-sm text-red-700">{error}</div>}
        {success && <div className="mb-4 text-sm text-green-700">{success}</div>}

        {/* Onboarding form: for drivers we split into steps; other roles keep simple form */}
        {role !== 'driver' ? (
          <form onSubmit={submitProfile} className="space-y-4">
            <div>
              <label htmlFor="onboard-name" className="block text-sm font-medium text-gray-700">Full name</label>
              <input id="onboard-name" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" placeholder="Your full name" />
            </div>

            <div>
              <label htmlFor="onboard-email" className="block text-sm font-medium text-gray-700">Email</label>
              <input id="onboard-email" type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" placeholder="you@example.com" />
            </div>

            <div className="flex items-center gap-3">
              <button type="submit" disabled={loading} className="px-4 py-2 bg-[#02665e] text-white rounded disabled:opacity-60">{loading ? 'Saving...' : 'Save and continue'}</button>
              <Link href="/public" className="text-sm text-gray-600">Return to public site</Link>
            </div>
          </form>
        ) : (
          <form onSubmit={submitProfile} className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">Step {stepIndex} of 4</div>
              <div className="text-xs text-gray-500">Complete all steps to finish onboarding</div>
            </div>

            {/* Step 1: Personal Details */}
            {stepIndex === 1 && (
              <div className="space-y-3 border rounded p-4 bg-gray-50">
                <h3 className="font-medium">Personal Details</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full name</label>
                  <input value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" placeholder="Your full name" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" placeholder="you@example.com" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                      <label htmlFor="gender-select" className="block text-sm font-medium text-gray-700">Gender</label>
                      <select id="gender-select" value={gender} onChange={e => setGender(e.target.value)} className="mt-1 block w-full border rounded px-2 py-2">
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="nationality-select" className="block text-sm font-medium text-gray-700">Nationality</label>
                    <select id="nationality-select" value={nationality} onChange={e => setNationality(e.target.value)} className="mt-1 block w-full border rounded px-2 py-2">
                      <option value="Tanzanian">Tanzanian</option>
                      <option value="Kenyan">Kenyan</option>
                      <option value="Ugandan">Ugandan</option>
                      <option value="Rwandese">Rwandese</option>
                      <option value="Burundian">Burundian</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">NIN (optional)</label>
                    <input value={nin} onChange={e => setNin(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" placeholder="National ID number" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Driving Details */}
            {stepIndex === 2 && (
              <div className="space-y-3 border rounded p-4 bg-gray-50">
                <h3 className="font-medium">Driving Details</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700">License number</label>
                  <input value={licenseNumber} onChange={e => setLicenseNumber(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" placeholder="e.g., DL-12345" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Type of vehicle</label>
                  <div className="flex gap-2 mt-2">
                    {['Bajaji','Bodaboda','Vehicle'].map(t => (
                      <label key={t} className={`inline-flex items-center justify-center gap-2 px-4 py-2 min-w-[96px] rounded cursor-pointer border ${vehicleType === t ? 'bg-[#02665e] text-white border-[#02665e]' : 'bg-white text-gray-700 border-gray-200'}`}>
                        <input type="radio" name="vehicleType" checked={vehicleType === t} onChange={() => setVehicleType(t)} className="sr-only" />
                        <span className="text-sm">{t}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Plate number</label>
                    <input value={plateNumber} onChange={e => setPlateNumber(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" placeholder="Plate number" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Operation / Parking area</label>
                    <input value={operationArea} onChange={e => setOperationArea(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" placeholder="e.g., Dar es Salaam - Ilala" />
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Payment Details */}
            {stepIndex === 3 && (
              <div className="space-y-3 border rounded p-4 bg-gray-50">
                <h3 className="font-medium">Payment Details</h3>
                <p className="text-sm text-gray-600">Provide a phone number or Lipa na M-Pesa Till number used to receive payments.</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment phone / Lipa number</label>
                  <input value={paymentPhone} onChange={e => setPaymentPhone(e.target.value)} className="mt-1 block w-full border rounded px-3 py-2" placeholder="e.g., +2557xxxxxxxx" />
                </div>
              </div>
            )}

            {/* Step 4: Uploads */}
            {stepIndex === 4 && (
              <div className="space-y-3 border rounded p-4 bg-gray-50">
                <h3 className="font-medium">Upload verification documents</h3>
                <div>
                  <label htmlFor="license-upload" className="block text-sm font-medium text-gray-700">Upload driving license (jpg, png, pdf)</label>
                  <input id="license-upload" type="file" accept="image/*,.pdf" onChange={e => setLicenseFile(e.target.files?.[0] ?? null)} />
                  {licenseFile && <div className="text-xs text-gray-600">Selected: {licenseFile.name}</div>}
                </div>
                <div>
                  <label htmlFor="id-upload" className="block text-sm font-medium text-gray-700">Upload national ID (jpg, png, pdf)</label>
                  <input id="id-upload" type="file" accept="image/*,.pdf" onChange={e => setIdFile(e.target.files?.[0] ?? null)} />
                  {idFile && <div className="text-xs text-gray-600">Selected: {idFile.name}</div>}
                </div>
                <div>
                  <label htmlFor="vehicle-reg-upload" className="block text-sm font-medium text-gray-700">Upload vehicle registration (optional)</label>
                  <input id="vehicle-reg-upload" type="file" accept="image/*,.pdf" onChange={e => setVehicleRegFile(e.target.files?.[0] ?? null)} />
                  {vehicleRegFile && <div className="text-xs text-gray-600">Selected: {vehicleRegFile.name}</div>}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {stepIndex > 1 && <button type="button" onClick={() => setStepIndex(i => Math.max(1, i-1))} className="px-3 py-2 border rounded">Back</button>}
              </div>
              <div className="flex items-center gap-3">
                {stepIndex < 4 ? (
                  <button type="button" onClick={() => setStepIndex(i => Math.min(4, i+1))} className="px-4 py-2 bg-[#02665e] text-white rounded">Next</button>
                ) : (
                  <button type="submit" disabled={loading} className="px-4 py-2 bg-[#02665e] text-white rounded disabled:opacity-60">{loading ? 'Saving...' : 'Submit and finish'}</button>
                )}
                <Link href="/public" className="text-sm text-gray-600">Cancel</Link>
              </div>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
