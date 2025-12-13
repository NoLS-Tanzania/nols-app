"use client";

import React, { useEffect, useState, useRef } from "react";
import { Trophy, TrendingUp, Star, Target, Award, CheckCircle, Clock, AlertCircle, MapPin, Users, DollarSign, MessageSquare, Send } from "lucide-react";
import axios from "axios";
import { io, Socket } from "socket.io-client";

const api = axios.create({ baseURL: "" });

interface LevelData {
  currentLevel: number;
  levelName: string;
  nextLevel: number;
  nextLevelName: string;
  totalEarnings: number;
  earningsForNextLevel: number;
  totalTrips: number;
  tripsForNextLevel: number;
  averageRating: number;
  ratingForNextLevel: number;
  totalReviews: number;
  reviewsForNextLevel: number;
  goalsCompleted: number;
  goalsForNextLevel: number;
  progress: {
    earnings: number; // percentage
    trips: number;
    rating: number;
    reviews: number;
    goals: number;
  };
  levelBenefits: string[];
  nextLevelBenefits: string[];
}

// Skeleton loader components
const LevelCardSkeleton = () => (
  <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm animate-pulse">
    <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
    <div className="h-4 bg-slate-200 rounded w-2/3 mb-2"></div>
    <div className="h-4 bg-slate-200 rounded w-1/2"></div>
  </div>
);

const ProgressCardSkeleton = () => (
  <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm animate-pulse">
    <div className="h-5 bg-slate-200 rounded w-1/4 mb-4"></div>
    <div className="h-3 bg-slate-200 rounded w-full mb-2"></div>
    <div className="h-4 bg-slate-200 rounded w-1/3"></div>
  </div>
);

