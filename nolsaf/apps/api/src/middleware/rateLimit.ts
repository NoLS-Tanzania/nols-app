import rateLimit from "express-rate-limit";

export const limitCodeSearch = rateLimit({
  windowMs: 60_000, // 1 min
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});
