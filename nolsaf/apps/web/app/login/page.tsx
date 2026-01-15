"use client";
import { useState, useEffect } from "react";
import { Lock, X, AlertCircle, Clock } from 'lucide-react';
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const [accountLocked, setAccountLocked] = useState(false);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  // Countdown timer for account lockout
  useEffect(() => {
    if (!accountLocked || !lockedUntil) {
      setTimeRemaining("");
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const remaining = lockedUntil - now;

      if (remaining <= 0) {
        setAccountLocked(false);
        setLockedUntil(null);
        setTimeRemaining("");
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [accountLocked, lockedUntil]);

  // Auto-hide error popup after 5 seconds (only for credential errors)
  useEffect(() => {
    if (error && !accountLocked) {
      setShowError(true);
      const timer = setTimeout(() => {
        setShowError(false);
        setTimeout(() => setError(null), 300);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, accountLocked]);

  function getErrorMessage(errorMsg: string): string {
    const msg = errorMsg.toLowerCase();
    if (msg.includes("invalid_credentials") || msg.includes("invalid credentials")) {
      return "Please check your password or username";
    }
    if (msg.includes("too many")) {
      return "Too many attempts. Please wait a moment.";
    }
    return "Please check your password or username";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    // Don't allow submission if account is locked
    if (accountLocked && lockedUntil && lockedUntil > Date.now()) {
      return;
    }
    
    setError(null);
    setShowError(false);
    setLoading(true);
    try {
      const r = await fetch("/api/auth/login-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      
      const data = await r.json().catch(() => ({}));
      
      if (!r.ok) {
        const errorCode = data?.code || "";
        const errorMsg = data?.error || data?.message || `Login failed (${r.status})`;

        // Handle account locked status
        if (errorCode === "ACCOUNT_LOCKED" || errorMsg.toLowerCase().includes("account locked") || errorMsg.toLowerCase().includes("temporarily locked")) {
          // lockedUntil is a timestamp in milliseconds (number)
          const lockUntil = data?.lockedUntil ? Number(data.lockedUntil) : null;
          if (lockUntil && lockUntil > Date.now()) {
            setAccountLocked(true);
            setLockedUntil(lockUntil);
            setError(null);
            setLoading(false);
            return;
          }
        }

        // Handle rate limiting / too many attempts (show inline, not popup)
        if (errorMsg.toLowerCase().includes("too many")) {
          setError("Too many attempts. Please wait a moment.");
          setLoading(false);
          return;
        }

        // Handle invalid credentials (show as popup)
        setError(getErrorMessage(errorMsg));
        setLoading(false);
        return;
      }
      
      // Successful login - clear any lockout state
      setAccountLocked(false);
      setLockedUntil(null);

      // Wait a moment for cookies to be set
      await new Promise(resolve => setTimeout(resolve, 100));

      // Determine where to route based on the authenticated user role.
      // First try to get role from response
      let role = String(data?.user?.role || "").toUpperCase();
      
      // If role not in response, fetch from /api/account/me
      if (!role || role === "UNDEFINED" || role === "NULL" || role === "") {
        try {
          const meResponse = await fetch("/api/account/me", { credentials: "include" });
          if (meResponse.ok) {
            const me = await meResponse.json();
            role = String(me?.role || me?.data?.role || "").toUpperCase();
          }
        } catch (err) {
          console.error("Failed to fetch user role:", err);
        }
      }

      // Map CUSTOMER to USER for routing (but keep original for cookie check)
      const originalRole = role;
      if (role === "CUSTOMER") {
        role = "USER";
      }

      // Redirect based on role
      if (originalRole === "ADMIN") {
        // Force redirect to admin home page
        window.location.href = "/admin/home";
      } else if (originalRole === "OWNER") {
        window.location.href = "/owner";
      } else if (originalRole === "DRIVER") {
        window.location.href = "/driver";
      } else {
        // Default to customer account area for CUSTOMER and other roles
        window.location.href = "/account";
      }
    } catch (err: any) {
      setError(getErrorMessage(err?.message || "Login error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50" suppressHydrationWarning>
      <div className="w-full max-w-sm relative">
        {/* Error Popup Alert (only for credential errors, not "too many attempts") */}
        {error && !accountLocked && !error.includes("Too many attempts") && (
          <div
            className={`absolute top-0 left-0 right-0 mb-4 bg-white border-l-4 border-red-500 rounded-lg shadow-lg p-4 z-50 transition-all duration-300 ease-in-out ${
              showError ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2 pointer-events-none"
            }`}
            role="alert"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <AlertCircle className="w-5 h-5 text-red-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{error}</p>
              </div>
              <button
                onClick={() => {
                  setShowError(false);
                  setTimeout(() => setError(null), 300);
                }}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="card w-full p-6 space-y-4 mt-16" suppressHydrationWarning>
          <h1 className="text-xl font-semibold">Sign in</h1>
          <label className="block text-sm">
            <span className="block mb-1">Email</span>
            <input
              type="email"
              required
              className="input w-full"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={accountLocked}
              suppressHydrationWarning
            />
          </label>
          <label className="block text-sm">
            <span className="block mb-1">Password</span>
            <input
              type="password"
              required
              className="input w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              disabled={accountLocked}
              suppressHydrationWarning
            />
          </label>
          
          {/* Account Locked Message (Inline) */}
          {accountLocked && (
            <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4" role="alert">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-amber-900 mb-1">
                    Account temporarily locked due to too many failed login attempts.
                  </p>
                  {timeRemaining && (
                    <p className="text-sm text-amber-700">
                      Please try again in <span className="font-semibold">{timeRemaining}</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Too Many Attempts Message (Inline) */}
          {error && error.includes("Too many attempts") && !accountLocked && (
            <div className="bg-orange-50 border-l-4 border-orange-500 rounded-lg p-4" role="alert">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-orange-900">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div className="text-right">
            <button type="button" onClick={() => router.push('/account/forgot-password')} className="text-sm text-slate-600 hover:underline inline-flex items-center gap-2">
              <Lock className="w-4 h-4" />
              <span>Forgot password?</span>
            </button>
          </div>
          <button className="btn btn-solid w-full" disabled={loading || accountLocked}>
            {loading ? "Signing in…" : accountLocked ? "Account Locked" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
