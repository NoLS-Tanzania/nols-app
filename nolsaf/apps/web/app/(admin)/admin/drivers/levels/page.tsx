"use client";
import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { Trophy, Truck, Search, Star, TrendingUp, Users, Target, Award, CheckCircle, Eye, X, BarChart3, PieChart as PieChartIcon, Car, Bike, CarTaxiFront, MessageSquare, Send, Clock, Bell } from "lucide-react";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const api = axios.create({ baseURL: "", withCredentials: true });
function authify() {}

type DriverWithLevel = {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  suspendedAt: string | null;
  createdAt: string;
  region: string | null;
  district: string | null;
  vehicleType: string; // "Tuktuk" | "MotorCycle" | "Car"
  plateNumber: string;
  currentLevel: number;
  levelName: string;
  totalEarnings: number;
  totalTrips: number;
  averageRating: number;
  totalReviews: number;
  goalsCompleted: number;
  progress: {
    earnings: number;
    trips: number;
    rating: number;
    reviews: number;
    goals: number;
  };
  levelBenefits: string[];
};

type Summary = {
  total: number;
  silver: number;
  gold: number;
  diamond: number;
};

type DriverLevelMessage = {
  id: number;
  driverId: number;
  driverName: string;
  driverEmail: string;
  driverPhone: string | null;
  message: string;
  status: "PENDING" | "RESPONDED" | "RESOLVED";
  createdAt: string;
  responses?: Array<{
    id: number;
    message: string;
    adminName: string;
    createdAt: string;
  }>;
};

