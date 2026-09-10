import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireCapability: vi.fn(),
  roomFindMany: vi.fn(),
  roomFindFirst: vi.fn(),
  requestFindMany: vi.fn(),
  requestCreate: vi.fn(),
  audit: vi.fn(),
}));

vi.mock("@nolsaf/prisma", () => ({
  typedPrisma: {
    roomType: { findMany: mocks.roomFindMany, findFirst: mocks.roomFindFirst },
    nrmsPricingRecommendation: { findMany: mocks.requestFindMany, create: mocks.requestCreate },
  },
}));
vi.mock("../middleware/auth.js", () => ({
  requireAuth: (req: any, _res: unknown, next: () => void) => {
    req.user = { id: 41, role: "SALES_EXECUTIVE", email: "sales@example.com" };
    next();
  },
}));
vi.mock("../lib/nrmsPropertyAccess.js", () => ({ requireNrmsPropertyCapability: mocks.requireCapability }));
vi.mock("../lib/audit.js", () => ({ audit: mocks.audit }));
vi.mock("../lib/sanitize.js", () => ({ sanitizeText: (value: string) => value.trim() }));

import rateRequestsRouter from "./owner.nrms.rateRequests.js";

const app = express();
app.use(express.json());
app.use("/api/owner/nrms/rate-requests", rateRequestsRouter);

describe("NRMS sales rate proposals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireCapability.mockResolvedValue({ actorId: 41, role: "SALES_EXECUTIVE", property: { id: 9 } });
    mocks.roomFindMany.mockResolvedValue([]);
    mocks.requestFindMany.mockResolvedValue([]);
    mocks.audit.mockResolvedValue(undefined);
  });

  it("uses read access for proposal history", async () => {
    const response = await request(app).get("/api/owner/nrms/rate-requests/9");

    expect(response.status).toBe(200);
    expect(mocks.requireCapability).toHaveBeenCalledWith(expect.anything(), expect.anything(), 9, "rates.read");
    expect(response.body).toEqual({ roomTypes: [], requests: [] });
  });

  it("lets sales submit a proposal without publishing the rate", async () => {
    mocks.roomFindFirst.mockResolvedValue({ id: 2, baseRate: 100_000, currency: "TZS" });
    mocks.requestCreate.mockResolvedValue({
      id: 15,
      stayDate: new Date("2099-01-02T00:00:00.000Z"),
      currentRate: 100_000,
      recommendedRate: 115_000,
      currency: "TZS",
      reason: "Demand is elevated",
      status: "PENDING",
      factors: { source: "SALES_EXECUTIVE" },
      roomType: { id: 2, name: "Deluxe" },
    });

    const response = await request(app).post("/api/owner/nrms/rate-requests/9").send({
      roomTypeId: 2,
      stayDate: "2099-01-02",
      proposedRate: 115_000,
      reason: "Demand is elevated",
    });

    expect(response.status).toBe(201);
    expect(mocks.requireCapability).toHaveBeenCalledWith(expect.anything(), expect.anything(), 9, "rates.change_request");
    expect(mocks.requestCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ recommendedRate: 115_000, factors: expect.objectContaining({ source: "SALES_EXECUTIVE" }) }),
    }));
    expect(response.body.request.proposedRate).toBe(115_000);
  });
});
