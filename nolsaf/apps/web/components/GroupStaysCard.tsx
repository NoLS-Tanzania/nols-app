"use client";

import React, { useState, useEffect } from 'react';
import DatePicker from '@/components/ui/DatePicker';
import { REGIONS as TZ_REGIONS } from '@/lib/tzRegions';
import { REGIONS_FULL_DATA } from '@/lib/tzRegionsFull';
import Link from 'next/link';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Check, Truck, Bus, Coffee, Users, Wrench, Download, ArrowLeft, CheckCircle, ArrowRight, Trash2 } from 'lucide-react';
import Spinner from './Spinner';

export default function GroupStaysCard({ onCloseAction }: { onCloseAction?: () => void }) {
  const DRAFT_KEY = 'groupStaysDraft.v1';
  const [groupType, setGroupType] = useState<string>('');
  const [accommodationType, setAccommodationType] = useState<string>('');
  const [minHotelStarLabel, setMinHotelStarLabel] = useState<string>('');
  const [headcount, setHeadcount] = useState<number>(4);
  const [maleCount, setMaleCount] = useState<number>(2);
  const [femaleCount, setFemaleCount] = useState<number>(2);
  const [otherCount, setOtherCount] = useState<number>(0);
  const [checkInIso, setCheckInIso] = useState<string>('');
  const [checkOutIso, setCheckOutIso] = useState<string>('');
  const [roomSize, setRoomSize] = useState<number>(2);
  const [errors, setErrors] = useState<string[]>([]);
  const [hasSavedDraft, setHasSavedDraft] = useState<boolean>(false);
  const [draftNotice, setDraftNotice] = useState<string>('');

  // Use canonical TZ region/district data from `lib/tzRegions.ts`
  // `TZ_REGIONS` is an array of { id, name, districts }
  // Use `id` values for selects (stable for URLs/storage) and look up names when needed
  const REGION_OPTIONS = TZ_REGIONS;
  const getDistrictsFor = (regionId: string) => TZ_REGIONS.find(r => r.id === regionId)?.districts ?? [];
  const getRegionName = (id?: string | null) => id ? (TZ_REGIONS.find(r => r.id === id)?.name ?? id) : '';
  
  // Helper functions for full data structure (wards and streets)
  const getFullRegionData = (regionId: string) => {
    const region = TZ_REGIONS.find(r => r.id === regionId);
    if (!region) return null;
    return REGIONS_FULL_DATA.find(r => r.name === region.name);
  };
  
  const getWardsFor = (regionId: string, districtName: string) => {
    const fullRegion = getFullRegionData(regionId);
    if (!fullRegion) return [];
    const district = fullRegion.districts?.find(d => d.name === districtName);
    return district?.wards ?? [];
  };
  
  const getStreetsFor = (regionId: string, districtName: string, wardName: string) => {
    const fullRegion = getFullRegionData(regionId);
    if (!fullRegion) return [];
    const district = fullRegion.districts?.find(d => d.name === districtName);
    if (!district) return [];
    const ward = district.wards?.find(w => w.name === wardName);
    return ward?.streets ?? [];
  };

  const [fromCountry, setFromCountry] = useState<string>('');
  const [fromRegion, setFromRegion] = useState<string>('');
  const [toRegion, setToRegion] = useState<string>('');
  const [toDistrict, setToDistrict] = useState<string>('');
  const [toWard, setToWard] = useState<string>('');
  const [toLocation, setToLocation] = useState<string>('');
  const [fromDistrict, setFromDistrict] = useState<string>('');
  const [fromWard, setFromWard] = useState<string>('');
  const [fromLocation, setFromLocation] = useState<string>('');

  // Countries list with EU as a special option
  const COUNTRIES = [
    { value: 'tanzania', label: 'Tanzania' },
    { value: 'eu', label: 'EU (European Union)' },
    { value: 'kenya', label: 'Kenya' },
    { value: 'uganda', label: 'Uganda' },
    { value: 'rwanda', label: 'Rwanda' },
    { value: 'burundi', label: 'Burundi' },
    { value: 'south-africa', label: 'South Africa' },
    { value: 'united-states', label: 'United States' },
    { value: 'united-kingdom', label: 'United Kingdom' },
    { value: 'canada', label: 'Canada' },
    { value: 'australia', label: 'Australia' },
    { value: 'india', label: 'India' },
    { value: 'china', label: 'China' },
    { value: 'japan', label: 'Japan' },
    { value: 'south-korea', label: 'South Korea' },
    { value: 'brazil', label: 'Brazil' },
    { value: 'mexico', label: 'Mexico' },
    { value: 'argentina', label: 'Argentina' },
    { value: 'egypt', label: 'Egypt' },
    { value: 'nigeria', label: 'Nigeria' },
    { value: 'ghana', label: 'Ghana' },
    { value: 'other', label: 'Other' },
  ];

  // Check if Tanzania is selected
  const isTanzaniaSelected = fromCountry === 'tanzania';

  const HOTEL_STAR_OPTIONS = [
    { value: '', label: 'Select rating' },
    { value: 'basic', label: 'Basic accommodations' },
    { value: 'simple', label: 'Simple and affordable' },
    { value: 'moderate', label: 'Moderate quality' },
    { value: 'high', label: 'High-end comfort' },
    { value: 'luxury', label: 'Luxury and exceptional service' },
  ] as const;

  const hotelStarLabelToNumber = (v: unknown): number | null => {
    const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
    if (s === 'basic') return 1;
    if (s === 'simple') return 2;
    if (s === 'moderate') return 3;
    if (s === 'high') return 4;
    if (s === 'luxury') return 5;
    return null;
  };

  const hotelStarNumberToLabel = (n: unknown): string => {
    const num = Number(n);
    if (!Number.isFinite(num)) return '';
    if (num <= 1) return 'basic';
    if (num === 2) return 'simple';
    if (num === 3) return 'moderate';
    if (num === 4) return 'high';
    if (num >= 5) return 'luxury';
    return '';
  };

  // Calculate headcount from gender breakdown
  const calculatedHeadcount = maleCount + femaleCount + otherCount;
  // Update headcount when gender breakdown changes
  useEffect(() => {
    if (calculatedHeadcount > 0) {
      setHeadcount(calculatedHeadcount);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maleCount, femaleCount, otherCount]);
  
  const roomsNeeded = Math.max(0, Math.ceil(headcount / (roomSize || 1)));
  const [checkInPickerOpen, setCheckInPickerOpen] = useState(false);
  const [checkOutPickerOpen, setCheckOutPickerOpen] = useState(false);
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
  const [rosterFileName, setRosterFileName] = useState<string>('');
  const [showAllPassengers, setShowAllPassengers] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const templateColumns = ['First name','Last name','Phone','Age','Gender','Nationality'];

  const toIsoDate = (d: Date) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const addDaysIso = (iso: string, days: number) => {
    if (!iso) return '';
    const dt = new Date(iso);
    if (Number.isNaN(dt.getTime())) return '';
    dt.setUTCDate(dt.getUTCDate() + days);
    return toIsoDate(dt);
  };

  const isoDateToApiDateTime = (iso: string) => {
    if (!iso) return null;
    return `${iso}T00:00:00.000Z`;
  };

  const clearSavedDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    setHasSavedDraft(false);
    setDraftNotice('Saved draft cleared.');
    window.setTimeout(() => setDraftNotice(''), 2500);
  };

  // Restore Step 1 + Step 2 draft (never restores roster)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as any;
      if (!parsed || typeof parsed !== 'object') return;

      setGroupType(typeof parsed.groupType === 'string' ? parsed.groupType : '');
      setFromCountry(typeof parsed.fromCountry === 'string' ? parsed.fromCountry : '');
      setFromRegion(typeof parsed.fromRegion === 'string' ? parsed.fromRegion : '');
      setFromDistrict(typeof parsed.fromDistrict === 'string' ? parsed.fromDistrict : '');
      setFromWard(typeof parsed.fromWard === 'string' ? parsed.fromWard : '');
      setFromLocation(typeof parsed.fromLocation === 'string' ? parsed.fromLocation : '');
      setToRegion(typeof parsed.toRegion === 'string' ? parsed.toRegion : '');
      setToDistrict(typeof parsed.toDistrict === 'string' ? parsed.toDistrict : '');
      setToWard(typeof parsed.toWard === 'string' ? parsed.toWard : '');
      setToLocation(typeof parsed.toLocation === 'string' ? parsed.toLocation : '');

      setAccommodationType(typeof parsed.accommodationType === 'string' ? parsed.accommodationType : '');
      // Draft compatibility:
      // - new drafts store minHotelStarLabel (basic/simple/moderate/high/luxury)
      // - older drafts stored minHotelStar as a number (1-5)
      if (typeof parsed.minHotelStarLabel === 'string') {
        setMinHotelStarLabel(parsed.minHotelStarLabel);
      } else if (typeof parsed.minHotelStar === 'string') {
        setMinHotelStarLabel(parsed.minHotelStar);
      } else if (Number.isFinite(parsed.minHotelStar)) {
        setMinHotelStarLabel(hotelStarNumberToLabel(parsed.minHotelStar));
      } else {
        setMinHotelStarLabel('');
      }
      setMaleCount(Number.isFinite(parsed.maleCount) ? Math.max(0, Number(parsed.maleCount)) : 2);
      setFemaleCount(Number.isFinite(parsed.femaleCount) ? Math.max(0, Number(parsed.femaleCount)) : 2);
      setOtherCount(Number.isFinite(parsed.otherCount) ? Math.max(0, Number(parsed.otherCount)) : 0);
      setRoomSize(Number.isFinite(parsed.roomSize) ? Math.max(1, Number(parsed.roomSize)) : 2);
      setNeedsPrivateRoom(typeof parsed.needsPrivateRoom === 'boolean' ? parsed.needsPrivateRoom : false);
      setPrivateRoomCount(Number.isFinite(parsed.privateRoomCount) ? Math.max(0, Number(parsed.privateRoomCount)) : 0);
      setUseDates(typeof parsed.useDates === 'boolean' ? parsed.useDates : true);
      setCheckInIso(typeof parsed.checkInIso === 'string' ? parsed.checkInIso : '');
      setCheckOutIso(typeof parsed.checkOutIso === 'string' ? parsed.checkOutIso : '');

      setArrPickup(typeof parsed.arrPickup === 'boolean' ? parsed.arrPickup : false);
      setArrTransport(typeof parsed.arrTransport === 'boolean' ? parsed.arrTransport : false);
      setArrMeals(typeof parsed.arrMeals === 'boolean' ? parsed.arrMeals : false);
      setArrGuide(typeof parsed.arrGuide === 'boolean' ? parsed.arrGuide : false);
      setArrEquipment(typeof parsed.arrEquipment === 'boolean' ? parsed.arrEquipment : false);
      setPickupLocation(typeof parsed.pickupLocation === 'string' ? parsed.pickupLocation : '');
      setPickupTime(typeof parsed.pickupTime === 'string' ? parsed.pickupTime : '');
      setArrangementNotes(typeof parsed.arrangementNotes === 'string' ? parsed.arrangementNotes : '');

      const savedStep = Number.isFinite(parsed.currentStep) ? Number(parsed.currentStep) : 1;
      setCurrentStep(Math.min(2, Math.max(1, savedStep)));

      setHasSavedDraft(true);
      setDraftNotice('Draft restored (Steps 1–2).');
      window.setTimeout(() => setDraftNotice(''), 3000);
    } catch {
      // If draft is corrupted, ignore it
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Autosave Step 1 + Step 2 fields only (never saves roster)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = window.setTimeout(() => {
      try {
        const draft = {
          currentStep: Math.min(2, Math.max(1, currentStep)),

          // Step 1
          groupType,
          fromCountry,
          fromRegion,
          fromDistrict,
          fromWard,
          fromLocation,
          toRegion,
          toDistrict,
          toWard,
          toLocation,

          // Step 2
          accommodationType,
          minHotelStarLabel,
          maleCount,
          femaleCount,
          otherCount,
          roomSize,
          needsPrivateRoom,
          privateRoomCount,
          useDates,
          checkInIso,
          checkOutIso,
          arrPickup,
          arrTransport,
          arrMeals,
          arrGuide,
          arrEquipment,
          pickupLocation,
          pickupTime,
          arrangementNotes,
        };

        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        setHasSavedDraft(true);
      } catch {
        // ignore quota/unavailable storage
      }
    }, 450);

    return () => window.clearTimeout(t);
  }, [
    currentStep,
    groupType,
    fromCountry,
    fromRegion,
    fromDistrict,
    fromWard,
    fromLocation,
    toRegion,
    toDistrict,
    toWard,
    toLocation,
    accommodationType,
    minHotelStarLabel,
    maleCount,
    femaleCount,
    otherCount,
    roomSize,
    needsPrivateRoom,
    privateRoomCount,
    useDates,
    checkInIso,
    checkOutIso,
    arrPickup,
    arrTransport,
    arrMeals,
    arrGuide,
    arrEquipment,
    pickupLocation,
    pickupTime,
    arrangementNotes,
  ]);

  const collectValidationErrors = (opts?: { upToStep?: number }) => {
    const upToStep = opts?.upToStep ?? 4;
    const e: string[] = [];

    // Step 1 required fields
    if (upToStep >= 1) {
      if (!groupType) e.push('Group type is required.');
      if (!fromCountry) e.push('Country is required.');
      if (!toRegion) e.push('Destination region is required.');
      if (!toDistrict) e.push('Destination district is required.');

      // If Tanzania is selected, origin region is required
      if (isTanzaniaSelected && !fromRegion) e.push('Region is required when Tanzania is selected.');
    }

    // Step 2 required fields
    if (upToStep >= 2) {
      if (!accommodationType) e.push('Accommodation type is required.');
      if (accommodationType === 'hotel' && !hotelStarLabelToNumber(minHotelStarLabel)) e.push('Hotel rating is required when accommodation type is Hotel.');
      if (calculatedHeadcount < 1) e.push('Headcount must be at least 1. Please specify at least one person in the gender breakdown.');
      if (needsPrivateRoom && (!privateRoomCount || privateRoomCount < 1)) e.push('Please specify how many private rooms are needed.');
      if (useDates && (!checkInIso || !checkOutIso)) e.push('Please select check-in and check-out dates.');
      if (checkInIso && checkOutIso && new Date(checkInIso) >= new Date(checkOutIso)) e.push('Check-out must be after check-in.');
    }

    return e;
  };

  // Check if all required fields are filled
  const isFormComplete = () => {
    // Step 1: Required fields
    if (!groupType) return false;
    if (!fromCountry) return false;
    if (!toRegion) return false;
    if (!toDistrict) return false;
    
    // If Tanzania is selected, origin region is required
    if (isTanzaniaSelected && !fromRegion) return false;
    
    // Step 2: Accommodation type required
    if (!accommodationType) return false;

    // If Hotel is selected, rating is required
    if (accommodationType === 'hotel' && !hotelStarLabelToNumber(minHotelStarLabel)) return false;
    
    // Headcount must be at least 1 (default is 4, so this is usually satisfied)
    if (!headcount || headcount < 1) return false;
    
    // If private rooms are needed, count must be specified
    if (needsPrivateRoom && (!privateRoomCount || privateRoomCount < 1)) return false;
    
    // If using dates, both check-in and check-out must be selected
    if (useDates && (!checkInIso || !checkOutIso)) return false;
    
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
    setRosterFileName(file?.name ?? '');
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


  const validate = () => {
    const e = collectValidationErrors();
    setErrors(e);
    return e.length === 0;
  };

  const validateUpToStep = (upToStep: number) => {
    const e = collectValidationErrors({ upToStep });
    setErrors(e);
    return e.length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    
    setIsCreating(true);
    setErrors([]);
    
    const payload = {
      groupType,
      fromCountry: fromCountry || null,
      fromRegion: isTanzaniaSelected ? fromRegion : null,
      fromDistrict: isTanzaniaSelected ? fromDistrict : null,
      fromWard: isTanzaniaSelected ? fromWard : null,
      fromLocation: isTanzaniaSelected ? fromLocation : null,
      toRegion,
      toDistrict,
      toWard,
      toLocation,
      accommodationType,
      minHotelStarLabel: accommodationType === 'hotel' ? (minHotelStarLabel || null) : null,
      headcount: calculatedHeadcount,
      maleCount: maleCount > 0 ? maleCount : null,
      femaleCount: femaleCount > 0 ? femaleCount : null,
      otherCount: otherCount > 0 ? otherCount : null,
      needsPrivateRoom,
      privateRoomCount,
      checkin: useDates ? isoDateToApiDateTime(checkInIso) : null,
      checkout: useDates ? isoDateToApiDateTime(checkOutIso) : null,
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
      // Make API request to create group booking
      const response = await fetch(`/api/group-bookings`, {
        method: 'POST',
        credentials: "include",
        headers: {
          'Content-Type': 'application/json',
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

      // Clear saved draft on successful submit
      try { localStorage.removeItem(DRAFT_KEY); } catch {}
      setHasSavedDraft(false);
      
      // Show success message
      setShowSuccess(true);
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
    if (!checkInIso && !checkOutIso) return 'Select dates';
    const from = checkInIso ? new Date(checkInIso) : null;
    const to = checkOutIso ? new Date(checkOutIso) : null;
    const formatDateShort = (d?: Date | null) => d ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(d) : '—';
    const f = formatDateShort(from);
    const t = to ? formatDateShort(to) : 'Any';
    if (from && to) {
      const nights = Math.max(0, Math.round((to.getTime() - from.getTime()) / 86400000));
      const nightsLabel = nights === 1 ? '1 night' : `${nights} nights`;
      return `${f} to ${t} · ${nightsLabel}`;
    }
    return `${f} to ${t}`;
  };

  // Show success screen if booking was created successfully
  if (showSuccess) {
    return (
      <section className="mt-4" aria-labelledby="group-stays-success">
        <div className="public-container">
          <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-sm">
            <style dangerouslySetInnerHTML={{ __html: `
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes scaleIn {
                from { opacity: 0; transform: scale(0.8); }
                to { opacity: 1; transform: scale(1); }
              }
              @keyframes slideUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
              }
              .success-fade-in { animation: fadeIn 0.5s ease-out; }
              .success-scale-in { animation: scaleIn 0.6s ease-out; }
              .success-slide-up { animation: slideUp 0.6s ease-out 0.2s both; }
              .success-slide-up-delayed { animation: slideUp 0.6s ease-out 0.4s both; }
              .success-fade-in-delayed { animation: fadeIn 0.5s ease-out 0.6s both; }
            `}} />
            <div className="max-w-2xl mx-auto text-center space-y-6">
              {/* Animated success icon */}
              <div className="flex justify-center">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg success-scale-in">
                  <CheckCircle className="h-10 w-10 text-white transition-all duration-300" strokeWidth={2.5} />
                </div>
              </div>
              
              {/* Heading and description with slide-up animation */}
              <div className="space-y-3 success-slide-up">
                <h2 id="group-stays-success" className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                  Thank you for your Group Stay booking!
                </h2>
                <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
                  We&apos;ve received your group stay request and our team is currently reviewing it. 
                  We&apos;ll get back to you soon with accommodation options and pricing tailored to your group&apos;s needs.
                </p>
              </div>

              {/* Button with hover and transition effects */}
              <div className="pt-4 success-slide-up-delayed">
                <Link
                  href="/account/group-stays"
                  className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 active:scale-[0.98] no-underline group"
                  onClick={() => {
                    if (onCloseAction) onCloseAction();
                  }}
                >
                  <span>View My Group Stays</span>
                  <ArrowRight className="h-5 w-5 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </div>

              {/* Footer note */}
              <p className="text-sm text-slate-500 pt-2 success-fade-in-delayed">
                You can track your booking status and view all your group stays in your account.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

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
              <Link 
                href="/public" 
                onClick={() => {
                  if (onCloseAction) onCloseAction();
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-[#02665e] hover:bg-slate-50 rounded-lg transition-all duration-200 font-medium group no-underline"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span>Return to public site</span>
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
                        onClick={() => {
                          if (s <= currentStep) {
                            setErrors([]);
                            setCurrentStep(s);
                            return;
                          }
                          // Validate all steps up to the target step
                          const ok = validateUpToStep(s - 1);
                          if (ok) {
                            setErrors([]);
                            setCurrentStep(s);
                          }
                        }}
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
              <div key={currentStep} className="stepContentTransition">
              {currentStep === 1 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <div className="text-slate-500">
                        {draftNotice ? (
                          <span className="text-emerald-700">{draftNotice}</span>
                        ) : (
                          <span>Saved automatically (Steps 1–2)</span>
                        )}
                      </div>
                      {hasSavedDraft ? (
                        <button
                          type="button"
                          onClick={clearSavedDraft}
                          aria-label="Clear saved draft"
                          title="Clear saved draft"
                          className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white p-4 border border-slate-100 shadow-sm transform transition hover:-translate-y-0.5 hover:shadow-lg">
                    <label htmlFor="group-type" className="block text-sm font-medium text-slate-700">Group type <span className="text-red-500">*</span></label>
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
                          <option value="safari_stay">Safari Stay</option>
                          <option value="other">Other</option>
                        </select>
                        <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
                      </div>
                    </div>

                    <div className="mt-3">
                      <div>
                        <label htmlFor="from-country" className="block text-xs text-slate-600 mb-1">Country <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <select 
                            id="from-country" 
                            value={fromCountry} 
                            onChange={(e) => { 
                              const newCountry = e.target.value;
                              setFromCountry(newCountry);
                              // Clear region/district/ward/street if not Tanzania
                              if (newCountry !== 'tanzania') {
                                setFromRegion('');
                                setFromDistrict('');
                                setFromWard('');
                                setFromLocation('');
                              }
                            }} 
                            className="groupstays-select mt-1 w-full rounded-md px-3 py-2 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 pr-9"
                          >
                            <option value="">Select country</option>
                            {COUNTRIES.map((country) => (
                              <option key={country.value} value={country.value}>{country.label}</option>
                            ))}
                          </select>
                          <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
                        </div>
                      </div>
                    </div>

                    {isTanzaniaSelected && (
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label htmlFor="from-region" className="block text-xs text-slate-600">
                            Region <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <select id="from-region" value={fromRegion} onChange={(e) => { setFromRegion(e.target.value); setFromDistrict(''); setFromWard(''); setFromLocation(''); }} required className="groupstays-select mt-1 w-full rounded-md px-3 py-2 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 pr-9">
                              <option value="">Select region</option>
                              {REGION_OPTIONS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                            <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="from-district" className="block text-xs text-slate-600">District</label>
                          <div className="relative">
                            <select id="from-district" value={fromDistrict} onChange={(e) => { setFromDistrict(e.target.value); setFromWard(''); setFromLocation(''); }} disabled={!fromRegion} className="groupstays-select mt-1 w-full rounded-md px-3 py-2 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 pr-9 disabled:bg-slate-50 disabled:text-slate-400">
                              <option value="">Select district</option>
                              {getDistrictsFor(fromRegion).map((d) => <option key={d} value={d}>{d}</option>)}
                            </select>
                            <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="from-ward" className="block text-xs text-slate-600">Ward</label>
                          <div className="relative">
                            <select id="from-ward" value={fromWard} onChange={(e) => { setFromWard(e.target.value); setFromLocation(''); }} disabled={!fromDistrict} className="groupstays-select mt-1 w-full rounded-md px-3 py-2 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 pr-9 disabled:bg-slate-50 disabled:text-slate-400">
                              <option value="">Select ward</option>
                              {getWardsFor(fromRegion, fromDistrict).map((ward) => (
                                <option key={ward.name} value={ward.name}>{ward.name}</option>
                              ))}
                            </select>
                            <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="from-location" className="block text-xs text-slate-600">Street</label>
                          <div className="relative">
                            <select id="from-location" value={fromLocation} onChange={(e) => setFromLocation(e.target.value)} disabled={!fromWard} className="groupstays-select mt-1 w-full rounded-md px-3 py-2 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 pr-9 disabled:bg-slate-50 disabled:text-slate-400">
                              <option value="">Select street</option>
                              {getStreetsFor(fromRegion, fromDistrict, fromWard).map((street) => (
                                <option key={street} value={street}>{street}</option>
                              ))}
                            </select>
                            <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg bg-white p-4 border border-slate-100 shadow-sm transform transition hover:-translate-y-0.5 hover:shadow-lg">
                    <div>
                      <label htmlFor="to-region" className="block text-sm font-medium text-slate-700">Where are you going? <span className="text-red-500">*</span></label>
                      <p className="text-xs text-slate-500 mt-1">Region, district, ward and exact location</p>
                    </div>

                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label htmlFor="to-region" className="block text-xs text-slate-600">Region <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <select id="to-region" value={toRegion} onChange={(e) => { setToRegion(e.target.value); setToDistrict(''); setToWard(''); setToLocation(''); }} className="groupstays-select mt-1 w-full rounded-md px-3 py-2 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 pr-9">
                            <option value="">Select region</option>
                            {REGION_OPTIONS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                          <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="to-district" className="block text-xs text-slate-600">District <span className="text-red-500">*</span></label>
                        <div className="relative">
                          <select id="to-district" value={toDistrict} onChange={(e) => { setToDistrict(e.target.value); setToWard(''); setToLocation(''); }} disabled={!toRegion} className="groupstays-select mt-1 w-full rounded-md px-3 py-2 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 pr-9 disabled:bg-slate-50 disabled:text-slate-400">
                            <option value="">Select district</option>
                            {getDistrictsFor(toRegion).map((d) => <option key={d} value={d}>{d}</option>)}
                          </select>
                          <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="to-ward" className="block text-xs text-slate-600">Ward</label>
                        <div className="relative">
                          <select id="to-ward" value={toWard} onChange={(e) => { setToWard(e.target.value); setToLocation(''); }} disabled={!toDistrict} className="groupstays-select mt-1 w-full rounded-md px-3 py-2 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 pr-9 disabled:bg-slate-50 disabled:text-slate-400">
                            <option value="">Select ward</option>
                            {getWardsFor(toRegion, toDistrict).map((ward) => (
                              <option key={ward.name} value={ward.name}>{ward.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="to-location" className="block text-xs text-slate-600">Street</label>
                        <div className="relative">
                          <select id="to-location" value={toLocation} onChange={(e) => setToLocation(e.target.value)} disabled={!toWard} className="groupstays-select mt-1 w-full rounded-md px-3 py-2 border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 pr-9 disabled:bg-slate-50 disabled:text-slate-400">
                            <option value="">Select street</option>
                            {getStreetsFor(toRegion, toDistrict, toWard).map((street) => (
                              <option key={street} value={street}>{street}</option>
                            ))}
                          </select>
                          <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Accommodation, headcount and private-room controls moved to Step 2 */}
                </div>
              )}

              {currentStep === 2 && (
                <div>
                  <div className="mb-3 flex items-center justify-between gap-3 text-xs">
                    <div className="text-slate-500">
                      {draftNotice ? (
                        <span className="text-emerald-700">{draftNotice}</span>
                      ) : (
                        <span>Saved automatically (Steps 1–2)</span>
                      )}
                    </div>
                    {hasSavedDraft ? (
                      <button
                        type="button"
                        onClick={clearSavedDraft}
                        aria-label="Clear saved draft"
                        title="Clear saved draft"
                        className="inline-flex items-center justify-center h-8 w-8 rounded-md border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    ) : null}
                  </div>
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
                        <select
                          id="accommodation-type"
                          value={accommodationType}
                          onChange={(e) => {
                            const next = e.target.value;
                            setAccommodationType(next);
                            if (next !== 'hotel') setMinHotelStarLabel('');
                          }}
                          className="groupstays-select mt-1 w-full rounded px-2 py-1 border appearance-none pr-9"
                        >
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

                    {accommodationType === 'hotel' ? (
                      <div className="mt-3">
                        <label htmlFor="hotel-rating" className="block text-xs text-slate-600 mb-1">Hotel rating</label>
                        <div className="relative">
                          <select
                            id="hotel-rating"
                            value={minHotelStarLabel}
                            onChange={(e) => setMinHotelStarLabel(e.target.value)}
                            className="groupstays-select mt-1 w-full rounded px-2 py-1 border appearance-none pr-9"
                          >
                            {HOTEL_STAR_OPTIONS.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                          <ChevronDown className="groupstays-chevron pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden />
                        </div>
                        <p className="mt-2 text-xs text-slate-500">Required when you select Hotel.</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded border p-3 mb-4 groupstays-section border-slate-100">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-1.5 h-6 bg-emerald-500 rounded-sm" aria-hidden />
                      <div>
                        <div className="text-sm font-medium">Headcount</div>
                        <div className="text-xs text-slate-500">Number of people in your group (separated by gender)</div>
                      </div>
                    </div>
                    {/* Gender-based headcount breakdown */}
                    <div className="mt-3 space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label htmlFor="male-count" className="block text-xs text-slate-600 mb-1">Male</label>
                          <input 
                            id="male-count" 
                            name="maleCount" 
                            value={maleCount} 
                            onChange={(e) => setMaleCount(Math.max(0, Number(e.target.value || 0)))} 
                            type="number" 
                            min={0} 
                            aria-label="Number of males" 
                            placeholder="0" 
                            className="w-full rounded px-2 py-1 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" 
                          />
                        </div>
                        <div>
                          <label htmlFor="female-count" className="block text-xs text-slate-600 mb-1">Female</label>
                          <input 
                            id="female-count" 
                            name="femaleCount" 
                            value={femaleCount} 
                            onChange={(e) => setFemaleCount(Math.max(0, Number(e.target.value || 0)))} 
                            type="number" 
                            min={0} 
                            aria-label="Number of females" 
                            placeholder="0" 
                            className="w-full rounded px-2 py-1 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" 
                          />
                        </div>
                        <div>
                          <label htmlFor="other-count" className="block text-xs text-slate-600 mb-1">Other</label>
                          <input 
                            id="other-count" 
                            name="otherCount" 
                            value={otherCount} 
                            onChange={(e) => setOtherCount(Math.max(0, Number(e.target.value || 0)))} 
                            type="number" 
                            min={0} 
                            aria-label="Number of other" 
                            placeholder="0" 
                            className="w-full rounded px-2 py-1 border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200" 
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                        <span className="text-xs font-medium text-slate-700">Total Headcount:</span>
                        <span className="text-sm font-bold text-emerald-600">{calculatedHeadcount} {calculatedHeadcount === 1 ? 'person' : 'people'}</span>
                      </div>
                    </div>
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
                      {!useDates ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setUseDates(true);
                            }}
                            className="px-3 py-2 rounded border bg-white text-sm"
                          >
                            Add dates
                          </button>
                          <span className="text-sm text-slate-500">Dates: Not specified</span>
                        </div>
                      ) : (
                        <div className="w-full max-w-md mx-auto">
                          <div className="grid grid-cols-2 gap-2">
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setCheckInPickerOpen(true)}
                                className="w-full text-left rounded px-3 py-2 border bg-white text-sm"
                              >
                                <div className="text-xs text-slate-500">Check-in</div>
                                <div className="font-medium text-slate-700">
                                  {checkInIso ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(checkInIso)) : 'Select'}
                                </div>
                              </button>

                              {checkInPickerOpen && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setCheckInPickerOpen(false)} />
                                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                    <DatePicker
                                      selected={checkInIso || undefined}
                                      onSelectAction={(s) => {
                                        const date = Array.isArray(s) ? s[0] : s;
                                        if (date) {
                                          setCheckInIso(date);
                                          if (checkOutIso && new Date(checkOutIso) <= new Date(date)) setCheckOutIso('');
                                        }
                                        setCheckInPickerOpen(false);
                                      }}
                                      onCloseAction={() => setCheckInPickerOpen(false)}
                                      allowRange={false}
                                    />
                                  </div>
                                </>
                              )}
                            </div>

                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setCheckOutPickerOpen(true)}
                                disabled={!checkInIso}
                                className="w-full text-left rounded px-3 py-2 border bg-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <div className="text-xs text-slate-500">Check-out</div>
                                <div className="font-medium text-slate-700">
                                  {checkOutIso ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(checkOutIso)) : 'Select'}
                                </div>
                              </button>

                              {checkOutPickerOpen && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setCheckOutPickerOpen(false)} />
                                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                    <DatePicker
                                      selected={checkOutIso || undefined}
                                      onSelectAction={(s) => {
                                        const date = Array.isArray(s) ? s[0] : s;
                                        if (date) setCheckOutIso(date);
                                        setCheckOutPickerOpen(false);
                                      }}
                                      onCloseAction={() => setCheckOutPickerOpen(false)}
                                      allowRange={false}
                                      minDate={checkInIso ? addDaysIso(checkInIso, 1) : undefined}
                                    />
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="mt-2 flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setUseDates(false);
                                setCheckInIso('');
                                setCheckOutIso('');
                                setCheckInPickerOpen(false);
                                setCheckOutPickerOpen(false);
                              }}
                              className="px-3 py-2 text-sm rounded border bg-slate-50 text-slate-600"
                            >
                              Remove dates
                            </button>
                          </div>
                        </div>
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
                  <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Roster</div>
                        <h4 className="mt-1 text-base sm:text-lg font-semibold text-slate-900">Passenger roster (CSV / Excel)</h4>
                        <p className="mt-1 text-sm text-slate-600">
                          To help us plan rooms and logistics, you can upload a passenger list. The easiest way is to download the template, fill it in Excel/Google Sheets, then upload the saved CSV.
                        </p>
                        <p className="mt-2 text-xs text-slate-500">Optional: If you don’t have the roster yet, you can continue without it.</p>
                      </div>
                      <div className="hidden sm:flex items-center justify-center h-10 w-10 rounded-lg bg-slate-50 border border-slate-200">
                        <Users className="w-5 h-5 text-slate-600" aria-hidden />
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-sm font-semibold text-slate-700">1</div>
                          <div className="text-sm font-semibold text-slate-900">Download template</div>
                        </div>
                        <div className="mt-2 text-xs text-slate-600">Get the correct columns and formatting.</div>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-sm font-semibold text-slate-700">2</div>
                          <div className="text-sm font-semibold text-slate-900">Fill in Excel</div>
                        </div>
                        <div className="mt-2 text-xs text-slate-600">One passenger per row. Don’t change column names.</div>
                      </div>
                      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-white border border-slate-200 flex items-center justify-center text-sm font-semibold text-slate-700">3</div>
                          <div className="text-sm font-semibold text-slate-900">Upload CSV</div>
                        </div>
                        <div className="mt-2 text-xs text-slate-600">Export/Save as CSV, then upload here.</div>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="rounded-lg border border-slate-200 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">Template</div>
                            <div className="text-xs text-slate-600">CSV template (opens in Excel)</div>
                          </div>
                          <button
                            type="button"
                            onClick={downloadTemplate}
                            aria-label="Download roster template"
                            className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold inline-flex items-center gap-2 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                          >
                            <Download className="w-4 h-4" aria-hidden />
                            Download
                          </button>
                        </div>

                        <div className="mt-3">
                          <div className="text-xs text-slate-500">Expected columns</div>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {templateColumns.map((c) => (
                              <span key={c} className="px-2 py-1 rounded-full text-xs bg-slate-50 border border-slate-200 text-slate-700">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-900">Upload roster</div>
                            <div className="text-xs text-slate-600">Upload a saved CSV file</div>
                          </div>
                        </div>

                        <div className="mt-3">
                          <label
                            htmlFor="roster-file"
                            className="w-full cursor-pointer rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-700 flex items-center justify-between gap-3 hover:bg-slate-100"
                          >
                            <span className="truncate">{rosterFileName ? rosterFileName : 'Choose CSV file to upload'}</span>
                            <span className="text-xs font-semibold text-slate-600">Browse</span>
                          </label>
                          <input
                            id="roster-file"
                            type="file"
                            accept=".csv,text/csv"
                            aria-label="Upload roster CSV"
                            onChange={(e) => handleRosterFile(e.target.files ? e.target.files[0] : undefined)}
                            className="sr-only"
                          />
                          <div className="mt-2 text-xs text-slate-500">Tip: In Excel, use “Save As” → “CSV (Comma delimited)”.</div>
                        </div>

                        {rosterError ? <div className="mt-2 text-xs text-rose-600">{rosterError}</div> : null}
                      </div>
                    </div>

                    {roster.length ? (
                      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                            <Check className="w-4 h-4 text-emerald-600" aria-hidden />
                            Imported roster
                          </div>
                          <div className="text-xs text-slate-600">Rows: <strong>{roster.length}</strong> (showing first 5)</div>
                        </div>

                        <div className="mt-3 overflow-x-auto">
                          <table className="min-w-full text-left text-xs">
                            <thead>
                              <tr className="text-slate-600">
                                {templateColumns.map((col, idx) => (
                                  <th key={col + idx} className="pr-4 pb-2 font-semibold whitespace-nowrap">{col}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {roster.slice(0, 5).map((r, i) => (
                                <tr key={i} className="border-t border-slate-200">
                                  {templateColumns.map((col, ci) => {
                                    const key = col.replace(/\s+/g, '').toLowerCase();
                                    return <td key={ci} className="pr-4 py-2 text-slate-700 whitespace-nowrap">{r[key] ?? ''}</td>;
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="mt-3 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => { setRoster([]); setRosterFileName(''); }}
                            className="px-3 py-2 rounded-lg border bg-white text-sm text-slate-700 hover:bg-slate-50"
                          >
                            Clear roster
                          </button>
                        </div>
                      </div>
                    ) : null}
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
                        {accommodationType === 'hotel' ? (
                          <div className="flex justify-between items-center py-1 bg-slate-50 px-2 rounded">
                            <span className="text-xs text-slate-500">Hotel rating</span>
                            <span className="text-sm font-medium text-slate-900">{minHotelStarLabel || '—'}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Origin */}
                    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                      <h5 className="text-sm font-semibold text-blue-700 uppercase mb-3 pb-2 border-b border-blue-100">Origin</h5>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-1">
                          <span className="text-xs text-slate-500">Country</span>
                          <span className="text-sm font-medium text-slate-900">
                            {fromCountry ? COUNTRIES.find(c => c.value === fromCountry)?.label || fromCountry : '—'}
                          </span>
                        </div>
                        {isTanzaniaSelected && (
                          <>
                            <div className="flex justify-between items-center py-1 bg-slate-50 px-2 rounded">
                              <span className="text-xs text-slate-500">Region</span>
                              <span className="text-sm font-medium text-slate-900">{fromRegion ? getRegionName(fromRegion) : '—'}</span>
                            </div>
                            <div className="flex justify-between items-center py-1">
                              <span className="text-xs text-slate-500">District</span>
                              <span className="text-sm font-medium text-slate-900">{fromDistrict || '—'}</span>
                            </div>
                            <div className="flex justify-between items-center py-1 bg-slate-50 px-2 rounded">
                              <span className="text-xs text-slate-500">Ward</span>
                              <span className="text-sm font-medium text-slate-900">{fromWard || '—'}</span>
                            </div>
                            <div className="flex justify-between items-center py-1">
                              <span className="text-xs text-slate-500">Location</span>
                              <span className="text-sm font-medium text-slate-900">{fromLocation || '—'}</span>
                            </div>
                          </>
                        )}
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
                          <span className="text-sm font-medium text-slate-900">{checkInIso ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(checkInIso)) : '—'}</span>
                        </div>
                        <div className="flex justify-between items-center py-1 bg-slate-50 px-2 rounded">
                          <span className="text-xs text-slate-500">Check-out</span>
                          <span className="text-sm font-medium text-slate-900">{checkOutIso ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(checkOutIso)) : '—'}</span>
                        </div>
                        {checkInIso && checkOutIso && (
                          <div className="flex justify-between items-center py-1">
                            <span className="text-xs text-slate-500">Duration</span>
                            <span className="text-sm font-medium text-slate-900">{Math.max(0, Math.round((new Date(checkOutIso).getTime() - new Date(checkInIso).getTime()) / 86400000))} night{Math.max(0, Math.round((new Date(checkOutIso).getTime() - new Date(checkInIso).getTime()) / 86400000)) !== 1 ? 's' : ''}</span>
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
                                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:shadow focus:outline-none focus:ring-2 focus:ring-emerald-200"
                                >
                                  <span>
                                    Show {roster.length - 3} more passenger{roster.length - 3 !== 1 ? 's' : ''}
                                  </span>
                                  <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden />
                                </button>
                              )}
                              {showAllPassengers && roster.length > 3 && (
                                <button
                                  type="button"
                                  onClick={() => setShowAllPassengers(false)}
                                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:shadow focus:outline-none focus:ring-2 focus:ring-emerald-200"
                                >
                                  <span>Show less</span>
                                  <ChevronDown className="h-4 w-4 rotate-180 text-slate-500" aria-hidden />
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
          </div>

          
          <div className="mt-4 flex items-center justify-end gap-2">
            {currentStep > 1 ? (
              <button type="button" onClick={() => setCurrentStep((s) => s - 1)} className="px-3 py-2 bg-white border rounded-lg shadow-sm transition transform hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-emerald-200 inline-flex items-center gap-2">
                <ChevronLeft className="w-4 h-4 text-slate-700" aria-hidden />
                <span className="text-sm text-slate-700">Back</span>
              </button>
            ) : null}

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={() => {
                  const ok = validateUpToStep(currentStep);
                  if (!ok) return;
                  setErrors([]);
                  setCurrentStep((s) => s + 1);
                }}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg shadow transition transform hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-emerald-300 inline-flex items-center gap-2"
              >
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

          <style jsx>{`
            .stepContentTransition {
              animation: stepContentIn 180ms ease-out;
              will-change: transform, opacity;
            }
            @keyframes stepContentIn {
              from {
                opacity: 0;
                transform: translateY(6px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
            @media (prefers-reduced-motion: reduce) {
              .stepContentTransition {
                animation: none;
              }
            }
          `}</style>
        </article>
      </div>
    </section>
  );
}
