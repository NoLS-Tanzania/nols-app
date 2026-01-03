import rateLimit from "express-rate-limit";

export const limitCodeSearch = rateLimit({
  windowMs: 60_000, // 1 min
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for cancellation lookups (prevents abuse of code validation)
export const limitCancellationLookup = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 30, // 30 lookups per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many cancellation code lookups. Please wait a moment and try again." },
});

// Rate limiter for cancellation submissions (prevents spam submissions)
export const limitCancellationSubmit = rateLimit({
  windowMs: 15 * 60_000, // 15 minutes
  max: 5, // 5 submissions per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many cancellation requests. Please wait before submitting another request." },
});

// Rate limiter for cancellation messages (prevents spam messaging)
export const limitCancellationMessages = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 10, // 10 messages per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages. Please wait a moment before sending another message." },
});

// Rate limiter for plan request submissions (prevents spam)
export const limitPlanRequestSubmit = rateLimit({
  windowMs: 15 * 60_000, // 15 minutes
  max: 3, // 3 submissions per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many plan request submissions. Please wait before submitting another request." },
});

// Rate limiter for plan request messages (follow-up messages)
export const limitPlanRequestMessages = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 5, // 5 messages per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many messages. Please wait a moment before sending another message." },
});

// Rate limiter for chatbot messages (prevents spam/abuse)
export const limitChatbotMessages = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 30, // 30 messages per minute per IP/session
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
  max: 20, // 20 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment and try again." },
});

// Rate limiter for chatbot language changes
export const limitChatbotLanguageChange = rateLimit({
  windowMs: 60_000, // 1 minute
  max: 10, // 10 language changes per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many language changes. Please wait a moment and try again." },
});

// Rate limiter for OTP sending (prevents SMS spam and cost abuse)
export const limitOtpSend = rateLimit({
  windowMs: 15 * 60_000, // 15 minutes
  max: 3, // 3 OTP requests per phone number per 15 minutes
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
  max: 10, // 10 verification attempts per phone number per 15 minutes
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
  max: 10, // 10 login attempts per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please wait 15 minutes before trying again." },
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Rate limiter for public transport booking creation (prevents spam/abuse)
export const limitTransportBooking = rateLimit({
  windowMs: 15 * 60_000, // 15 minutes
  max: 10, // 10 bookings per IP per 15 minutes
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