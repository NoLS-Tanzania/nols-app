"use client";

import React, { useState, useRef, useEffect } from 'react';
import { DayPicker, type DateRange } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { REGIONS as TZ_REGIONS } from '@/lib/tzRegions';
import Link from 'next/link';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Check, Truck, Bus, Coffee, Users, Wrench, Download, ArrowLeft } from 'lucide-react';
import Spinner from './Spinner';

// DateRange type is imported from react-day-picker for accurate typing


export default function GroupStaysCard({ onClose }: { onClose?: () => void }) {
  const [groupType, setGroupType] = useState<string>('');
  const [accommodationType, setAccommodationType] = useState<string>('');
  const [headcount, setHeadcount] = useState<number>(4);
  const [range, setRange] = useState<DateRange | undefined>(undefined);
  const [pendingRange, setPendingRange] = useState<DateRange | undefined>(undefined);
  const [roomSize, setRoomSize] = useState<number>(2);
  const [errors, setErrors] = useState<string[]>([]);

  // Use canonical TZ region/district data from `lib/tzRegions.ts`
  // `TZ_REGIONS` is an array of { id, name, districts }
  // Use `id` values for selects (stable for URLs/storage) and look up names when needed
  const REGION_OPTIONS = TZ_REGIONS;
  const getDistrictsFor = (regionId: string) => TZ_REGIONS.find(r => r.id === regionId)?.districts ?? [];
  const getRegionName = (id?: string | null) => id ? (TZ_REGIONS.find(r => r.id === id)?.name ?? id) : '';

  const [fromRegion, setFromRegion] = useState<string>('');
  const [toRegion, setToRegion] = useState<string>('');
  const [toDistrict, setToDistrict] = useState<string>('');
  const [toWard, setToWard] = useState<string>('');
  const [toLocation, setToLocation] = useState<string>('');
  const [fromDistrict, setFromDistrict] = useState<string>('');
  const [fromWard, setFromWard] = useState<string>('');
  const [fromLocation, setFromLocation] = useState<string>('');

  const roomsNeeded = Math.max(0, Math.ceil(headcount / (roomSize || 1)));
  const [numberOfMonths, setNumberOfMonths] = useState<number>(2);
  const [showPickerPopover, setShowPickerPopover] = useState(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [useDates, setUseDates] = useState<boolean>(true);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [needsPrivateRoom, setNeedsPrivateRoom] = useState<boolean>(false);
  const [privateRoomCount, setPrivateRoomCount] = useState<number>(0);
  // Arrangements (Step 2)
  const [arrPickup, setArrPickup] = useState<boolean>(false);
  const [arrTransport, setArrTransport] = useState<boolean>(false);
  const [arrMeals, setArrMeals] = useState<boolean>(false);
  const [arrGuide, setArrGuide] = useState<boolean>(false);
  const [arrEquipment, setArrEquipment] = useState<boolean>(false);
  const [pickupLocation, setPickupLocation] = useState<string>('');
  const [pickupTime, setPickupTime] = useState<string>('');
  const [arrangementNotes, setArrangementNotes] = useState<string>('');
  const [roster, setRoster] = useState<Array<Record<string, string>>>([]);
  const [rosterError, setRosterError] = useState<string>('');
  const [showAllPassengers, setShowAllPassengers] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const templateColumns = ['First name','Last name','Phone','Age','Gender','Nationality'];

  // Check if all required fields are filled
  const isFormComplete = () => {
    // Step 1: Group type and destination region required
    if (!groupType || !toRegion) return false;
    
    // Step 2: Accommodation type required
    if (!accommodationType) return false;
    
    // Headcount must be at least 1 (default is 4, so this is usually satisfied)
    if (!headcount || headcount < 1) return false;
    
    // If private rooms are needed, count must be specified
    if (needsPrivateRoom && (!privateRoomCount || privateRoomCount < 1)) return false;
    
    // If using dates, both check-in and check-out must be selected
    if (useDates && (!range?.from || !range?.to)) return false;
    
    return true;
  };

  const downloadTemplate = () => {
    const header = templateColumns.join(',') + '\n';
    const example = ['John','Doe','+255700000000','29','M','Tanzanian'].join(',') + '\n';
    const blob = new Blob([header, example], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roster-template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const parseCSV = (text: string) : Array<Array<string>> => {
    // Basic CSV parser supporting quoted fields
    const rows: Array<Array<string>> = [];
    const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    for (const line of lines) {
      const row: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i+1] === '"') {
            cur += '"';
            i++; // skip escaped quote
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === ',' && !inQuotes) {
          row.push(cur);
          cur = '';
        } else {
          cur += ch;
        }
      }
      row.push(cur);
      rows.push(row.map(r => r.trim()));
    }
    return rows;
  };

  const handleRosterFile = (file?: File) => {
    setRosterError('');
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      try {
        const rows = parseCSV(text);
        if (!rows.length) {
          setRosterError('Empty CSV');
          return;
        }
        const headers = rows[0].map(h => h.replace(/\s+/g, '').toLowerCase());
        const data = rows.slice(1).map(r => {
          const obj: Record<string,string> = {};
          for (let i = 0; i < headers.length; i++) {
            obj[headers[i] || `col${i+1}`] = r[i] ?? '';
          }
          return obj;
        }).filter(d => Object.values(d).some(v => v && v.trim() !== ''));
        setRoster(data);
      } catch (e) {
        setRosterError('Failed to parse CSV');
      }
    };
    reader.readAsText(file);
  };
  

  useEffect(() => {
    // responsive: show 2 months on >= 768px, 1 month on small screens
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setNumberOfMonths(mq.matches ? 2 : 1);
    update();
    // addEventListener('change') is modern; fallback to addListener for older env
    if ((mq as any).addEventListener) {
      (mq as any).addEventListener('change', update);
      return () => (mq as any).removeEventListener('change', update);
    }
    (mq as any).addListener(update);
    return () => (mq as any).removeListener(update);
  }, []);

  // close popover on outside click
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const el = popoverRef.current;
      if (!el) return;
      if (!(e.target instanceof Node)) return;
      if (!el.contains(e.target)) setShowPickerPopover(false);
    };
    document.addEventListener('click', onDoc);
    return () => document.removeEventListener('click', onDoc);
  }, []);

  const validate = () => {
    const e: string[] = [];
    if (!headcount || headcount < 1) e.push('Headcount must be at least 1.');
    if (needsPrivateRoom && (!privateRoomCount || privateRoomCount < 1)) e.push('Please specify how many private rooms are needed.');
    if (range?.from && range?.to && range.from > range.to) e.push('Check-out must be after check-in.');
    setErrors(e);
    return e.length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    
    setIsCreating(true);
    setErrors([]);
    
    const payload = {
      groupType,
      fromRegion,
      fromDistrict,
      fromWard,
      fromLocation,
      toRegion,
      toDistrict,
      toWard,
      toLocation,
      accommodationType,
      headcount,
      needsPrivateRoom,
      privateRoomCount,
      checkin: range?.from?.toISOString() ?? null,
      checkout: range?.to?.toISOString() ?? null,
      useDates,
      roomSize,
      roomsNeeded,
      arrangements: {
        pickup: arrPickup,
        transport: arrTransport,
        meals: arrMeals,
        guide: arrGuide,
        equipment: arrEquipment,
        pickupLocation: pickupLocation || null,
        pickupTime: pickupTime ? formatTimeTo12(pickupTime) : null,
        notes: arrangementNotes || null,
      },
      roster,
    };
    
    try {
      // Get API URL from environment or use default
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      
      // Get authentication token from localStorage
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      if (!token) {
        throw new Error('Authentication required. Please log in to create a booking.');
      }
      
      // Make API request to create group booking
      const response = await fetch(`${API_URL}/api/group-bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      
      // Parse response
      const data = await response.json();
      
      // Handle error responses
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Session expired. Please log in again.');
        } else if (response.status === 400 && data.details) {
          // Handle validation errors
          const validationErrors = data.details.map((err: any) => 
            `${err.field}: ${err.message}`
          );
          setErrors(validationErrors);
          return;
        } else {
          throw new Error(data.error || data.message || 'Failed to create group booking');
        }
      }
      
      // Success handling
      // eslint-disable-next-line no-console
      console.log('Group booking created successfully:', {
        bookingId: data.bookingId,
        status: data.booking?.status,
        destination: data.booking?.destination,
      });
      
      // Show success message
      setShowSuccess(true);
      
      // Close after showing success for 2 seconds
      setTimeout(() => {
        setShowSuccess(false);
        if (onClose) onClose();
      }, 2000);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Failed to create group booking:', error);
      
      // Display error message to user
      const errorMessage = error instanceof Error ? error.message : 'Failed to create group booking. Please try again.';
      setErrors([errorMessage]);
    } finally {
      setIsCreating(false);
    }
  };


  const recommendRoomSize = (type: string, count: number) => {
    // Simple heuristics for recommendations
    const c = Math.max(0, Number(count) || 0);
    // if accommodation is dorm-style prefer larger rooms
    if (accommodationType === 'dorm' || accommodationType === 'hostel') {
      if (c >= 40) return 6;
      if (c >= 20) return 4;
      return 3;
    }
    switch (type) {
      case 'students':
        if (c >= 40) return 4;
        if (c >= 12) return 3;
        return 2;
      case 'workers':
        if (c >= 20) return 4;
        if (c >= 8) return 3;
        return 2;
      case 'family':
        return 2;
      case 'event':
        if (c >= 50) return 4;
        if (c >= 20) return 3;
        return 2;
      default:
        return 2;
    }
  };

  /* RecommendationBadge removed per request: no automatic recommendations shown */

  const formatTimeTo12 = (t?: string) => {
    if (!t) return '';
    // t expected in "HH:MM" (24-hour) format from input[type=time]
    const [hh, mm] = t.split(':');
    const H = Number(hh || '0');
    const M = mm || '00';
    const meridiem = H >= 12 ? 'PM' : 'AM';
    const hour12 = H % 12 === 0 ? 12 : H % 12;
    return `${String(hour12).padStart(2, '0')}:${M} ${meridiem}`;
  };
  const formatDateSummary = () => {
    if (!useDates) return 'Not specified';
    const from = range?.from;
    const to = range?.to;
    if (!from && !to) return 'Select dates';
    const formatDateShort = (d?: Date) => d ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(d) : '—';
    const f = from ? formatDateShort(from) : '—';
    const t = to ? formatDateShort(to) : 'Any';
    if (from && to) {
      const nights = Math.max(0, Math.round((to.getTime() - from.getTime()) / 86400000));
      const nightsLabel = nights === 1 ? '1 night' : `${nights} nights`;
      return `${f} to ${t} · ${nightsLabel}`;
    }
    return `${f} to ${t}`;
  };

  return (
    <section className="mt-4" aria-labelledby="group-stays-heading">
      <div className="public-container">
        {/* Centered page heading */}
        <div className="text-center mb-6">
          <h3 id="group-stays-heading" className="text-2xl sm:text-3xl font-semibold">Group Stays Hub</h3>
          <p className="mt-2 text-sm text-slate-600">Reserve rooms and manage group lodging for families, teams and events.</p>
        </div>

        <article className="rounded-xl border bg-gradient-to-b from-white via-slate-50 to-white p-6 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-emerald-600" aria-hidden />
              </div>
            </div>
            <div className="ml-4">
              <Link href="/public" onClick={onClose} aria-label="Return to Public" title="Return to Public" className="text-slate-500 hover:text-slate-700 inline-flex items-center">
                <ArrowLeft className="w-5 h-5" aria-hidden />
              </Link>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Stepper header */}
            <div className="sm:col-span-2">
              <div className="mb-3">
                <nav className="flex items-center justify-center gap-6">
                  {[1,2,3,4].map((s, i) => (
                    <div key={s} className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(s)}
                        className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold transition-transform transform ${currentStep===s ? 'bg-emerald-600 text-white shadow-md scale-105' : 'bg-slate-100 text-slate-700 hover:scale-105'} focus:outline-none focus:ring-2 focus:ring-emerald-200`}
                        aria-current={currentStep===s ? 'step' : undefined}
                        aria-label={`Step ${s}`}
                      >
                        {s}
                      </button>
                      <div className="hidden sm:block text-sm text-slate-600">{s === 1 ? 'Details' : s === 2 ? 'Accommodation' : s === 3 ? 'Roster' : 'Review'}</div>
                      {i < 3 ? <div className={`w-16 h-1 rounded ${currentStep > s ? 'bg-emerald-500' : 'bg-slate-200'} transition-colors`} /> : null}
                    </div>
                  ))}
                </nav>
                <div className="mt-3 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full bg-emerald-500 ${currentStep === 1 ? 'w-0' : currentStep === 2 ? 'w-1/3' : currentStep === 3 ? 'w-2/3' : 'w-full'} transition-all`} />
                </div>
              </div>
            </div>

            {/* Step content */}
            <div className="sm:col-span-2">
              {currentStep === 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="rounded-lg bg-white p-4 border border-slate-100 shadow-sm transform transition hover:-translate-y-0.5 hover:shadow-lg">
                    <label htmlFor="group-type" className="block text-sm font-medium text-slate-700">Group type</label>
                    <p className="text-xs text-slate-500 mt-1">Select the group type. Students option added for school groups.</p>
                    <div className="mt-3">
                      <div className="relative">
                        <select id="group-type" name="groupType" value={groupType} onChange={(e) => setGroupType(e.target.value)} className="groupstays-select mt-1 w-full rounded-md px-3 py-2 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 pr-9">
                          <option value="">Select</option>
                          <option value="family">Family</option>
                          <option value="workers">Workers</option>
                          <option value="event">Event</option>
                          <option value="students">Students</option>
                          <option value="team">Team</option>
                          <option value="other">Other</option>
                        </select>
                        <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="from-region" className="block text-xs text-slate-600">Region</label>
                        <div className="relative">
                          <select id="from-region" value={fromRegion} onChange={(e) => { setFromRegion(e.target.value); setFromDistrict(''); setFromWard(''); setFromLocation(''); }} className="groupstays-select mt-1 w-full rounded-md px-3 py-2 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 pr-9">
                            <option value="">Select region</option>
                            {REGION_OPTIONS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                          <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="from-district" className="block text-xs text-slate-600">District</label>
                        <div className="relative">
                          <select id="from-district" value={fromDistrict} onChange={(e) => setFromDistrict(e.target.value)} className="groupstays-select mt-1 w-full rounded-md px-3 py-2 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 pr-9">
                            <option value="">Select district</option>
                            {getDistrictsFor(fromRegion).map((d) => <option key={d} value={d}>{d}</option>)}
                          </select>
                          <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="from-ward" className="block text-xs text-slate-600">Ward</label>
                        <input id="from-ward" value={fromWard} onChange={(e) => setFromWard(e.target.value)} placeholder="Ward" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                      </div>

                      <div>
                        <label htmlFor="from-location" className="block text-xs text-slate-600">Exact location</label>
                        <input id="from-location" value={fromLocation} onChange={(e) => setFromLocation(e.target.value)} placeholder="Street, landmark or GPS coordinates" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-white p-4 border border-slate-100 shadow-sm transform transition hover:-translate-y-0.5 hover:shadow-lg">
                    <div>
                      <label htmlFor="to-region" className="block text-sm font-medium text-slate-700">Where are you going?</label>
                      <p className="text-xs text-slate-500 mt-1">Region, district, ward and exact location</p>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="to-region" className="block text-xs text-slate-600">Region</label>
                        <div className="relative">
                          <select id="to-region" value={toRegion} onChange={(e) => { setToRegion(e.target.value); setToDistrict(''); }} className="groupstays-select mt-1 w-full rounded-md px-3 py-2 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 pr-9">
                            <option value="">Select region</option>
                            {REGION_OPTIONS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                          <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="to-district" className="block text-xs text-slate-600">District</label>
                        <div className="relative">
                          <select id="to-district" value={toDistrict} onChange={(e) => setToDistrict(e.target.value)} className="groupstays-select mt-1 w-full rounded-md px-3 py-2 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 pr-9">
                            <option value="">Select district</option>
                            {getDistrictsFor(toRegion).map((d) => <option key={d} value={d}>{d}</option>)}
                          </select>
                          <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="to-ward" className="block text-xs text-slate-600">Ward</label>
                          <input id="to-ward" value={toWard} onChange={(e) => setToWard(e.target.value)} placeholder="Ward" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                      </div>

                      <div>
                        <label htmlFor="to-location" className="block text-xs text-slate-600">Exact location</label>
                          <input id="to-location" value={toLocation} onChange={(e) => setToLocation(e.target.value)} placeholder="Street, landmark or GPS coordinates" className="groupstays-select mt-1 w-full rounded-md px-3 py-2 pr-9 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" />
                      </div>
                    </div>
                  </div>

                  {/* Accommodation, headcount and private-room controls moved to Step 2 */}
                </div>
              )}

              {currentStep === 2 && (
                <div>
                  {/* Accommodation, headcount and private-room controls moved to top of Step 2 */}
                  <div className="rounded border p-3 mb-4 groupstays-section border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-emerald-500 rounded-sm" aria-hidden />
                        <div>
                          <div className="text-sm font-medium">Accommodation</div>
                          <div className="text-xs text-slate-500">Choose style so we can recommend room sizes</div>
                        </div>
                      </div>
                    </div>
                    <div className="relative">
                      <label htmlFor="accommodation-type" className="sr-only">Accommodation type</label>
                      <select id="accommodation-type" value={accommodationType} onChange={(e) => setAccommodationType(e.target.value)} className="groupstays-select mt-1 w-full rounded px-2 py-1 border appearance-none pr-9">
                        <option value="">Select</option>
                        <option value="villa">Villa</option>
                        <option value="apartment">Apartment</option>
                        <option value="hotel">Hotel</option>
                        <option value="hostel">Hostel</option>
                        <option value="lodge">Lodge</option>
                        <option value="condo">Condo</option>
                        <option value="guest_house">Guest House</option>
                        <option value="bungalow">Bungalow</option>
                        <option value="cabin">Cabin</option>
                        <option value="homestay">Homestay</option>
                        <option value="townhouse">Townhouse</option>
                        <option value="house">House</option>
                        <option value="other">Other</option>
                      </select>
                      <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Choose the accommodation style so we can recommend room sizes.</p>
                  </div>

                  <div className="rounded border p-3 mb-4 groupstays-section border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-6 bg-emerald-500 rounded-sm" aria-hidden />
                      <div>
                        <div className="text-sm font-medium">Headcount</div>
                        <div className="text-xs text-slate-500">Number of people in your group</div>
                      </div>
                    </div>
                    <input id="headcount" name="headcount" value={headcount} onChange={(e) => setHeadcount(Math.max(1, Number(e.target.value || 0)))} type="number" min={1} aria-label="How many people are in your group" placeholder="e.g. 12" className="mt-1 w-full rounded px-2 py-1 border" />
                  </div>

                  <div className="rounded border p-3 mb-4 groupstays-section border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-6 bg-emerald-500 rounded-sm" aria-hidden />
                      <div>
                        <div className="text-sm font-medium">Private rooms</div>
                        <div className="text-xs text-slate-500">Reserve private rooms for those who request them</div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-4 private-room-row">
                      <div className="flex items-center gap-4">
                        <div role="group" aria-label="Private room options" className="inline-flex gap-2">
                          <button
                            type="button"
                            onClick={() => setNeedsPrivateRoom(true)}
                            aria-pressed={needsPrivateRoom}
                            className={`text-sm px-3 py-1 rounded border inline-flex items-center focus:outline-none focus:ring-2 focus:ring-emerald-200 ${needsPrivateRoom ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200'}`}
                          >
                            Yes
                          </button>
                          <button
                            type="button"
                            onClick={() => { setNeedsPrivateRoom(false); setPrivateRoomCount(0); }}
                            aria-pressed={!needsPrivateRoom}
                            className={`text-sm px-3 py-1 rounded border inline-flex items-center focus:outline-none focus:ring-2 focus:ring-emerald-200 ${!needsPrivateRoom ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200'}`}
                          >
                            No
                          </button>
                        </div>
                      </div>

                      {needsPrivateRoom ? (
                        <div className="flex items-center gap-2">
                          <label htmlFor="private-room-count" className="text-xs text-slate-600">How many?</label>
                          <input id="private-room-count" type="number" min={1} value={privateRoomCount} onChange={(e) => setPrivateRoomCount(Math.max(0, Number(e.target.value || 0)))} className="ml-2 w-20 rounded px-2 py-1 border" />
                        </div>
                      ) : null}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">If yes, we will reserve private rooms for those who request them.</p>
                  </div>

                  <div className="rounded border p-3 groupstays-section border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-6 bg-emerald-500 rounded-sm" aria-hidden />
                      <div>
                        <div className="text-sm font-medium">Room configuration</div>
                        <div className="text-xs text-slate-500">Persons per room and estimated rooms needed</div>
                      </div>
                    </div>
                    <div>
                      <label htmlFor="room-size" className="block text-xs text-slate-600">Room size (persons per room)</label>
                      <div className="relative">
                        <select id="room-size" value={roomSize} onChange={(e) => setRoomSize(Number(e.target.value))} className="groupstays-select mt-1 w-full rounded px-2 py-1 border appearance-none pr-9">
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                          <option value={3}>3</option>
                          <option value={4}>4</option>
                        </select>
                        <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
                      </div>
                      <div className="mt-2 text-sm text-slate-600">Estimated rooms needed: <span className="font-medium">{roomsNeeded}</span></div>
                      <div className="mt-1 text-xs text-slate-500">Suggested room size: <span className="font-medium">{recommendRoomSize(groupType, headcount)}</span></div>
                    </div>
                  </div>

                  <div className="rounded border p-3 mb-4 groupstays-section border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-6 bg-emerald-500 rounded-sm" aria-hidden />
                      <div>
                        <div className="text-sm font-medium">Dates</div>
                        <div className="text-xs text-slate-500">Select check-in and check-out (nights shown when both set)</div>
                      </div>
                    </div>
                    <div className="mt-2">
                      {/* existing date UI (kept) */}
                      {/* control to enable/disable date selection. When disabled the date UI is hidden */}
                      {!useDates ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setUseDates(true);
                              setPendingRange(range);
                              setShowPickerPopover(true);
                            }}
                            className="px-3 py-2 rounded border bg-white text-sm"
                          >
                            Add dates
                          </button>
                          <span className="text-sm text-slate-500">Dates: Not specified</span>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col items-center gap-3">
                            {numberOfMonths === 1 ? (
                              <div className="relative">
                                <button
                                  type="button"
                                  aria-haspopup="dialog"
                                  aria-expanded={showPickerPopover}
                                  onClick={() => setShowPickerPopover((s) => { const ns = !s; if (!s) setPendingRange(range); return ns; })}
                                  className="mx-auto text-left rounded px-4 py-2 border bg-white min-w-[12rem]"
                                >
                                  <div className="text-sm text-slate-700">
                                    <span className="font-medium">{range?.from ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(range.from) : 'Select dates'}</span>
                                    <span className="mx-2">to</span>
                                    <span className="font-medium">{range?.to ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(range.to) : 'Any'}</span>
                                  </div>
                                </button>

                                {showPickerPopover && (
                                  <div ref={popoverRef} className="absolute z-50 left-1/2 -translate-x-1/2 mt-2 w-[22rem] bg-white rounded shadow-lg p-3 animate-fade-in sm:left-auto sm:translate-x-0 sm:right-0 sm:w-auto">
                                    <DayPicker
                                      mode="range"
                                      selected={pendingRange ?? range}
                                      onSelect={(r) => {
                                        const rr = r as DateRange | undefined;
                                        setPendingRange(rr);
                                      }}
                                      numberOfMonths={numberOfMonths}
                                      fromDate={new Date()}
                                      disabled={{ before: new Date() }}
                                      defaultMonth={new Date()}
                                    />
                                    <div className="mt-2 flex justify-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setRange(pendingRange);
                                          setPendingRange(undefined);
                                          setShowPickerPopover(false);
                                        }}
                                        disabled={!(pendingRange?.from && pendingRange?.to)}
                                        className="px-3 py-1 text-sm rounded bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        Apply
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="w-full flex justify-center">
                                <div>
                                  <DayPicker
                                    mode="range"
                                    selected={pendingRange ?? range}
                                    onSelect={(r) => {
                                      const rr = r as DateRange | undefined;
                                      setPendingRange(rr);
                                    }}
                                    numberOfMonths={numberOfMonths}
                                    fromDate={new Date()}
                                    disabled={{ before: new Date() }}
                                    defaultMonth={new Date()}
                                    footer={undefined}
                                  />
                                  <div className="mt-2 flex justify-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRange(pendingRange);
                                        setPendingRange(undefined);
                                        setShowPickerPopover(false);
                                      }}
                                      disabled={!(pendingRange?.from && pendingRange?.to)}
                                      className="px-3 py-1 text-sm rounded bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Apply
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div>
                              <button
                                type="button"
                                onClick={() => {
                                  // Close the date picker UI without clearing the selected dates
                                  setShowPickerPopover(false);
                                  setPendingRange(undefined);
                                }}
                                className="px-3 py-2 text-sm rounded border bg-slate-50 text-slate-600"
                              >
                                Close
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="mt-2 text-sm text-slate-600 text-center">Selected: <span className="font-medium">{formatDateSummary()}</span></div>
                  </div>

                    {/* Arrangements: group-level options for Step 2 */}
                    <div className="rounded border p-3 mb-4 groupstays-section">
                      <label className="block text-xs text-slate-600">Arrangements</label>
                      <div className="mt-2">
                        {/* summary badges */}
                        <div className="arrangements-summary">
                          {([['Pickup', arrPickup], ['Transport', arrTransport], ['Meals', arrMeals], ['Guide', arrGuide], ['Equipment', arrEquipment]] as [string, boolean][]).filter(s => s[1]).map((s) => (
                            <div key={s[0]} className="pill-badge">{s[0]}</div>
                          ))}
                          <div className="text-xs text-slate-500">{[arrPickup, arrTransport, arrMeals, arrGuide, arrEquipment].filter(Boolean).length} selected</div>
                        </div>

                        <div className="arrangements-grid">
                          <button type="button" onClick={() => setArrPickup((v) => !v)} aria-pressed={arrPickup} className={`arrangement-pill ${arrPickup ? 'selected' : ''}`}>
                              <Truck className="w-5 h-5" aria-hidden />
                            <span>Airport pick-up</span>
                          </button>

                          <button type="button" onClick={() => setArrTransport((v) => !v)} aria-pressed={arrTransport} className={`arrangement-pill ${arrTransport ? 'selected' : ''}`}>
                            <Bus className="w-5 h-5" aria-hidden />
                            <span>Transport between sites</span>
                          </button>

                          <button type="button" onClick={() => setArrMeals((v) => !v)} aria-pressed={arrMeals} className={`arrangement-pill ${arrMeals ? 'selected' : ''}`}>
                            <Coffee className="w-5 h-5" aria-hidden />
                            <span>Meals included</span>
                          </button>

                          <button type="button" onClick={() => setArrGuide((v) => !v)} aria-pressed={arrGuide} className={`arrangement-pill ${arrGuide ? 'selected' : ''}`}>
                            <Users className="w-5 h-5" aria-hidden />
                            <span>On-site guide/staff</span>
                          </button>

                          <button type="button" onClick={() => setArrEquipment((v) => !v)} aria-pressed={arrEquipment} className={`arrangement-pill ${arrEquipment ? 'selected' : ''}`}>
                            <Wrench className="w-5 h-5" aria-hidden />
                            <span>Special equipment</span>
                          </button>
                        </div>

                        <div className="mt-3 arrangements-details grid grid-cols-1 gap-2">
                          <label htmlFor="pickup-location" className="text-xs text-slate-600">Pickup location</label>
                          <input id="pickup-location" type="text" value={pickupLocation} onChange={(e) => setPickupLocation(e.target.value)} placeholder="Airport terminal, hotel" className="mt-1 w-full rounded px-3 py-2 border" />

                          <label htmlFor="pickup-time" className="text-xs text-slate-600">Pickup time</label>
                          <div className="mt-1">
                            <input id="pickup-time" type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} className="w-36 rounded px-3 py-2 border" />
                            <div className="text-xs text-slate-500 mt-1">Displayed and saved as 12-hour time (AM/PM)</div>
                          </div>

                          <label htmlFor="arrangement-notes" className="text-xs text-slate-600">Arrangement notes</label>
                          <textarea id="arrangement-notes" value={arrangementNotes} onChange={(e) => setArrangementNotes(e.target.value)} placeholder="Any special requests or details" className="mt-1 w-full rounded px-3 py-2 border h-20 resize-y" />
                        </div>
                      </div>
                    </div>

                  
                </div>
              )}

              {currentStep === 3 && (
                <div>
                  <div className="rounded border p-3">
                    <label className="block text-xs text-slate-600">Roster</label>
                    <div className="mt-2 text-sm text-slate-500">Manage passenger roster for this booking. Download the template, fill rows, and upload CSV to import.</div>

                    <div className="mt-3 grid grid-cols-1 gap-2">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={downloadTemplate} aria-label="Download roster template" title="Download template" className="px-3 py-2 rounded border bg-white text-sm inline-flex items-center justify-center">
                          <Download className="w-4 h-4 text-slate-700" aria-hidden />
                        </button>
                      </div>

                      <div>
                        <label htmlFor="roster-file" className="sr-only">Upload roster CSV</label>
                        <input id="roster-file" type="file" accept=".csv,text/csv" aria-label="Upload roster CSV" onChange={(e) => handleRosterFile(e.target.files ? e.target.files[0] : undefined)} className="text-sm" />
                      </div>

                      {rosterError ? <div className="text-xs text-rose-600">{rosterError}</div> : null}

                      {roster.length ? (
                        <div className="mt-2">
                          <div className="text-xs text-slate-600">Imported rows: <strong>{roster.length}</strong></div>
                          <div className="mt-2 text-sm bg-slate-50 p-2 rounded">
                            <table className="w-full text-left text-xs">
                                <thead>
                                  <tr>
                                    {templateColumns.map((col, idx) => (
                                      <th key={col + idx} className="pr-2">{col.replace(/\s+/g, '').toLowerCase()}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {roster.slice(0,5).map((r,i) => (
                                    <tr key={i} className="border-t">
                                      {templateColumns.map((col, ci) => {
                                        const key = col.replace(/\s+/g, '').toLowerCase();
                                        return <td key={ci} className="pr-2 py-1">{r[key] ?? ''}</td>;
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                          </div>
                          <div className="mt-2">
                            <button type="button" onClick={() => setRoster([])} className="px-3 py-1 rounded border text-sm">Clear roster</button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-4">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-100">
                    <h4 className="text-lg font-semibold text-emerald-900 flex items-center gap-2">
                      <Check className="w-5 h-5 text-emerald-600" />
                      Review Your Booking
                    </h4>
                    <p className="text-xs text-emerald-700 mt-1">Please verify all details before creating your block booking</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Group Details */}
                    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                      <h5 className="text-sm font-semibold text-emerald-700 uppercase mb-3 pb-2 border-b border-emerald-100 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Group Details
                      </h5>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-1">
                          <span className="text-xs text-slate-500">Type</span>
                          <span className="text-sm font-medium text-slate-900">{groupType || '—'}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 bg-slate-50 px-2 rounded">
                          <span className="text-xs text-slate-500">Headcount</span>
                          <span className="text-sm font-medium text-slate-900">{headcount}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-xs text-slate-500">Accommodation</span>
                          <span className="text-sm font-medium text-slate-900">{accommodationType || '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Origin */}
                    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                      <h5 className="text-sm font-semibold text-blue-700 uppercase mb-3 pb-2 border-b border-blue-100">Origin</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-1">
                          <span className="text-xs text-slate-500">Region</span>
                          <span className="text-sm font-medium text-slate-900">{fromRegion ? getRegionName(fromRegion) : '—'}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 bg-slate-50 px-2 rounded">
                          <span className="text-xs text-slate-500">District</span>
                          <span className="text-sm font-medium text-slate-900">{fromDistrict || '—'}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-xs text-slate-500">Ward</span>
                          <span className="text-sm font-medium text-slate-900">{fromWard || '—'}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 bg-slate-50 px-2 rounded">
                          <span className="text-xs text-slate-500">Location</span>
                          <span className="text-sm font-medium text-slate-900">{fromLocation || '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Destination */}
                    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                      <h5 className="text-sm font-semibold text-purple-700 uppercase mb-3 pb-2 border-b border-purple-100">Destination</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-1">
                          <span className="text-xs text-slate-500">Region</span>
                          <span className="text-sm font-medium text-slate-900">{toRegion ? getRegionName(toRegion) : '—'}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 bg-slate-50 px-2 rounded">
                          <span className="text-xs text-slate-500">District</span>
                          <span className="text-sm font-medium text-slate-900">{toDistrict || '—'}</span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className="text-xs text-slate-500">Ward</span>
                          <span className="text-sm font-medium text-slate-900">{toWard || '—'}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 bg-slate-50 px-2 rounded">
                          <span className="text-xs text-slate-500">Location</span>
                          <span className="text-sm font-medium text-slate-900">{toLocation || '—'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Dates & Duration */}
                    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                      <h5 className="text-sm font-semibold text-amber-700 uppercase mb-3 pb-2 border-b border-amber-100 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Dates & Duration
                      </h5>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-1">
                          <span className="text-xs text-slate-500">Check-in</span>
                          <span className="text-sm font-medium text-slate-900">{range?.from ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(range.from) : '—'}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 bg-slate-50 px-2 rounded">
                          <span className="text-xs text-slate-500">Check-out</span>
                          <span className="text-sm font-medium text-slate-900">{range?.to ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(range.to) : '—'}</span>
                        </div>
                        {range?.from && range?.to && (
                          <div className="flex justify-between items-center py-1">
                            <span className="text-xs text-slate-500">Duration</span>
                            <span className="text-sm font-medium text-slate-900">{Math.max(0, Math.round((range.to.getTime() - range.from.getTime()) / 86400000))} night{Math.max(0, Math.round((range.to.getTime() - range.from.getTime()) / 86400000)) !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                        <div className="flex justify-between items-center py-1 bg-slate-50 px-2 rounded">
                          <span className="text-xs text-slate-500">Using dates</span>
                          <span className="text-sm font-medium text-slate-900">{useDates ? 'Yes' : 'Not specified'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Full-width sections */}
                  <div className="space-y-4">
                    {/* Rooms & Configuration */}
                    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                      <h5 className="text-sm font-semibold text-teal-700 uppercase mb-3 pb-2 border-b border-teal-100">Rooms & Configuration</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="bg-teal-50 rounded-lg p-3 text-center border border-teal-100">
                          <div className="text-xs text-teal-600 mb-1">Room Size</div>
                          <div className="text-lg font-bold text-teal-900">{roomSize}</div>
                          <div className="text-xs text-teal-600">person{roomSize !== 1 ? 's' : ''}</div>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100">
                          <div className="text-xs text-blue-600 mb-1">Rooms Needed</div>
                          <div className="text-lg font-bold text-blue-900">{roomsNeeded}</div>
                          <div className="text-xs text-blue-600">rooms</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-3 text-center border border-purple-100">
                          <div className="text-xs text-purple-600 mb-1">Private Rooms</div>
                          <div className="text-lg font-bold text-purple-900">{needsPrivateRoom ? privateRoomCount : '0'}</div>
                          <div className="text-xs text-purple-600">{needsPrivateRoom ? 'requested' : 'none'}</div>
                        </div>
                        <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-100">
                          <div className="text-xs text-amber-600 mb-1">Suggested Size</div>
                          <div className="text-lg font-bold text-amber-900">{recommendRoomSize(groupType, headcount)}</div>
                          <div className="text-xs text-amber-600">persons</div>
                        </div>
                      </div>
                    </div>

                    {/* Arrangements */}
                    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                      <h5 className="text-sm font-semibold text-indigo-700 uppercase mb-3 pb-2 border-b border-indigo-100">Arrangements</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 p-2 rounded hover:bg-slate-50">
                            <Truck className={`w-4 h-4 ${arrPickup ? 'text-emerald-600' : 'text-slate-300'}`} />
                            <span className="text-sm flex-1">Airport pick-up</span>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${arrPickup ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                              {arrPickup ? 'Yes' : 'No'}
                            </span>
                          </div>
                          {arrPickup && pickupLocation && (
                            <div className="ml-6 text-xs text-slate-600 bg-emerald-50 p-2 rounded border-l-2 border-emerald-300">
                              <span className="font-medium">Location:</span> {pickupLocation}
                            </div>
                          )}
                          {arrPickup && pickupTime && (
                            <div className="ml-6 text-xs text-slate-600 bg-emerald-50 p-2 rounded border-l-2 border-emerald-300">
                              <span className="font-medium">Time:</span> {formatTimeTo12(pickupTime)}
                            </div>
                          )}

                          <div className="flex items-center gap-2 p-2 rounded hover:bg-slate-50">
                            <Bus className={`w-4 h-4 ${arrTransport ? 'text-emerald-600' : 'text-slate-300'}`} />
                            <span className="text-sm flex-1">Transport between sites</span>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${arrTransport ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                              {arrTransport ? 'Yes' : 'No'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 p-2 rounded hover:bg-slate-50">
                            <Coffee className={`w-4 h-4 ${arrMeals ? 'text-emerald-600' : 'text-slate-300'}`} />
                            <span className="text-sm flex-1">Meals included</span>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${arrMeals ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                              {arrMeals ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2 p-2 rounded hover:bg-slate-50">
                            <Users className={`w-4 h-4 ${arrGuide ? 'text-emerald-600' : 'text-slate-300'}`} />
                            <span className="text-sm flex-1">On-site guide/staff</span>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${arrGuide ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                              {arrGuide ? 'Yes' : 'No'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 p-2 rounded hover:bg-slate-50">
                            <Wrench className={`w-4 h-4 ${arrEquipment ? 'text-emerald-600' : 'text-slate-300'}`} />
                            <span className="text-sm flex-1">Special equipment</span>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${arrEquipment ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                              {arrEquipment ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {arrangementNotes && (
                        <div className="mt-4 pt-3 border-t border-slate-200">
                          <div className="text-xs font-medium text-slate-600 mb-2">Additional Notes:</div>
                          <div className="bg-indigo-50 p-3 rounded-lg text-sm text-slate-700 border border-indigo-100">
                            {arrangementNotes}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Roster */}
                    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                      <h5 className="text-sm font-semibold text-rose-700 uppercase mb-3 pb-2 border-b border-rose-100">Passenger Roster</h5>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-rose-50 rounded-lg border border-rose-100">
                          <span className="text-sm font-medium text-rose-900">Total Passengers</span>
                          <span className="text-2xl font-bold text-rose-700">{roster.length > 0 ? roster.length : '0'}</span>
                        </div>
                        {roster.length > 0 && (
                          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <div className="text-sm text-slate-700 space-y-1">
                              {(showAllPassengers ? roster : roster.slice(0, 3)).map((r, i) => {
                                const name = `${r.firstname || ''} ${r.lastname || ''}`.trim() || `Passenger ${i + 1}`;
                                return (
                                  <div key={i} className="flex items-center gap-2 p-2 bg-white rounded border border-slate-100">
                                    <div className="w-6 h-6 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center text-xs font-bold">
                                      {i + 1}
                                    </div>
                                    <span className="font-medium">{name}</span>
                                    {r.phone && <span className="text-xs text-slate-500">· {r.phone}</span>}
                                  </div>
                                );
                              })}
                              {roster.length > 3 && !showAllPassengers && (
                                <button
                                  type="button"
                                  onClick={() => setShowAllPassengers(true)}
                                  className="w-full text-xs text-blue-600 hover:text-blue-700 text-center pt-2 italic hover:underline focus:outline-none focus:ring-2 focus:ring-blue-200 rounded p-1 transition-colors"
                                >
                                  ... and {roster.length - 3} more passenger{roster.length - 3 !== 1 ? 's' : ''} (click to view all)
                                </button>
                              )}
                              {showAllPassengers && roster.length > 3 && (
                                <button
                                  type="button"
                                  onClick={() => setShowAllPassengers(false)}
                                  className="w-full text-xs text-slate-600 hover:text-slate-700 text-center pt-2 italic hover:underline focus:outline-none focus:ring-2 focus:ring-slate-200 rounded p-1 transition-colors"
                                >
                                  Show less
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                        {roster.length === 0 && (
                          <div className="text-center py-6 text-slate-400">
                            <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">No passengers added yet</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          
          <div className="mt-4 flex items-center justify-end gap-2">
            {currentStep > 1 ? (
              <button type="button" onClick={() => setCurrentStep((s) => s - 1)} className="px-3 py-2 bg-white border rounded-lg shadow-sm transition transform hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-emerald-200 inline-flex items-center gap-2">
                <ChevronLeft className="w-4 h-4 text-slate-700" aria-hidden />
                <span className="text-sm text-slate-700">Back</span>
              </button>
            ) : null}

            {currentStep < 4 ? (
              <button type="button" onClick={() => setCurrentStep((s) => s + 1)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg shadow transition transform hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-emerald-300 inline-flex items-center gap-2">
                <span className="text-sm">Next</span>
                <ChevronRight className="w-4 h-4" aria-hidden />
              </button>
            ) : (
              <>
                <button type="button" onClick={() => { /* save draft local */ }} disabled={isCreating || !isFormComplete()} className="px-3 py-2 bg-slate-50 border rounded-lg transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed">Save draft</button>
                <button 
                  type="button" 
                  onClick={handleCreate} 
                  disabled={isCreating || !isFormComplete()}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg shadow transition transform hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-emerald-300 inline-flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none"
                  title={!isFormComplete() ? 'Please fill all required fields' : ''}
                >
                  {isCreating ? (
                    <>
                      <Spinner size="sm" ariaLabel="Creating block booking" />
                      <span className="text-sm">Creating...</span>
                    </>
                  ) : showSuccess ? (
                    <>
                      <Check className="w-4 h-4" aria-hidden />
                      <span className="text-sm">Created!</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" aria-hidden />
                      <span className="text-sm">Create Block</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>

          
          {errors.length ? (
            <div role="alert" aria-live="assertive" className="mt-3 text-sm text-rose-600">
              {errors.map((er,i) => <div key={i}>{er}</div>)}
            </div>
          ) : null}
        </article>
      </div>
    </section>
  );
}