export default function AdminDriversLevelsPage() {
  const [drivers, setDrivers] = useState<DriverWithLevel[]>([]);
  const [summary, setSummary] = useState<Summary>({ total: 0, silver: 0, gold: 0, diamond: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<"" | "1" | "2" | "3">("");
  const [selectedDriver, setSelectedDriver] = useState<DriverWithLevel | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"drivers" | "messages">("drivers");
  
  // Messages state
  const [messages, setMessages] = useState<DriverLevelMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<DriverLevelMessage | null>(null);
  const [responseText, setResponseText] = useState("");
  const [sending, setSending] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "RESPONDED" | "RESOLVED">("ALL");
  const socketRef = useRef<Socket | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'info' | 'success' } | null>(null);

  // Add box-sizing style to prevent overflow
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .driver-levels-container *,
      .driver-levels-container *::before,
      .driver-levels-container *::after {
        box-sizing: border-box;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const loadMessages = useCallback(async () => {
    setMessagesLoading(true);
    try {
      const r = await api.get<{ messages: DriverLevelMessage[] }>("/api/admin/drivers/level-messages");
      setMessages(r.data?.messages ?? []);
    } catch (err: any) {
      // Only log non-4xx errors to avoid console spam for expected errors (e.g., missing tables, permissions)
      if (!err?.response || err.response.status >= 500) {
        console.error("Failed to load messages", err);
      } else {
        console.debug("Could not load messages (expected):", err.response?.status, err.response?.data);
      }
      setMessages([]);
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page: 1, pageSize: 200 };
      if (search) params.search = search;
      if (levelFilter) params.level = levelFilter;
      
      const r = await api.get<{ drivers: DriverWithLevel[]; summary: Summary }>("/admin/drivers/levels", { params });
      const apiDrivers = r.data?.drivers ?? [];
      const apiSummary = r.data?.summary ?? { total: 0, silver: 0, gold: 0, diamond: 0 };
      
      setDrivers(apiDrivers);
      setSummary(apiSummary);
    } catch (err) {
      console.error("Failed to load drivers", err);
      setDrivers([]);
      setSummary({ total: 0, silver: 0, gold: 0, diamond: 0 });
    } finally {
      setLoading(false);
    }
  }, [search, levelFilter]);

  useEffect(() => {
    authify();
    if (activeTab === "drivers") {
      void loadDrivers();
    } else {
      void loadMessages();
    }

    // Setup Socket.IO for real-time driver messages
    try {
      const socketUrl = process.env.NEXT_PUBLIC_API_URL || (typeof window !== 'undefined' ? window.location.origin : "http://localhost:4000");
      const socket = io(socketUrl, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
      });

      socket.on("connect", () => {
        console.log("Socket connected for admin level messages");
        // Join admin room
        socket.emit("join-admin-room");
      });

      socket.on("connect_error", (err) => {
        // Silently handle connection errors - Socket.IO will attempt reconnection
        console.debug("Socket connection error (will retry):", err.message);
      });

      // Listen for new driver messages
      socket.on("driver-level-message", (data: { driverId: number; driverName: string; message: string; timestamp: string }) => {
        // Reload messages to get the latest
        void loadMessages();
        
        // Show notification
        setNotification({
          message: `New message from ${data.driverName}`,
          type: 'info',
        });
        
        // Auto-dismiss notification after 5 seconds
        setTimeout(() => setNotification(null), 5000);
      });

      socketRef.current = socket;
    } catch (err) {
      // If Socket.IO fails to initialize, just continue without real-time updates
      console.debug("Socket.IO initialization failed, continuing without real-time updates:", err);
      socketRef.current = null;
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [activeTab, loadDrivers, loadMessages]);

  async function sendResponse(messageId: number) {
    if (!responseText.trim() || !selectedMessage) return;

    setSending(true);
    try {
      const r = await api.post(`/api/admin/drivers/level-messages/${messageId}/respond`, {
        message: responseText.trim(),
      });

      if (r.status === 200) {
        setResponseText("");
        await loadMessages();
        setSelectedMessage(null);
      }
    } catch (err) {
      console.error("Failed to send response", err);
      alert("Failed to send response. Please try again.");
    } finally {
      setSending(false);
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      void loadDrivers();
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [loadDrivers]);

  const getLevelColor = (level: number) => {
    switch (level) {
      case 3:
        return { bg: "bg-purple-100", text: "text-purple-700", border: "border-purple-300", badge: "bg-purple-600" };
      case 2:
        return { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-300", badge: "bg-amber-500" };
      case 1:
        return { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300", badge: "bg-slate-500" };
      default:
        return { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-300", badge: "bg-gray-500" };
    }
  };

  const getLevelIcon = (level: number) => {
    switch (level) {
      case 3:
        return <Award className="h-5 w-5 text-purple-600" />;
      case 2:
        return <Trophy className="h-5 w-5 text-amber-600" />;
      case 1:
        return <Star className="h-5 w-5 text-slate-600" />;
      default:
        return <Trophy className="h-5 w-5 text-gray-600" />;
    }
  };

  const viewDriverDetails = (driver: DriverWithLevel) => {
    setSelectedDriver(driver);
    setShowDetailsModal(true);
  };

  const overallProgress = (driver: DriverWithLevel) => {
    if (driver.currentLevel === 3) return 100;
    return Math.round(
      (driver.progress.earnings +
        driver.progress.trips +
        driver.progress.rating +
        driver.progress.reviews +
        driver.progress.goals) /
        5
    );
  };

  // Filter drivers based on levelFilter
  const filteredDrivers = useMemo(() => {
    if (!levelFilter) {
      return drivers; // Show all when "All" is selected
    }
    return drivers.filter((driver) => driver.currentLevel === Number(levelFilter));
  }, [drivers, levelFilter]);

  // Calculate message counts
  const messageCounts = useMemo(() => {
    return {
      pending: messages.filter((msg) => msg.status === "PENDING").length,
      responded: messages.filter((msg) => msg.status === "RESPONDED").length,
      resolved: messages.filter((msg) => msg.status === "RESOLVED").length,
      total: messages.length,
    };
  }, [messages]);

  // Prepare chart data
  const levelDistributionData = [
    { name: "Silver", value: summary.silver, color: "#64748b" },
    { name: "Gold", value: summary.gold, color: "#f59e0b" },
    { name: "Diamond", value: summary.diamond, color: "#9333ea" },
  ];

  const averageMetricsByLevel = () => {
    const levelGroups = {
      silver: drivers.filter((d) => d.currentLevel === 1),
      gold: drivers.filter((d) => d.currentLevel === 2),
      diamond: drivers.filter((d) => d.currentLevel === 3),
    };

    const calculateAverage = (group: DriverWithLevel[], key: keyof DriverWithLevel) => {
      if (group.length === 0) return 0;
      const sum = group.reduce((acc, d) => acc + (typeof d[key] === 'number' ? d[key] : 0), 0);
      return Math.round(sum / group.length);
    };

    return [
      {
        level: "Silver",
        earnings: calculateAverage(levelGroups.silver, 'totalEarnings'),
        trips: calculateAverage(levelGroups.silver, 'totalTrips'),
        rating: levelGroups.silver.length > 0 
          ? parseFloat((levelGroups.silver.reduce((acc, d) => acc + d.averageRating, 0) / levelGroups.silver.length).toFixed(1))
          : 0,
        reviews: calculateAverage(levelGroups.silver, 'totalReviews'),
      },
      {
        level: "Gold",
        earnings: calculateAverage(levelGroups.gold, 'totalEarnings'),
        trips: calculateAverage(levelGroups.gold, 'totalTrips'),
        rating: levelGroups.gold.length > 0 
          ? parseFloat((levelGroups.gold.reduce((acc, d) => acc + d.averageRating, 0) / levelGroups.gold.length).toFixed(1))
          : 0,
        reviews: calculateAverage(levelGroups.gold, 'totalReviews'),
      },
      {
        level: "Diamond",
        earnings: calculateAverage(levelGroups.diamond, 'totalEarnings'),
        trips: calculateAverage(levelGroups.diamond, 'totalTrips'),
        rating: levelGroups.diamond.length > 0 
          ? parseFloat((levelGroups.diamond.reduce((acc, d) => acc + d.averageRating, 0) / levelGroups.diamond.length).toFixed(1))
          : 0,
        reviews: calculateAverage(levelGroups.diamond, 'totalReviews'),
      },
    ];
  };

  const metricsComparisonData = averageMetricsByLevel();


  return (
    <div className="driver-levels-container w-full space-y-6 overflow-x-hidden" style={{ boxSizing: 'border-box', maxWidth: '100%' }}>
      {/* Notification Banner */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in ${
          notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'
        }`}>
          <Bell className="h-5 w-5" />
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-75">
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl p-4 md:p-6 border-2 border-slate-200 shadow-sm">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="h-12 w-12 md:h-16 md:w-16 rounded-full bg-gradient-to-br from-purple-50 to-purple-100 flex items-center justify-center mb-3 md:mb-4">
            <Trophy className="h-6 w-6 md:h-8 md:w-8 text-purple-600" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Driver Levels</h1>
          <p className="text-xs md:text-sm text-gray-500 mt-1 md:mt-2">View driver levels, progress, and characteristics</p>
        </div>
      </div>

      {/* Tabs - Responsive Pills */}
      <div className="bg-white rounded-xl p-4 border-2 border-slate-200 shadow-sm">
        <div className="flex flex-wrap gap-2 justify-center">
          <div
            onClick={() => setActiveTab("drivers")}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ease-in-out cursor-pointer border-2 shadow-sm transform hover:scale-105 active:scale-95 ${
              activeTab === "drivers"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-md scale-105"
                : "bg-white text-gray-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400"
            }`}
          >
            <div className="flex items-center gap-2">
              <Trophy className={`h-4 w-4 transition-transform duration-300 ${activeTab === "drivers" ? "animate-pulse" : ""}`} />
              <span className="transition-colors duration-300">Drivers</span>
            </div>
          </div>
          <div
            onClick={() => setActiveTab("messages")}
            className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ease-in-out cursor-pointer border-2 shadow-sm transform hover:scale-105 active:scale-95 ${
              activeTab === "messages"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-md scale-105"
                : "bg-white text-gray-700 border-slate-300 hover:bg-slate-50 hover:border-slate-400"
            }`}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className={`h-4 w-4 transition-transform duration-300 ${activeTab === "messages" ? "animate-pulse" : ""}`} />
              <span className="transition-colors duration-300">Messages</span>
              {messageCounts.total > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold transition-colors duration-300 ${
                  activeTab === "messages"
                    ? "bg-white/20 text-white"
                    : "bg-emerald-100 text-emerald-700"
                }`}>
                  {messageCounts.total}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Drivers Tab Content */}
      {activeTab === "drivers" && (
        <>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="bg-white rounded-xl p-4 md:p-6 border-2 border-slate-200 shadow-sm cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] relative overflow-hidden group"
          onClick={() => setLevelFilter("")}
        >
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600 mb-1 truncate">Total Drivers</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{summary.total}</p>
            </div>
            <Truck className="h-6 w-6 md:h-8 md:w-8 text-emerald-600 flex-shrink-0 ml-2" />
          </div>
        </div>
        <div
          className="bg-white rounded-xl p-4 md:p-6 border-2 border-slate-200 shadow-sm cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] relative overflow-hidden group"
          onClick={() => setLevelFilter("1")}
        >
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600 mb-1 truncate">Silver Level</p>
              <p className="text-xl md:text-2xl font-bold text-slate-700">{summary.silver}</p>
            </div>
            <Star className="h-6 w-6 md:h-8 md:w-8 text-slate-500 flex-shrink-0 ml-2" />
          </div>
        </div>
        <div
          className="bg-white rounded-xl p-4 md:p-6 border-2 border-slate-200 shadow-sm cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] relative overflow-hidden group"
          onClick={() => setLevelFilter("2")}
        >
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600 mb-1 truncate">Gold Level</p>
              <p className="text-xl md:text-2xl font-bold text-amber-700">{summary.gold}</p>
            </div>
            <Trophy className="h-6 w-6 md:h-8 md:w-8 text-amber-500 flex-shrink-0 ml-2" />
          </div>
        </div>
        <div
          className="bg-white rounded-xl p-4 md:p-6 border-2 border-slate-200 shadow-sm cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] relative overflow-hidden group"
          onClick={() => setLevelFilter("3")}
        >
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
          <div className="flex items-center justify-between relative z-10">
            <div className="min-w-0 flex-1">
              <p className="text-xs md:text-sm text-gray-600 mb-1 truncate">Diamond Level</p>
              <p className="text-xl md:text-2xl font-bold text-purple-700">{summary.diamond}</p>
            </div>
            <Award className="h-6 w-6 md:h-8 md:w-8 text-purple-600 flex-shrink-0 ml-2" />
          </div>
        </div>
      </div>

      {/* Statistical Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Level Distribution Pie Chart */}
        <div className="bg-white rounded-xl p-4 md:p-6 border-2 border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">Level Distribution</h2>
          </div>
          {summary.total > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={levelDistributionData.filter((d) => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {levelDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              <p>No data available</p>
            </div>
          )}
        </div>

        {/* Average Metrics Comparison Bar Chart */}
        <div className="bg-white rounded-xl p-4 md:p-6 border-2 border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">Average Metrics by Level</h2>
          </div>
          {drivers.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metricsComparisonData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="level" />
                <YAxis />
                <Tooltip 
                  formatter={(value: any, name: string) => {
                    if (name === 'Earnings (TZS)') {
                      return [`${(value / 1000).toFixed(0)}K TZS`, name];
                    }
                    return [value, name];
                  }}
                />
                <Legend />
                <Bar dataKey="earnings" fill="#10b981" name="Earnings (TZS)" />
                <Bar dataKey="trips" fill="#3b82f6" name="Trips" />
                <Bar dataKey="reviews" fill="#8b5cf6" name="Reviews" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-400">
              <p>No data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Rating Comparison Chart */}
      {drivers.length > 0 && (
        <div className="bg-white rounded-xl p-4 md:p-6 border-2 border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-gray-900">Rating Comparison by Level</h2>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metricsComparisonData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="level" />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Bar dataKey="rating" fill="#f59e0b" name="Average Rating" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border-2 border-slate-200 shadow-sm w-full" style={{ maxWidth: '100%', overflow: 'hidden' }}>
        <div className="flex flex-col gap-4 w-full" style={{ maxWidth: '100%' }}>
          {/* Search Bar - Properly Contained */}
          <div className="w-full relative" style={{ maxWidth: '100%' }}>
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
                <input
                  type="text"
                  placeholder="Search drivers..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
              style={{ boxSizing: 'border-box', maxWidth: '100%', width: '100%' }}
                />
              </div>
          {/* Level Filter Buttons - Responsive */}
          <div className="flex flex-wrap gap-2 w-full">
            <button
              onClick={() => setLevelFilter("")}
              className={`px-3 md:px-4 py-2 rounded-lg border-2 transition-all text-xs md:text-sm font-medium whitespace-nowrap ${
                levelFilter === ""
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-gray-700 border-slate-300 hover:border-emerald-300"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setLevelFilter("1")}
              className={`px-3 md:px-4 py-2 rounded-lg border-2 transition-all text-xs md:text-sm font-medium whitespace-nowrap ${
                levelFilter === "1"
                  ? "bg-slate-600 text-white border-slate-600"
                  : "bg-white text-gray-700 border-slate-300 hover:border-slate-300"
              }`}
            >
              Silver
            </button>
            <button
              onClick={() => setLevelFilter("2")}
              className={`px-3 md:px-4 py-2 rounded-lg border-2 transition-all text-xs md:text-sm font-medium whitespace-nowrap ${
                levelFilter === "2"
                  ? "bg-amber-500 text-white border-amber-500"
                  : "bg-white text-gray-700 border-slate-300 hover:border-amber-300"
              }`}
            >
              Gold
            </button>
            <button
              onClick={() => setLevelFilter("3")}
              className={`px-3 md:px-4 py-2 rounded-lg border-2 transition-all text-xs md:text-sm font-medium whitespace-nowrap ${
                levelFilter === "3"
                  ? "bg-purple-600 text-white border-purple-600"
                  : "bg-white text-gray-700 border-slate-300 hover:border-purple-300"
              }`}
            >
              Diamond
            </button>
          </div>
        </div>
      </div>

      {/* Drivers Table */}
      <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            <p className="mt-4 text-gray-500">Loading drivers...</p>
          </div>
        ) : filteredDrivers.length === 0 ? (
          <div className="p-12 text-center">
            <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No drivers found{levelFilter ? ` for ${levelFilter === "1" ? "Silver" : levelFilter === "2" ? "Gold" : "Diamond"} level` : ""}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-slate-50 border-b-2 border-slate-200">
                <tr>
                  <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase whitespace-nowrap">Driver</th>
                  <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase whitespace-nowrap">Vehicle</th>
                  <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase whitespace-nowrap">Level</th>
                  <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase whitespace-nowrap">Progress</th>
                  <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase whitespace-nowrap">Metrics</th>
                  <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase whitespace-nowrap">Rating</th>
                  <th className="px-4 md:px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredDrivers.map((driver) => {
                  const colors = getLevelColor(driver.currentLevel);
                  return (
                    <tr key={driver.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                      <Truck className="h-5 w-5 text-emerald-600" />
                    </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900 truncate">{driver.name}</p>
                            <p className="text-xs text-gray-500 truncate">{driver.email}</p>
                            {driver.phone && <p className="text-xs text-gray-400 truncate">{driver.phone}</p>}
                    </div>
                  </div>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <div className="space-y-1 min-w-[120px]">
                          <div className="flex items-center gap-2">
                            {driver.vehicleType === "Car" && <Car className="h-4 w-4 text-blue-600 flex-shrink-0" />}
                            {driver.vehicleType === "MotorCycle" && <Bike className="h-4 w-4 text-orange-600 flex-shrink-0" />}
                            {driver.vehicleType === "Tuktuk" && <CarTaxiFront className="h-4 w-4 text-green-600 flex-shrink-0" />}
                            <span className="text-xs font-medium text-gray-700 truncate">
                              {driver.vehicleType}
                            </span>
                </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 truncate font-mono">
                              {driver.plateNumber}
                            </span>
            </div>
          </div>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="flex-shrink-0">{getLevelIcon(driver.currentLevel)}</div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap ${colors.badge}`}>
                            {driver.levelName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <div className="w-24 md:w-32 min-w-[96px]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-gray-600">Overall</span>
                            <span className="text-xs font-semibold text-emerald-600">{overallProgress(driver)}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-emerald-600 h-2 rounded-full transition-all"
                              style={{ width: `${overallProgress(driver)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <div className="space-y-1 text-xs min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <TrendingUp className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-600 truncate">{(driver.totalEarnings / 1000).toFixed(0)}K TZS</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-600 truncate">{driver.totalTrips} trips</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Target className="h-3 w-3 text-gray-400 flex-shrink-0" />
                            <span className="text-gray-600 truncate">{driver.goalsCompleted} goals</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400 flex-shrink-0" />
                          <span className="font-semibold text-gray-900">{driver.averageRating.toFixed(1)}</span>
                          <span className="text-xs text-gray-500">({driver.totalReviews})</span>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4">
                        <button
                          onClick={() => viewDriverDetails(driver)}
                          className="flex items-center justify-center p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        </div>

      {/* Driver Details Modal */}
      {showDetailsModal && selectedDriver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl p-4 md:p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto border-2 border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                {getLevelIcon(selectedDriver.currentLevel)}
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedDriver.name}</h2>
                  <p className="text-sm text-gray-500">{selectedDriver.email}</p>
                </div>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
              </div>

            {/* Level Badge */}
            <div className={`mb-6 p-6 rounded-lg border-2 ${getLevelColor(selectedDriver.currentLevel).bg} ${getLevelColor(selectedDriver.currentLevel).border}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Current Level</p>
                    <div className="flex items-center gap-3">
                    <span className={`px-4 py-2 rounded-lg text-white font-bold text-xl ${getLevelColor(selectedDriver.currentLevel).badge}`}>
                      {selectedDriver.levelName}
                    </span>
                    {selectedDriver.currentLevel < 3 && (
                        <div className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-gray-600" />
                        <span className="text-sm text-gray-700">
                          Next: {selectedDriver.currentLevel === 1 ? "Gold" : "Diamond"}
                        </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                  <p className="text-sm text-gray-600 mb-1">Overall Progress</p>
                  <p className="text-2xl font-bold text-gray-900">{overallProgress(selectedDriver)}%</p>
                  </div>
                </div>
              </div>

            {/* Progress Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 w-full">
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-semibold text-gray-900">Total Earnings</h3>
                  </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold text-gray-900">{selectedDriver.totalEarnings.toLocaleString()} TZS</span>
                  <span className="text-sm text-gray-500">{selectedDriver.progress.earnings}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2">
                    <div
                      className="bg-emerald-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(selectedDriver.progress.earnings, 100)}%` }}
                    />
                  </div>
                </div>

              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-5 w-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Total Trips</h3>
                  </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold text-gray-900">{selectedDriver.totalTrips}</span>
                  <span className="text-sm text-gray-500">{selectedDriver.progress.trips}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(selectedDriver.progress.trips, 100)}%` }}
                    />
                  </div>
                </div>

              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="h-5 w-5 text-amber-600" />
                  <h3 className="font-semibold text-gray-900">Average Rating</h3>
                  </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold text-gray-900">{selectedDriver.averageRating.toFixed(1)}</span>
                  <span className="text-sm text-gray-500">{selectedDriver.progress.rating}%</span>
                </div>
                <div className="w-full bg-amber-200 rounded-full h-2">
                  <div
                    className="bg-amber-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(selectedDriver.progress.rating, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{selectedDriver.totalReviews} reviews</p>
              </div>

              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-5 w-5 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">Goals Completed</h3>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold text-gray-900">{selectedDriver.goalsCompleted}</span>
                  <span className="text-sm text-gray-500">{selectedDriver.progress.goals}%</span>
                </div>
                <div className="w-full bg-purple-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(selectedDriver.progress.goals, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

            {/* Level Benefits */}
            <div className={`p-6 rounded-lg border-2 ${getLevelColor(selectedDriver.currentLevel).bg} ${getLevelColor(selectedDriver.currentLevel).border}`}>
              <div className="flex items-center gap-2 mb-4">
                <Award className={`h-6 w-6 ${getLevelColor(selectedDriver.currentLevel).text}`} />
                <h3 className={`text-xl font-semibold ${getLevelColor(selectedDriver.currentLevel).text}`}>
                  {selectedDriver.levelName} Level Benefits
                </h3>
              </div>
              <ul className="space-y-2">
                {selectedDriver.levelBenefits.map((benefit, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                    <CheckCircle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${getLevelColor(selectedDriver.currentLevel).text}`} />
                    <span className={`text-sm ${getLevelColor(selectedDriver.currentLevel).text}`}>{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* Messages Tab Content */}
      {activeTab === "messages" && (
        <div className="space-y-6">
          {/* Messages Filters */}
          <div className="bg-white rounded-xl p-4 border-2 border-slate-200 shadow-sm">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by driver name, email, or message..."
                  value={messageSearch}
                  onChange={(e) => setMessageSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setStatusFilter("ALL")}
                  className={`px-4 py-2 rounded-lg border-2 transition-all text-sm shadow-sm ${
                    statusFilter === "ALL"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-gray-700 border-slate-300 hover:border-emerald-300"
                  }`}
                >
                  All
                  {messageCounts.total > 0 && (
                    <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                      statusFilter === "ALL"
                        ? "bg-white/20 text-white"
                        : "bg-emerald-100 text-emerald-700"
                    }`}>
                      {messageCounts.total}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setStatusFilter("PENDING")}
                  className={`px-4 py-2 rounded-lg border-2 transition-all text-sm shadow-sm ${
                    statusFilter === "PENDING"
                      ? "bg-amber-500 text-white border-amber-500"
                      : "bg-white text-gray-700 border-slate-300 hover:border-amber-300"
                  }`}
                >
                  Pending
                  {messageCounts.pending > 0 && (
                    <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                      statusFilter === "PENDING"
                        ? "bg-white/20 text-white"
                        : "bg-amber-100 text-amber-700"
                    }`}>
                      {messageCounts.pending}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setStatusFilter("RESPONDED")}
                  className={`px-4 py-2 rounded-lg border-2 transition-all text-sm shadow-sm ${
                    statusFilter === "RESPONDED"
                      ? "bg-blue-500 text-white border-blue-500"
                      : "bg-white text-gray-700 border-slate-300 hover:border-blue-300"
                  }`}
                >
                  Responded
                  {messageCounts.responded > 0 && (
                    <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                      statusFilter === "RESPONDED"
                        ? "bg-white/20 text-white"
                        : "bg-blue-100 text-blue-700"
                    }`}>
                      {messageCounts.responded}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setStatusFilter("RESOLVED")}
                  className={`px-4 py-2 rounded-lg border-2 transition-all text-sm shadow-sm ${
                    statusFilter === "RESOLVED"
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : "bg-white text-gray-700 border-slate-300 hover:border-emerald-300"
                  }`}
                >
                  Resolved
                  {messageCounts.resolved > 0 && (
                    <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                      statusFilter === "RESOLVED"
                        ? "bg-white/20 text-white"
                        : "bg-emerald-100 text-emerald-700"
                    }`}>
                      {messageCounts.resolved}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Messages List */}
          {messagesLoading ? (
            <div className="bg-white rounded-xl p-12 border-2 border-slate-200 shadow-sm text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              <p className="mt-4 text-gray-500">Loading messages...</p>
            </div>
          ) : (() => {
            const filteredMessages = messages.filter((msg) => {
              const matchesSearch =
                !messageSearch ||
                msg.driverName.toLowerCase().includes(messageSearch.toLowerCase()) ||
                msg.driverEmail.toLowerCase().includes(messageSearch.toLowerCase()) ||
                msg.message.toLowerCase().includes(messageSearch.toLowerCase());
              const matchesStatus = statusFilter === "ALL" || msg.status === statusFilter;
              return matchesSearch && matchesStatus;
            });

            const getStatusBadge = (status: string) => {
              switch (status) {
                case "PENDING":
                  return (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700 border border-amber-300">
                      Pending
                    </span>
                  );
                case "RESPONDED":
                  return (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 border border-blue-300">
                      Responded
                    </span>
                  );
                case "RESOLVED":
                  return (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-300">
                      Resolved
                    </span>
                  );
                default:
                  return null;
              }
            };

            return filteredMessages.length === 0 ? (
              <div className="bg-white rounded-xl p-12 border-2 border-slate-200 shadow-sm text-center">
                <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No messages found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Messages List */}
                <div className="space-y-4">
                  {filteredMessages.map((msg) => (
                    <div
                      key={msg.id}
                      onClick={() => setSelectedMessage(msg)}
                      className={`bg-white rounded-xl p-4 border-2 shadow-sm cursor-pointer transition-all hover:shadow-lg ${
                        selectedMessage?.id === msg.id
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-slate-200 hover:border-emerald-300"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <Users className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{msg.driverName}</p>
                            <p className="text-xs text-gray-500">{msg.driverEmail}</p>
                          </div>
                        </div>
                        {getStatusBadge(msg.status)}
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2 mb-2">{msg.message}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(msg.createdAt).toLocaleString()}</span>
                        {msg.responses && msg.responses.length > 0 && (
                          <>
                            <span>•</span>
                            <span>{msg.responses.length} response(s)</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  </div>

                {/* Message Detail & Response */}
                <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm">
                  {selectedMessage ? (
                    <div className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-lg font-semibold text-gray-900">Message Details</h2>
                          {getStatusBadge(selectedMessage.status)}
                        </div>
                        <div className="bg-slate-50 rounded-lg p-4 mb-4">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                              <Users className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{selectedMessage.driverName}</p>
                              <p className="text-xs text-gray-500">{selectedMessage.driverEmail}</p>
                              {selectedMessage.driverPhone && (
                                <p className="text-xs text-gray-500">{selectedMessage.driverPhone}</p>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedMessage.message}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {new Date(selectedMessage.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Previous Responses */}
                      {selectedMessage.responses && selectedMessage.responses.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 mb-3">Previous Responses</h3>
                          <div className="space-y-3">
                            {selectedMessage.responses.map((response) => (
                              <div key={response.id} className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-semibold text-blue-900">{response.adminName}</span>
                                  <span className="text-xs text-blue-700">
                                    {new Date(response.createdAt).toLocaleString()}
                                  </span>
                                </div>
                                <p className="text-sm text-blue-900 whitespace-pre-wrap">{response.message}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Response Form */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-900 mb-3">Send Response</h3>
                        <textarea
                          value={responseText}
                          onChange={(e) => setResponseText(e.target.value)}
                          placeholder="Type your response here..."
                          rows={4}
                          className="w-full px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 resize-none"
                        />
                        <div className="flex gap-3 mt-3">
                          <button
                            onClick={() => sendResponse(selectedMessage.id)}
                            disabled={!responseText.trim() || sending}
                            className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            <Send className="h-4 w-4" />
                            {sending ? "Sending..." : "Send Response"}
                          </button>
                          {selectedMessage.status === "PENDING" && (
                            <button
                              onClick={async () => {
                                try {
                                  await api.post(`/api/admin/drivers/level-messages/${selectedMessage.id}/resolve`);
                                  await loadMessages();
                                  setSelectedMessage(null);
                                } catch (err) {
                                  console.error("Failed to mark as resolved", err);
                                }
                              }}
                              className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-all flex items-center gap-2"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Mark Resolved
                            </button>
                          )}
                        </div>
              </div>
            </div>
          ) : (
                    <div className="text-center py-12 text-gray-500">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p>Select a message to view details and respond</p>
            </div>
          )}
        </div>
      </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
