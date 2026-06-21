import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { buildErrorDiagnostic } from "../lib/errorDiagnostics.js";

const originalSourceMapDir = process.env.SOURCE_MAP_DIR;

afterEach(() => {
  if (originalSourceMapDir == null) delete process.env.SOURCE_MAP_DIR;
  else process.env.SOURCE_MAP_DIR = originalSourceMapDir;
});

describe("buildErrorDiagnostic", () => {
  it("extracts a useful source frame and stable fingerprint", async () => {
    const first = await buildErrorDiagnostic({
      service: "web",
      message: "ReferenceError: ownerFilter is not defined",
      stack: "ReferenceError: ownerFilter is not defined\n    at load (apps/web/app/admin/revenue/page.tsx:301:11)",
      release: "test-release",
    });
    const second = await buildErrorDiagnostic({
      service: "web",
      message: "ReferenceError: ownerFilter is not defined",
      stack: "ReferenceError: ownerFilter is not defined\n    at load (apps/web/app/admin/revenue/page.tsx:301:11)",
      release: "test-release",
    });

    expect(first.primaryFrame).toMatchObject({
      functionName: "load",
      file: "apps/web/app/admin/revenue/page.tsx",
      line: 301,
      column: 11,
      mapped: true,
    });
    expect(first.fingerprint).toBe(second.fingerprint);
  });

  it("maps a generated browser frame through a private source map", async () => {
    const directory = await fs.mkdtemp(path.join(os.tmpdir(), "nolsaf-source-map-"));
    process.env.SOURCE_MAP_DIR = directory;
    const mapPath = path.join(directory, "release-123", "_next", "static", "chunks", "app.js.map");
    await fs.mkdir(path.dirname(mapPath), { recursive: true });
    await fs.writeFile(mapPath, JSON.stringify({
      version: 3,
      file: "app.js",
      sources: ["webpack://_N_E/./apps/web/app/admin/revenue/page.tsx"],
      sourcesContent: ["const value = 1;\nthrow new Error('boom');\nconst after = true;"],
      names: ["renderRevenue"],
      mappings: "AACA",
    }));

    try {
      const diagnostic = await buildErrorDiagnostic({
        service: "web",
        message: "boom",
        stack: "Error: boom\n    at renderRevenue (https://nolsaf.com/_next/static/chunks/app.js:1:1)",
        release: "release-123",
      });

      expect(diagnostic.primaryFrame?.mapped).toBe(true);
      expect(diagnostic.primaryFrame?.file).toBe("apps/web/app/admin/revenue/page.tsx");
      expect(diagnostic.primaryFrame?.line).toBe(2);
      expect(diagnostic.primaryFrame?.codeContext?.some((line) => line.highlight && line.content.includes("throw"))).toBe(true);
    } finally {
      await fs.rm(directory, { recursive: true, force: true });
    }
  });
});
