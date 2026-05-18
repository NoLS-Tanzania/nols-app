import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { validateSecrets } from "../lib/validateSecrets";
import { isCloudinaryFileTypeAllowed } from "../routes/uploads.cloudinary";
import { isCareerResumeFileTypeAllowed } from "../routes/public.careers.apply";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

function setProductionSecrets(overrides: Record<string, string | undefined> = {}) {
  process.env.NODE_ENV = "production";
  Object.assign(process.env, {
    AZAMPAY_API_KEY: "a".repeat(24),
    AZAMPAY_CLIENT_ID: "client-id",
    AZAMPAY_CLIENT_SECRET: "b".repeat(24),
    AZAMPAY_WEBHOOK_SECRET: "c".repeat(24),
    AZAMPAY_APP_NAME: "nolsaf",
    DATABASE_URL: "mysql://user:pass@example.com:3306/nolsaf",
    JWT_SECRET: "j".repeat(40),
    ENCRYPTION_KEY: "e".repeat(40),
    INTERNAL_PROXY_SECRET: "p".repeat(40),
    WEB_ORIGIN: "https://www.nolsaf.com",
    APP_ORIGIN: "https://app.nolsaf.com",
    CORS_ORIGIN: "https://www.nolsaf.com,https://app.nolsaf.com",
    CLOUDINARY_CLOUD_NAME: "nolsaf",
    CLOUDINARY_API_KEY: "123456789",
    CLOUDINARY_API_SECRET: "s".repeat(24),
  });
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

describe("security hardening", () => {
  it("fails closed in production when the internal proxy secret is missing", () => {
    setProductionSecrets({ INTERNAL_PROXY_SECRET: undefined });

    expect(() => validateSecrets()).toThrow(/INTERNAL_PROXY_SECRET/);
  });

  it("rejects placeholder production secrets", () => {
    setProductionSecrets({ JWT_SECRET: "changeme".repeat(6) });

    expect(() => validateSecrets()).toThrow(/placeholder value/);
  });

  it("does not allow the old agent tour revenue route to be mounted again", () => {
    const routesDir = path.resolve(process.cwd(), "src/routes");
    const agentRoute = fs.readFileSync(path.join(routesDir, "agent.ts"), "utf8");

    expect(agentRoute).not.toContain("agent.tourRevenue");
    expect(agentRoute).not.toContain("/api/agent/tour-revenue");
    expect(fs.existsSync(path.join(routesDir, "agent.tourRevenue.ts"))).toBe(false);
  });

  it("keeps Cloudinary uploads restricted to known safe MIME types", () => {
    expect(isCloudinaryFileTypeAllowed("image/png")).toBe(true);
    expect(isCloudinaryFileTypeAllowed("image/webp")).toBe(true);
    expect(isCloudinaryFileTypeAllowed("application/pdf")).toBe(true);
    expect(isCloudinaryFileTypeAllowed("image/svg+xml")).toBe(false);
    expect(isCloudinaryFileTypeAllowed("text/html")).toBe(false);
    expect(isCloudinaryFileTypeAllowed("application/javascript")).toBe(false);
  });

  it("keeps public career resume uploads restricted to document MIME types", () => {
    expect(isCareerResumeFileTypeAllowed("application/pdf")).toBe(true);
    expect(isCareerResumeFileTypeAllowed("application/msword")).toBe(true);
    expect(isCareerResumeFileTypeAllowed("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(true);
    expect(isCareerResumeFileTypeAllowed("text/html")).toBe(false);
    expect(isCareerResumeFileTypeAllowed("image/svg+xml")).toBe(false);
    expect(isCareerResumeFileTypeAllowed("application/javascript")).toBe(false);
  });
});
