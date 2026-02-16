import rateLimit from "express-rate-limit";

export const limitAgentPortalRead = rateLimit({
  windowMs: 60_000, // 1 minute
  limit: 60, // 60 requests per minute per agent
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment and try again." },
  keyGenerator: (req) => {
    const userId = (req as any)?.user?.id;
    if (typeof userId === "number" && Number.isFinite(userId) && userId > 0) {
      return `agent:${userId}`;
    }
    return req.ip || req.socket.remoteAddress || "unknown";
  },
});

export const limitAgentNotifyAdmin = rateLimit({
  windowMs: 60_000, // 1 minute
  limit: 5, // prevent inbox spam
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages. Please wait a moment before sending another." },
  keyGenerator: (req) => {
    const userId = (req as any)?.user?.id;
    if (typeof userId === "number" && Number.isFinite(userId) && userId > 0) {
      return `agent-notify-admin:${userId}`;
    }
    return req.ip || req.socket.remoteAddress || "unknown";
  },
});

export const limitCloudinarySign = rateLimit({
  windowMs: 60_000, // 1 minute
  // Allows bursts for multi-file uploads but blocks abuse
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many upload signature requests. Please wait and try again." },
  keyGenerator: (req) => {
    const userId = (req as any)?.user?.id;
    if (typeof userId === "number" && Number.isFinite(userId) && userId > 0) {
      return `cloudinary-sign:${userId}`;
    }
    return req.ip || req.socket.remoteAddress || "unknown";
  },
});

