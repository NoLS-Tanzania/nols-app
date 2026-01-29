import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";

let app: any;

beforeAll(async () => {
  // Ensure the API entrypoint does not bind to a port.
  process.env.NODE_ENV = "test";
  const mod = await import("../index");
  app = (mod as any).app;
});

describe("API smoke", () => {
  it("returns JSON 404 for unknown routes", async () => {
    const res = await request(app).get("/definitely-not-a-route");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"] || "").toContain("application/json");
    expect(res.body).toHaveProperty("error");
  });

  it("keeps the placeholder codes search endpoint reachable", async () => {
    const res = await request(app).post("/codes/search").send({ q: "abc" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
  });

  it("mounts admin updates endpoints (unauthenticated request is rejected)", async () => {
    const res = await request(app).get("/api/admin/updates");
    expect([401, 403]).toContain(res.status);
  });

  it("mounts cloudinary signer endpoint (unauthenticated request is rejected)", async () => {
    const res = await request(app).get("/api/uploads/cloudinary/sign?folder=test");
    expect([401, 403]).toContain(res.status);
  });

  it("mounts public updates endpoint (must not 404)", async () => {
    const res = await request(app).get("/api/public/updates");
    expect(res.status === 404).toBe(false);
    expect(res.headers["content-type"] || "").toContain("application/json");
  });

  it("mounts public trust partners endpoint (must not 404)", async () => {
    const res = await request(app).get("/api/admin/trust-partners/public");
    expect(res.status === 404).toBe(false);
    expect(res.headers["content-type"] || "").toContain("application/json");
  });

  it("mounts public properties endpoint (must not 404)", async () => {
    const res = await request(app).get("/api/public/properties");
    expect(res.status === 404).toBe(false);
    expect(res.headers["content-type"] || "").toContain("application/json");
  });

  it("mounts plan request endpoint (must not 404)", async () => {
    // Send an intentionally minimal/invalid payload; we only care that the route exists.
    const res = await request(app).post("/api/plan-request").send({});
    expect(res.status === 404).toBe(false);
    expect(res.headers["content-type"] || "").toContain("application/json");
  });
});
