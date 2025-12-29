"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Search, 
  MapPin, 
  Briefcase, 
  Clock, 
  DollarSign, 
  ChevronRight, 
  X, 
  Upload, 
  FileText,
  CheckCircle2,
  Building2,
  Users,
  Heart,
  TrendingUp,
  Globe,
  Filter,
  Calendar,
  RefreshCw,
  GraduationCap,
  Languages,
  XCircle
} from "lucide-react";
import PublicHeader from "@/components/PublicHeader";
import PublicFooter from "@/components/PublicFooter";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import LayoutFrame from "@/components/LayoutFrame";
import { usePathname } from "next/navigation";

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

type JobType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP" | "FREELANCE";
type JobCategory = "ENGINEERING" | "DESIGN" | "MARKETING" | "SALES" | "OPERATIONS" | "SUPPORT" | "MANAGEMENT" | "OTHER";
type JobLocation = "REMOTE" | "ONSITE" | "HYBRID";

interface Job {
  id: string;
  title: string;
  department: string;
  category: JobCategory;
  type: JobType;
  location: JobLocation;
  locationDetail?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: "MONTHLY" | "YEARLY";
  };
  description: string;
  requirements: string[];
  responsibilities: string[];
  benefits: string[];
  postedDate: string;
  applicationDeadline?: string;
  experienceLevel: "ENTRY" | "MID" | "SENIOR" | "LEAD";
  featured?: boolean;
}

// Jobs will be fetched from API - sample data removed

