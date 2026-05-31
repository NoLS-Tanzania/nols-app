import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/db.js";
import { getRedis } from "../src/lib/redis.js";
import { runLoadTest } from "./load-test.js";
import { runSocketLoadTest } from "./socket-load-test.js";

interface CapacitySuiteConfig {
  endpoint: string;
  concurrent: number;
  requests: number;
  durationSeconds: number;
  socketClients: number;
  socketDurationSeconds: number;
  propertyId: number;
  reportPath: string;
}

const DEFAULT_REPORT_PATH = process.env.CAPACITY_REPORT_PATH || "reports/capacity-summary.json";

function buildConfig(argv: string[]): CapacitySuiteConfig {
  const config: CapacitySuiteConfig = {
    endpoint: "/api/public/properties",
    concurrent: 25,
    requests: 250,
    durationSeconds: 60,
    socketClients: 25,
    socketDurationSeconds: 60,
    propertyId: Number(process.env.PROPERTY_ID || 1),
    reportPath: DEFAULT_REPORT_PATH,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    switch (token) {
      case "--endpoint":
        config.endpoint = argv[index + 1];
        index += 1;
        break;
      case "--concurrent":
        config.concurrent = Number.parseInt(argv[index + 1], 10);
        index += 1;
        break;
      case "--requests":
        config.requests = Number.parseInt(argv[index + 1], 10);
        index += 1;
        break;
      case "--duration":
        config.durationSeconds = Number.parseInt(argv[index + 1], 10);
        index += 1;
        break;
      case "--socket-clients":
        config.socketClients = Number.parseInt(argv[index + 1], 10);
        index += 1;
        break;
      case "--socket-duration":
        config.socketDurationSeconds = Number.parseInt(argv[index + 1], 10);
        index += 1;
        break;
      case "--property-id":
        config.propertyId = Number.parseInt(argv[index + 1], 10);
        index += 1;
        break;
      case "--report-json":
        config.reportPath = argv[index + 1];
        index += 1;
        break;
      default:
        break;
    }
  }

  if (Number.isNaN(config.concurrent) || config.concurrent < 1) throw new Error("--concurrent must be >= 1");
  if (Number.isNaN(config.requests) || config.requests < 1) throw new Error("--requests must be >= 1");
  if (Number.isNaN(config.durationSeconds) || config.durationSeconds < 1) throw new Error("--duration must be >= 1");
  if (Number.isNaN(config.socketClients) || config.socketClients < 1) throw new Error("--socket-clients must be >= 1");
  if (Number.isNaN(config.socketDurationSeconds) || config.socketDurationSeconds < 1) throw new Error("--socket-duration must be >= 1");

  return config;
}

async function checkRedis(): Promise<{ ok: boolean; latencyMs: number; details: string }> {
  const start = Date.now();
  const redis = getRedis();
  if (!redis) throw new Error("Redis client unavailable");
  await redis.ping();
  const latencyMs = Date.now() - start;
  await redis.set("capacity:heartbeat", String(start), "EX", 60);
  return {
    ok: true,
    latencyMs,
    details: `Redis ping latency ${latencyMs}ms`,
  };
}

async function checkDatabase(): Promise<{ ok: boolean; latencyMs: number; details: string }> {
  const start = Date.now();
  await prisma.$queryRaw`SELECT 1 as healthy`;
  const latencyMs = Date.now() - start;
  return {
    ok: true,
    latencyMs,
    details: `Database query latency ${latencyMs}ms`,
  };
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(`Usage:
  pnpm --filter @nolsaf/api load:test:capacity --endpoint /api/public/properties --concurrent 25 --requests 250 --socket-clients 25

Options:
  --endpoint <path>
  --concurrent <number>
  --requests <number>
  --duration <seconds>
  --socket-clients <number>
  --socket-duration <seconds>
  --property-id <number>
  --report-json <output-path>
`);
    return;
  }

  const config = buildConfig(argv);
  const suiteStart = Date.now();

  const redisResult = await checkRedis();
  const databaseResult = await checkDatabase();
  const apiResult = await runLoadTest({
    baseUrl: process.env.API_URL || "http://localhost:3001",
    endpoint: config.endpoint,
    method: "GET",
    concurrent: config.concurrent,
    requests: config.requests,
    durationSeconds: config.durationSeconds,
    warmupRequests: 10,
    timeoutMs: 30_000,
    headers: {},
    reportPath: undefined,
  });
  const socketResult = await runSocketLoadTest({
    socketUrl: process.env.SOCKET_URL || process.env.API_URL || "http://localhost:3001",
    clients: config.socketClients,
    durationSeconds: config.socketDurationSeconds,
    propertyId: config.propertyId,
    timeoutMs: 10_000,
    reportPath: undefined,
  });

  const report = {
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - suiteStart,
    redis: redisResult,
    database: databaseResult,
    api: apiResult,
    socket: socketResult,
    overall: {
      redisHealthy: redisResult.ok,
      databaseHealthy: databaseResult.ok,
      apiHealthy: apiResult.errorRate < 1 && apiResult.p95 < 500,
      socketHealthy: socketResult.errorRate < 5 && socketResult.failedConnections === 0 && socketResult.failedJoins === 0,
    },
  };

  const reportDir = path.dirname(config.reportPath);
  mkdirSync(reportDir, { recursive: true });
  writeFileSync(config.reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(`\n📝 Capacity suite report written to ${config.reportPath}`);
  console.log("\n📋 Capacity Suite Summary:");
  console.log(`Redis: ${redisResult.ok ? "✅" : "❌"} ${redisResult.details}`);
  console.log(`Database: ${databaseResult.ok ? "✅" : "❌"} ${databaseResult.details}`);
  console.log(`API: ${report.overall.apiHealthy ? "✅" : "⚠️"} p95 ${apiResult.p95.toFixed(2)}ms, error rate ${apiResult.errorRate.toFixed(2)}%`);
  console.log(`Socket: ${report.overall.socketHealthy ? "✅" : "⚠️"} connection failures ${socketResult.failedConnections}, join failures ${socketResult.failedJoins}`);

  if (!report.overall.apiHealthy || !report.overall.socketHealthy || !report.overall.redisHealthy || !report.overall.databaseHealthy) {
    console.warn("⚠️ Capacity suite completed with at least one warning.");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("❌ Capacity suite failed:", error);
  process.exit(1);
});
