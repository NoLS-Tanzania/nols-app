"use client";

import React, { useEffect, useState, useRef } from "react";
import { Gift, TrendingUp, Calendar, CheckCircle, Clock, AlertCircle, Download, FileText, Trophy, BarChart3, Gem, Star, Target, Bell } from "lucide-react";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const api = axios.create({ baseURL: "" });

interface BonusHistory {
  id: string;
  date: string;
  amount: number;
  period: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  reason?: string;
  claimedAt?: string;
  paidAt?: string;
}

interface BonusEligibility {
  eligible: boolean;
  currentPeriod: string;
  tripsRequired: number;
  tripsCompleted: number;
  ratingRequired: number;
  currentRating: number;
  earningsRequired: number;
  currentEarnings: number;
  nextBonusDate?: string;
  progress: {
    trips: number;
    rating: number;
    earnings: number;
  };
}

interface PerformanceMetrics {
  driver: {
    id: number;
    name: string;
    email: string;
  };
  metrics: {
    rating: number;
    completionRate: number;
    cancellationRate: number;
    meetsPerformanceExcellence: boolean;
    monthlyTrips: number;
    totalTrips: number;
    activeDaysThisMonth: number;
    meetsVolumeMilestone: boolean;
    monthsOfService: number;
    meetsLoyaltyCriteria: boolean;
  };
  progress: {
    performanceExcellence: {
      rating: number;
      completionRate: number;
      cancellationRate: number;
    };
    volumeAchievement: {
      trips: number;
      activeDays: number;
    };
    loyaltyRetention: {
      monthsOfService: number;
      activeDays: number;
    };
  };
  period: {
    current: string;
    startOfMonth: string;
    endOfMonth: string;
  };
  totalReviews: number;
}

interface BonusNotification {
  bonusAmount: number;
  bonusReasonType: string;
  reason: string;
  period: string;
  bonusPaymentRef: string;
  grantedAt: string;
  grantedBy: {
    id: number;
    name: string;
  };
}

// Skeleton loader components
const SummaryCardSkeleton = () => (
  <div className="bg-white rounded-lg p-6 border-2 border-slate-200 shadow-sm animate-pulse">
    <div className="flex items-center justify-between">
      <div className="flex-1">
        <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
        <div className="h-8 bg-slate-200 rounded w-32"></div>
      </div>
      <div className="h-12 w-12 rounded-full bg-slate-200"></div>
    </div>
  </div>
);

const ProgressBarSkeleton = () => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <div className="h-4 bg-slate-200 rounded w-16"></div>
      <div className="h-4 bg-slate-200 rounded w-20"></div>
    </div>
    <div className="w-full bg-slate-200 rounded-full h-3"></div>
    <div className="h-3 bg-slate-200 rounded w-24 mt-1"></div>
  </div>
);

const EligibilitySkeleton = () => (
  <section className="w-full max-w-full bg-white rounded-lg p-6 border-2 border-slate-200 shadow-sm">
    <div className="flex items-center gap-2 mb-6">
      <div className="h-5 w-5 bg-slate-200 rounded"></div>
      <div className="h-6 bg-slate-200 rounded w-40"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      <ProgressBarSkeleton />
      <ProgressBarSkeleton />
      <ProgressBarSkeleton />
    </div>
    <div className="p-4 rounded-lg border-2 border-slate-200 bg-slate-50 animate-pulse">
      <div className="h-20 bg-slate-200 rounded"></div>
    </div>
  </section>
);

const ChartSkeleton = () => (
  <section className="w-full max-w-full bg-white rounded-lg p-6 border-2 border-slate-200 shadow-sm">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 bg-slate-200 rounded"></div>
        <div className="h-6 bg-slate-200 rounded w-32"></div>
      </div>
      <div className="flex gap-2">
        <div className="h-8 bg-slate-200 rounded w-16"></div>
        <div className="h-8 bg-slate-200 rounded w-20"></div>
        <div className="h-8 bg-slate-200 rounded w-16"></div>
      </div>
    </div>
    <div className="h-64 bg-slate-100 rounded-lg animate-pulse"></div>
  </section>
);

