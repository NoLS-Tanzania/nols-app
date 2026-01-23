"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCircle, Search, X, Calendar, MapPin, Eye, FileText } from "lucide-react";
import DatePicker from "@/components/ui/DatePicker";
import axios from "axios";

// Use same-origin for HTTP calls so Next.js rewrites proxy to the API
const api = axios.create({ baseURL: "", withCredentials: true });
function authify() {}

type RecommendedRequest = {
  id: number;
  role: string;
  tripType: string;
  destinations: string;
  dateFrom: string | null;
  dateTo: string | null;
  groupSize: number | null;
  budget: string | null;
  notes: string;
  status: string;
  customer: {
    name: string;
    email: string;
    phone: string | null;
  };
  transportRequired: boolean;
  adminResponse?: string | null;
  suggestedItineraries?: string | null;
  requiredPermits?: string | null;
  estimatedTimeline?: string | null;
  assignedAgent?: string | null;
  respondedAt?: string | null;
  createdAt: string;
};

export default function AdminPlanWithUsRecommendedPage() {
  const [role, setRole] = useState<string>("");
  const [tripType, setTripType] = useState<string>("");
  const [date, setDate] = useState<string | string[]>("");
  const [q, setQ] = useState("");
  const [list, setList] = useState<RecommendedRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 30;
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [pickerAnim, setPickerAnim] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RecommendedRequest | null>(null);
  const [showResponseModal, setShowResponseModal] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params: any = {
        page,
        pageSize,
        status: "COMPLETED", // Only show completed requests
      };
      if (role) params.role = role;
      if (tripType) params.tripType = tripType;
      if (date) {
        if (Array.isArray(date)) {
          params.start = date[0];
          params.end = date[1];
        } else {
          params.date = date;
        }
      }
      if (q) params.q = q;

      const r = await api.get<{ items: RecommendedRequest[]; total: number }>("/api/admin/plan-with-us/requests", { params });
      setList(r.data?.items ?? []);
      setTotal(r.data?.total ?? 0);
    } catch (err) {
      console.error("Failed to load recommended requests", err);
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    authify();
    load();
  }, [page, role, tripType, date, q]);

  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-full bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Recommended</h1>
          <p className="text-sm text-gray-500 mt-1">View all completed requests with feedback sent to customers</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <div className="flex flex-col gap-4 w-full max-w-full">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-3 w-full max-w-full">
            {/* Search Box */}
            <div className="relative w-full min-w-0 sm:col-span-2 lg:col-span-2 xl:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm max-w-full box-border"
                placeholder="Search recommended requests..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setPage(1);
                    load();
                  }
                }}
              />
              {q && (
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setPage(1);
                    load();
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Role Filter */}
            <div className="w-full min-w-0">
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white max-w-full box-border"
              >
                <option value="">All Roles</option>
                <option value="Event planner">Event Planner</option>
                <option value="School / Teacher">School / Teacher</option>
                <option value="University">University</option>
                <option value="Community group">Community Group</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Trip Type Filter */}
            <div className="w-full min-w-0">
              <select
                value={tripType}
                onChange={(e) => {
                  setTripType(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white max-w-full box-border"
              >
                <option value="">All Trip Types</option>
                <option value="Local tourism">Local Tourism</option>
                <option value="Safari">Safari</option>
                <option value="Cultural">Cultural</option>
                <option value="Adventure / Hiking">Adventure / Hiking</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Date Picker */}
            <div className="relative w-full min-w-0">
              <button
                type="button"
                onClick={() => {
                  setPickerAnim(true);
                  setTimeout(() => setPickerAnim(false), 350);
                  setPickerOpen((v) => !v);
                }}
                className={`w-full px-3 py-2 rounded-lg border border-gray-300 text-sm flex items-center justify-center gap-2 text-gray-700 bg-white transition-all ${
                  pickerAnim ? "ring-2 ring-blue-100" : "hover:bg-gray-50"
                } box-border`}
              >
                <Calendar className="h-4 w-4" />
                <span>Date</span>
              </button>
              {pickerOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
                  <div className="fixed z-50 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <DatePicker
                      selected={date || undefined}
                      onSelectAction={(s) => {
                        setDate(s as string | string[]);
                        setPage(1);
                      }}
                      onCloseAction={() => setPickerOpen(false)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recommended Requests Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <>
            {/* Skeleton Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trip Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responded At</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-12"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-40"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-20"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-28"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="h-8 bg-gray-200 rounded w-24 ml-auto"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : list.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No recommended requests found.</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trip Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responded At</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {list.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">#{request.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          <div className="font-medium">{request.customer.name}</div>
                          <div className="text-xs text-gray-400">{request.customer.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{request.role}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{request.tripType}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          <span className="max-w-xs truncate">{request.destinations || "N/A"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {request.respondedAt ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>{new Date(request.respondedAt).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedRequest(request);
                            setShowResponseModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 flex items-center gap-1 ml-auto"
                        >
                          <Eye className="h-4 w-4" />
                          View Feedback
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200">
              {list.map((request) => (
                <div key={request.id} className="p-4 bg-white hover:bg-gray-50 transition-colors duration-150">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-gray-900">Request #{request.id}</span>
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      Completed
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    <span>Role: {request.role} • Type: {request.tripType}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                    <span>Customer: {request.customer.name}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>Destination: {request.destinations || "N/A"}</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span>
                      Responded: {request.respondedAt ? new Date(request.respondedAt).toLocaleDateString() : "N/A"}
                    </span>
                  </div>
                  <div className="mt-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowResponseModal(true);
                      }}
                      className="text-blue-600 hover:text-blue-900 text-sm flex items-center gap-1 ml-auto"
                    >
                      <Eye className="h-4 w-4" />
                      View Feedback
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {list.length > 0 && (
        <div className="flex justify-center py-4">
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
              Page {page} of {pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </nav>
        </div>
      )}

      {/* View Feedback Modal */}
      {showResponseModal && selectedRequest && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowResponseModal(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Feedback Sent to Customer</h2>
                <button
                  onClick={() => setShowResponseModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Request Details */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold text-gray-900 mb-3">Original Request</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Customer:</span>
                      <span className="ml-2 font-medium">{selectedRequest.customer.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Email:</span>
                      <span className="ml-2">{selectedRequest.customer.email}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Role:</span>
                      <span className="ml-2">{selectedRequest.role}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Trip Type:</span>
                      <span className="ml-2">{selectedRequest.tripType}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Destination:</span>
                      <span className="ml-2">{selectedRequest.destinations || "N/A"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Group Size:</span>
                      <span className="ml-2">{selectedRequest.groupSize || "N/A"}</span>
                    </div>
                  </div>
                  {selectedRequest.notes && (
                    <div className="mt-3">
                      <span className="text-gray-500 text-sm">Notes:</span>
                      <p className="mt-1 text-sm text-gray-700">{selectedRequest.notes}</p>
                    </div>
                  )}
                </div>

                {/* Admin Response */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Feedback Provided</h3>

                  {selectedRequest.suggestedItineraries && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Suggested Itineraries with Prices
                      </label>
                      <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm whitespace-pre-wrap">
                        {selectedRequest.suggestedItineraries}
                      </div>
                    </div>
                  )}

                  {selectedRequest.requiredPermits && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Checklist of Required Permits and Documents
                      </label>
                      <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm whitespace-pre-wrap">
                        {selectedRequest.requiredPermits}
                      </div>
                    </div>
                  )}

                  {selectedRequest.estimatedTimeline && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Estimated Timelines and Booking Windows
                      </label>
                      <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm whitespace-pre-wrap">
                        {selectedRequest.estimatedTimeline}
                      </div>
                    </div>
                  )}

                  {selectedRequest.assignedAgent && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Assigned Agent / Contact
                      </label>
                      <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm">
                        {selectedRequest.assignedAgent}
                      </div>
                    </div>
                  )}

                  {selectedRequest.adminResponse && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Additional Notes / Recommendations
                      </label>
                      <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm whitespace-pre-wrap">
                        {selectedRequest.adminResponse}
                      </div>
                    </div>
                  )}

                  {selectedRequest.respondedAt && (
                    <div className="pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-500">
                        Feedback sent on: <span className="font-medium">{new Date(selectedRequest.respondedAt).toLocaleString()}</span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

