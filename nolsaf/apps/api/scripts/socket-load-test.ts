import { performance } from "node:perf_hooks";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { io, Socket } from "socket.io-client";

interface SocketLoadConfig {
  socketUrl: string;
  clients: number;
  durationSeconds: number;
  propertyId: number;
  authToken?: string;
  timeoutMs: number;
  reportPath?: string;
}

interface SocketLoadResult {
  totalConnections: number;
  successfulConnections: number;
  failedConnections: number;
  totalJoins: number;
  successfulJoins: number;
  failedJoins: number;
  avgConnectLatencyMs: number;
  p95ConnectLatencyMs: number;
  avgJoinLatencyMs: number;
  p95JoinLatencyMs: number;
  errorRate: number;
  connectLatencies: number[];
  joinLatencies: number[];
  errors: string[];
}

const DEFAULT_SOCKET_URL = process.env.SOCKET_URL || process.env.API_URL || "http://localhost:3001";

function percentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((percentile / 100) * sorted.length) - 1));
  return sorted[index];
}

function buildConfig(argv: string[]): SocketLoadConfig {
  const config: SocketLoadConfig = {
    socketUrl: DEFAULT_SOCKET_URL,
    clients: 25,
    durationSeconds: 60,
    propertyId: Number(process.env.PROPERTY_ID || 1),
    timeoutMs: 10_000,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    switch (token) {
      case "--socket-url":
        config.socketUrl = argv[index + 1];
        index += 1;
        break;
      case "--clients":
        config.clients = Number.parseInt(argv[index + 1], 10);
        index += 1;
        break;
      case "--duration":
        config.durationSeconds = Number.parseInt(argv[index + 1], 10);
        index += 1;
        break;
      case "--property-id":
        config.propertyId = Number.parseInt(argv[index + 1], 10);
        index += 1;
        break;
      case "--token":
        config.authToken = argv[index + 1];
        index += 1;
        break;
      case "--timeout-ms":
        config.timeoutMs = Number.parseInt(argv[index + 1], 10);
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

  if (Number.isNaN(config.clients) || config.clients < 1) throw new Error("--clients must be >= 1");
  if (Number.isNaN(config.durationSeconds) || config.durationSeconds < 1) throw new Error("--duration must be >= 1");
  if (Number.isNaN(config.propertyId) || config.propertyId < 1) throw new Error("--property-id must be >= 1");

  return config;
}

export async function runSocketLoadTest(config: SocketLoadConfig): Promise<SocketLoadResult> {
  const connectLatencies: number[] = [];
  const joinLatencies: number[] = [];
  const errors: string[] = [];

  let successfulConnections = 0;
  let failedConnections = 0;
  let successfulJoins = 0;
  let failedJoins = 0;

  const sockets: Socket[] = [];
  const startedAt = performance.now();

  const connectPromises = Array.from({ length: config.clients }, (_, index) => new Promise<void>((resolve) => {
    const socket = io(config.socketUrl, {
      path: "/socket.io",
      transports: ["websocket"],
      timeout: config.timeoutMs,
      auth: config.authToken ? { token: config.authToken } : undefined,
    });

    const connectAt = performance.now();
    sockets.push(socket);

    socket.on("connect", () => {
      const connectLatency = performance.now() - connectAt;
      connectLatencies.push(connectLatency);
      successfulConnections += 1;
      const joinStart = performance.now();
      socket.emit("join-property-availability", { propertyId: config.propertyId }, (response: any) => {
        const joinLatency = performance.now() - joinStart;
        joinLatencies.push(joinLatency);
        if (response && response.status === "ok") {
          successfulJoins += 1;
        } else {
          failedJoins += 1;
          errors.push(`Join failed: ${JSON.stringify(response)}`);
        }
        resolve();
      });
    });

    socket.on("connect_error", (err: Error) => {
      failedConnections += 1;
      errors.push(`Connect failed: ${err.message}`);
      resolve();
    });

    socket.on("disconnect", () => {
      // Track disconnects as a signal that the client finished its cycle.
    });

    socket.on("error", (err: any) => {
      errors.push(`Socket error: ${typeof err === "string" ? err : JSON.stringify(err)}`);
    });
  }));

  await Promise.race([
    Promise.all(connectPromises),
    new Promise((resolve) => setTimeout(resolve, config.durationSeconds * 1000)),
  ]);

  const totalDuration = performance.now() - startedAt;

  for (const socket of sockets) {
    try {
      socket.disconnect();
    } catch {
      // ignore cleanup failures
    }
  }

  const avgConnectLatencyMs = connectLatencies.length > 0 ? connectLatencies.reduce((sum, value) => sum + value, 0) / connectLatencies.length : 0;
  const avgJoinLatencyMs = joinLatencies.length > 0 ? joinLatencies.reduce((sum, value) => sum + value, 0) / joinLatencies.length : 0;

  const result: SocketLoadResult = {
    totalConnections: config.clients,
    successfulConnections,
    failedConnections,
    totalJoins: config.clients,
    successfulJoins,
    failedJoins,
    avgConnectLatencyMs,
    p95ConnectLatencyMs: percentile(connectLatencies, 95),
    avgJoinLatencyMs,
    p95JoinLatencyMs: percentile(joinLatencies, 95),
    errorRate: config.clients > 0 ? ((failedConnections + failedJoins) / (config.clients * 2)) * 100 : 0,
    connectLatencies,
    joinLatencies,
    errors: errors.slice(0, 20),
  };

  if (config.reportPath) {
    const reportDir = path.dirname(config.reportPath);
    mkdirSync(reportDir, { recursive: true });
    writeFileSync(config.reportPath, JSON.stringify(result, null, 2), "utf8");
    console.log(`📝 Socket report written to ${config.reportPath}`);
  }

  return result;
}

function printResults(result: SocketLoadResult) {
  console.log("\n📡 Socket Load Results:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Total Clients:         ${result.totalConnections}`);
  console.log(`Successful connects:   ${result.successfulConnections}`);
  console.log(`Failed connects:       ${result.failedConnections}`);
  console.log(`Successful joins:      ${result.successfulJoins}`);
  console.log(`Failed joins:          ${result.failedJoins}`);
  console.log(`Average connect latency: ${result.avgConnectLatencyMs.toFixed(2)}ms`);
  console.log(`P95 connect latency:   ${result.p95ConnectLatencyMs.toFixed(2)}ms`);
  console.log(`Average join latency:  ${result.avgJoinLatencyMs.toFixed(2)}ms`);
  console.log(`P95 join latency:      ${result.p95JoinLatencyMs.toFixed(2)}ms`);
  console.log(`Error rate:            ${result.errorRate.toFixed(2)}%`);
  if (result.errors.length > 0) {
    console.log("Top errors:");
    result.errors.forEach((entry, index) => console.log(`  ${index + 1}. ${entry}`));
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

export function printHelp(): void {
  console.log(`Usage:
  pnpm --filter @nolsaf/api load:test:socket --clients 50 --duration 60 --property-id 1

Options:
  --socket-url <ws://host:port>
  --clients <number>
  --duration <seconds>
  --property-id <number>
  --token <auth-token>
  --timeout-ms <number>
  --report-json <output-path>
`);
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    printHelp();
    return;
  }

  try {
    const config = buildConfig(argv);
    const result = await runSocketLoadTest(config);
    printResults(result);
    process.exit(result.failedConnections + result.failedJoins > 0 ? 1 : 0);
  } catch (error) {
    console.error("❌ Socket load test failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