function JobCard({ job, onClick }: { job: Job; onClick: () => void }) {
  const formatSalary = (salary?: Job["salary"]) => {
    if (!salary || (!salary.min && !salary.max)) return "Competitive";
    const currency = salary.currency || "TZS";
    const period = salary.period === "YEARLY" ? "year" : "month";
    if (salary.min && salary.max) {
      return `${(salary.min / 1000).toFixed(0)}K - ${(salary.max / 1000).toFixed(0)}K ${currency}/${period}`;
    }
    return `${((salary.min || salary.max || 0) / 1000).toFixed(0)}K ${currency}/${period}`;
  };

  const getTypeColor = (type: JobType) => {
    switch (type) {
      case "FULL_TIME": return "bg-green-100 text-green-800";
      case "PART_TIME": return "bg-blue-100 text-blue-800";
      case "CONTRACT": return "bg-purple-100 text-purple-800";
      case "INTERNSHIP": return "bg-yellow-100 text-yellow-800";
      case "FREELANCE": return "bg-orange-100 text-orange-800";
    }
  };

  const getLocationIcon = (location: JobLocation) => {
    switch (location) {
      case "REMOTE": return <Globe size={14} className="flex-shrink-0 text-blue-600" />;
      case "ONSITE": return <Building2 size={14} className="flex-shrink-0 text-gray-700" />;
      case "HYBRID": return <RefreshCw size={14} className="flex-shrink-0 text-purple-600" />;
    }
  };

  return (
    <div
      onClick={onClick}
      className={`group bg-white rounded-xl shadow-sm border cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
        job.featured 
          ? "border-[#02665e]/30 shadow-md ring-1 ring-[#02665e]/10" 
          : "border-gray-200/60 hover:border-[#02665e]/30"
      }`}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 mb-2 flex-wrap">
              {job.featured && (
                <span className="px-2.5 py-1 text-xs font-semibold bg-gradient-to-r from-[#02665e] to-[#038a7c] text-white rounded-md shadow-sm">
                  Featured
                </span>
              )}
              <h3 className="text-xl font-bold text-gray-900 group-hover:text-[#02665e] transition-colors">
                {job.title}
              </h3>
            </div>
            <p className="text-sm font-medium text-gray-500 mb-4">{job.department}</p>
          </div>
          <ChevronRight className="text-gray-300 group-hover:text-[#02665e] flex-shrink-0 transition-colors mt-1" size={20} />
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${getTypeColor(job.type)} shadow-sm`}>
            {job.type.replace("_", " ")}
          </span>
          <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-700 flex items-center gap-1.5 border border-gray-200/50">
            {getLocationIcon(job.location)} 
            <span className="capitalize">{job.location.toLowerCase()}</span>
          </span>
          {job.locationDetail && (
            <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-700 flex items-center gap-1.5 border border-gray-200/50">
              <MapPin size={14} className="text-gray-500" /> 
              {job.locationDetail}
            </span>
          )}
          <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200/50">
            {job.experienceLevel}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-5 line-clamp-2 leading-relaxed">{job.description}</p>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex flex-col gap-2 text-xs flex-1">
            <div className="flex items-center gap-4 text-gray-500">
              <span className="flex items-center gap-1.5">
                <DollarSign size={14} className="text-gray-400" />
                <span className="font-medium text-gray-700">{formatSalary(job.salary)}</span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-gray-500">
              <span className="flex items-center gap-1.5">
                <Calendar size={14} className="text-gray-400" />
                <span>Posted: <span className="font-medium text-gray-700">{new Date(job.postedDate).toLocaleDateString()}</span></span>
              </span>
              {job.applicationDeadline && (() => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const expiryDate = new Date(job.applicationDeadline);
                expiryDate.setHours(0, 0, 0, 0);
                const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const isExpiringSoon = daysUntilExpiry <= 7 && daysUntilExpiry >= 0;
                
                return (
                  <span className={`flex items-center gap-1.5 ${isExpiringSoon ? 'text-amber-600' : 'text-gray-500'}`}>
                    <Clock size={14} className={isExpiringSoon ? 'text-amber-500' : 'text-gray-400'} />
                    <span>
                      {isExpiringSoon ? (
                        <>
                          Expires: <span className="font-semibold text-amber-600">{new Date(job.applicationDeadline).toLocaleDateString()}</span>
                          <span className="ml-1 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">
                            {daysUntilExpiry === 0 ? 'Today' : daysUntilExpiry === 1 ? '1 day left' : `${daysUntilExpiry} days left`}
                          </span>
                        </>
                      ) : (
                        <>
                          Expires: <span className="font-medium text-gray-700">{new Date(job.applicationDeadline).toLocaleDateString()}</span>
                        </>
                      )}
                    </span>
                  </span>
                );
              })()}
            </div>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className="px-4 py-2 bg-[#02665e]/5 hover:bg-[#02665e]/10 text-[#02665e] font-semibold rounded-lg flex items-center gap-2 transition-all duration-200 group/btn border border-[#02665e]/20 hover:border-[#02665e]/40"
          >
            <span>View Details</span>
            <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ApplicationForm({ job, onClose, onSuccess }: { job: Job; onClose: () => void; onSuccess?: () => void }) {
  // Check if this is a Travel Agent position (by title containing "agent" or "travel")
  const isTravelAgentPosition = job.title.toLowerCase().includes("agent") || job.title.toLowerCase().includes("travel");
  
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    coverLetter: "",
    resume: null as File | null,
    portfolio: "",
    linkedIn: "",
    referredBy: "",
    // Agent-specific fields
    educationLevel: "",
    yearsOfExperience: "",
    bio: "",
    areasOfOperation: [] as string[],
    languages: [] as string[],
    specializations: [] as string[],
    certifications: [] as Array<{ name: string; issuer: string; year: string; expiryDate?: string }>,
  });
  
  // Temporary input states for agent arrays
  const [areaInput, setAreaInput] = useState("");
  const [languageInput, setLanguageInput] = useState("");
  const [specializationInput, setSpecializationInput] = useState("");
  const [certInput, setCertInput] = useState({ name: "", issuer: "", year: "", expiryDate: "" });
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Agent-specific handlers
  const handleAddArea = () => {
    if (areaInput.trim() && !formData.areasOfOperation.includes(areaInput.trim())) {
      setFormData({
        ...formData,
        areasOfOperation: [...formData.areasOfOperation, areaInput.trim()],
      });
      setAreaInput("");
    }
  };

  const handleRemoveArea = (area: string) => {
    setFormData({
      ...formData,
      areasOfOperation: formData.areasOfOperation.filter((a) => a !== area),
    });
  };

  const handleAddLanguage = () => {
    if (languageInput.trim() && !formData.languages.includes(languageInput.trim())) {
      setFormData({
        ...formData,
        languages: [...formData.languages, languageInput.trim()],
      });
      setLanguageInput("");
    }
  };

  const handleRemoveLanguage = (lang: string) => {
    setFormData({
      ...formData,
      languages: formData.languages.filter((l) => l !== lang),
    });
  };

  const handleAddSpecialization = () => {
    if (specializationInput.trim() && !formData.specializations.includes(specializationInput.trim())) {
      setFormData({
        ...formData,
        specializations: [...formData.specializations, specializationInput.trim()],
      });
      setSpecializationInput("");
    }
  };

  const handleRemoveSpecialization = (spec: string) => {
    setFormData({
      ...formData,
      specializations: formData.specializations.filter((s) => s !== spec),
    });
  };

  const handleAddCertification = () => {
    if (certInput.name.trim() && certInput.issuer.trim() && certInput.year.trim()) {
      setFormData({
        ...formData,
        certifications: [
          ...formData.certifications,
          {
            name: certInput.name.trim(),
            issuer: certInput.issuer.trim(),
            year: certInput.year.trim(),
            expiryDate: certInput.expiryDate.trim() || undefined,
          },
        ],
      });
      setCertInput({ name: "", issuer: "", year: "", expiryDate: "" });
    }
  };

  const handleRemoveCertification = (index: number) => {
    setFormData({
      ...formData,
      certifications: formData.certifications.filter((_, i) => i !== index),
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError("File size must be less than 5MB");
        return;
      }
      if (!file.type.includes("pdf") && !file.type.includes("doc") && !file.type.includes("docx")) {
        setError("Please upload a PDF or Word document");
        return;
      }
      setFormData({ ...formData, resume: file });
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.fullName || !formData.email || !formData.phone || !formData.coverLetter || !formData.linkedIn) {
      setError("Please fill in all required fields");
      return;
    }

    setSubmitting(true);
    try {
      const base = (process.env.NEXT_PUBLIC_API_URL as string) ?? '';
      const url = base ? base.replace(/\/$/, '') + '/api/careers/apply' : '/api/careers/apply';
      
      const formDataToSend = new FormData();
      formDataToSend.append('jobId', job.id);
      formDataToSend.append('fullName', formData.fullName);
      formDataToSend.append('email', formData.email);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('coverLetter', formData.coverLetter);
      if (formData.resume) {
        formDataToSend.append('resume', formData.resume);
      }
      if (formData.portfolio) formDataToSend.append('portfolio', formData.portfolio);
      if (formData.linkedIn) formDataToSend.append('linkedIn', formData.linkedIn);
      if (formData.referredBy) formDataToSend.append('referredBy', formData.referredBy);

      // Add agent-specific data if this is a Travel Agent position
      if (isTravelAgentPosition) {
        const agentApplicationData = {
          educationLevel: formData.educationLevel || null,
          yearsOfExperience: formData.yearsOfExperience ? parseInt(formData.yearsOfExperience) : null,
          bio: formData.bio || null,
          areasOfOperation: formData.areasOfOperation.length > 0 ? formData.areasOfOperation : null,
          languages: formData.languages.length > 0 ? formData.languages : null,
          specializations: formData.specializations.length > 0 ? formData.specializations : null,
          certifications: formData.certifications.length > 0 ? formData.certifications : null,
        };
        formDataToSend.append('agentApplicationData', JSON.stringify(agentApplicationData));
      }

      const response = await fetch(url, {
        method: 'POST',
        body: formDataToSend,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Application submission failed', err);
      setError(err?.message || 'Failed to submit application. Please try again or email careers@nolsaf.com directly.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 text-center">
          <CheckCircle2 className="mx-auto mb-4 text-green-500" size={64} />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h3>
          <p className="text-gray-600 mb-6">
            Thank you for applying to {job.title}. We'll review your application and get back to you soon.
          </p>
          <button
            onClick={onClose}
            className="w-full bg-[#02665e] text-white py-3 rounded-lg font-semibold hover:bg-[#024d47] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto overflow-x-hidden">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between gap-4">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 break-words flex-1">Apply for {job.title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 overflow-x-hidden">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full box-border">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-transparent box-border"
                placeholder="John Doe"
              />
            </div>

            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-transparent box-border"
                placeholder="john@example.com"
              />
            </div>

            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-transparent box-border"
                placeholder="+255 123 456 789"
              />
            </div>

            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LinkedIn Profile <span className="text-red-500">*</span>
              </label>
              <input
                type="url"
                required
                value={formData.linkedIn}
                onChange={(e) => setFormData({ ...formData, linkedIn: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-transparent box-border"
                placeholder="https://linkedin.com/in/yourprofile"
              />
            </div>
          </div>

          <div className="w-full box-border">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resume/CV <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg bg-gray-50/50 hover:bg-gray-50 hover:border-[#02665e] transition-all duration-200 w-full box-border">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />
              {formData.resume ? (
                <div className="flex items-center justify-center gap-3 p-4 sm:p-5">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#02665e]/10">
                    <FileText className="text-[#02665e]" size={20} />
                  </div>
                  <span className="text-gray-700 font-medium text-sm sm:text-base flex-1 text-center truncate">{formData.resume.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData({ ...formData, resume: null });
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1.5 rounded-full hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
                    aria-label="Remove file"
                  >
                    <X size={18} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center gap-3 p-6 sm:p-8 w-full text-gray-600 hover:text-[#02665e] transition-colors"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-white border-2 border-gray-300 hover:border-[#02665e] transition-colors">
                    <Upload size={20} className="text-gray-500" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm sm:text-base font-medium">Click to upload or drag and drop</p>
                    <p className="text-xs sm:text-sm text-gray-500">PDF, DOC, DOCX (Max 5MB)</p>
                  </div>
                </button>
              )}
            </div>
          </div>

          <div className="w-full box-border">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cover Letter <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={formData.coverLetter}
              onChange={(e) => setFormData({ ...formData, coverLetter: e.target.value })}
              rows={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-transparent box-border resize-none"
              placeholder="Tell us why you're interested in this position and what makes you a great fit..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full box-border">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Portfolio/Website (Optional)
              </label>
              <input
                type="url"
                value={formData.portfolio}
                onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-transparent box-border"
                placeholder="https://yourportfolio.com"
              />
            </div>

            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Referred By (Optional)
              </label>
              <input
                type="text"
                value={formData.referredBy}
                onChange={(e) => setFormData({ ...formData, referredBy: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-transparent box-border"
                placeholder="Name of employee who referred you"
              />
            </div>
          </div>

          {/* Agent-Specific Fields */}
          {isTravelAgentPosition && (
            <div className="space-y-6 pt-6 border-t border-gray-200">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800 font-medium">
                  This is a Travel Agent position. Please provide additional information below.
                </p>
              </div>

              {/* Education & Experience */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-[#02665e]" />
                  Education & Experience
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Education Level
                    </label>
                    <select
                      value={formData.educationLevel}
                      onChange={(e) => setFormData({ ...formData, educationLevel: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-transparent box-border"
                    >
                      <option value="">Select education level...</option>
                      <option value="HIGH_SCHOOL">High School</option>
                      <option value="DIPLOMA">Diploma</option>
                      <option value="BACHELORS">Bachelors</option>
                      <option value="MASTERS">Masters</option>
                      <option value="PHD">PhD</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Years of Experience
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={formData.yearsOfExperience}
                      onChange={(e) => setFormData({ ...formData, yearsOfExperience: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-transparent box-border"
                      placeholder="e.g., 5"
                    />
                  </div>
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Bio/About You
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-transparent box-border resize-none"
                    placeholder="Tell us about your background and experience in travel..."
                  />
                </div>
              </div>

              {/* Skills & Expertise */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Skills & Expertise</h3>
                
                {/* Areas of Operation */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#02665e]" />
                    Areas of Operation
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={areaInput}
                      onChange={(e) => setAreaInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddArea();
                        }
                      }}
                      placeholder="Enter area (e.g., Dar es Salaam)"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-transparent box-border"
                    />
                    <button
                      type="button"
                      onClick={handleAddArea}
                      className="px-4 py-2 bg-[#02665e] text-white rounded-lg text-sm font-medium hover:bg-[#014d47] transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {formData.areasOfOperation.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.areasOfOperation.map((area, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm"
                        >
                          {area}
                          <button
                            type="button"
                            onClick={() => handleRemoveArea(area)}
                            className="hover:text-blue-900"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Languages */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Languages className="h-4 w-4 text-[#02665e]" />
                    Languages
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={languageInput}
                      onChange={(e) => setLanguageInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddLanguage();
                        }
                      }}
                      placeholder="Enter language (e.g., English)"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-transparent box-border"
                    />
                    <button
                      type="button"
                      onClick={handleAddLanguage}
                      className="px-4 py-2 bg-[#02665e] text-white rounded-lg text-sm font-medium hover:bg-[#014d47] transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {formData.languages.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.languages.map((lang, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-sm"
                        >
                          {lang}
                          <button
                            type="button"
                            onClick={() => handleRemoveLanguage(lang)}
                            className="hover:text-purple-900"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Specializations */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-[#02665e]" />
                    Specializations
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={specializationInput}
                      onChange={(e) => setSpecializationInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSpecialization();
                        }
                      }}
                      placeholder="Enter specialization (e.g., Safari Tours)"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-transparent box-border"
                    />
                    <button
                      type="button"
                      onClick={handleAddSpecialization}
                      className="px-4 py-2 bg-[#02665e] text-white rounded-lg text-sm font-medium hover:bg-[#014d47] transition-colors"
                    >
                      Add
                    </button>
                  </div>
                  {formData.specializations.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.specializations.map((spec, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-lg text-sm"
                        >
                          {spec}
                          <button
                            type="button"
                            onClick={() => handleRemoveSpecialization(spec)}
                            className="hover:text-green-900"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Certifications */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Certifications</h3>
                <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="min-w-0">
                      <input
                        type="text"
                        value={certInput.name}
                        onChange={(e) => setCertInput({ ...certInput, name: e.target.value })}
                        placeholder="Certification name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-transparent box-border text-sm"
                      />
                    </div>
                    <div className="min-w-0">
                      <input
                        type="text"
                        value={certInput.issuer}
                        onChange={(e) => setCertInput({ ...certInput, issuer: e.target.value })}
                        placeholder="Issuer"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-transparent box-border text-sm"
                      />
                    </div>
                    <div className="min-w-0">
                      <input
                        type="text"
                        value={certInput.year}
                        onChange={(e) => setCertInput({ ...certInput, year: e.target.value })}
                        placeholder="Year"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-transparent box-border text-sm"
                      />
                    </div>
                    <div className="min-w-0">
                      <input
                        type="text"
                        value={certInput.expiryDate}
                        onChange={(e) => setCertInput({ ...certInput, expiryDate: e.target.value })}
                        placeholder="Expiry date (optional)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-transparent box-border text-sm"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCertification}
                    className="px-4 py-2 bg-[#02665e] text-white rounded-lg text-sm font-medium hover:bg-[#014d47] transition-colors"
                  >
                    Add Certification
                  </button>
                </div>
                {formData.certifications.length > 0 && (
                  <div className="space-y-2">
                    {formData.certifications.map((cert, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg"
                      >
                        <div>
                          <div className="font-medium text-amber-900">{cert.name}</div>
                          <div className="text-sm text-amber-700">
                            {cert.issuer} • {cert.year}
                            {cert.expiryDate && ` • Expires: ${cert.expiryDate}`}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveCertification(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <XCircle className="h-5 w-5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 pt-4 w-full box-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 sm:px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors min-w-0"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 sm:px-6 py-3 bg-[#02665e] text-white rounded-lg font-semibold hover:bg-[#024d47] transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-0"
            >
              {submitting ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function JobDetailModal({ job, onClose, onApply }: { job: Job; onClose: () => void; onApply: () => void }) {
  const formatSalary = (salary?: Job["salary"]) => {
    if (!salary || (!salary.min && !salary.max)) return "Competitive";
    const currency = salary.currency || "TZS";
    const period = salary.period === "YEARLY" ? "year" : "month";
    if (salary.min && salary.max) {
      return `${(salary.min / 1000).toFixed(0)}K - ${(salary.max / 1000).toFixed(0)}K ${currency}/${period}`;
    }
    return `${((salary.min || salary.max || 0) / 1000).toFixed(0)}K ${currency}/${period}`;
  };

  const getTypeColor = (type: JobType) => {
    switch (type) {
      case "FULL_TIME": return "bg-green-50 text-green-700 border-green-200";
      case "PART_TIME": return "bg-blue-50 text-blue-700 border-blue-200";
      case "CONTRACT": return "bg-purple-50 text-purple-700 border-purple-200";
      case "INTERNSHIP": return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "FREELANCE": return "bg-orange-50 text-orange-700 border-orange-200";
    }
  };

  const getLocationIcon = (location: JobLocation) => {
    switch (location) {
      case "REMOTE": return <Globe size={16} className="flex-shrink-0 text-blue-600" />;
      case "ONSITE": return <Building2 size={16} className="flex-shrink-0 text-gray-700" />;
      case "HYBRID": return <RefreshCw size={16} className="flex-shrink-0 text-purple-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-200/60 p-6 sm:p-8 flex items-start justify-between z-10">
          <div className="flex-1 min-w-0 pr-4">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 leading-tight">{job.title}</h2>
            <p className="text-base text-gray-500 font-medium">{job.department}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            aria-label="Close"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 sm:p-8 space-y-8">
          {/* Badges Section */}
          <div className="flex flex-wrap gap-3">
            <span className={`px-4 py-2.5 rounded-lg text-sm font-semibold border ${getTypeColor(job.type)} shadow-sm`}>
              {job.type.replace("_", " ")}
            </span>
            <span className="px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-50 text-gray-700 border border-gray-200 flex items-center gap-2 shadow-sm">
              {getLocationIcon(job.location)}
              <span className="capitalize">{job.location.toLowerCase()}</span>
              {job.locationDetail && (
                <>
                  <span className="text-gray-400">•</span>
                  <span>{job.locationDetail}</span>
                </>
              )}
            </span>
            <span className="px-4 py-2.5 rounded-lg text-sm font-medium bg-purple-50 text-purple-700 border border-purple-200 shadow-sm">
              {job.experienceLevel} Level
            </span>
            {job.salary && (
              <span className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-2 shadow-sm">
                <DollarSign size={16} className="text-amber-600" />
                {formatSalary(job.salary)}
              </span>
            )}
          </div>

          {/* Job Description */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Briefcase size={20} className="text-[#02665e]" />
              Job Description
            </h3>
            <p className="text-gray-700 leading-relaxed text-base">{job.description}</p>
          </div>

          {/* Key Responsibilities */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Key Responsibilities</h3>
            <ul className="space-y-3">
              {job.responsibilities.map((resp, idx) => (
                <li key={idx} className="flex items-start gap-3 text-gray-700 group">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-6 h-6 rounded-full bg-[#02665e]/10 flex items-center justify-center group-hover:bg-[#02665e]/20 transition-colors">
                      <ChevronRight className="text-[#02665e]" size={14} />
                    </div>
                  </div>
                  <span className="flex-1 pt-0.5">{resp}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Requirements */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-4">Requirements</h3>
            <ul className="space-y-3">
              {job.requirements.map((req, idx) => (
                <li key={idx} className="flex items-start gap-3 text-gray-700 group">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-6 h-6 rounded-full bg-[#02665e]/10 flex items-center justify-center group-hover:bg-[#02665e]/20 transition-colors">
                      <ChevronRight className="text-[#02665e]" size={14} />
                    </div>
                  </div>
                  <span className="flex-1 pt-0.5">{req}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Benefits & Perks */}
          {job.benefits.length > 0 && (
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">Benefits & Perks</h3>
              <ul className="space-y-3">
                {job.benefits.map((benefit, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-gray-700 group">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                        <CheckCircle2 className="text-green-600" size={16} />
                      </div>
                    </div>
                    <span className="flex-1 pt-0.5">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-600 space-y-1">
              <p className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-400" />
                <span>Posted: <span className="font-medium text-gray-700">{new Date(job.postedDate).toLocaleDateString()}</span></span>
              </p>
              {job.applicationDeadline && (
                <p className="flex items-center gap-2">
                  <Clock size={16} className="text-gray-400" />
                  <span>Deadline: <span className="font-medium text-gray-700">{new Date(job.applicationDeadline).toLocaleDateString()}</span></span>
                </p>
              )}
            </div>
            <button
              onClick={onApply}
              className="px-8 py-3 bg-gradient-to-r from-[#02665e] to-[#038a7c] text-white rounded-lg font-semibold hover:from-[#024d47] hover:to-[#02665e] transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 w-full sm:w-auto"
            >
              Apply Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CareersPage() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<"ADMIN" | "OWNER" | "DRIVER" | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPublicContext, setIsPublicContext] = useState<boolean | null>(null);
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  
  // Fetch jobs from API
  useEffect(() => {
    const fetchJobs = async () => {
      setJobsLoading(true);
      try {
        const apiBase = typeof window === 'undefined'
          ? (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000")
          : '';
        const url = `${apiBase.replace(/\/$/, '')}/api/public/careers?page=1&pageSize=100`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          const fetchedJobs: Job[] = (data.jobs || []).map((job: any) => ({
            id: String(job.id),
            title: job.title,
            department: job.department,
            category: job.category as JobCategory,
            type: job.type as JobType,
            location: job.location as JobLocation,
            locationDetail: job.locationDetail || undefined,
            salary: job.salary || undefined,
            description: job.description,
            requirements: Array.isArray(job.requirements) ? job.requirements : [],
            responsibilities: Array.isArray(job.responsibilities) ? job.responsibilities : [],
            benefits: Array.isArray(job.benefits) ? job.benefits : [],
            postedDate: job.postedDate,
            applicationDeadline: job.applicationDeadline || undefined,
            experienceLevel: job.experienceLevel as "ENTRY" | "MID" | "SENIOR" | "LEAD",
            featured: Boolean(job.featured) || false
          }));
          setJobs(fetchedJobs);
        }
      } catch (error) {
        console.error('Error fetching jobs:', error);
        setJobs([]);
      } finally {
        setJobsLoading(false);
      }
    };
    
    fetchJobs();
  }, []);
  
  // Separate active and expired jobs - memoized to prevent infinite loops
  const activeJobs = useMemo(() => {
    return jobs.filter(job => {
      if (!job.applicationDeadline) return true; // Jobs without deadline are considered active
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deadline = new Date(job.applicationDeadline);
      deadline.setHours(0, 0, 0, 0);
      return deadline >= today;
    });
  }, [jobs]);
  
  const expiredJobs = useMemo(() => {
    return jobs.filter(job => {
      if (!job.applicationDeadline) return false; // Jobs without deadline are not expired
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deadline = new Date(job.applicationDeadline);
      deadline.setHours(0, 0, 0, 0);
      return deadline < today;
    });
  }, [jobs]);
  
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<JobCategory | "ALL">("ALL");
  const [selectedType, setSelectedType] = useState<JobType | "ALL">("ALL");
  const [selectedLocation, setSelectedLocation] = useState<JobLocation | "ALL">("ALL");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Context detection logic (same as other public pages)
    let navigationContext: 'public' | 'owner' | 'driver' | 'admin' | null = null;
    if (typeof window !== 'undefined') {
      navigationContext = sessionStorage.getItem('navigationContext') as 'public' | 'owner' | 'driver' | 'admin' | null;
    }

    if (navigationContext) {
      if (navigationContext === 'public') {
        setIsPublicContext(true);
        setUserRole(null);
        setIsLoading(false);
        return;
      } else {
        setIsPublicContext(false);
        setUserRole(navigationContext.toUpperCase() as "ADMIN" | "OWNER" | "DRIVER");
        setIsLoading(false);
        return;
      }
    }

    let isFromPublicRoute = false;
    if (typeof document !== 'undefined') {
      const referrer = document.referrer;
      const origin = window.location.origin;
      isFromPublicRoute = Boolean(referrer && (
        referrer.includes('/public') || 
        referrer === origin || 
        referrer === origin + '/' ||
        (!referrer.includes('/owner') && !referrer.includes('/driver') && !referrer.includes('/admin') && referrer.startsWith(origin))
      ));
    }

    if (isFromPublicRoute) {
      setIsPublicContext(true);
      setUserRole(null);
      setIsLoading(false);
      return;
    }

    const role = getCookie('role') as "ADMIN" | "OWNER" | "DRIVER" | null;
    if (role) {
      setIsPublicContext(false);
      setUserRole(role);
      setIsLoading(false);
      return;
    }
    
    if (pathname?.includes('/driver')) {
      setIsPublicContext(false);
      setUserRole('DRIVER');
    } else if (pathname?.includes('/owner')) {
      setIsPublicContext(false);
      setUserRole('OWNER');
    } else if (pathname?.includes('/admin')) {
      setIsPublicContext(false);
      setUserRole('ADMIN');
    } else {
      setIsPublicContext(true);
      setUserRole(null);
    }
    
    setIsLoading(false);
  }, [pathname]);

  // Filter jobs based on search and filters (only active jobs)
  useEffect(() => {
    if (jobsLoading) {
      setFilteredJobs([]);
      return;
    }
    
    let filtered = activeJobs;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        job =>
          job.title.toLowerCase().includes(query) ||
          job.department.toLowerCase().includes(query) ||
          job.description.toLowerCase().includes(query) ||
          job.locationDetail?.toLowerCase().includes(query)
      );
    }

    if (selectedCategory !== "ALL") {
      filtered = filtered.filter(job => job.category === selectedCategory);
    }

    if (selectedType !== "ALL") {
      filtered = filtered.filter(job => job.type === selectedType);
    }

    if (selectedLocation !== "ALL") {
      filtered = filtered.filter(job => job.location === selectedLocation);
    }

    setFilteredJobs(filtered);
  }, [jobsLoading, searchQuery, selectedCategory, selectedType, selectedLocation, activeJobs]);

  useEffect(() => {
    // Intersection Observer for animations
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (heroRef.current) {
      observer.observe(heroRef.current);
    }

    return () => {
      if (heroRef.current) {
        observer.unobserve(heroRef.current);
      }
    };
  }, []);

  const shouldUsePublicLayout = isPublicContext === true || (isPublicContext === null && userRole === null);
  const isAuthenticated = !shouldUsePublicLayout && userRole !== null;
  const isDriver = userRole === "DRIVER";
  const isOwner = userRole === "OWNER";
  const isAdmin = userRole === "ADMIN";

  const categories: Array<{ value: JobCategory | "ALL"; label: string }> = [
    { value: "ALL", label: "All Categories" },
    { value: "ENGINEERING", label: "Engineering" },
    { value: "DESIGN", label: "Design" },
    { value: "MARKETING", label: "Marketing" },
    { value: "SALES", label: "Sales" },
    { value: "OPERATIONS", label: "Operations" },
    { value: "SUPPORT", label: "Support" },
    { value: "MANAGEMENT", label: "Management" },
    { value: "OTHER", label: "Other" },
  ];

  const jobTypes: Array<{ value: JobType | "ALL"; label: string }> = [
    { value: "ALL", label: "All Types" },
    { value: "FULL_TIME", label: "Full Time" },
    { value: "PART_TIME", label: "Part Time" },
    { value: "CONTRACT", label: "Contract" },
    { value: "INTERNSHIP", label: "Internship" },
    { value: "FREELANCE", label: "Freelance" },
  ];

  const locations: Array<{ value: JobLocation | "ALL"; label: string }> = [
    { value: "ALL", label: "All Locations" },
    { value: "REMOTE", label: "Remote" },
    { value: "HYBRID", label: "Hybrid" },
    { value: "ONSITE", label: "On-site" },
  ];

  if (isLoading || isPublicContext === null) {
    return (
      <>
        <PublicHeader />
        <main className="min-h-screen bg-white text-slate-900">
          <div className="public-container py-10">
            <div className="text-center">Loading...</div>
          </div>
        </main>
        <PublicFooter withRail={false} />
      </>
    );
  }

  return (
    <>
      {shouldUsePublicLayout ? (
        <PublicHeader />
      ) : isAuthenticated ? (
        <SiteHeader 
          role={isDriver ? "DRIVER" : isOwner ? "OWNER" : "ADMIN"} 
          driverMode={isDriver}
        />
      ) : (
        <PublicHeader />
      )}
      
      <main className="min-h-screen bg-white text-slate-900">
        <LayoutFrame heightVariant="sm" topVariant="sm" colorVariant="muted" variant="solid" />
        
        {/* Careers Hero Image */}
        <section className="relative w-full overflow-hidden mb-0 pb-0">
          <div className="public-container">
            <div className="relative w-full h-64 md:h-80 lg:h-96 rounded-lg overflow-hidden">
              <Image
                src="/assets/nolsaf_careers.jpg"
                alt="NoLSAF Careers"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-transparent rounded-lg" />
              <div className="absolute inset-0 flex items-center justify-center">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white text-center px-4 drop-shadow-lg">
                  Why Work at NoLSAF?
                </h2>
              </div>
            </div>
          </div>
        </section>
        
        {/* Company Culture Section - positioned directly after photo */}
        <section className="pt-0 pb-0 bg-gray-50 -mt-[16rem] md:-mt-[20rem] lg:-mt-[24rem]">
          <div className="public-container">
            <div className="max-w-6xl mx-auto">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                {[
                  {
                    icon: <Heart size={32} />,
                    iconColor: "text-red-500",
                    title: "Mission-Driven",
                    description: "We're building something meaningful that connects travelers with quality stays and safe transport across East Africa."
                  },
                  {
                    icon: <Users size={32} />,
                    iconColor: "text-blue-500",
                    title: "Inclusive Culture",
                    description: "We celebrate diversity and create an environment where everyone can thrive and bring their authentic selves to work."
                  },
                  {
                    icon: <TrendingUp size={32} />,
                    iconColor: "text-green-500",
                    title: "Career Growth",
                    description: "We invest in our team's development with training, mentorship, and opportunities to take on new challenges."
                  },
                  {
                    icon: <Globe size={32} />,
                    iconColor: "text-purple-500",
                    title: "Flexible Work",
                    description: "Work from anywhere in East Africa. We offer remote, hybrid, and on-site options to fit your lifestyle."
                  },
                  {
                    icon: <DollarSign size={32} />,
                    iconColor: "text-amber-500",
                    title: "Competitive Benefits",
                    description: "We offer competitive salaries, health insurance, and performance bonuses to reward your contributions."
                  },
                  {
                    icon: <Building2 size={32} />,
                    iconColor: "text-[#02665e]",
                    title: "Innovation",
                    description: "Work with cutting-edge technology and help shape the future of travel in East Africa."
                  }
                ].map((benefit, idx) => (
                  <div
                    key={idx}
                    className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className={`${benefit.iconColor} mb-4`}>{benefit.icon}</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{benefit.title}</h3>
                    <p className="text-gray-600">{benefit.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Job Listings Section */}
        <section className="pt-0 pb-16 bg-white">
          <div className="public-container">
            <div className="max-w-7xl mx-auto">
              <div className="mb-8">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Open Positions</h2>
                <p className="text-gray-600">Find the perfect role for you</p>
              </div>

              {/* Search and Filters */}
              <div className="bg-gray-50 rounded-lg p-6 mb-8">
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Search jobs by title, department, or location..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Filter size={16} className="inline mr-1" />
                      Category
                    </label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value as JobCategory | "ALL")}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-transparent"
                    >
                      {categories.map((cat) => (
                        <option key={cat.value} value={cat.value}>
                          {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Job Type
                    </label>
                    <select
                      value={selectedType}
                      onChange={(e) => setSelectedType(e.target.value as JobType | "ALL")}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-transparent"
                    >
                      {jobTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location
                    </label>
                    <select
                      value={selectedLocation}
                      onChange={(e) => setSelectedLocation(e.target.value as JobLocation | "ALL")}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-transparent"
                    >
                      {locations.map((loc) => (
                        <option key={loc.value} value={loc.value}>
                          {loc.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {(searchQuery || selectedCategory !== "ALL" || selectedType !== "ALL" || selectedLocation !== "ALL") && (
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory("ALL");
                        setSelectedType("ALL");
                        setSelectedLocation("ALL");
                      }}
                      className="text-sm text-[#02665e] hover:underline"
                    >
                      Clear all filters
                    </button>
                    <span className="text-gray-400">•</span>
                    <span className="text-sm text-gray-600">
                      {filteredJobs.length} {filteredJobs.length === 1 ? "job" : "jobs"} found
                    </span>
                  </div>
                )}
              </div>

              {/* Job Cards */}
              {jobsLoading ? (
                <div className="text-center py-16">
                  <Briefcase className="mx-auto text-gray-400 mb-4 animate-pulse" size={64} />
                  <p className="text-gray-600">Loading jobs...</p>
                </div>
              ) : filteredJobs.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredJobs.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      onClick={() => setSelectedJob(job)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Briefcase className="mx-auto text-gray-400 mb-4" size={64} />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">No jobs found</h3>
                  <p className="text-gray-600 mb-6">
                    {searchQuery || selectedCategory !== "ALL" || selectedType !== "ALL" || selectedLocation !== "ALL"
                      ? "Try adjusting your search or filters to see more results."
                      : "No job openings available at the moment. Check back soon!"}
                  </p>
                  {(searchQuery || selectedCategory !== "ALL" || selectedType !== "ALL" || selectedLocation !== "ALL") && (
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory("ALL");
                        setSelectedType("ALL");
                        setSelectedLocation("ALL");
                      }}
                      className="px-6 py-3 bg-[#02665e] text-white rounded-lg font-semibold hover:bg-[#024d47] transition-colors"
                    >
                      Clear Filters
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Job History Section */}
        <section className="py-16 bg-gray-50">
          <div className="public-container">
            <div className="max-w-7xl mx-auto">
              <div className="mb-8 text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Job Announcement History</h2>
                <p className="text-gray-600 text-lg">A timeline of our recent job postings and opportunities</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {expiredJobs.length > 0 ? (
                  expiredJobs
                    .map(job => ({
                      date: job.postedDate,
                      expiryDate: job.applicationDeadline || undefined,
                      title: job.title,
                      department: job.department,
                      status: "Expired",
                      description: job.description || `This position expired on ${job.applicationDeadline ? new Date(job.applicationDeadline).toLocaleDateString() : 'N/A'}.`
                    }))
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((item, idx) => (
                      <div
                        key={idx}
                        className="group relative bg-white/80 backdrop-blur-sm rounded-2xl shadow-sm hover:shadow-2xl transition-all duration-700 p-7 border border-gray-100/80 hover:border-[#02665e]/30 h-full flex flex-col overflow-hidden hover:-translate-y-2 hover:scale-[1.02]"
                      >
                    {/* Animated gradient accent bar - only visible on hover */}
                    <div className="absolute top-0 left-0 right-0 h-0 bg-gradient-to-r from-[#02665e] via-[#038a7c] to-[#04a896] group-hover:h-2 transition-all duration-700"></div>
                    
                    {/* Decorative corner element */}
                    <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-[#02665e]/5 to-transparent rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
                    
                    {/* Background gradient on hover with blur effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#02665e]/0 via-transparent to-transparent group-hover:from-[#02665e]/8 group-hover:via-[#038a7c]/4 group-hover:to-[#04a896]/4 transition-all duration-700 pointer-events-none backdrop-blur-[2px]"></div>
                    
                    <div className="relative flex-1 flex flex-col z-10">
                      {/* Header with icon */}
                      <div className="mb-5">
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-[#02665e] transition-colors duration-500 leading-tight mb-2">
                              {item.title}
                            </h3>
                            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-[#02665e]/8 via-[#038a7c]/6 to-[#04a896]/8 rounded-lg border border-[#02665e]/10 group-hover:from-[#02665e]/15 group-hover:via-[#038a7c]/12 group-hover:to-[#04a896]/15 group-hover:border-[#02665e]/20 transition-all duration-500">
                              <Briefcase size={12} className="text-[#02665e]" />
                              <span className="text-xs font-semibold text-[#02665e] group-hover:text-[#024d47] transition-colors duration-300">{item.department}</span>
                            </div>
                          </div>
                          <span className={`px-3.5 py-1.5 text-white text-xs font-bold rounded-full flex-shrink-0 shadow-md group-hover:shadow-lg group-hover:scale-110 transition-all duration-300 ${
                            item.status === "Expired" 
                              ? "bg-gradient-to-r from-red-500 to-red-600" 
                              : "bg-gradient-to-r from-green-500 to-emerald-500"
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                      
                      {/* Description with improved typography */}
                      <p className="text-sm text-gray-600 leading-relaxed mb-6 flex-1 group-hover:text-gray-800 transition-colors duration-500 font-medium">
                        {item.description}
                      </p>
                      
                      {/* Enhanced footer with date */}
                      <div className="mt-auto pt-5 border-t border-gray-100/60 group-hover:border-[#02665e]/25 transition-all duration-500">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-3 text-sm bg-gradient-to-r from-gray-50/80 to-gray-50/40 backdrop-blur-sm px-4 py-3 rounded-xl group-hover:from-[#02665e]/10 group-hover:via-[#038a7c]/8 group-hover:to-[#04a896]/10 group-hover:shadow-md transition-all duration-500 border border-gray-100/50 group-hover:border-[#02665e]/20">
                            <div className="p-2 bg-white rounded-lg shadow-sm group-hover:bg-gradient-to-br group-hover:from-[#02665e] group-hover:to-[#038a7c] group-hover:shadow-lg group-hover:scale-110 transition-all duration-500">
                              <Calendar size={14} className="text-[#02665e] group-hover:text-white transition-colors duration-300" />
                            </div>
                            <span className="font-semibold text-gray-700 group-hover:text-[#02665e] transition-colors duration-300">
                              Posted: {new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                            </span>
                          </div>
                          {item.expiryDate && (
                            <div className={`flex items-center gap-3 text-sm px-4 py-3 rounded-xl backdrop-blur-sm transition-all duration-500 border ${
                              item.status === "Expired"
                                ? "bg-gradient-to-r from-red-50/80 to-red-50/40 border-red-100/50 group-hover:from-red-100/50 group-hover:to-red-100/30"
                                : "bg-gradient-to-r from-gray-50/80 to-gray-50/40 border-gray-100/50"
                            }`}>
                              <div className={`p-2 rounded-lg shadow-sm transition-all duration-500 ${
                                item.status === "Expired"
                                  ? "bg-red-100 group-hover:bg-red-200"
                                  : "bg-white group-hover:bg-gradient-to-br group-hover:from-[#02665e] group-hover:to-[#038a7c]"
                              }`}>
                                <Clock size={14} className={item.status === "Expired" ? "text-red-600" : "text-[#02665e] group-hover:text-white transition-colors duration-300"} />
                              </div>
                              <span className={`font-semibold transition-colors duration-300 ${
                                item.status === "Expired"
                                  ? "text-red-700"
                                  : "text-gray-700 group-hover:text-[#02665e]"
                              }`}>
                                {item.status === "Expired" ? "Expired: " : "Expired: "}
                                {new Date(item.expiryDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                      </div>
                    ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <Briefcase className="mx-auto mb-4 text-gray-400" size={48} />
                    <p className="text-gray-600">No job history available yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="relative w-full overflow-hidden py-16">
          <div className="public-container">
            <div className="relative w-full bg-gradient-to-br from-[#02665e] to-[#038a7c] text-white rounded-lg overflow-hidden">
              <div className="max-w-4xl mx-auto text-center p-8 md:p-12">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Don't see a role that fits?
                </h2>
                <p className="text-xl text-white/90 mb-8">
                  We're always looking for talented people. Send us your resume and we'll keep you in mind for future opportunities.
                </p>
                <a
                  href="mailto:careers@nolsaf.com"
                  className="inline-block px-8 py-4 bg-white text-[#02665e] rounded-lg font-semibold hover:bg-gray-100 transition-colors border-2 border-[#02665e] animate-pulse hover:animate-none no-underline"
                >
                  Send Your Resume
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      {shouldUsePublicLayout ? (
        <PublicFooter withRail={false} />
      ) : isAuthenticated ? (
        <SiteFooter withRail={false} topSeparator={true} />
      ) : (
        <PublicFooter withRail={false} />
      )}

      {/* Job Detail Modal */}
      {selectedJob && !showApplicationForm && (
        <JobDetailModal
          job={selectedJob}
          onClose={() => setSelectedJob(null)}
          onApply={() => setShowApplicationForm(true)}
        />
      )}

      {/* Application Form Modal */}
      {selectedJob && showApplicationForm && (
        <ApplicationForm
          job={selectedJob}
          onClose={() => {
            setShowApplicationForm(false);
            setSelectedJob(null);
          }}
          onSuccess={() => {
            setShowApplicationForm(false);
            setSelectedJob(null);
          }}
        />
      )}
    </>
  );
}
