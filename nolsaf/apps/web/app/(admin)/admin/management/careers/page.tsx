"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { Briefcase, Plus, Edit, Trash2, Eye, X, Calendar, MapPin, DollarSign, Clock, CheckCircle2, AlertCircle, FileText, Users, Mail, Phone, ExternalLink, Download, CheckSquare, Square, GraduationCap, Languages } from "lucide-react";
import PDFViewer from "@/components/PDFViewer";
import DatePicker from "@/components/ui/DatePicker";
import { useSearchParams } from "next/navigation";

type Job = {
  id: number;
  title: string;
  category: string;
  type: string;
  location: string;
  locationDetail?: string | null;
  department: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  experienceLevel: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: "MONTHLY" | "YEARLY";
  } | null;
  postedDate: string;
  applicationDeadline?: string | null;
  featured: boolean;
  status: string;
  isTravelAgentPosition?: boolean;
  createdAt: string;
  updatedAt: string;
};

type JobFormData = {
  title: string;
  category: string;
  type: string;
  location: string;
  locationDetail: string;
  department: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  experienceLevel: string;
  salaryMin: string;
  salaryMax: string;
  salaryCurrency: string;
  salaryPeriod: string;
  applicationDeadline: string;
  featured: boolean;
  status: string;
  isTravelAgentPosition: boolean;
};

const CATEGORIES = ["ENGINEERING", "DESIGN", "MARKETING", "SALES", "OPERATIONS", "SUPPORT", "MANAGEMENT", "OTHER"];
const TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP", "FREELANCE"];
const LOCATIONS = ["REMOTE", "ONSITE", "HYBRID"];
const EXPERIENCE_LEVELS = ["ENTRY", "MID", "SENIOR", "LEAD"];

