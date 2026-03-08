import type { RequestHandler } from "express";
import type { AuthedRequest } from "./auth.js";
import { getProtectedDriverAccessDenial, getProtectedDriverState } from "../lib/driverAccess.js";

export const requireApprovedDriver: RequestHandler = async (req, res, next) => {
  const user = (req as AuthedRequest).user;
  if (!user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const driver = await getProtectedDriverState(user.id);
  if (!driver) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const denial = getProtectedDriverAccessDenial(driver);
  if (denial) {
    return res.status(denial.status).json({
      error: denial.code,
      code: denial.code,
      message: denial.message,
    });
  }

  return next();
};