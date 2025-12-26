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