export default function CareersManagement() {
  const searchParams = useSearchParams();
  const apiBase = typeof window === 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000")
    : '';
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [viewingJob, setViewingJob] = useState<Job | null>(null);
  const [saving, setSaving] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deadlinePickerOpen, setDeadlinePickerOpen] = useState(false);
  
  // Applications state
  const [activeTab, setActiveTab] = useState<'jobs' | 'applications'>('jobs');
  const [applications, setApplications] = useState<any[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(false);
  const [viewingApplication, setViewingApplication] = useState<any | null>(null);
  const [applicationStatusFilter, setApplicationStatusFilter] = useState<string>('ALL');
  const [applicationJobFilter, setApplicationJobFilter] = useState<string>('ALL');
  const applicationSearch = '';
  const [selectedApplications, setSelectedApplications] = useState<number[]>([]);
  
  const [, setStatistics] = useState<any>(null);
  const [, setStatisticsLoading] = useState(false);
  const [resumeViewUrl, setResumeViewUrl] = useState<string | null>(null);
  const [viewingResume, setViewingResume] = useState(false);

  useEffect(() => {
    const tab = String(searchParams?.get("tab") || "").toLowerCase();
    if (tab === "applications") setActiveTab("applications");
    if (tab === "jobs") setActiveTab("jobs");
  }, [searchParams]);

  const [formData, setFormData] = useState<JobFormData>({
    title: "",
    category: "ENGINEERING",
    type: "FULL_TIME",
    location: "REMOTE",
    locationDetail: "",
    department: "",
    description: "",
    responsibilities: [""],
    requirements: [""],
    benefits: [""],
    experienceLevel: "ENTRY",
    salaryMin: "",
    salaryMax: "",
    salaryCurrency: "TZS",
    salaryPeriod: "MONTHLY",
    applicationDeadline: "",
    featured: false,
    status: "ACTIVE",
    isTravelAgentPosition: false
  });

  const loadApplications = async () => {
    setApplicationsLoading(true);
    setError(null);
    try {
      let url = `${apiBase.replace(/\/$/, '')}/api/admin/careers/applications?page=1&pageSize=100`;
      if (applicationStatusFilter !== 'ALL') {
        url += `&status=${applicationStatusFilter}`;
      }
      if (applicationJobFilter !== 'ALL' && applicationJobFilter) {
        // Validate that jobId is a valid number
        const jobIdNum = parseInt(applicationJobFilter, 10);
        if (!isNaN(jobIdNum)) {
          url += `&jobId=${jobIdNum}`;
        }
      }
      if (applicationSearch.trim()) {
        url += `&search=${encodeURIComponent(applicationSearch.trim())}`;
      }
      const r = await fetch(url, { credentials: 'include' });
      if (!r.ok) {
        const errorData = await r.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to load applications: ${r.status}`);
      }
      const data = await r.json();
      setApplications(data.applications || []);
    } catch (e: any) {
      console.error('Error loading applications:', e);
      setError(e.message || 'Failed to load applications');
    } finally {
      setApplicationsLoading(false);
    }
  };

  const loadStatistics = async () => {
    setStatisticsLoading(true);
    try {
      const url = `${apiBase.replace(/\/$/, '')}/api/admin/careers/stats`;
      const r = await fetch(url, { credentials: 'include' });
      if (!r.ok) {
        const errorData = await r.json().catch(() => ({}));
        const errorMessage = errorData.error || `Failed to load statistics: ${r.status}`;
        
        // If it's a schema error, show a helpful message
        if (errorMessage.includes('Database schema not updated') || errorMessage.includes('prisma generate')) {
          console.error('Prisma schema needs to be regenerated. Please stop the dev server, run "npm run prisma:generate" from the root directory, then restart the server.');
        }
        
        throw new Error(errorMessage);
      }
      const data = await r.json();
      setStatistics(data);
    } catch (e: any) {
      console.error('Error loading statistics:', e);
      // Don't show error to user - statistics are optional
      // setError(e.message || 'Failed to load statistics');
    } finally {
      setStatisticsLoading(false);
    }
  };

  const toggleApplicationSelection = (id: number) => {
    setSelectedApplications(prev => 
      prev.includes(id) 
        ? prev.filter(appId => appId !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedApplications.length === applications.length) {
      setSelectedApplications([]);
    } else {
      setSelectedApplications(applications.map(app => app.id));
    }
  };

  const loadJobs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = `${apiBase.replace(/\/$/, '')}/api/admin/careers?page=1&pageSize=100`;
      const r = await fetch(url, { credentials: 'include' });
      if (!r.ok) throw new Error('Failed to fetch jobs');
      const data = await r.json();
      setJobs(data.jobs || []);
    } catch (e: any) {
      console.error('Error loading jobs:', e);
      setError(e.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (activeTab === 'applications') {
      loadApplications();
      loadStatistics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, applicationStatusFilter, applicationJobFilter, applicationSearch]);

  const resetForm = () => {
    setFormData({
      title: "",
      category: "ENGINEERING",
      type: "FULL_TIME",
      location: "REMOTE",
      locationDetail: "",
      department: "",
      description: "",
      responsibilities: [""],
      requirements: [""],
      benefits: [""],
      experienceLevel: "ENTRY",
      salaryMin: "",
      salaryMax: "",
      salaryCurrency: "TZS",
      salaryPeriod: "MONTHLY",
      applicationDeadline: "",
      featured: false,
      status: "ACTIVE",
      isTravelAgentPosition: false
    });
    setEditingJob(null);
    setShowForm(false);
  };

  const handleEdit = (job: Job) => {
    setEditingJob(job);
    setFormData({
      title: job.title,
      category: job.category,
      type: job.type,
      location: job.location,
      locationDetail: job.locationDetail || "",
      department: job.department,
      description: job.description,
      responsibilities: job.responsibilities.length > 0 ? job.responsibilities : [""],
      requirements: job.requirements.length > 0 ? job.requirements : [""],
      benefits: job.benefits.length > 0 ? job.benefits : [""],
      experienceLevel: job.experienceLevel,
      salaryMin: job.salary?.min ? String(job.salary.min) : "",
      salaryMax: job.salary?.max ? String(job.salary.max) : "",
      salaryCurrency: job.salary?.currency || "TZS",
      salaryPeriod: job.salary?.period || "MONTHLY",
      applicationDeadline: job.applicationDeadline ? new Date(job.applicationDeadline).toISOString().split('T')[0] : "",
      featured: job.featured,
      status: job.status,
      isTravelAgentPosition: job.isTravelAgentPosition ?? false,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this job posting?')) return;
    
    try {
      const url = `${apiBase.replace(/\/$/, '')}/api/admin/careers/${id}`;
      const r = await fetch(url, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!r.ok) throw new Error('Failed to delete job');
      setSuccess('Job deleted successfully');
      loadJobs();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message || 'Failed to delete job');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const salary = (formData.salaryMin || formData.salaryMax) ? {
        min: formData.salaryMin ? Number(formData.salaryMin) : undefined,
        max: formData.salaryMax ? Number(formData.salaryMax) : undefined,
        currency: formData.salaryCurrency,
        period: formData.salaryPeriod as "MONTHLY" | "YEARLY"
      } : null;

      // If Travel Agent position is enabled, ensure title contains "Agent" or "Travel"
      let finalTitle = formData.title;
      if (formData.isTravelAgentPosition) {
        const titleLower = finalTitle.toLowerCase();
        if (!titleLower.includes("agent") && !titleLower.includes("travel")) {
          // Suggest adding "Travel Agent" to title if not present
          finalTitle = finalTitle.trim() + (finalTitle.trim().endsWith(".") ? "" : " - Travel Agent");
        }
      }

      const payload = {
        title: finalTitle,
        category: formData.category,
        type: formData.type,
        location: formData.location,
        locationDetail: formData.locationDetail || null,
        department: formData.department,
        description: formData.description,
        responsibilities: formData.responsibilities.filter(r => r.trim()),
        requirements: formData.requirements.filter(r => r.trim()),
        benefits: formData.benefits.filter(b => b.trim()),
        experienceLevel: formData.experienceLevel,
        salary,
        applicationDeadline: formData.applicationDeadline || null,
        featured: formData.featured,
        status: formData.status
      };

      const url = editingJob
        ? `${apiBase.replace(/\/$/, '')}/api/admin/careers/${editingJob.id}`
        : `${apiBase.replace(/\/$/, '')}/api/admin/careers`;
      
      const method = editingJob ? 'PATCH' : 'POST';
      
      const r = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!r.ok) {
        const errorData = await r.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save job');
      }

      setSuccess(editingJob ? 'Job updated successfully' : 'Job created successfully');
      resetForm();
      loadJobs();
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message || 'Failed to save job');
      setTimeout(() => setError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const addListItem = (field: 'responsibilities' | 'requirements' | 'benefits') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], ""]
    }));
  };

  const updateListItem = (field: 'responsibilities' | 'requirements' | 'benefits', index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const removeListItem = (field: 'responsibilities' | 'requirements' | 'benefits', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatSalary = (salary: Job['salary']) => {
    if (!salary || (!salary.min && !salary.max)) return "Competitive";
    const currency = salary.currency || "TZS";
    const period = salary.period === "YEARLY" ? "year" : "month";
    if (salary.min && salary.max) {
      return `${(salary.min / 1000).toFixed(0)}K - ${(salary.max / 1000).toFixed(0)}K ${currency}/${period}`;
    }
    return `${((salary.min || salary.max || 0) / 1000).toFixed(0)}K ${currency}/${period}`;
  };

  const updateApplicationStatus = async (applicationId: number, status: string, notes?: string) => {
    // Prevent duplicate updates
    if (updatingStatus === applicationId) {
      return;
    }
    
    // Prevent setting the same status
    if (viewingApplication?.id === applicationId && viewingApplication?.status === status) {
      setError('This status is already set. Please select a different status.');
      setTimeout(() => setError(null), 3000);
      return;
    }

    setUpdatingStatus(applicationId);
    try {
      const url = `${apiBase.replace(/\/$/, '')}/api/admin/careers/applications/${applicationId}`;
      const r = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status, adminNotes: notes })
      });
      if (!r.ok) throw new Error('Failed to update application');
      setSuccess('Application status updated successfully');
      loadApplications();
      if (viewingApplication?.id === applicationId) {
        const updated = await r.json();
        setViewingApplication(updated);
      }
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message || 'Failed to update application');
      setTimeout(() => setError(null), 5000);
    } finally {
      setUpdatingStatus(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'REVIEWING': return 'bg-blue-100 text-blue-800';
      case 'SHORTLISTED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'HIRED': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewResume = async (applicationId: number) => {
    try {
      // Check if application has resume data before attempting to fetch
      const application = applications.find(app => app.id === applicationId) || viewingApplication;
      if (application && !application.resumeStorageKey && !application.resumeUrl) {
        setError('Resume file is not available. The resume may not have been uploaded successfully.');
        setTimeout(() => setError(null), 5000);
        return;
      }

      const url = `${apiBase.replace(/\/$/, '')}/api/admin/careers/applications/${applicationId}/resume`;
      const r = await fetch(url, { credentials: 'include' });
      if (!r.ok) {
        const errorData = await r.json().catch(() => ({}));
        const errorMessage = errorData.error || `Failed to get resume URL: ${r.status}`;
        if (errorMessage.includes('not available') || errorMessage.includes('Resume not available')) {
          throw new Error('Resume file is not available. The resume may not have been uploaded successfully or may have been deleted.');
        }
        throw new Error(errorMessage);
      }
      const data = await r.json();
      if (!data.url) {
        throw new Error('Resume URL not available');
      }
      setResumeViewUrl(data.url);
      setViewingResume(true);
    } catch (e: any) {
      console.error('Error loading resume:', e);
      setError(e.message || 'Failed to load resume');
      setTimeout(() => setError(null), 5000);
    }
  };

  if (viewingJob) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Job Details</h1>
            <button
              onClick={() => setViewingJob(null)}
              className="p-2 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-gray-300 rounded-lg transition-all duration-200 text-gray-600 hover:text-gray-900 group"
              title="Close"
            >
              <X size={20} className="transition-transform duration-200 group-hover:rotate-90" />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">{viewingJob.title}</h2>
              <p className="text-gray-600">{viewingJob.department}</p>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-lg text-sm">{viewingJob.category}</span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-lg text-sm">{viewingJob.type.replace('_', ' ')}</span>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-lg text-sm">{viewingJob.location}</span>
              <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-lg text-sm">{viewingJob.experienceLevel}</span>
              {viewingJob.featured && (
                <span className="px-3 py-1 bg-[#02665e] text-white rounded-lg text-sm font-semibold">Featured</span>
              )}
              <span className={`px-3 py-1 rounded-lg text-sm font-semibold ${
                viewingJob.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                viewingJob.status === 'CLOSED' ? 'bg-gray-100 text-gray-800' :
                'bg-yellow-100 text-yellow-800'
              }`}>
                {viewingJob.status}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar size={16} />
                <span>Posted: {formatDate(viewingJob.postedDate)}</span>
              </div>
              {viewingJob.applicationDeadline && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock size={16} />
                  <span>Expires: {formatDate(viewingJob.applicationDeadline)}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600">
                <DollarSign size={16} />
                <span>{formatSalary(viewingJob.salary)}</span>
              </div>
              {viewingJob.locationDetail && (
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin size={16} />
                  <span>{viewingJob.locationDetail}</span>
                </div>
              )}
            </div>
            
            <div>
              <h3 className="font-bold text-gray-900 mb-2">Description</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{viewingJob.description}</p>
            </div>
            
            <div>
              <h3 className="font-bold text-gray-900 mb-2">Responsibilities</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {viewingJob.responsibilities.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="font-bold text-gray-900 mb-2">Requirements</h3>
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {viewingJob.requirements.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
            
            {viewingJob.benefits.length > 0 && (
              <div>
                <h3 className="font-bold text-gray-900 mb-2">Benefits</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  {viewingJob.benefits.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center mb-4">
          <Briefcase className="h-8 w-8 text-gray-400 mb-3" />
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-gray-900">
            Careers Management
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Create, update, and manage job postings
          </p>
        </div>
        
        {/* Tabs */}
        <div className="flex justify-center mb-4">
          <div className="inline-flex rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
            <button
              onClick={() => setActiveTab('jobs')}
              className={`px-6 py-2.5 rounded-md font-medium transition-all duration-300 ease-in-out relative group ${
                activeTab === 'jobs'
                  ? 'bg-[#02665e] text-white shadow-md'
                  : 'text-gray-600 hover:text-[#02665e] hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Briefcase 
                  size={18} 
                  className={`transition-all duration-300 ${
                    activeTab === 'jobs' 
                      ? 'scale-110' 
                      : 'group-hover:scale-110'
                  }`} 
                />
                <span className="relative z-10">Jobs</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('applications')}
              className={`px-6 py-2.5 rounded-md font-medium transition-all duration-300 ease-in-out relative group ${
                activeTab === 'applications'
                  ? 'bg-[#02665e] text-white shadow-md'
                  : 'text-gray-600 hover:text-[#02665e] hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users 
                  size={18} 
                  className={`transition-all duration-300 ${
                    activeTab === 'applications' 
                      ? 'scale-110' 
                      : 'group-hover:scale-110'
                  }`} 
                />
                <span className="relative z-10">Applications</span>
              </div>
            </button>
          </div>
        </div>

        {activeTab === 'jobs' && (
          <div className="flex justify-center">
            <button
              onClick={() => {
                resetForm();
                setShowForm(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#02665e] text-white rounded-lg font-semibold hover:bg-[#024d47] transition-colors"
            >
              <Plus size={20} />
              New Job
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle2 size={20} />
          <span>{success}</span>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto overflow-x-hidden">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 sm:p-6 flex items-center justify-between z-10 flex-shrink-0">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                {editingJob ? 'Edit Job' : 'Create New Job'}
              </h2>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
              >
                <X size={24} />
              </button>
            </div>

            <div className="overflow-y-auto overflow-x-hidden flex-1 min-w-0">
              <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6 sm:space-y-8 max-w-full">
              {/* Section 1: Basic Information */}
              <div className="space-y-4">
                <div className="pb-2 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Briefcase size={20} className="text-[#02665e]" />
                    Basic Information
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">Essential details about the job position</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Job Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] transition-colors box-border"
                      placeholder="e.g., Senior Full Stack Developer"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Department <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] transition-colors box-border"
                      placeholder="e.g., Engineering"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Job Classification */}
              <div className="space-y-4">
                <div className="pb-2 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FileText size={20} className="text-[#02665e]" />
                    Job Classification
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">Categorize and classify the job position</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] transition-colors bg-white box-border"
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Job Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] transition-colors bg-white box-border"
                    >
                      {TYPES.map(type => (
                        <option key={type} value={type}>{type.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>

                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Experience Level <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.experienceLevel}
                      onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] transition-colors bg-white box-border"
                    >
                      {EXPERIENCE_LEVELS.map(level => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </div>

                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Application Deadline
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setDeadlinePickerOpen(true)}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] transition-colors box-border bg-white text-left flex items-center justify-between hover:bg-gray-50"
                      >
                        <span className={formData.applicationDeadline ? "text-gray-900" : "text-gray-500"}>
                          {formData.applicationDeadline 
                            ? new Date(formData.applicationDeadline + "T00:00:00").toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })
                            : "dd / mm / yyyy"}
                        </span>
                        <Calendar size={18} className="text-gray-400 flex-shrink-0" />
                      </button>
                      {deadlinePickerOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-40" 
                            onClick={() => setDeadlinePickerOpen(false)} 
                          />
                          <div className="absolute z-50 top-full left-0 mt-2 sm:left-auto sm:right-0">
                            <DatePicker
                              selected={formData.applicationDeadline || undefined}
                              onSelectAction={(date) => {
                                const selectedDate = Array.isArray(date) ? date[0] : date;
                                if (selectedDate) {
                                  setFormData({ ...formData, applicationDeadline: selectedDate });
                                }
                                setDeadlinePickerOpen(false);
                              }}
                              onCloseAction={() => setDeadlinePickerOpen(false)}
                              allowRange={false}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: Location Details */}
              <div className="space-y-4">
                <div className="pb-2 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <MapPin size={20} className="text-[#02665e]" />
                    Location Details
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">Specify where the job will be performed</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] transition-colors bg-white box-border"
                    >
                      {LOCATIONS.map(loc => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>

                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Location Detail
                    </label>
                    <input
                      type="text"
                      value={formData.locationDetail}
                      onChange={(e) => setFormData({ ...formData, locationDetail: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] transition-colors box-border"
                      placeholder="e.g., Dar es Salaam, Tanzania"
                    />
                  </div>
                </div>
              </div>

              {/* Section 4: Compensation */}
              <div className="space-y-4">
                <div className="pb-2 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <DollarSign size={20} className="text-[#02665e]" />
                    Compensation
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">Salary and compensation details</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Salary Min (TZS)
                    </label>
                    <input
                      type="number"
                      value={formData.salaryMin}
                      onChange={(e) => setFormData({ ...formData, salaryMin: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] transition-colors box-border"
                      placeholder="e.g., 2000000"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Salary Max (TZS)
                    </label>
                    <input
                      type="number"
                      value={formData.salaryMax}
                      onChange={(e) => setFormData({ ...formData, salaryMax: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] transition-colors box-border"
                      placeholder="e.g., 4000000"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Currency
                    </label>
                    <select
                      value={formData.salaryCurrency}
                      onChange={(e) => setFormData({ ...formData, salaryCurrency: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] transition-colors bg-white box-border"
                    >
                      <option value="TZS">TZS</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>

                  <div className="min-w-0">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Period
                    </label>
                    <select
                      value={formData.salaryPeriod}
                      onChange={(e) => setFormData({ ...formData, salaryPeriod: e.target.value })}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] transition-colors bg-white box-border"
                    >
                      <option value="MONTHLY">Monthly</option>
                      <option value="YEARLY">Yearly</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Section 5: Job Description */}
              <div className="space-y-4">
                <div className="pb-2 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <FileText size={20} className="text-[#02665e]" />
                    Job Description
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">Provide a detailed description of the role</p>
                </div>
                <div className="min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    required
                    rows={5}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] transition-colors resize-none box-border"
                    placeholder="Provide a comprehensive description of the job role, responsibilities, and what makes this position unique..."
                  />
                </div>
              </div>

              {/* Section 6: Responsibilities */}
              <div className="space-y-4">
                <div className="pb-2 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Key Responsibilities</h3>
                  <p className="text-sm text-gray-500 mt-1">List the main duties and responsibilities</p>
                </div>
                <div className="space-y-3">
                  {formData.responsibilities.map((resp, idx) => (
                    <div key={idx} className="flex gap-2 items-center min-w-0">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#02665e]/10 text-[#02665e] flex items-center justify-center text-xs font-semibold">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={resp}
                        onChange={(e) => updateListItem('responsibilities', idx, e.target.value)}
                        className="flex-1 min-w-0 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] transition-colors box-border"
                        placeholder={`Enter responsibility ${idx + 1}...`}
                      />
                      <button
                        type="button"
                        onClick={() => removeListItem('responsibilities', idx)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addListItem('responsibilities')}
                    className="text-sm font-medium text-[#02665e] hover:text-[#024d47] flex items-center gap-1 transition-colors"
                  >
                    <Plus size={16} />
                    Add Responsibility
                  </button>
                </div>
              </div>

              {/* Section 7: Requirements */}
              <div className="space-y-4">
                <div className="pb-2 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Requirements</h3>
                  <p className="text-sm text-gray-500 mt-1">Specify the skills and qualifications needed</p>
                </div>
                <div className="space-y-3">
                  {formData.requirements.map((req, idx) => (
                    <div key={idx} className="flex gap-2 items-center min-w-0">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#02665e]/10 text-[#02665e] flex items-center justify-center text-xs font-semibold">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={req}
                        onChange={(e) => updateListItem('requirements', idx, e.target.value)}
                        className="flex-1 min-w-0 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] transition-colors box-border"
                        placeholder={`Enter requirement ${idx + 1}...`}
                      />
                      <button
                        type="button"
                        onClick={() => removeListItem('requirements', idx)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addListItem('requirements')}
                    className="text-sm font-medium text-[#02665e] hover:text-[#024d47] flex items-center gap-1 transition-colors"
                  >
                    <Plus size={16} />
                    Add Requirement
                  </button>
                </div>
              </div>

              {/* Section 8: Benefits */}
              <div className="space-y-4">
                <div className="pb-2 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Benefits</h3>
                  <p className="text-sm text-gray-500 mt-1">List the benefits and perks offered</p>
                </div>
                <div className="space-y-3">
                  {formData.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex gap-2 items-center min-w-0">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#02665e]/10 text-[#02665e] flex items-center justify-center text-xs font-semibold">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={benefit}
                        onChange={(e) => updateListItem('benefits', idx, e.target.value)}
                        className="flex-1 min-w-0 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] transition-colors box-border"
                        placeholder={`Enter benefit ${idx + 1}...`}
                      />
                      <button
                        type="button"
                        onClick={() => removeListItem('benefits', idx)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addListItem('benefits')}
                    className="text-sm font-medium text-[#02665e] hover:text-[#024d47] flex items-center gap-1 transition-colors"
                  >
                    <Plus size={16} />
                    Add Benefit
                  </button>
                </div>
              </div>

              {/* Section 9: Publishing Options */}
              <div className="space-y-4">
                <div className="pb-2 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Publishing Options</h3>
                  <p className="text-sm text-gray-500 mt-1">Control visibility and status</p>
                </div>
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={formData.featured}
                        onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                        className="w-5 h-5 text-[#02665e] border-gray-300 rounded focus:ring-[#02665e] focus:ring-2 cursor-pointer"
                      />
                      <div>
                        <span className="text-sm font-semibold text-gray-900 block">Featured Job</span>
                        <span className="text-xs text-gray-500">Highlight this job on the careers page</span>
                      </div>
                    </label>

                    <div className="flex-1 max-w-xs">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Status
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] transition-colors bg-white"
                      >
                        <option value="ACTIVE">Active</option>
                        <option value="CLOSED">Closed</option>
                        <option value="DRAFT">Draft</option>
                      </select>
                    </div>
                  </div>

                  {/* Travel Agent Position Toggle */}
                  <div className="border-t border-gray-200 pt-4">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={formData.isTravelAgentPosition}
                        onChange={(e) => setFormData({ ...formData, isTravelAgentPosition: e.target.checked })}
                        className="w-5 h-5 text-[#02665e] border-gray-300 rounded focus:ring-[#02665e] focus:ring-2 cursor-pointer mt-0.5"
                      />
                      <div>
                        <span className="text-sm font-semibold text-gray-900 block">Travel Agent Position</span>
                        <span className="text-xs text-gray-500">Enable this if this job is for a Travel Agent. Applicants will be asked to provide agent-specific information (education, areas of operation, languages, certifications, etc.). When approved, an Agent profile will be automatically created.</span>
                      </div>
                    </label>
                    {formData.isTravelAgentPosition && (
                      <div className="mt-3 ml-8 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs text-blue-800">
                          <strong>Note:</strong> Make sure the job title includes &quot;Travel Agent&quot; or &quot;Agent&quot; for proper identification. Applicants will see additional agent-specific fields in the application form.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-6 py-3 border border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-6 py-3 bg-[#02665e] text-white rounded-lg font-semibold hover:bg-[#024d47] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Saving...' : editingJob ? 'Update Job' : 'Create Job'}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}

      {/* Applications View */}
      {activeTab === 'applications' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
                <select
                  value={applicationStatusFilter}
                  onChange={(e) => setApplicationStatusFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="REVIEWING">Reviewing</option>
                  <option value="SHORTLISTED">Shortlisted</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="HIRED">Hired</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Job</label>
                <select
                  value={applicationJobFilter}
                  onChange={(e) => setApplicationJobFilter(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e]"
                >
                  <option value="ALL">All Jobs</option>
                  {jobs.map(job => (
                    <option key={job.id} value={job.id}>{job.title}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Applications List */}
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            {applicationsLoading ? (
              <div className="p-8 text-center text-gray-500">Loading applications...</div>
            ) : applications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Users className="mx-auto mb-4 text-gray-400" size={48} />
                <p>No applications found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                        <button
                          onClick={toggleSelectAll}
                          className="p-1.5 bg-white border border-gray-300 hover:border-[#02665e] hover:bg-[#02665e]/5 rounded-md transition-all duration-300 ease-in-out hover:scale-110 active:scale-95 group"
                          title="Select All"
                        >
                          {selectedApplications.length === applications.length ? (
                            <CheckSquare size={18} className="text-[#02665e] transition-all duration-300 group-hover:scale-110" />
                          ) : (
                            <Square size={18} className="text-gray-400 transition-all duration-300 group-hover:text-[#02665e] group-hover:scale-110" />
                          )}
                        </button>
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {applications.map((app) => (
                      <tr key={app.id} className={`hover:bg-gray-50 ${selectedApplications.includes(app.id) ? 'bg-blue-50' : ''}`}>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => toggleApplicationSelection(app.id)}
                            className="p-1.5 bg-white border border-gray-300 hover:border-[#02665e] hover:bg-[#02665e]/5 rounded-md transition-all duration-300 ease-in-out hover:scale-110 active:scale-95 group"
                          >
                            {selectedApplications.includes(app.id) ? (
                              <CheckSquare size={18} className="text-[#02665e] transition-all duration-300 group-hover:scale-110" />
                            ) : (
                              <Square size={18} className="text-gray-400 transition-all duration-300 group-hover:text-[#02665e] group-hover:scale-110" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{app.fullName}</div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Mail size={14} />
                              {app.email}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                              <Phone size={14} />
                              {app.phone}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-gray-900">{app.job?.title || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{app.job?.department || ''}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(app.status)}`}>
                            {app.status}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDate(app.submittedAt)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={() => setViewingApplication(app)}
                            className="p-2 bg-gray-50 border border-blue-500/30 text-blue-600 hover:bg-blue-50 hover:border-blue-500 rounded-lg transition-all duration-300 ease-in-out hover:scale-110 hover:shadow-md active:scale-95 group"
                            title="View Details"
                          >
                            <Eye size={16} className="transition-transform duration-300 group-hover:scale-110" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Jobs List */}
      {activeTab === 'jobs' && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading jobs...</div>
          ) : jobs.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Briefcase className="mx-auto mb-4 text-gray-400" size={48} />
              <p>No jobs found. Create your first job posting!</p>
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posted</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{job.title}</span>
                        {job.featured && (
                          <span className="px-2 py-0.5 bg-[#02665e] text-white text-xs rounded-full">Featured</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{job.department}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{job.type.replace('_', ' ')}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        job.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        job.status === 'CLOSED' ? 'bg-gray-100 text-gray-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">{formatDate(job.postedDate)}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setViewingJob(job)}
                          className="p-2 bg-gray-50 border border-blue-500/30 text-blue-600 hover:bg-blue-50 hover:border-blue-500 rounded-lg transition-all duration-300 ease-in-out hover:scale-110 hover:shadow-md active:scale-95 group"
                          title="View"
                        >
                          <Eye size={16} className="transition-transform duration-300 group-hover:scale-110" />
                        </button>
                        <button
                          onClick={() => handleEdit(job)}
                          className="p-2 bg-gray-50 border border-[#02665e]/30 text-[#02665e] hover:bg-[#02665e]/5 hover:border-[#02665e] rounded-lg transition-all duration-300 ease-in-out hover:scale-110 hover:shadow-md active:scale-95 group"
                          title="Edit"
                        >
                          <Edit size={16} className="transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                        </button>
                        <button
                          onClick={() => handleDelete(job.id)}
                          className="p-2 bg-gray-50 border border-red-500/30 text-red-600 hover:bg-red-50 hover:border-red-500 rounded-lg transition-all duration-300 ease-in-out hover:scale-110 hover:shadow-md active:scale-95 group"
                          title="Delete"
                        >
                          <Trash2 size={16} className="transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* Application Detail Modal */}
      {viewingApplication && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#02665e] to-[#024d47] px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h2 className="text-xl font-bold text-white">Application Details</h2>
              <button
                onClick={() => setViewingApplication(null)}
                className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 rounded-lg transition-all duration-200 text-white group backdrop-blur-sm"
                title="Close"
              >
                <X size={18} className="transition-transform duration-200 group-hover:rotate-90" />
              </button>
            </div>
            
            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-gray-50 min-w-0 min-h-0">
              <div className="p-6 space-y-6">
                {/* Applicant Info */}
                <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <Users size={18} className="text-[#02665e]" />
                    <h3 className="text-base font-semibold text-gray-900">Applicant Information</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Full Name</label>
                      <p className="text-sm font-medium text-gray-900">{viewingApplication.fullName}</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Email</label>
                      <p className="text-sm text-gray-900 flex items-center gap-1.5">
                        <Mail size={14} className="text-gray-400" />
                        {viewingApplication.email}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Phone</label>
                      <p className="text-sm text-gray-900 flex items-center gap-1.5">
                        <Phone size={14} className="text-gray-400" />
                        {viewingApplication.phone}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
                      <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(viewingApplication.status)}`}>
                        {viewingApplication.status}
                      </span>
                    </div>
                    {viewingApplication.linkedIn && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">LinkedIn</label>
                        <a 
                          href={viewingApplication.linkedIn} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5"
                        >
                          <ExternalLink size={14} />
                          View Profile
                        </a>
                      </div>
                    )}
                    {viewingApplication.portfolio && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Portfolio</label>
                        <a 
                          href={viewingApplication.portfolio} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1.5"
                        >
                          <ExternalLink size={14} />
                          View Portfolio
                        </a>
                      </div>
                    )}
                    {viewingApplication.referredBy && (
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 mb-1.5">Referred By</label>
                        <p className="text-sm text-gray-900">{viewingApplication.referredBy}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Job Info */}
                <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Briefcase size={18} className="text-[#02665e]" />
                    <h3 className="text-base font-semibold text-gray-900">Job Applied For</h3>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{viewingApplication.job?.title || 'N/A'}</p>
                  <p className="text-xs text-gray-600 mt-1">{viewingApplication.job?.department || ''}</p>
                </div>

                {/* Agent-Specific Information */}
                {viewingApplication.agentApplicationData && (
                  <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <Users size={18} className="text-[#02665e]" />
                      <h3 className="text-base font-semibold text-gray-900">Agent Profile Information</h3>
                    </div>
                    <div className="space-y-4">
                      {/* Education & Experience */}
                      {(viewingApplication.agentApplicationData.educationLevel || viewingApplication.agentApplicationData.yearsOfExperience) && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <GraduationCap size={16} className="text-[#02665e]" />
                            Education & Experience
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {viewingApplication.agentApplicationData.educationLevel && (
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Education Level</label>
                                <p className="text-sm text-gray-900">{viewingApplication.agentApplicationData.educationLevel.replace('_', ' ')}</p>
                              </div>
                            )}
                            {viewingApplication.agentApplicationData.yearsOfExperience !== null && viewingApplication.agentApplicationData.yearsOfExperience !== undefined && (
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Years of Experience</label>
                                <p className="text-sm text-gray-900">{viewingApplication.agentApplicationData.yearsOfExperience} {viewingApplication.agentApplicationData.yearsOfExperience === 1 ? 'year' : 'years'}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Bio */}
                      {viewingApplication.agentApplicationData.bio && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Bio</h4>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-md p-3 border border-gray-100">{viewingApplication.agentApplicationData.bio}</p>
                        </div>
                      )}

                      {/* Areas of Operation */}
                      {viewingApplication.agentApplicationData.areasOfOperation && Array.isArray(viewingApplication.agentApplicationData.areasOfOperation) && viewingApplication.agentApplicationData.areasOfOperation.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <MapPin size={16} className="text-[#02665e]" />
                            Areas of Operation
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {viewingApplication.agentApplicationData.areasOfOperation.map((area: string, idx: number) => (
                              <span key={idx} className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-200">
                                {area}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Languages */}
                      {viewingApplication.agentApplicationData.languages && Array.isArray(viewingApplication.agentApplicationData.languages) && viewingApplication.agentApplicationData.languages.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Languages size={16} className="text-[#02665e]" />
                            Languages
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {viewingApplication.agentApplicationData.languages.map((lang: string, idx: number) => (
                              <span key={idx} className="inline-flex items-center px-3 py-1 bg-purple-50 text-purple-700 rounded-lg text-sm border border-purple-200">
                                {lang}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Specializations */}
                      {viewingApplication.agentApplicationData.specializations && Array.isArray(viewingApplication.agentApplicationData.specializations) && viewingApplication.agentApplicationData.specializations.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <Briefcase size={16} className="text-[#02665e]" />
                            Specializations
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {viewingApplication.agentApplicationData.specializations.map((spec: string, idx: number) => (
                              <span key={idx} className="inline-flex items-center px-3 py-1 bg-green-50 text-green-700 rounded-lg text-sm border border-green-200">
                                {spec}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Certifications */}
                      {viewingApplication.agentApplicationData.certifications && Array.isArray(viewingApplication.agentApplicationData.certifications) && viewingApplication.agentApplicationData.certifications.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2">Certifications</h4>
                          <div className="space-y-2">
                            {viewingApplication.agentApplicationData.certifications.map((cert: any, idx: number) => (
                              <div key={idx} className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                <div className="font-medium text-amber-900">{cert.name}</div>
                                <div className="text-sm text-amber-700">
                                  {cert.issuer} • {cert.year}
                                  {cert.expiryDate && ` • Expires: ${cert.expiryDate}`}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Agent Profile Created Indicator */}
                      {viewingApplication.agent && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={16} className="text-green-600" />
                            <span className="text-sm font-medium text-green-800">Agent profile has been created</span>
                          </div>
                          <p className="text-xs text-green-700 mt-1">This application was approved and an agent profile was automatically created.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Cover Letter */}
                <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText size={18} className="text-[#02665e]" />
                    <h3 className="text-base font-semibold text-gray-900">Cover Letter</h3>
                  </div>
                  <div className="bg-gray-50 rounded-md p-4 max-h-60 overflow-y-auto border border-gray-100">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{viewingApplication.coverLetter}</p>
                  </div>
                </div>

                {/* Resume */}
                {(viewingApplication.resumeFileName || viewingApplication.resumeStorageKey || viewingApplication.resumeUrl) && (
                  <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <FileText size={18} className="text-[#02665e]" />
                      <h3 className="text-base font-semibold text-gray-900">Resume</h3>
                    </div>
                    {/* Check if resume is actually available (has storage key or URL) */}
                    {(viewingApplication.resumeStorageKey || viewingApplication.resumeUrl) ? (
                      <div 
                        onClick={() => handleViewResume(viewingApplication.id)}
                        className="flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-md border border-gray-200 hover:border-[#02665e] hover:bg-gray-100 cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="p-2 bg-white rounded-md group-hover:bg-[#02665e]/10 transition-colors">
                            <FileText size={20} className="text-[#02665e] flex-shrink-0" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 truncate group-hover:text-[#02665e] transition-colors">
                              {viewingApplication.resumeFileName || 'Resume File'}
                            </p>
                            {viewingApplication.resumeSize && (
                              <p className="text-xs text-gray-500 mt-0.5">
                                {(viewingApplication.resumeSize / 1024).toFixed(2)} KB
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewResume(viewingApplication.id);
                            }}
                            className="px-4 py-2 bg-[#02665e] text-white rounded-md hover:bg-[#024d47] transition-colors flex items-center gap-2 text-sm font-medium"
                          >
                            <Eye size={16} />
                            View
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const url = `${apiBase.replace(/\/$/, '')}/api/admin/careers/applications/${viewingApplication.id}/resume`;
                                const r = await fetch(url, { credentials: 'include' });
                                if (!r.ok) {
                                  const errorData = await r.json().catch(() => ({}));
                                  throw new Error(errorData.error || `Failed to get resume URL: ${r.status}`);
                                }
                                const data = await r.json();
                                if (!data.url) {
                                  throw new Error('Resume URL not available');
                                }
                                window.open(data.url, '_blank');
                              } catch (err: any) {
                                console.error('Error downloading resume:', err);
                                setError(err.message || 'Failed to download resume');
                                setTimeout(() => setError(null), 5000);
                              }
                            }}
                            className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium"
                          >
                            <Download size={16} />
                            Download
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-yellow-50 rounded-md border border-yellow-200">
                        <p className="text-sm text-yellow-800">
                          <strong>Resume not available:</strong> The resume file was not successfully uploaded or is no longer accessible.
                          {viewingApplication.resumeFileName && (
                            <span className="block mt-1 text-xs text-yellow-700">
                              Original filename: {viewingApplication.resumeFileName}
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Admin Notes */}
                <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">Admin Notes</h3>
                  <textarea
                    value={viewingApplication.adminNotes || ''}
                    onChange={(e) => setViewingApplication({ ...viewingApplication, adminNotes: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#02665e] focus:border-[#02665e] text-sm resize-none"
                    rows={4}
                    style={{ maxHeight: '120px', overflowY: 'auto' }}
                    placeholder="Add notes about this application..."
                  />
                </div>

                {/* Status Update */}
                <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                  <h3 className="text-base font-semibold text-gray-900 mb-3">Update Status</h3>
                  
                  {/* Current Status Display */}
                  {viewingApplication.status && (
                    <div className="mb-4 pb-3 border-b border-gray-200">
                      <p className="text-sm text-gray-600 mb-1">Current status:</p>
                      <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(viewingApplication.status)}`}>
                        {viewingApplication.status}
                      </span>
                    </div>
                  )}
                  
                  {/* All Status Buttons - Available for workflow transitions */}
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Change status to:</p>
                    <div className="flex flex-wrap gap-2">
                      {['PENDING', 'REVIEWING', 'SHORTLISTED', 'REJECTED', 'HIRED'].map((status) => {
                        const isCurrentStatus = viewingApplication.status === status;
                        const isUpdating = updatingStatus === viewingApplication.id;
                        const isDisabled = isUpdating;
                        
                        return (
                          <button
                            key={status}
                            onClick={() => {
                              if (!isDisabled && !isCurrentStatus) {
                                updateApplicationStatus(viewingApplication.id, status, viewingApplication.adminNotes);
                              }
                            }}
                            disabled={isDisabled || isCurrentStatus}
                            className={`px-4 py-2.5 rounded-lg text-xs font-semibold transition-all duration-300 ease-in-out flex-shrink-0 ${
                              isCurrentStatus
                                ? 'bg-[#02665e] text-white shadow-md cursor-default scale-105'
                                : isDisabled
                                ? 'bg-white text-gray-400 border border-gray-200 cursor-not-allowed opacity-60'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-[#02665e] hover:text-white hover:border-[#02665e] hover:shadow-md hover:scale-105 active:scale-95 cursor-pointer'
                            }`}
                            title={
                              isCurrentStatus
                                ? 'This is the current status'
                                : isUpdating
                                ? 'Updating status...'
                                : `Change status to ${status}`
                            }
                          >
                            {status}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs text-gray-500 mt-3 italic">
                      Note: Email notifications are sent only when the status actually changes.
                    </p>
                  </div>
                </div>

                {/* Status History */}
                {viewingApplication.usedStatuses && Array.isArray(viewingApplication.usedStatuses) && viewingApplication.usedStatuses.length > 0 && (
                  <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <Clock size={18} className="text-[#02665e]" />
                      <h3 className="text-base font-semibold text-gray-900">Status History</h3>
                    </div>
                    <div className="space-y-2">
                      {viewingApplication.usedStatuses.map((status: string, index: number) => (
                        <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-md">
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>
                            {status}
                          </span>
                          <span className="text-xs text-gray-500">
                            {index === viewingApplication.usedStatuses.length - 1 ? 'Current' : 'Previously used'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Submission Info */}
                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs text-gray-500 space-x-4 flex-wrap">
                    <span>Submitted: {formatDate(viewingApplication.submittedAt)}</span>
                    {viewingApplication.reviewedAt && (
                      <span>• Reviewed: {formatDate(viewingApplication.reviewedAt)}</span>
                    )}
                    {viewingApplication.reviewedByUser && (
                      <span>• By: {viewingApplication.reviewedByUser.name || viewingApplication.reviewedByUser.email}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 bg-white px-6 py-4 flex justify-end gap-3 flex-shrink-0">
              <button
                onClick={() => setViewingApplication(null)}
                className="px-6 py-2.5 bg-white border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-400 hover:shadow-sm transition-all duration-300 ease-in-out active:scale-95 text-sm"
              >
                Close
              </button>
              <button
                onClick={() => {
                  updateApplicationStatus(viewingApplication.id, viewingApplication.status, viewingApplication.adminNotes);
                }}
                className="px-6 py-2.5 bg-[#02665e] text-white rounded-lg font-medium hover:bg-[#024d47] hover:shadow-md transition-all duration-300 ease-in-out hover:scale-105 active:scale-95 text-sm"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resume Viewer Modal */}
      {viewingResume && resumeViewUrl && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
            <div className="bg-gradient-to-r from-[#02665e] to-[#024d47] px-6 py-4 flex items-center justify-between flex-shrink-0">
              <h2 className="text-xl font-bold text-white">Resume Viewer</h2>
              <div className="flex items-center gap-3">
                <a
                  href={resumeViewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-md transition-colors flex items-center gap-2 text-sm font-medium"
                >
                  <Download size={16} />
                  Download
                </a>
                <button
                  onClick={() => {
                    setViewingResume(false);
                    setResumeViewUrl(null);
                  }}
                  className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 rounded-lg transition-all duration-200 text-white group backdrop-blur-sm"
                  title="Close"
                >
                  <X size={18} className="transition-transform duration-200 group-hover:rotate-90" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-gray-100 min-w-0 min-h-0">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <PDFViewer url={resumeViewUrl} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