const TableSkeleton = () => (
  <section className="w-full max-w-full bg-white rounded-lg p-6 border-2 border-slate-200 shadow-sm">
    <div className="flex items-center gap-2 mb-6">
      <div className="h-5 w-5 bg-slate-200 rounded"></div>
      <div className="h-6 bg-slate-200 rounded w-32"></div>
    </div>
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <th key={i} className="px-6 py-3">
                <div className="h-4 bg-slate-200 rounded w-20"></div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[1, 2, 3].map((i) => (
            <tr key={i} className="border-b border-slate-100">
              {[1, 2, 3, 4, 5, 6].map((j) => (
                <td key={j} className="px-6 py-4">
                  <div className="h-4 bg-slate-200 rounded w-24"></div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

export default function DriverBonusPage() {
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingEligibility, setLoadingEligibility] = useState(true);
  const [loadingPerformance, setLoadingPerformance] = useState(true);
  const [bonusHistory, setBonusHistory] = useState<BonusHistory[]>([]);
  const [eligibility, setEligibility] = useState<BonusEligibility | null>(null);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [bonusNotification, setBonusNotification] = useState<BonusNotification | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Fetch bonus data
  const fetchBonusData = async () => {
    const token = localStorage.getItem("token");
    if (token) api.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    // Fetch bonus history
    setLoadingHistory(true);
    try {
      const historyRes = await api.get("/api/driver/bonus/history");
      if (Array.isArray(historyRes.data)) {
        setBonusHistory(historyRes.data);
      } else {
        setBonusHistory([]);
      }
    } catch (e: any) {
      if (e?.response?.status >= 500 || !e?.response) {
        console.error("Failed to load bonus history", e);
        setInfoMessage("Unable to connect to server. Please check your connection and try again.");
        setBonusHistory([]);
      } else {
        setBonusHistory([]);
      }
    } finally {
      setLoadingHistory(false);
    }

    // Fetch eligibility
    setLoadingEligibility(true);
    try {
      const eligibilityRes = await api.get("/api/driver/bonus/eligibility");
      setEligibility(eligibilityRes.data);
    } catch (e: any) {
      if (e?.response?.status >= 500 || !e?.response) {
        console.error("Failed to load bonus eligibility", e);
        setEligibility(null);
      } else {
        setEligibility(null);
      }
    } finally {
      setLoadingEligibility(false);
    }

    // Fetch performance metrics
    setLoadingPerformance(true);
    try {
      const performanceRes = await api.get("/api/driver/performance");
      setPerformance(performanceRes.data);
    } catch (e: any) {
      if (e?.response?.status >= 500 || !e?.response) {
        console.error("Failed to load performance metrics", e);
        setPerformance(null);
      } else {
        setPerformance(null);
      }
    } finally {
      setLoadingPerformance(false);
    }
  };

  useEffect(() => {
    fetchBonusData();

    // Setup Socket.IO for real-time bonus notifications
    if (typeof window !== "undefined") {
      const url = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000";
      const token = localStorage.getItem("token");
      
      const socket = io(url, {
        transports: ["websocket"],
        autoConnect: true,
        reconnection: true,
        auth: token ? { token } : undefined,
      });

      socketRef.current = socket;

      // Get driver ID from token or API
      socket.on("connect", async () => {
        try {
          // Get driver ID from token or performance endpoint
          const perfRes = await api.get("/api/driver/performance").catch(() => null);
          if (perfRes?.data?.driver?.id) {
            socket.emit("join-driver-room", { driverId: perfRes.data.driver.id });
          }
        } catch (e) {
          console.warn("Failed to join driver room", e);
        }
      });

      // Listen for bonus granted notifications
      socket.on("bonus-granted", (notification: BonusNotification) => {
        setBonusNotification(notification);
        // Refresh bonus data
        fetchBonusData();
        
        // Auto-hide notification after 10 seconds
        setTimeout(() => {
          setBonusNotification(null);
        }, 10000);
      });

      return () => {
        socket.off("bonus-granted");
        socket.disconnect();
        socketRef.current = null;
      };
    }
  }, []);

  const formatAmount = (amt: number) => {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "TZS",
      maximumFractionDigits: 0,
    }).format(amt);
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString();
  };

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    let bgColor = 'bg-gray-100 text-gray-700';
    let icon = Clock;

    if (statusLower === 'paid' || statusLower === 'approved') {
      bgColor = 'bg-green-100 text-green-700';
      icon = CheckCircle;
    } else if (statusLower === 'pending') {
      bgColor = 'bg-amber-100 text-amber-700';
      icon = Clock;
    } else if (statusLower === 'rejected') {
      bgColor = 'bg-red-100 text-red-700';
      icon = AlertCircle;
    }

    const Icon = icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColor}`}>
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // Filter and prepare chart data based on selected period
  const getFilteredChartData = () => {
    const now = new Date();
    let filtered = bonusHistory.filter((b) => {
      const bonusDate = new Date(b.date);
      const diffTime = now.getTime() - bonusDate.getTime();
      const diffDays = diffTime / (1000 * 60 * 60 * 24);

      if (selectedPeriod === 'week') {
        return diffDays <= 7;
      } else if (selectedPeriod === 'month') {
        return diffDays <= 30;
      } else if (selectedPeriod === 'year') {
        return diffDays <= 365;
      }
      return true;
    });

    // Sort by date
    filtered = filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Group and aggregate data based on selected period
    if (selectedPeriod === 'week') {
      // Group by week
      const weekGroups: Record<string, { amount: number; count: number; date: string }> = {};
      filtered.forEach((b) => {
        const date = new Date(b.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
        const weekKey = `Week ${Math.ceil((date.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24 * 7))}`;
        
        if (!weekGroups[weekKey]) {
          weekGroups[weekKey] = { amount: 0, count: 0, date: b.date };
        }
        weekGroups[weekKey].amount += b.amount;
        weekGroups[weekKey].count += 1;
      });

      return Object.entries(weekGroups)
        .map(([period, data]) => ({
          period,
          amount: data.amount,
          date: formatDate(data.date),
          fullDate: data.date,
        }))
        .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
    } else if (selectedPeriod === 'month') {
      // Group by month
      const monthGroups: Record<string, { amount: number; count: number; date: string }> = {};
      filtered.forEach((b) => {
        const date = new Date(b.date);
        const monthKey = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        if (!monthGroups[monthKey]) {
          monthGroups[monthKey] = { amount: 0, count: 0, date: b.date };
        }
        monthGroups[monthKey].amount += b.amount;
        monthGroups[monthKey].count += 1;
      });

      return Object.entries(monthGroups)
        .map(([period, data]) => ({
          period,
          amount: data.amount,
          date: formatDate(data.date),
          fullDate: data.date,
        }))
        .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
    } else if (selectedPeriod === 'year') {
      // Group by year
      const yearGroups: Record<string, { amount: number; count: number; date: string }> = {};
      filtered.forEach((b) => {
        const date = new Date(b.date);
        const yearKey = date.getFullYear().toString();
        
        if (!yearGroups[yearKey]) {
          yearGroups[yearKey] = { amount: 0, count: 0, date: b.date };
        }
        yearGroups[yearKey].amount += b.amount;
        yearGroups[yearKey].count += 1;
      });

      return Object.entries(yearGroups)
        .map(([period, data]) => ({
          period: `Year ${period}`,
          amount: data.amount,
          date: formatDate(data.date),
          fullDate: data.date,
        }))
        .sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
    }

    // Default: return individual entries
    return filtered.map((b) => ({
      period: b.period,
      amount: b.amount,
      date: formatDate(b.date),
      fullDate: b.date,
    }));
  };

  const chartData = getFilteredChartData();

  // Calculate totals based on filtered data
  const totalBonuses = bonusHistory.reduce((sum, b) => sum + b.amount, 0);
  const paidBonuses = bonusHistory.filter((b) => b.status === 'paid').reduce((sum, b) => sum + b.amount, 0);
  const pendingBonuses = bonusHistory.filter((b) => b.status === 'pending').reduce((sum, b) => sum + b.amount, 0);

  return (
    <div className="w-full max-w-full space-y-6 overflow-x-hidden">
      {/* Header */}
      <div className="w-full text-center">
        <div className="flex flex-col items-center mb-6">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-50 text-emerald-600">
            <Gift className="h-6 w-6" aria-hidden />
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-gray-900">Bonus</h1>
        </div>
      </div>

      {infoMessage && (
        <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-blue-700">
            <AlertCircle className="h-5 w-5" />
            <span className="text-sm font-medium">{infoMessage}</span>
          </div>
        </div>
      )}

      {/* Bonus Notification Banner */}
      {bonusNotification && (
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-lg p-4 mb-6 animate-fade-in">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <Bell className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-emerald-900 mb-1">New Bonus Granted! 🎉</h3>
                <p className="text-sm text-emerald-700 mb-2">
                  You've received a <strong>{formatAmount(bonusNotification.bonusAmount)}</strong> bonus for <strong>{bonusNotification.reason}</strong>
                </p>
                <p className="text-xs text-emerald-600">
                  Period: {bonusNotification.period} • Reference: {bonusNotification.bonusPaymentRef}
                </p>
              </div>
            </div>
            <button
              onClick={() => setBonusNotification(null)}
              className="text-emerald-600 hover:text-emerald-700 flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {!loadingHistory && bonusHistory.length === 0 && !infoMessage && (
        <div className="bg-slate-50 border-2 border-slate-200 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 text-slate-700">
            <Gift className="h-5 w-5 text-slate-500" />
            <div>
              <div className="text-sm font-medium">No bonuses available</div>
              <div className="text-xs text-slate-500 mt-1">You don't have any bonuses to show yet. Complete trips to earn bonuses.</div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {loadingHistory ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-6 border-2 border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-600 mb-1">Total Bonuses</div>
                  <div className="text-2xl font-bold text-gray-900">{formatAmount(totalBonuses)}</div>
                </div>
                <div className="h-12 w-12 rounded-full bg-emerald-50 flex items-center justify-center">
                  <Gift className="h-6 w-6 text-emerald-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border-2 border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-600 mb-1">Paid</div>
                  <div className="text-2xl font-bold text-green-700">{formatAmount(paidBonuses)}</div>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 border-2 border-slate-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-slate-600 mb-1">Pending</div>
                  <div className="text-2xl font-bold text-amber-700">{formatAmount(pendingBonuses)}</div>
                </div>
                <div className="h-12 w-12 rounded-full bg-amber-50 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </div>
          </div>
      )}

      {/* Performance Metrics Section */}
      {loadingPerformance ? (
        <EligibilitySkeleton />
      ) : performance ? (
        <section className="w-full max-w-full bg-white rounded-lg p-6 border-2 border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <Target className="h-5 w-5 text-emerald-600" />
            <h2 className="text-xl font-semibold text-gray-900">Performance Metrics & Bonus Eligibility</h2>
          </div>

          {/* Current Performance Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-medium text-blue-700">Rating</span>
              </div>
              <p className="text-2xl font-bold text-blue-900">{performance.metrics.rating.toFixed(1)}</p>
              <p className="text-xs text-blue-600 mt-1">{performance.totalReviews} reviews</p>
            </div>
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-700">Completion Rate</span>
              </div>
              <p className="text-2xl font-bold text-emerald-900">{performance.metrics.completionRate}%</p>
              <p className="text-xs text-emerald-600 mt-1">{performance.metrics.monthlyTrips} trips this month</p>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-medium text-amber-700">Active Days</span>
              </div>
              <p className="text-2xl font-bold text-amber-900">{performance.metrics.activeDaysThisMonth}</p>
              <p className="text-xs text-amber-600 mt-1">Days with trips</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
              <div className="flex items-center gap-2 mb-2">
                <Gem className="h-4 w-4 text-purple-600" />
                <span className="text-xs font-medium text-purple-700">Service</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">{performance.metrics.monthsOfService}</p>
              <p className="text-xs text-purple-600 mt-1">Months active</p>
            </div>
          </div>

          {/* Bonus Type Eligibility Progress */}
          <div className="space-y-6">
            {/* Performance Excellence */}
            <div className="p-4 bg-gradient-to-r from-amber-50 to-amber-100 rounded-lg border border-amber-200">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="h-5 w-5 text-amber-600" />
                <h3 className="font-semibold text-amber-900">Performance Excellence Bonus</h3>
                {performance.metrics.meetsPerformanceExcellence && (
                  <span className="ml-auto px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">Eligible ✓</span>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-amber-800">Rating ≥ 4.7</span>
                    <span className="text-sm font-medium text-amber-900">
                      {performance.metrics.rating.toFixed(1)} / 4.7
                      {performance.metrics.rating >= 4.7 ? " ✓" : ""}
                    </span>
                  </div>
                  <div className="w-full bg-amber-200 rounded-full h-2">
                    <div
                      className="bg-amber-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, performance.progress.performanceExcellence.rating)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-amber-800">Completion Rate ≥ 95%</span>
                    <span className="text-sm font-medium text-amber-900">
                      {performance.metrics.completionRate}% / 95%
                      {performance.metrics.completionRate >= 95 ? " ✓" : ""}
                    </span>
                  </div>
                  <div className="w-full bg-amber-200 rounded-full h-2">
                    <div
                      className="bg-amber-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, performance.progress.performanceExcellence.completionRate)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-amber-800">Cancellation Rate &lt; 5%</span>
                    <span className="text-sm font-medium text-amber-900">
                      {performance.metrics.cancellationRate}% / 5%
                      {performance.metrics.cancellationRate < 5 ? " ✓" : ""}
                    </span>
                  </div>
                  <div className="w-full bg-amber-200 rounded-full h-2">
                    <div
                      className="bg-red-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, performance.metrics.cancellationRate * 20)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Volume Achievement */}
            <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                <h3 className="font-semibold text-blue-900">Volume Achievement Bonus</h3>
                {performance.metrics.meetsVolumeMilestone && (
                  <span className="ml-auto px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">Eligible ✓</span>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-blue-800">Monthly Trips</span>
                    <span className="text-sm font-medium text-blue-900">
                      {performance.metrics.monthlyTrips} trips
                      {performance.metrics.monthlyTrips >= 50 ? " ✓" : ""}
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, performance.progress.volumeAchievement.trips)}%` }}
                    />
                  </div>
                  <p className="text-xs text-blue-600 mt-1">
                    Milestones: 50 trips (100k TZS), 100 trips (150k TZS), 200+ trips (200k TZS)
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-blue-800">Active Days This Month</span>
                    <span className="text-sm font-medium text-blue-900">
                      {performance.metrics.activeDaysThisMonth} days
                    </span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, performance.progress.volumeAchievement.activeDays)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Loyalty & Retention */}
            <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-4">
                <Gem className="h-5 w-5 text-purple-600" />
                <h3 className="font-semibold text-purple-900">Loyalty & Retention Bonus</h3>
                {performance.metrics.meetsLoyaltyCriteria && (
                  <span className="ml-auto px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-medium">Eligible ✓</span>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-purple-800">Months of Service ≥ 6</span>
                    <span className="text-sm font-medium text-purple-900">
                      {performance.metrics.monthsOfService} months
                      {performance.metrics.monthsOfService >= 6 ? " ✓" : ""}
                    </span>
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, performance.progress.loyaltyRetention.monthsOfService)}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-purple-800">Active Days ≥ 20</span>
                    <span className="text-sm font-medium text-purple-900">
                      {performance.metrics.activeDaysThisMonth} / 20 days
                      {performance.metrics.activeDaysThisMonth >= 20 ? " ✓" : ""}
                    </span>
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, performance.progress.loyaltyRetention.activeDays)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* Eligibility Section */}
      {loadingEligibility ? (
        <EligibilitySkeleton />
      ) : eligibility ? (
            <section className="w-full max-w-full bg-white rounded-lg p-6 border-2 border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
                <h2 className="text-xl font-semibold text-gray-900">Eligibility Status</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Trips Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Trips</span>
                    <span className="text-sm text-slate-600">
                      {eligibility.tripsCompleted} / {eligibility.tripsRequired}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div
                      className="bg-emerald-600 h-3 rounded-full transition-all"
                      style={{ width: `${Math.min(100, eligibility.progress.trips)}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {eligibility.progress.trips}% complete
                  </div>
                </div>

                {/* Rating Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Rating</span>
                    <span className="text-sm text-slate-600">
                      {eligibility.currentRating.toFixed(1)} / {eligibility.ratingRequired}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div
                      className="bg-emerald-600 h-3 rounded-full transition-all"
                      style={{ width: `${Math.min(100, eligibility.progress.rating)}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {eligibility.progress.rating}% complete
                  </div>
                </div>

                {/* Earnings Progress */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Earnings</span>
                    <span className="text-sm text-slate-600">
                      {formatAmount(eligibility.currentEarnings)} / {formatAmount(eligibility.earningsRequired)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div
                      className="bg-emerald-600 h-3 rounded-full transition-all"
                      style={{ width: `${Math.min(100, eligibility.progress.earnings)}%` }}
                    />
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {eligibility.progress.earnings}% complete
                  </div>
                </div>
              </div>

              <div className={`p-4 rounded-lg border-2 ${
                eligibility.eligible
                  ? 'bg-green-50 border-green-200'
                  : 'bg-amber-50 border-amber-200'
              }`}>
                <div className="flex items-start gap-3">
                  {eligibility.eligible ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                  )}
                  <div>
                    <div className={`font-semibold ${
                      eligibility.eligible ? 'text-green-800' : 'text-amber-800'
                    }`}>
                      {eligibility.eligible
                        ? 'You are eligible for bonus!'
                        : 'Continue working to become eligible'}
                    </div>
                    <div className={`text-sm mt-1 ${
                      eligibility.eligible ? 'text-green-700' : 'text-amber-700'
                    }`}>
                      {eligibility.eligible
                        ? `You've met all requirements for ${eligibility.currentPeriod}`
                        : `Complete ${eligibility.tripsRequired - eligibility.tripsCompleted} more trips and earn ${formatAmount(eligibility.earningsRequired - eligibility.currentEarnings)} more to qualify`}
                    </div>
                  </div>
                </div>
              </div>
            </section>
      ) : null}

      {/* Bonus History Chart */}
      {loadingHistory ? (
        <ChartSkeleton />
      ) : bonusHistory.length > 0 ? (
            <section className="w-full max-w-full bg-white rounded-lg p-6 border-2 border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-emerald-600" />
                  <h2 className="text-xl font-semibold text-gray-900">Bonus History</h2>
                </div>
                <div className="flex gap-2">
                  {(['week', 'month', 'year'] as const).map((period) => (
                    <button
                      key={period}
                      onClick={() => setSelectedPeriod(period)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        selectedPeriod === period
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-64 mb-6">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="period" 
                        tick={{ fontSize: 12 }}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => {
                          if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                          return value.toString();
                        }}
                      />
                      <Tooltip
                        formatter={(value: number) => formatAmount(value)}
                        labelFormatter={(label) => `Period: ${label}`}
                        contentStyle={{ 
                          backgroundColor: 'white', 
                          border: '2px solid #e2e8f0', 
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={{ fill: '#10b981', r: 5, strokeWidth: 2, stroke: '#fff' }}
                        activeDot={{ r: 7, fill: '#059669' }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500">
                    <div className="text-center">
                      <Calendar className="h-12 w-12 text-slate-300 mx-auto mb-2" />
                      <div className="text-sm">No bonus data for {selectedPeriod}</div>
                    </div>
                  </div>
                )}
              </div>
            </section>
      ) : null}

      {/* Bonus History Table */}
      {loadingHistory ? (
        <TableSkeleton />
      ) : (
        <section className="w-full max-w-full bg-white rounded-lg p-6 border-2 border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600" />
                <h2 className="text-xl font-semibold text-gray-900">Bonus Claims</h2>
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200 max-w-full">
              <table className="w-full divide-y divide-slate-200 table-auto">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Period</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Paid At</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {bonusHistory.length > 0 ? (
                    bonusHistory.map((bonus) => (
                      <tr key={bonus.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-slate-900 whitespace-nowrap">
                          {formatDate(bonus.date)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700">{bonus.period}</td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                          {formatAmount(bonus.amount)}
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                          {getStatusBadge(bonus.status)}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">
                          {bonus.paidAt ? formatDate(bonus.paidAt) : '—'}
                        </td>
                        <td className="px-6 py-4 text-sm text-right whitespace-nowrap">
                          {bonus.status === 'paid' && (
                            <button
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                              title="Download receipt"
                            >
                              <Download className="h-4 w-4" />
                              Receipt
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <Gift className="h-12 w-12 text-slate-300 mb-3" />
                          <div className="text-sm font-medium text-slate-600 mb-1">No bonus history yet</div>
                          <div className="text-xs text-slate-500">Complete trips to earn bonuses</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
      </section>
      )}
    </div>
  );
}
