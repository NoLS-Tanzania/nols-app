"use client";

import React from "react";
import { ChevronDown } from 'lucide-react';

type Props = {
  selectedRole: string | null;
};

export default function PlanRequestForm({ selectedRole }: Props) {
  const [submitting, setSubmitting] = React.useState(false);

  const [transportRequired, setTransportRequired] = React.useState<string>('');

  // Keep group size and passenger count in state so we can auto-fill passengers
  const [groupSizeState, setGroupSizeState] = React.useState<string>('');
  const [passengerCount, setPassengerCount] = React.useState<string>('');

  // Minimal form state (expand as needed)
  const formRef = React.useRef<HTMLFormElement | null>(null);

  // Wizard state
  const [step, setStep] = React.useState<number>(1);
  const totalSteps = 4;
  const [reviewData, setReviewData] = React.useState<Record<string, string>>({});

  const collectFormAsObject = () => {
    if (!formRef.current) return {} as Record<string, string>;
    const fm = new FormData(formRef.current);
    const obj: Record<string, string> = {};
    fm.forEach((value, key) => {
      obj[key] = typeof value === 'string' ? value : String(value);
    });
    // ensure role is included
    obj.role = selectedRole ?? '';
    return obj;
  };

  // Friendly labels and preferred order for the review step
  const reviewLabels: Record<string, string> = {
    role: 'Role',
    tripType: 'Trip type',
    destinations: 'Destination(s)',
    dateFrom: 'From',
    dateTo: 'To',
    groupSize: 'Group size',
    budget: 'Budget',
    notes: 'Notes',
    // Event planner
    eventType: 'Event type',
    expectedAttendees: 'Expected attendees',
    eventStartDate: 'Event start',
    eventEndDate: 'Event end',
    venuePreferences: 'Venue preferences',
    accommodationNeeded: 'Accommodation needed',
    cateringRequired: 'Catering required',
    avRequirements: 'AV / internet',
    budgetPerPerson: 'Budget / person',
    // School
    studentsCount: 'Students',
    chaperones: 'Chaperones',
    ageRange: 'Student age range',
    learningObjectives: 'Learning objectives',
    riskAssessment: 'Risk assessment needed',
    specialNeedsSupport: 'Special needs support',
    // University
    researchPurpose: 'Research purpose',
    staffCount: 'Staff / supervisors',
    studentsCountUniv: 'Students (university)',
    ethicsApproval: 'Ethics ref',
    sampleCollection: 'Collect samples?',
    permitsNeeded: 'Permits likely?',
    // Community
    communityObjectives: 'Community objectives',
    beneficiaries: 'Estimated beneficiaries',
    projectDuration: 'Project duration',
    localPartners: 'Local partners',
    // Other
    otherDetails: 'Other details',
    attachments: 'Attachments',
    // Contact & transport
    fullName: 'Contact name',
    email: 'Email',
    phone: 'Phone',
    transportRequired: 'Transport required?',
    vehicleType: 'Preferred vehicle',
    pickupLocation: 'Pickup',
    dropoffLocation: 'Dropoff',
    vehiclesNeeded: 'Vehicles needed',
    passengerCount: 'Estimated passengers',
    vehicleRequirements: 'Vehicle requirements',
  };

  const reviewOrder = [
    'role', 'tripType', 'destinations', 'dateFrom', 'dateTo', 'groupSize', 'passengerCount', 'budget', 'notes',
    'fullName', 'email', 'phone', 'transportRequired', 'vehicleType', 'pickupLocation', 'dropoffLocation', 'vehiclesNeeded', 'vehicleRequirements',
  ];

  const getOrderedReviewKeys = (data: Record<string, string>) => {
    const keys = Object.keys(data);
    const ordered: string[] = [];
    reviewOrder.forEach((k) => { if (keys.includes(k)) ordered.push(k); });
    keys.forEach((k) => { if (!ordered.includes(k)) ordered.push(k); });
    return ordered;
  };

  const formatLabel = (key: string) => reviewLabels[key] ?? key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
  const formatValue = (v: string | undefined) => {
    if (v == null || v === '') return '-';
    const lower = String(v).toLowerCase();
    if (lower === 'yes' || lower === 'no') return lower === 'yes' ? 'Yes' : 'No';
    return v;
  };

  const goNext = () => {
    const next = Math.min(totalSteps, step + 1);
    if (next === totalSteps) {
      setReviewData(collectFormAsObject());
    }
    setStep(next);
  };

  const goBack = () => setStep(Math.max(1, step - 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRef.current) return;
    setSubmitting(true);
    const form = new FormData(formRef.current);
    form.set('role', selectedRole ?? '');

    // TODO: replace with actual API endpoint
    try {
      await fetch('/api/plan-request', {
        method: 'POST',
        body: form,
      });
      // simple success UX placeholder
      alert('Request submitted — we will get back to you within 48 hours.');
      formRef.current.reset();
      // clear controlled sync state after successful reset
      setGroupSizeState('');
      setPassengerCount('');
    } catch (err) {
      console.error(err);
      alert('Failed to submit request. Try again later.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6 bg-white border rounded-lg p-6 shadow-sm" aria-labelledby={selectedRole ? 'request-form' : undefined}>
      <input type="hidden" name="role" value={selectedRole ?? ''} />
      {selectedRole && (
        <>
          <h2 id="request-form" className="text-xl font-semibold">Your plan details</h2>
          <p className="mt-1 text-sm text-slate-600">Showing questions for <strong className="text-slate-800">{selectedRole}</strong></p>
        </>
      )}

      {/* Two-column wrapper: show stepper + content only after a role is selected */}
      <div className="mt-4 flex items-start gap-6">
        {selectedRole ? (
          <>
            <div className="w-28 pr-4 border-r border-slate-200">
              <div className="flex flex-col items-center gap-4">
                {['Details', 'Role', 'Transport', 'Review'].map((label, i) => (
                  <div key={label} className="flex flex-col items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${step === i+1 ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-slate-700'}`}>{i+1}</div>
                    <div className="mt-2 text-slate-700 text-xs text-center">{label}</div>
                    {i < 3 && <div className="w-px h-6 bg-slate-200 mt-2"></div>}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex-1">

          {step === 1 && (
        <div className="rounded border p-3 mb-4 groupstays-section border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-sm" aria-hidden />
              <div>
                <div className="text-sm font-medium">Trip details</div>
                <div className="text-xs text-slate-500">Tell us the basics so we can plan</div>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="trip-type" className="block text-sm font-medium text-slate-700">Trip type</label>
              <div className="mt-2 relative">
                <select id="trip-type" name="tripType" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 pr-9">
                  <option>Local tourism</option>
                  <option>Safari</option>
                  <option>Cultural</option>
                  <option>Adventure / Hiking</option>
                  <option>Other</option>
                </select>
                <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
              </div>
            </div>

            <div>
              <label htmlFor="destinations" className="block text-sm font-medium text-slate-700">Destination(s)</label>
              <input id="destinations" name="destinations" className="groupstays-select mt-2 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" placeholder="City, national park, region, or 'Any'" />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="date-from" className="block text-sm font-medium text-slate-700">From</label>
              <input id="date-from" name="dateFrom" className="groupstays-select mt-2 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" type="date" />
            </div>
            <div>
              <label htmlFor="date-to" className="block text-sm font-medium text-slate-700">To</label>
              <input id="date-to" name="dateTo" className="groupstays-select mt-2 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" type="date" />
            </div>
            <div>
              <label htmlFor="group-size" className="block text-sm font-medium text-slate-700">Group size</label>
              <input id="group-size" name="groupSize" value={groupSizeState} onChange={(e) => { const v = e.target.value; setGroupSizeState(v); setPassengerCount(v); }} className="groupstays-select mt-2 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" placeholder="Number of people" type="number" min={1} />
            </div>
            <div>
              <label htmlFor="budget" className="block text-sm font-medium text-slate-700">Budget (approx.)</label>
              <input id="budget" name="budget" className="groupstays-select mt-2 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" placeholder="USD or local currency" />
            </div>
          </div>

          <div className="mt-3">
            <label htmlFor="notes" className="block text-sm font-medium text-slate-700">Special requirements / notes</label>
            <textarea id="notes" name="notes" className="groupstays-select mt-2 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" rows={4} placeholder="Dietary requirements, accessibility needs, permits, transport or vehicle requests, etc."></textarea>
          </div>
        </div>
      )}

      {/* Role-specific sections (expanded) - step 2 */}
      {step === 2 && selectedRole === 'Event planner' && (
        <div className="rounded border p-3 mb-4 groupstays-section border-slate-100" aria-labelledby="event-planner-section">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-sm" aria-hidden />
              <div>
                <div id="event-planner-section" className="text-sm font-medium">For Event Planners</div>
                <div className="text-xs text-slate-500">Provide details about the event so we can suggest suitable venues, services and cost estimates.</div>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="event-type" className="block text-xs text-slate-600">Event type</label>
              <input id="event-type" name="eventType" placeholder="Conference, wedding, workshop etc." className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>

            <div>
              <label htmlFor="expected-attendees" className="block text-xs text-slate-600">Expected attendees</label>
              <input id="expected-attendees" name="expectedAttendees" placeholder="Number of attendees" type="number" min={1} className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="event-start-date" className="block text-sm font-medium text-slate-700">Start date</label>
              <input id="event-start-date" name="eventStartDate" type="date" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
            <div>
              <label htmlFor="event-end-date" className="block text-sm font-medium text-slate-700">End date</label>
              <input id="event-end-date" name="eventEndDate" type="date" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
          </div>

          <div className="mt-3">
            <label htmlFor="venue-preferences" className="block text-xs text-slate-600">Venue preferences</label>
            <input id="venue-preferences" name="venuePreferences" placeholder="Capacity, accessibility, indoor/outdoor, facilities" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="accommodation-needed" className="block text-sm font-medium text-slate-700">Accommodation needed?</label>
              <div className="relative mt-1">
                <select id="accommodation-needed" name="accommodationNeeded" className="groupstays-select w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200">
                  <option value="">Select an option</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
              </div>
            </div>

            <div>
              <label htmlFor="catering-required" className="block text-sm font-medium text-slate-700">Catering required?</label>
              <div className="relative mt-1">
                <select id="catering-required" name="cateringRequired" className="groupstays-select w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200">
                  <option value="">Select an option</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="av-requirements" className="block text-xs text-slate-600">AV / power / internet requirements</label>
              <input id="av-requirements" name="avRequirements" placeholder="Microphones, projectors, power, connectivity" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
            <div>
              <label htmlFor="budget-per-person" className="block text-xs text-slate-600">Target budget per person</label>
              <input id="budget-per-person" name="budgetPerPerson" placeholder="USD or local currency" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
          </div>
        </div>
      )}

      {step === 2 && selectedRole === 'School / Teacher' && (
        <div className="rounded border p-3 mb-4 groupstays-section border-slate-100" aria-labelledby="school-section">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-sm" aria-hidden />
              <div>
                <div className="text-sm font-medium">For Schools / Teachers</div>
                <div className="text-xs text-slate-500">Tell us about group numbers, learning goals and any special requirements for school trips.</div>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="studentsCount" className="block text-xs text-slate-600">Number of students</label>
              <input id="studentsCount" name="studentsCount" type="number" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
            <div>
              <label htmlFor="chaperones" className="block text-xs text-slate-600">Number of chaperones</label>
              <input id="chaperones" name="chaperones" type="number" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="ageRange" className="block text-xs text-slate-600">Student age range</label>
              <input id="ageRange" name="ageRange" placeholder="e.g. 12-15" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
            <div>
              <label htmlFor="learningObjectives" className="block text-xs text-slate-600">Learning objectives / curriculum links</label>
              <input id="learningObjectives" name="learningObjectives" placeholder="Curriculum links or goals" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="risk-assessment" className="block text-xs text-slate-600">Risk assessment needed?</label>
              <div className="relative mt-1">
                <select id="risk-assessment" name="riskAssessment" className="groupstays-select w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200">
                  <option value="">Select an option</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
              </div>
            </div>
            <div>
              <label htmlFor="special-needs-support" className="block text-xs text-slate-600">Special needs support required?</label>
              <div className="relative mt-1">
                <select id="special-needs-support" name="specialNeedsSupport" className="groupstays-select w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200">
                  <option value="">Select an option</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && selectedRole === 'University' && (
        <div className="rounded border p-3 mb-4 groupstays-section border-slate-100" aria-labelledby="university-section">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-sm" aria-hidden />
              <div>
                <div id="university-section" className="text-sm font-medium">For Universities</div>
                <div className="text-xs text-slate-500">For research or fieldwork visits: share project aims, permits and staff involved.</div>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <label htmlFor="research-purpose" className="block text-xs text-slate-600">Research purpose / project description</label>
            <input id="research-purpose" name="researchPurpose" placeholder="Brief project summary, aims and methods" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="staff-count" className="block text-xs text-slate-600">Staff / supervisors count</label>
              <input id="staff-count" name="staffCount" placeholder="Number of staff" type="number" min={0} className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
            <div>
              <label htmlFor="students-count-univ" className="block text-xs text-slate-600">Number of students involved</label>
              <input id="students-count-univ" name="studentsCountUniv" placeholder="Number of students" type="number" min={0} className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
          </div>

          <div className="mt-3">
            <label htmlFor="ethics-approval" className="block text-xs text-slate-600">Ethics approval reference (if any)</label>
            <input id="ethics-approval" name="ethicsApproval" placeholder="Reference or N/A" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="sample-collection" className="block text-sm font-medium text-slate-700">Collect samples?</label>
              <div className="relative mt-1">
                <select id="sample-collection" name="sampleCollection" className="groupstays-select w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200">
                  <option value="">Select an option</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
              </div>
            </div>

            <div>
              <label htmlFor="permits-needed" className="block text-sm font-medium text-slate-700">Permits likely needed?</label>
              <div className="relative mt-1">
                <select id="permits-needed" name="permitsNeeded" className="groupstays-select w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200">
                  <option value="">Select an option</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 2 && selectedRole === 'Community group' && (
        <div className="rounded border p-3 mb-4 groupstays-section border-slate-100" aria-labelledby="community-section">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-sm" aria-hidden />
              <div>
                <div id="community-section" className="text-sm font-medium">For Community Groups</div>
                <div className="text-xs text-slate-500">Share objectives, beneficiaries and local partnerships to help us recommend sustainable options.</div>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <label htmlFor="community-objectives" className="block text-xs text-slate-600">Community objectives / program description</label>
            <input id="community-objectives" name="communityObjectives" placeholder="Brief description of objectives" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label htmlFor="beneficiaries" className="block text-xs text-slate-600">Estimated beneficiaries</label>
              <input id="beneficiaries" name="beneficiaries" placeholder="Number of beneficiaries" type="number" min={0} className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
            <div>
              <label htmlFor="project-duration" className="block text-xs text-slate-600">Project duration</label>
              <input id="project-duration" name="projectDuration" placeholder="Days / weeks" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
          </div>

          <div className="mt-3">
            <label htmlFor="local-partners" className="block text-xs text-slate-600">Local partners or contacts</label>
            <input id="local-partners" name="localPartners" placeholder="Local organisations or contact people" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
          </div>

          {/* Funding status removed per product decision */}
        </div>
      )}

      {step === 2 && selectedRole === 'Other' && (
        <div className="rounded border p-3 mb-4 groupstays-section border-slate-100" aria-labelledby="other-section">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-sm" aria-hidden />
              <div>
                <div id="other-section" className="text-sm font-medium">Other details</div>
                <div className="text-xs text-slate-500">If your request does not match the categories, describe your needs so we can route it correctly.</div>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <label htmlFor="other-details" className="block text-xs text-slate-600">Describe your request</label>
            <textarea id="other-details" name="otherDetails" placeholder="Tell us more about your request" rows={4} className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
          </div>

          <div className="mt-3">
            <label htmlFor="other-attachments" className="block text-xs text-slate-600">Attachments (optional)</label>
            <input id="other-attachments" name="attachments" type="text" placeholder="Optional: link to brief or attachments (Drive/Dropbox)" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="rounded border p-3 mb-4 groupstays-section border-slate-100" aria-labelledby="contact-transport-heading">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-sm" aria-hidden />
              <div>
                <div id="contact-transport-heading" className="text-sm font-medium">Contact & Transport</div>
                <div className="text-xs text-slate-500">Your contact details and transport preferences</div>
              </div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="full-name" className="block text-xs text-slate-600">Your name</label>
              <input id="full-name" name="fullName" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs text-slate-600">Email</label>
              <input id="email" name="email" type="email" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
            <div>
              <label htmlFor="phone" className="block text-xs text-slate-600">Phone</label>
              <input id="phone" name="phone" placeholder="+255..." className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
            </div>
          </div>

          <div className="mt-4">
            <h4 className="text-sm font-medium text-slate-800">Transport & transfers</h4>
            <p className="text-xs text-slate-500">Tell us if you need transport, pickup/dropoff locations and vehicle preferences.</p>

            <div className="mt-3">
              <label htmlFor="transport-required" className="block text-xs text-slate-600">Transport required?</label>
              <div className="relative mt-1">
                <select id="transport-required" name="transportRequired" value={transportRequired} onChange={(e) => setTransportRequired(e.target.value)} className="groupstays-select w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200">
                  <option value="">Select an option</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
                <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
              </div>
            </div>

            {transportRequired === 'yes' && (
              <>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="vehicle-type" className="block text-xs text-slate-600">Preferred vehicle type</label>
                    <div className="relative mt-1">
                      <select id="vehicle-type" name="vehicleType" className="groupstays-select w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200">
                        <option value="">Select vehicle type</option>
                        <option value="bus">Bus / Coach</option>
                        <option value="minibus">Minibus</option>
                        <option value="4x4">4x4 / SUV</option>
                        <option value="van">Van</option>
                        <option value="boat">Boat</option>
                        <option value="other">Other</option>
                      </select>
                      <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="pickup-location" className="block text-xs text-slate-600">Pickup location</label>
                    <input id="pickup-location" name="pickupLocation" placeholder="City, hotel, or coordinates" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="dropoff-location" className="block text-xs text-slate-600">Dropoff location</label>
                    <input id="dropoff-location" name="dropoffLocation" placeholder="City, park, or coordinates" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                  </div>
                  <div>
                    <label htmlFor="vehicles-needed" className="block text-xs text-slate-600">Number of vehicles / units</label>
                    <input id="vehicles-needed" name="vehiclesNeeded" type="number" min={0} placeholder="e.g. 1, 2" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="passenger-count" className="block text-xs text-slate-600">Estimated passengers</label>
                    <input id="passenger-count" name="passengerCount" value={passengerCount} onChange={(e) => { if (!groupSizeState) setPassengerCount(e.target.value); }} type="number" min={0} placeholder="Number of passengers" disabled={!!groupSizeState} className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                  </div>
                  <div>
                    <label htmlFor="vehicle-requirements" className="block text-xs text-slate-600">Special vehicle requirements</label>
                    <input id="vehicle-requirements" name="vehicleRequirements" placeholder="e.g. wheelchair access, refrigeration, trailer" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Review step (4) */}
      {step === 4 && (
        <section aria-labelledby="review-heading" className="space-y-3">
          <h3 id="review-heading" className="text-lg font-semibold">Review your request</h3>
          <p className="text-sm text-slate-600">Review the information below before sending. Use Back to edit any section.</p>
          <div className="rounded border p-3 bg-gray-50 text-sm">
            {Object.keys(reviewData).length === 0 ? (
              <p className="text-sm text-slate-500">No details to show.</p>
            ) : (
              <div className="space-y-3">
                <div className="bg-white rounded border p-3">
                  <div className="text-sm font-medium">Summary</div>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-700">
                    {getOrderedReviewKeys(reviewData).map((k) => (
                      <div key={k} className="flex items-start gap-2">
                        <div className="w-40 text-xs text-slate-500">{formatLabel(k)}</div>
                        <div className="flex-1 text-sm text-slate-800 break-words">{formatValue(reviewData[k])}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      </div></>) : null}</div>

      {selectedRole && (
        <div className="pt-3 flex gap-3">
          {step > 1 && (
            <button type="button" onClick={goBack} className="inline-flex items-center justify-center gap-2 border border-slate-200 text-slate-700 bg-white px-4 py-2 rounded-lg">Back</button>
          )}

          {step < totalSteps && (
            <button type="button" onClick={goNext} className="ml-auto inline-flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold px-4 py-2 rounded-lg">Next</button>
          )}

          {step === totalSteps && (
            <button type="submit" disabled={submitting} className="ml-auto inline-flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold px-4 py-2 rounded-lg">
              {submitting ? 'Sending…' : 'Send request'}
            </button>
          )}
        </div>
      )}
    </form>
  );
}