export const limitCodeSearch = rateLimit({
  windowMs: 60_000, // 1 min
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for cancellation lookups (prevents abuse of code validation)
export const limitCancellationLookup = rateLimit({
  windowMs: 60_000, // 1 minute
  limit: 30, // 30 lookups per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many cancellation code lookups. Please wait a moment and try again." },
});

// Rate limiter for cancellation submissions (prevents spam submissions)
export const limitCancellationSubmit = rateLimit({
  windowMs: 15 * 60_000, // 15 minutes
  limit: 5, // 5 submissions per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many cancellation requests. Please wait before submitting another request." },
});

// Rate limiter for cancellation messages (prevents spam messaging)
export const limitCancellationMessages = rateLimit({
  windowMs: 60_000, // 1 minute
  limit: 10, // 10 messages per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages. Please wait a moment before sending another message." },
});

// Rate limiter for plan request submissions (prevents spam)
export const limitPlanRequestSubmit = rateLimit({
  windowMs: 15 * 60_000, // 15 minutes
  limit: 3, // 3 submissions per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many plan request submissions. Please wait before submitting another request." },
});

// Rate limiter for plan request messages (follow-up messages)
export const limitPlanRequestMessages = rateLimit({
  windowMs: 60_000, // 1 minute
  limit: 5, // 5 messages per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages. Please wait a moment before sending another message." },
});

// Rate limiter for owner group stay messages (prevents spam/abuse)
export const limitOwnerGroupStayMessages = rateLimit({
  windowMs: 60_000, // 1 minute
  limit: 10, // 10 messages per minute per owner
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages. Please wait a moment before sending another message." },
  keyGenerator: (req) => {
    // Rate limit by owner ID if authenticated
    const ownerId = (req as any).user?.id;
    if (ownerId) {
      return `owner-group-stay-msg:${ownerId}`;
    }
    // Fallback to IP if not authenticated
    return req.ip || req.socket.remoteAddress || "unknown";
  },
});

// Rate limiter for chatbot messages (prevents spam/abuse)
export const limitChatbotMessages = rateLimit({
  windowMs: 60_000, // 1 minute
  limit: 30, // 30 messages per minute per IP/session
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages. Please wait a moment before sending another message." },
  keyGenerator: (req) => {
    // Use session ID if available, otherwise fall back to IP
    const sessionId = req.body?.sessionId || req.cookies?.chatbot_session_id;
    if (sessionId) {
      return `chatbot:${sessionId}`;
    }
    // Ensure we always return a string
    return req.ip || req.socket.remoteAddress || "unknown";
  },
});

// Rate limiter for chatbot conversation history requests
export const limitChatbotConversations = rateLimit({
  windowMs: 60_000, // 1 minute
  limit: 20, // 20 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment and try again." },
});

// Rate limiter for chatbot language changes
export const limitChatbotLanguageChange = rateLimit({
  windowMs: 60_000, // 1 minute
  limit: 10, // 10 language changes per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many language changes. Please wait a moment and try again." },
});

// Rate limiter for OTP sending (prevents SMS spam and cost abuse)
export const limitOtpSend = rateLimit({
  windowMs: 15 * 60_000, // 15 minutes
  limit: 3, // 3 OTP requests per phone number per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many OTP requests. Please wait 15 minutes before requesting another code." },
  keyGenerator: (req) => {
    // Rate limit by phone number to prevent SMS spam
    const phone = req.body?.phone;
    if (phone) {
      return `otp:${String(phone)}`;
    }
    // Fallback to IP if no phone provided
    return req.ip || req.socket.remoteAddress || "unknown";
  },
});

// Rate limiter for OTP verification attempts (prevents brute force)
export const limitOtpVerify = rateLimit({
  windowMs: 15 * 60_000, // 15 minutes
  limit: 10, // 10 verification attempts per phone number per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many verification attempts. Please wait 15 minutes before trying again." },
  keyGenerator: (req) => {
    const phone = req.body?.phone;
    if (phone) {
      return `otp-verify:${String(phone)}`;
    }
    return req.ip || req.socket.remoteAddress || "unknown";
  },
});

// Rate limiter for login attempts (IP-based to prevent brute force)
export const limitLoginAttempts = rateLimit({
  windowMs: 15 * 60_000, // 15 minutes
  limit: 10, // 10 login attempts per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please wait 15 minutes before trying again." },
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Rate limiter for registration attempts (prevents account creation abuse)
export const limitRegisterAttempts = rateLimit({
  windowMs: 15 * 60_000, // 15 minutes
  limit: 5, // 5 registration attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many registration attempts. Please wait 15 minutes before trying again." },
  keyGenerator: (req) => {
    const email = req.body?.email;
    if (email) return `register:${String(email).trim().toLowerCase()}`;
    return req.ip || req.socket.remoteAddress || "unknown";
  },
});

// Rate limiter for public transport booking creation (prevents spam/abuse)
export const limitTransportBooking = rateLimit({
  windowMs: 15 * 60_000, // 15 minutes
  limit: 10, // 10 bookings per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many booking requests. Please wait 15 minutes before creating another booking." },
  keyGenerator: (req) => {
    // Rate limit by IP, but also consider phone/email if provided
    const phone = req.body?.guestPhone || req.body?.phone;
    const email = req.body?.guestEmail || req.body?.email;
    if (phone) {
      return `transport-booking:${String(phone)}`;
    }
    if (email) {
      return `transport-booking:${String(email)}`;
    }
    return req.ip || req.socket.remoteAddress || "unknown";
  },
});

// Rate limiter for authenticated driver trip list endpoints (prevents scraping/spam)
export const limitDriverTripsList = rateLimit({
  windowMs: 60_000, // 1 minute
  limit: 120, // 120 requests/minute per driver
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment and try again." },
  keyGenerator: (req) => {
    const driverId = (req as any).user?.id || (req as any).userId;
    if (driverId) return `driver-trips-list:${String(driverId)}`;
    return req.ip || req.socket.remoteAddress || "unknown";
  },
});

// Rate limiter for driver trip claim endpoint (prevents claim spamming / brute forcing)
export const limitDriverTripClaim = rateLimit({
  windowMs: 10 * 60_000, // 10 minutes
  limit: 15, // 15 claims/10 minutes per driver
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many claim attempts. Please wait and try again." },
  keyGenerator: (req) => {
    const driverId = (req as any).user?.id || (req as any).userId;
    if (driverId) return `driver-trip-claim:${String(driverId)}`;
    return req.ip || req.socket.remoteAddress || "unknown";
  },
});

// Rate limiter for driver trip actions (accept/decline/cancel)
export const limitDriverTripAction = rateLimit({
  windowMs: 60_000, // 1 minute
  limit: 60, // 60 actions/minute per driver
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment and try again." },
  keyGenerator: (req) => {
    const driverId = (req as any).user?.id || (req as any).userId;
    if (driverId) return `driver-trip-action:${String(driverId)}`;
    return req.ip || req.socket.remoteAddress || "unknown";
  },
});

// Rate limiter for driver location updates (high-frequency but must be bounded)
export const limitDriverLocationUpdate = rateLimit({
  windowMs: 60_000, // 1 minute
  limit: 240, // ~4 updates/sec per driver
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many location updates. Please slow down." },
  keyGenerator: (req) => {
    const driverId = (req as any).user?.id || (req as any).userId;
    if (driverId) return `driver-location:${String(driverId)}`;
    return req.ip || req.socket.remoteAddress || "unknown";
  },
});

// Rate limiter for driver availability toggles (prevents spam/flapping)
export const limitDriverAvailabilityToggle = rateLimit({
  windowMs: 60_000, // 1 minute
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many availability changes. Please wait a moment." },
  keyGenerator: (req) => {
    const driverId = (req as any).user?.id || (req as any).userId;
    if (driverId) return `driver-availability:${String(driverId)}`;
    return req.ip || req.socket.remoteAddress || "unknown";
  },
});