export default function DriverLevel() {
  const [levelData, setLevelData] = useState<LevelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{ id: number; message: string; from: 'driver' | 'admin'; timestamp: string; adminName?: string }>>([]);
  const [messageInput, setMessageInput] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Add custom animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes fade-in-up {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes slide-in-left {
        from {
          opacity: 0;
          transform: translateX(-20px);
        }
        to {
          opacity: 1;
          transform: translateX(0);
        }
      }
      @keyframes scale-in {
        from {
          opacity: 0;
          transform: scale(0.9);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      .animate-fade-in {
        animation: fade-in 0.6s ease-out forwards;
      }
      .animate-fade-in-up {
        animation: fade-in-up 0.6s ease-out forwards;
        opacity: 0;
      }
      .animate-slide-in-left {
        animation: slide-in-left 0.6s ease-out forwards;
        opacity: 0;
      }
      .animate-scale-in {
        animation: scale-in 0.6s ease-out forwards;
        opacity: 0;
      }
      .delay-100 { animation-delay: 0.1s; }
      .delay-200 { animation-delay: 0.2s; }
      .delay-300 { animation-delay: 0.3s; }
      .delay-400 { animation-delay: 0.4s; }
      .delay-500 { animation-delay: 0.5s; }
      .delay-600 { animation-delay: 0.6s; }
      .delay-700 { animation-delay: 0.7s; }
      .delay-800 { animation-delay: 0.8s; }
      .delay-900 { animation-delay: 0.9s; }
    `;
    style.setAttribute('data-level-animations', 'true');
    if (!document.head.querySelector('style[data-level-animations]')) {
      document.head.appendChild(style);
    }
    return () => {
      const existingStyle = document.head.querySelector('style[data-level-animations]');
      if (existingStyle) {
        document.head.removeChild(existingStyle);
      }
    };
  }, []);

  useEffect(() => {
    const fetchLevelData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        
        if (!token) {
          setError("Please log in to view your driver level");
          setLoading(false);
          return;
        }

        // Fetch level data from API
        const response = await api.get("/api/driver/level", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 200 && response.data) {
          setLevelData(response.data);
          setError(null);
        } else {
          setError("Failed to load level data");
        }
      } catch (err: any) {
        console.error("Error fetching level data:", err);
        if (err.response?.status === 401) {
          setError("Please log in to view your driver level");
        } else if (err.response?.status === 404) {
          setError("Level data not found");
        } else {
          setError("Failed to load level data. Please try again later.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchLevelData();

    // Setup Socket.IO for real-time responses
    const token = localStorage.getItem("token");
    if (token) {
      const socket = io(process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000", {
        auth: { token },
      });

      socket.on("connect", () => {
        console.log("Socket connected for level messages");
        // Join driver room
        const userId = JSON.parse(atob(token.split(".")[1])).id;
        socket.emit("join-driver-room", { driverId: userId });
      });

      // Listen for admin responses
      socket.on("admin-level-message-response", (data: { messageId: number; response: string; adminName: string; timestamp: string }) => {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            message: data.response,
            from: 'admin',
            timestamp: data.timestamp,
            adminName: data.adminName,
          },
        ]);
        setNotification({ message: `New response from ${data.adminName}`, type: 'success' });
        setTimeout(() => setNotification(null), 5000);
      });

      socketRef.current = socket;

      return () => {
        socket.disconnect();
      };
    }
  }, []);

  // Helper function to send message to admin
  const sendMessageToAdmin = async (message: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please log in to send messages");
        return;
      }

      const response = await api.post(
        "/api/driver/level/message",
        { message },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.status === 200) {
        // Add message to local state
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            message,
            from: 'driver' as const,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch (err: any) {
      console.error("Error sending message:", err);
      alert("Failed to send message. Please try again.");
    }
  };

  const getLevelBenefits = (level: number): string[] => {
    const benefits: { [key: number]: string[] } = {
      1: ["Standard support", "Standard commission rate", "Access to basic features", "Basic trip assignments"],
      2: ["Priority support", "10% bonus on earnings", "Access to premium features", "Priority trip assignments", "Early access to new features"],
      3: ["Elite support", "20% bonus on earnings", "Access to all features", "Highest priority assignments", "Exclusive partnerships", "Lifetime benefits", "Brand Ambassador", "Invited to events"],
    };
    return benefits[level] || benefits[1];
  };

  const getLevelColor = (level: number): string => {
    const colors: { [key: number]: string } = {
      1: "bg-slate-400",  // Silver
      2: "bg-yellow-400", // Gold
      3: "bg-purple-500", // Diamond
    };
    return colors[level] || colors[1];
  };

  const getLevelTextColor = (level: number): string => {
    const colors: { [key: number]: string } = {
      1: "text-slate-600",  // Silver
      2: "text-yellow-600", // Gold
      3: "text-purple-600", // Diamond
    };
    return colors[level] || colors[1];
  };

  if (loading) {
    return (
      <div className="w-full max-w-full space-y-6 overflow-x-hidden">
        <div className="w-full text-center">
          <div className="flex flex-col items-center mb-6">
            <Trophy className="w-8 h-8 text-emerald-600 mb-2" />
            <h1 className="text-2xl font-bold text-slate-900">Driver Level</h1>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <LevelCardSkeleton />
          <LevelCardSkeleton />
          <ProgressCardSkeleton />
          <ProgressCardSkeleton />
          <ProgressCardSkeleton />
          <ProgressCardSkeleton />
        </div>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="w-full max-w-full space-y-6 overflow-x-hidden">
        <div className="w-full text-center">
          <div className="flex flex-col items-center mb-6">
            <Trophy className="w-8 h-8 text-emerald-600 mb-2" />
            <h1 className="text-2xl font-bold text-slate-900">Driver Level</h1>
          </div>
        </div>
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      </div>
    );
  }

  if (!levelData && !loading) {
    return (
      <div className="w-full max-w-full space-y-6 overflow-x-hidden">
        <div className="w-full text-center">
          <div className="flex flex-col items-center mb-6">
            <Trophy className="w-8 h-8 text-emerald-600 mb-2" />
            <h1 className="text-2xl font-bold text-slate-900">Driver Level</h1>
          </div>
        </div>
        <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-slate-600 font-medium">No level data available</p>
        </div>
      </div>
    );
  }

  if (!levelData) {
    return null;
  }

  const overallProgress = levelData.currentLevel === 3 
    ? 100 
    : Math.round(
        (levelData.progress.earnings + 
         levelData.progress.trips + 
         levelData.progress.rating + 
         levelData.progress.reviews + 
         levelData.progress.goals) / 5
      );

  return (
    <div className="w-full max-w-full space-y-6 overflow-x-hidden">
      {/* Notification Banner */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 ${
          notification.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'
        } animate-fade-in`}>
          <CheckCircle className="h-5 w-5" />
          <span>{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 hover:opacity-75">
            ×
          </button>
        </div>
      )}

      {/* Header */}
      <div className="w-full text-center">
        <div className="flex flex-col items-center mb-6">
          <Trophy className={`w-8 h-8 ${getLevelTextColor(levelData.currentLevel)} mb-2 animate-pulse transition-transform duration-300 hover:scale-110`} />
          <h1 className="text-2xl font-bold text-slate-900 animate-fade-in">Driver Level</h1>
          <p className="text-slate-600 mt-1 animate-fade-in-up delay-100 transition-all duration-500 hover:text-emerald-600">Track your progress and unlock new benefits</p>
        </div>
      </div>

      {/* Current Level Card */}
      <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm transition-all duration-300 hover:shadow-lg animate-fade-in-up delay-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 transition-colors duration-300">Current Level</h2>
            <p className="text-sm text-slate-600 transition-colors duration-300">Your current driver status</p>
          </div>
          <div className={`${getLevelColor(levelData.currentLevel)} text-white px-4 py-2 rounded-lg font-bold text-xl transition-all duration-300 hover:scale-105 animate-scale-in delay-300`}>
            {levelData.levelName}
          </div>
        </div>

        {levelData.currentLevel < 3 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Progress to {levelData.nextLevelName}</span>
              <span className="text-sm font-semibold text-emerald-600">{overallProgress}%</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-3">
              <div
                className={`${getLevelColor(levelData.nextLevel)} h-3 rounded-full transition-all duration-500`}
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Progress Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Earnings Progress */}
        <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-emerald-300 animate-fade-in-up delay-400">
          <div className="flex items-center gap-3 mb-4">
            <DollarSign className="w-5 h-5 text-emerald-600 flex-shrink-0 transition-transform duration-300 hover:scale-110" />
            <div>
              <h3 className="font-semibold text-slate-900 transition-colors duration-300">Total Earnings</h3>
              <p className="text-sm text-slate-600 transition-colors duration-300">
                {levelData.totalEarnings.toLocaleString()} TZS / {levelData.earningsForNextLevel > 0 ? levelData.earningsForNextLevel.toLocaleString() : "Max"} TZS
              </p>
            </div>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(levelData.progress.earnings, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">
            {levelData.currentLevel === 3 
              ? "Maximum level reached!" 
              : `${((levelData.earningsForNextLevel - levelData.totalEarnings) / 1000).toFixed(0)}K TZS to next level`}
          </p>
        </div>

        {/* Trips Progress */}
        <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-blue-300 animate-fade-in-up delay-500">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-blue-600 flex-shrink-0 transition-transform duration-300 hover:scale-110" />
            <div>
              <h3 className="font-semibold text-slate-900 transition-colors duration-300">Total Trips</h3>
              <p className="text-sm text-slate-600 transition-colors duration-300">
                {levelData.totalTrips.toLocaleString()} / {levelData.tripsForNextLevel > 0 ? levelData.tripsForNextLevel.toLocaleString() : "Max"}
              </p>
            </div>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(levelData.progress.trips, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">
            {levelData.currentLevel === 3 
              ? "Maximum level reached!" 
              : `${Math.round(levelData.tripsForNextLevel - levelData.totalTrips)} trips to next level`}
          </p>
        </div>

        {/* Rating Progress */}
        <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-yellow-300 animate-fade-in-up delay-600">
          <div className="flex items-center gap-3 mb-4">
            <Star className="w-5 h-5 text-yellow-600 flex-shrink-0 transition-transform duration-300 hover:scale-110" />
            <div>
              <h3 className="font-semibold text-slate-900 transition-colors duration-300">Average Rating</h3>
              <p className="text-sm text-slate-600 transition-colors duration-300">
                {levelData.averageRating.toFixed(1)} / {levelData.ratingForNextLevel > 0 ? levelData.ratingForNextLevel.toFixed(1) : "Max"}
              </p>
            </div>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
            <div
              className="bg-yellow-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(levelData.progress.rating, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">
            {levelData.currentLevel === 3 
              ? "Maximum level reached!" 
              : `Maintain ${levelData.ratingForNextLevel.toFixed(1)}+ rating`}
          </p>
        </div>

        {/* Reviews Progress */}
        <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm transition-all duration-300 hover:shadow-lg hover:scale-105 hover:border-purple-300 animate-fade-in-up delay-700">
          <div className="flex items-center gap-3 mb-4">
            <Users className="w-5 h-5 text-purple-600 flex-shrink-0 transition-transform duration-300 hover:scale-110" />
            <div>
              <h3 className="font-semibold text-slate-900 transition-colors duration-300">Total Reviews</h3>
              <p className="text-sm text-slate-600 transition-colors duration-300">
                {levelData.totalReviews.toLocaleString()} / {levelData.reviewsForNextLevel > 0 ? levelData.reviewsForNextLevel.toLocaleString() : "Max"}
              </p>
            </div>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(levelData.progress.reviews, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">
            {levelData.currentLevel === 3 
              ? "Maximum level reached!" 
              : `${Math.round(levelData.reviewsForNextLevel - levelData.totalReviews)} reviews to next level`}
          </p>
        </div>

        {/* Goals Progress */}
        <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm md:col-span-2 transition-all duration-300 hover:shadow-lg hover:scale-[1.02] hover:border-emerald-300 animate-fade-in-up delay-800">
          <div className="flex items-center gap-3 mb-4">
            <Target className="w-5 h-5 text-emerald-600 flex-shrink-0 transition-transform duration-300 hover:scale-110" />
            <div>
              <h3 className="font-semibold text-slate-900 transition-colors duration-300">Goals Accomplished</h3>
              <p className="text-sm text-slate-600 transition-colors duration-300">
                {levelData.goalsCompleted} / {levelData.goalsForNextLevel > 0 ? levelData.goalsForNextLevel : "Max"}
              </p>
            </div>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(levelData.progress.goals, 100)}%` }}
            />
          </div>
          <p className="text-xs text-slate-500">
            {levelData.currentLevel === 3 
              ? "Maximum level reached!" 
              : `${Math.round(levelData.goalsForNextLevel - levelData.goalsCompleted)} goals to next level`}
          </p>
        </div>
      </div>

      {/* All Levels Benefits Section */}
      <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm transition-all duration-300 hover:shadow-lg animate-fade-in-up delay-900">
        <div className="flex items-center gap-2 mb-6">
          <Award className="w-6 h-6 text-emerald-600 transition-transform duration-300 hover:scale-110" />
          <h2 className="text-xl font-semibold text-slate-900 transition-colors duration-300">Level Benefits</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Silver Level */}
          <div className={`relative rounded-lg p-5 border-2 transition-all duration-300 hover:shadow-md hover:scale-105 ${
            levelData.currentLevel >= 1 
              ? 'border-emerald-500 bg-emerald-50' 
              : 'border-slate-200 bg-slate-50'
          } animate-slide-in-left delay-300`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`${getLevelColor(1)} text-white px-3 py-1 rounded-lg font-bold text-sm`}>
                Silver
              </div>
              {levelData.currentLevel >= 1 && (
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              )}
            </div>
            <ul className="space-y-2">
              {getLevelBenefits(1).map((benefit, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    levelData.currentLevel >= 1 ? 'text-emerald-600' : 'text-slate-300'
                  }`} />
                  <span className={levelData.currentLevel >= 1 ? 'text-slate-900' : 'text-slate-500'}>{benefit}</span>
                </li>
              ))}
            </ul>
            {levelData.currentLevel >= 1 && (
              <div className="mt-4 pt-3 border-t border-emerald-200">
                <span className="text-xs font-medium text-emerald-700">✓ Achieved</span>
              </div>
            )}
          </div>

          {/* Gold Level */}
          <div className={`relative rounded-lg p-5 border-2 transition-all duration-300 hover:shadow-md hover:scale-105 ${
            levelData.currentLevel >= 2 
              ? 'border-yellow-500 bg-yellow-50' 
              : levelData.currentLevel === 1
              ? 'border-yellow-300 bg-yellow-50/50'
              : 'border-slate-200 bg-slate-50'
          } animate-slide-in-left delay-400`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`${getLevelColor(2)} text-white px-3 py-1 rounded-lg font-bold text-sm`}>
                Gold
              </div>
              {levelData.currentLevel >= 2 ? (
                <CheckCircle className="w-5 h-5 text-yellow-600" />
              ) : levelData.currentLevel === 1 ? (
                <Clock className="w-5 h-5 text-yellow-500" />
              ) : null}
            </div>
            <ul className="space-y-2">
              {getLevelBenefits(2).map((benefit, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                  {levelData.currentLevel >= 2 ? (
                    <CheckCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  )}
                  <span className={levelData.currentLevel >= 2 ? 'text-slate-900' : 'text-slate-500'}>{benefit}</span>
                </li>
              ))}
            </ul>
            {levelData.currentLevel >= 2 ? (
              <div className="mt-4 pt-3 border-t border-yellow-200">
                <span className="text-xs font-medium text-yellow-700">✓ Achieved</span>
              </div>
            ) : levelData.currentLevel === 1 ? (
              <div className="mt-4 pt-3 border-t border-yellow-200">
                <span className="text-xs font-medium text-yellow-600">→ Next Level</span>
              </div>
            ) : null}
          </div>

          {/* Diamond Level */}
          <div className={`relative rounded-lg p-5 border-2 transition-all duration-300 hover:shadow-md hover:scale-105 ${
            levelData.currentLevel >= 3 
              ? 'border-purple-500 bg-purple-50' 
              : levelData.currentLevel === 2
              ? 'border-purple-300 bg-purple-50/50'
              : 'border-slate-200 bg-slate-50'
          } animate-slide-in-left delay-500`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`${getLevelColor(3)} text-white px-3 py-1 rounded-lg font-bold text-sm`}>
                Diamond
              </div>
              {levelData.currentLevel >= 3 ? (
                <CheckCircle className="w-5 h-5 text-purple-600" />
              ) : levelData.currentLevel === 2 ? (
                <Clock className="w-5 h-5 text-purple-500" />
              ) : null}
            </div>
            <ul className="space-y-2">
              {getLevelBenefits(3).map((benefit, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                  {levelData.currentLevel >= 3 ? (
                    <CheckCircle className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <Clock className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                  )}
                  <span className={levelData.currentLevel >= 3 ? 'text-slate-900' : 'text-slate-500'}>{benefit}</span>
                </li>
              ))}
            </ul>
            {levelData.currentLevel >= 3 ? (
              <div className="mt-4 pt-3 border-t border-purple-200">
                <span className="text-xs font-medium text-purple-700">✓ Achieved</span>
              </div>
            ) : levelData.currentLevel === 2 ? (
              <div className="mt-4 pt-3 border-t border-purple-200">
                <span className="text-xs font-medium text-purple-600">→ Next Level</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Communication Section */}
      <div className="bg-white rounded-xl p-6 border-2 border-slate-200 shadow-sm transition-all duration-300 hover:shadow-lg animate-fade-in-up delay-900">
        <div className="flex items-center gap-2 mb-6">
          <MessageSquare className="w-6 h-6 text-emerald-600 transition-transform duration-300 hover:scale-110" />
          <h2 className="text-xl font-semibold text-slate-900 transition-colors duration-300">Level Communication</h2>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Have questions about your level or benefits? Send a message to the admin team.
        </p>
        
        {/* Messages Display */}
        {messages.length > 0 && (
          <div className="mb-4 space-y-3 max-h-64 overflow-y-auto border-2 border-slate-200 rounded-lg p-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`p-3 rounded-lg ${
                  msg.from === 'driver'
                    ? 'bg-emerald-50 border border-emerald-200 ml-auto max-w-[80%]'
                    : 'bg-blue-50 border border-blue-200 mr-auto max-w-[80%]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-700">
                    {msg.from === 'admin' ? (msg.adminName || 'Admin') : 'You'}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(msg.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-slate-900">{msg.message}</p>
              </div>
            ))}
          </div>
        )}
        
        <div className="space-y-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type your message here..."
              className="flex-1 px-4 py-2 border-2 border-slate-300 rounded-lg focus:outline-none focus:border-emerald-500 transition-colors"
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && messageInput.trim()) {
                  await sendMessageToAdmin(messageInput.trim());
                  setMessageInput('');
                }
              }}
            />
            <button
              onClick={async () => {
                if (messageInput.trim()) {
                  await sendMessageToAdmin(messageInput.trim());
                  setMessageInput('');
                }
              }}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all duration-300 hover:scale-105 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

