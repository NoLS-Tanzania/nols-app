// apps/api/src/middleware/requestSizeLimit.ts
import { Request, Response, NextFunction } from "express";
import express from "express";

// Configure body parser with size limits
export const jsonParser = express.json({
  limit: "100kb", // Maximum request body size
  strict: true,
});

export const urlencodedParser = express.urlencoded({
  extended: true,
  limit: "100kb",
  parameterLimit: 50, // Maximum number of parameters
});

/**
 * Middleware to check request size and reject oversized requests
 */
export function requestSizeLimit(maxSize: number = 100 * 1024) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get("content-length");
    
    if (contentLength && parseInt(contentLength) > maxSize) {
      return res.status(413).json({
        error: "Request too large",
        message: `Request body exceeds maximum size of ${maxSize} bytes`,
      });
    }

    next();
  };
}

