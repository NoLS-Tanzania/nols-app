"use client";
import React, { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Loader2, GraduationCap, MapPin, Languages, Briefcase, FileText, XCircle, UserPlus } from "lucide-react";
import axios from "axios";
import Link from "next/link";

const api = axios.create({ baseURL: "", withCredentials: true });

type UserOption = {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
};

export default function NewAgentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [formData, setFormData] = useState({
    userId: "",
    status: "ACTIVE",
    educationLevel: "",
    yearsOfExperience: "",
    bio: "",
    isAvailable: true,
    maxActiveRequests: "10",
    // Arrays (will be converted to JSON)
    areasOfOperation: [] as string[],
    certifications: [] as Array<{ name: string; issuer: string; year: string; expiryDate?: string }>,
    languages: [] as string[],
    specializations: [] as string[],
  });

  // Temporary input states for arrays
  const [areaInput, setAreaInput] = useState("");
  const [languageInput, setLanguageInput] = useState("");
  const [specializationInput, setSpecializationInput] = useState("");
  const [certInput, setCertInput] = useState({ name: "", issuer: "", year: "", expiryDate: "" });

  // Load users for selection
  useEffect(() => {
    async function loadUsers() {
      try {
        const response = await api.get<{ data: UserOption[] }>("/api/admin/users", {
          params: { perPage: 100, role: "" }, // Get all users
        });
        setUsers(response.data.data || []);
      } catch (err) {
        console.error("Failed to load users", err);
      } finally {
        setUsersLoading(false);
      }
    }
    loadUsers();
  }, []);

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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrors({});

    // Validation
    if (!formData.userId) {
      setErrors({ userId: "Please select a user" });
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        userId: Number(formData.userId),
        status: formData.status,
        educationLevel: formData.educationLevel || null,
        yearsOfExperience: formData.yearsOfExperience ? Number(formData.yearsOfExperience) : null,
        bio: formData.bio || null,
        isAvailable: formData.isAvailable,
        maxActiveRequests: Number(formData.maxActiveRequests),
      };

      // Add JSON fields
      if (formData.areasOfOperation.length > 0) {
        payload.areasOfOperation = formData.areasOfOperation;
      }
      if (formData.languages.length > 0) {
        payload.languages = formData.languages;
      }
      if (formData.specializations.length > 0) {
        payload.specializations = formData.specializations;
      }
      if (formData.certifications.length > 0) {
        payload.certifications = formData.certifications;
      }

      await api.post("/api/admin/agents", payload);
      router.push("/admin/agents");
    } catch (err: any) {
      console.error("Failed to create agent", err);
      const errorMessage = err?.response?.data?.error || err?.response?.data?.message || err?.message || "Failed to create agent. Please try again.";
      setErrors({
        submit: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center gap-4">
          <Link
            href="/admin/agents"
            className="self-start p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div className="flex flex-col items-center gap-3">
            <div className="h-16 w-16 rounded-full bg-[#02665e]/10 flex items-center justify-center">
              <UserPlus className="h-8 w-8 text-[#02665e]" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">Add New Agent</h1>
              <p className="text-sm text-gray-500 mt-1">Create a new agent profile</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden w-full min-w-0">
        {/* Basic Information Section */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
          <div className="space-y-5">
            {/* User Selection */}
            <div className="space-y-2">
              <label htmlFor="userId" className="block text-sm font-semibold text-gray-900">
                Select User <span className="text-red-500">*</span>
              </label>
              {usersLoading ? (
                <div className="text-sm text-gray-500">Loading users...</div>
              ) : (
                <>
                  <select
                    id="userId"
                    value={formData.userId}
                    onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
                    className={`w-full min-w-0 max-w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] outline-none text-sm bg-white hover:border-gray-300 transition-all duration-200 cursor-pointer box-border ${
                      errors.userId ? "border-red-300" : "border-gray-200"
                    }`}
                  >
                    <option value="">Select a user...</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name || user.email || user.phone || `User #${user.id}`}
                        {user.email && ` (${user.email})`}
                      </option>
                    ))}
                  </select>
                  {errors.userId && (
                    <p className="text-sm text-red-600">{errors.userId}</p>
                  )}
                </>
              )}
            </div>

            {/* Status and Availability */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full min-w-0">
              <div className="space-y-2 min-w-0">
                <label htmlFor="status" className="block text-sm font-semibold text-gray-900">
                  Status
                </label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full min-w-0 max-w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] outline-none text-sm bg-white hover:border-gray-300 transition-all duration-200 cursor-pointer box-border"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>

              <div className="space-y-2 min-w-0">
                <label htmlFor="maxActiveRequests" className="block text-sm font-semibold text-gray-900">
                  Max Active Requests
                </label>
                <input
                  type="number"
                  id="maxActiveRequests"
                  min="1"
                  max="50"
                  value={formData.maxActiveRequests}
                  onChange={(e) => setFormData({ ...formData, maxActiveRequests: e.target.value })}
                  className="w-full min-w-0 max-w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] outline-none text-sm bg-white hover:border-gray-300 transition-all duration-200 box-border"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Education & Experience Section */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Education & Experience</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full min-w-0">
            <div className="space-y-2 min-w-0">
              <label htmlFor="educationLevel" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-[#02665e] flex-shrink-0" />
                Education Level
              </label>
              <select
                id="educationLevel"
                value={formData.educationLevel}
                onChange={(e) => setFormData({ ...formData, educationLevel: e.target.value })}
                className="w-full min-w-0 max-w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] outline-none text-sm bg-white hover:border-gray-300 transition-all duration-200 cursor-pointer box-border"
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

            <div className="space-y-2 min-w-0">
              <label htmlFor="yearsOfExperience" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-[#02665e] flex-shrink-0" />
                Years of Experience
              </label>
              <input
                type="number"
                id="yearsOfExperience"
                min="0"
                max="50"
                value={formData.yearsOfExperience}
                onChange={(e) => setFormData({ ...formData, yearsOfExperience: e.target.value })}
                className="w-full min-w-0 max-w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] outline-none text-sm bg-white hover:border-gray-300 transition-all duration-200 box-border"
                placeholder="e.g., 5"
              />
            </div>
          </div>
        </div>

        {/* Skills & Expertise Section */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Skills & Expertise</h2>
          <div className="space-y-5">
            {/* Areas of Operation */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#02665e]" />
                Areas of Operation
              </label>
          <div className="flex gap-2 w-full min-w-0">
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
              className="flex-1 min-w-0 max-w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] outline-none text-sm bg-white hover:border-gray-300 transition-all duration-200 box-border"
            />
            <button
              type="button"
              onClick={handleAddArea}
              className="px-4 py-2.5 bg-[#02665e] text-white rounded-xl text-sm font-medium hover:bg-[#014d47] transition-all duration-200"
            >
              Add
            </button>
          </div>
          {formData.areasOfOperation.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
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
              <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Languages className="h-4 w-4 text-[#02665e]" />
                Languages
              </label>
          <div className="flex gap-2 w-full min-w-0">
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
              className="flex-1 min-w-0 max-w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] outline-none text-sm bg-white hover:border-gray-300 transition-all duration-200 box-border"
            />
            <button
              type="button"
              onClick={handleAddLanguage}
              className="px-4 py-2.5 bg-[#02665e] text-white rounded-xl text-sm font-medium hover:bg-[#014d47] transition-all duration-200"
            >
              Add
            </button>
          </div>
          {formData.languages.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
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
              <label className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-[#02665e]" />
                Specializations
              </label>
          <div className="flex gap-2 w-full min-w-0">
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
              className="flex-1 min-w-0 max-w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] outline-none text-sm bg-white hover:border-gray-300 transition-all duration-200 box-border"
            />
            <button
              type="button"
              onClick={handleAddSpecialization}
              className="px-4 py-2.5 bg-[#02665e] text-white rounded-xl text-sm font-medium hover:bg-[#014d47] transition-all duration-200"
            >
              Add
            </button>
          </div>
          {formData.specializations.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
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
        </div>

        {/* Certifications Section */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Certifications</h2>
          <div className="space-y-3">
            <div className="space-y-3 p-4 bg-gray-50 rounded-xl border border-gray-200 w-full min-w-0 overflow-hidden">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full min-w-0">
              <div className="min-w-0">
                <input
                  type="text"
                  value={certInput.name}
                  onChange={(e) => setCertInput({ ...certInput, name: e.target.value })}
                  placeholder="Certification name"
                  className="w-full min-w-0 max-w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] outline-none text-sm bg-white transition-all duration-200 box-border"
                />
              </div>
              <div className="min-w-0">
                <input
                  type="text"
                  value={certInput.issuer}
                  onChange={(e) => setCertInput({ ...certInput, issuer: e.target.value })}
                  placeholder="Issuer"
                  className="w-full min-w-0 max-w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] outline-none text-sm bg-white transition-all duration-200 box-border"
                />
              </div>
              <div className="min-w-0">
                <input
                  type="text"
                  value={certInput.year}
                  onChange={(e) => setCertInput({ ...certInput, year: e.target.value })}
                  placeholder="Year"
                  className="w-full min-w-0 max-w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] outline-none text-sm bg-white transition-all duration-200 box-border"
                />
              </div>
              <div className="min-w-0">
                <input
                  type="text"
                  value={certInput.expiryDate}
                  onChange={(e) => setCertInput({ ...certInput, expiryDate: e.target.value })}
                  placeholder="Expiry date (optional)"
                  className="w-full min-w-0 max-w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] outline-none text-sm bg-white transition-all duration-200 box-border"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={handleAddCertification}
              className="px-4 py-2 bg-[#02665e] text-white rounded-lg text-sm font-medium hover:bg-[#014d47] transition-all duration-200"
            >
              Add Certification
            </button>
          </div>
            {formData.certifications.length > 0 && (
              <div className="space-y-2 mt-2">
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
                      className="hover:text-amber-900"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Additional Information Section */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
          <div className="space-y-5">
            {/* Bio */}
            <div className="space-y-2">
              <label htmlFor="bio" className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#02665e]" />
                Bio / Description
              </label>
              <textarea
                id="bio"
                rows={4}
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Enter agent bio or description..."
                className="w-full min-w-0 max-w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#02665e]/20 focus:border-[#02665e] outline-none text-sm bg-white hover:border-gray-300 transition-all duration-200 resize-y box-border"
              />
            </div>

            {/* Availability Toggle */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <input
                type="checkbox"
                id="isAvailable"
                checked={formData.isAvailable}
                onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
                className="w-5 h-5 text-[#02665e] border-gray-300 rounded focus:ring-[#02665e] cursor-pointer"
              />
              <label htmlFor="isAvailable" className="text-sm font-medium text-gray-900 cursor-pointer">
                Agent is available for new assignments
              </label>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {errors.submit && (
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {errors.submit}
            </div>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="p-4 sm:p-6 flex items-center justify-end gap-3">
          <Link
            href="/admin/agents"
            className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all duration-200"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-[#02665e] text-white rounded-xl text-sm font-semibold hover:bg-[#014d47] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Create Agent
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

