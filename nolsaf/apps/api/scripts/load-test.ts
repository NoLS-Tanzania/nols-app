import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";

interface TestConfig {
  baseUrl: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  concurrent: number;
  requests: number;
  durationSeconds: number;
  warmupRequests: number;
  timeoutMs: number;
  headers?: Record<string, string>;
  body?: unknown;
  reportPath?: string;
}

interface TestResult {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalDuration: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  p50: number;
  p95: number;
  p99: number;
  requestsPerSecond: number;
  errorRate: number;
  durations: number[];
  perSecond: Array<{ second: number; requests: number; avgLatency: number; p95Latency: number }>;
  errors: Array<{ status: number; message: string }>;
}

const SCENARIOS: Record<string, string> = {
  browse: "/api/public/properties",
  detail: "/api/public/properties/1",
  "home-summary": "/api/public/home-summary",
};

function percentile(values: number[], percentileValue: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1));
  return sorted[index];
}

function buildConfig(argv: string[]): TestConfig {
  const config: TestConfig = {
    baseUrl: process.env.API_URL || "http://localhost:3001",
    endpoint: SCENARIOS.browse,
    method: "GET",
    concurrent: 10,
    requests: 100,
    durationSeconds: 0,
    warmupRequests: 0,
    timeoutMs: 30_000,
    headers: {},
  };

  const headerEntries: Record<string, string> = {};

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    switch (token) {
      case "--scenario":
        config.endpoint = SCENARIOS[argv[index + 1]] || argv[index + 1];
        index += 1;
        break;
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
      case "--warmup":
        config.warmupRequests = Number.parseInt(argv[index + 1], 10);
        index += 1;
        break;
      case "--method":
        config.method = argv[index + 1].toUpperCase() as TestConfig["method"];
        index += 1;
        break;
      case "--base-url":
        config.baseUrl = argv[index + 1];
        index += 1;
        break;
      case "--timeout-ms":
        config.timeoutMs = Number.parseInt(argv[index + 1], 10);
        index += 1;
        break;
      case "--header":
        if (argv[index + 1]) {
          const [key, ...rest] = argv[index + 1].split(":");
          headerEntries[key.trim()] = rest.join(":").trim();
        }
        index += 1;
        break;
      case "--body-file":
        config.body = JSON.parse(readFileSync(argv[index + 1], "utf8"));
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

  if (Object.keys(headerEntries).length > 0) {
    config.headers = headerEntries;
  }

  if (Number.isNaN(config.concurrent) || config.concurrent < 1) throw new Error("--concurrent must be >= 1");
  if (Number.isNaN(config.requests) || config.requests < 1) throw new Error("--requests must be >= 1");
  if (Number.isNaN(config.durationSeconds) || config.durationSeconds < 0) throw new Error("--duration must be >= 0");
  if (Number.isNaN(config.timeoutMs) || config.timeoutMs < 1000) throw new Error("--timeout-ms must be >= 1000");

  return config;
}

async function makeRequest(config: TestConfig): Promise<{ duration: number; status: number; error?: string }> {
  const start = performance.now();
  try {
    const url = `${config.baseUrl}${config.endpoint}`;
    const options: RequestInit = {
      method: config.method,
      headers: {
        "Content-Type": "application/json",
        ...(config.headers || {}),
      },
      signal: AbortSignal.timeout(config.timeoutMs),
    };

    if (config.body && (config.method === "POST" || config.method === "PUT")) {
      options.body = JSON.stringify(config.body);
    }

    const response = await fetch(url, options);
    const payload = await response.text();
    const duration = performance.now() - start;

    return {
      duration,
      status: response.status,
      error: !response.ok ? payload.slice(0, 200) : undefined,
    };
  } catch (error: any) {
    const duration = performance.now() - start;
    return {
      duration,
      status: 0,
      error: error?.message || String(error),
    };
  }
}

async function runLoadTestInternal(config: TestConfig): Promise<TestResult> {
  const durations: number[] = [];
  const errors: Array<{ status: number; message: string }> = [];
  const perSecond = new Map<number, number[]>();

  let successfulRequests = 0;
  let failedRequests = 0;
  let completedRequests = 0;

  const totalStart = performance.now();
  const durationMs = config.durationSeconds > 0 ? config.durationSeconds * 1000 : undefined;

  const launchRequest = async () => {
    const result = await makeRequest(config);
    const duration = result.duration;
    durations.push(duration);
    completedRequests += 1;

    const secondBucket = Math.floor((performance.now() - totalStart) / 1000);
    if (!perSecond.has(secondBucket)) {
      perSecond.set(secondBucket, []);
    }
    perSecond.get(secondBucket)!.push(duration);

    if (result.status >= 200 && result.status < 300) {
      successfulRequests += 1;
    } else {
      failedRequests += 1;
      if (result.error) {
        errors.push({ status: result.status, message: result.error });
      }
    }
  };

  if (durationMs) {
    const expectedEnd = totalStart + durationMs;
    while (performance.now() < expectedEnd) {
      const active = Array.from({ length: Math.min(config.concurrent, Math.max(1, Math.floor((expectedEnd - performance.now()) / 1000) + 1)) }, () => launchRequest());
      await Promise.all(active);
    }
  } else {
    const batches = Math.ceil(config.requests / config.concurrent);
    for (let batch = 0; batch < batches; batch += 1) {
      const batchStart = batch * config.concurrent;
      const batchEnd = Math.min(batchStart + config.concurrent, config.requests);
      const batchSize = batchEnd - batchStart;
      const promises = Array.from({ length: batchSize }, () => launchRequest());
      await Promise.all(promises);
      const progress = ((batch + 1) / batches) * 100;
      process.stdout.write(`\r   Progress: ${progress.toFixed(1)}% (${Math.min(batchEnd, config.requests)}/${config.requests} requests)`);
    }
  }

  const totalDuration = performance.now() - totalStart;
  durations.sort((a, b) => a - b);

  const result: TestResult = {
    totalRequests: completedRequests,
    successfulRequests,
    failedRequests,
    totalDuration,
    averageDuration: durations.length > 0 ? durations.reduce((sum, value) => sum + value, 0) / durations.length : 0,
    minDuration: durations.length > 0 ? durations[0] : 0,
    maxDuration: durations.length > 0 ? durations[durations.length - 1] : 0,
    p50: percentile(durations, 50),
    p95: percentile(durations, 95),
    p99: percentile(durations, 99),
    requestsPerSecond: totalDuration > 0 ? (completedRequests / totalDuration) * 1000 : 0,
    errorRate: completedRequests > 0 ? (failedRequests / completedRequests) * 100 : 0,
    durations,
    perSecond: Array.from(perSecond.entries())
      .sort((left, right) => left[0] - right[0])
      .map(([second, values]) => ({
        second,
        requests: values.length,
        avgLatency: values.reduce((sum, value) => sum + value, 0) / values.length,
        p95Latency: percentile(values, 95),
      })),
    errors: errors.slice(0, 10),
  };

  if (config.reportPath) {
    const reportDir = path.dirname(config.reportPath);
    mkdirSync(reportDir, { recursive: true });
    writeFileSync(config.reportPath, JSON.stringify(result, null, 2), "utf8");
    console.log(`\n📝 Load test report written to ${config.reportPath}`);
  }

  return result;
}

export async function runLoadTest(config: TestConfig): Promise<TestResult> {
  const start = performance.now();

  console.log("\n🚀 Starting API load test");
  console.log(`   Endpoint: ${config.method} ${config.baseUrl}${config.endpoint}`);
  console.log(`   Concurrency: ${config.concurrent}`);
  console.log(`   Requests: ${config.requests}`);
  console.log(`   Duration: ${config.durationSeconds}s`);
  console.log(`   Warmup: ${config.warmupRequests} requests\n`);

  if (config.warmupRequests > 0) {
    console.log(`🔥 Warmup: ${config.warmupRequests} requests at concurrency ${Math.min(5, config.concurrent)}`);
    await runLoadTestInternal({
      ...config,
      concurrent: Math.min(5, config.concurrent),
      requests: config.warmupRequests,
      durationSeconds: 0,
      warmupRequests: 0,
      reportPath: undefined,
    });
  }

  const result = await runLoadTestInternal(config);
  const elapsed = performance.now() - start;
  console.log(`\n⏱️  Run completed in ${(elapsed / 1000).toFixed(2)}s`);
  return result;
}

function printResults(result: TestResult) {
  console.log("\n📊 API Load Test Results:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Total Requests:      ${result.totalRequests}`);
  console.log(`Successful:          ${result.successfulRequests} (${((result.successfulRequests / result.totalRequests) * 100 || 0).toFixed(1)}%)`);
  console.log(`Failed:              ${result.failedRequests} (${((result.failedRequests / result.totalRequests) * 100 || 0).toFixed(1)}%)`);
  console.log(`Total Duration:      ${(result.totalDuration / 1000).toFixed(2)}s`);
  console.log(`Requests/Second:     ${result.requestsPerSecond.toFixed(2)}`);
  console.log("");
  console.log("Response Times:");
  console.log(`  Average:           ${result.averageDuration.toFixed(2)}ms`);
  console.log(`  Min:                ${result.minDuration.toFixed(2)}ms`);
  console.log(`  Max:                ${result.maxDuration.toFixed(2)}ms`);
  console.log(`  p50 (Median):       ${result.p50.toFixed(2)}ms`);
  console.log(`  p95:                ${result.p95.toFixed(2)}ms`);
  console.log(`  p99:                ${result.p99.toFixed(2)}ms`);
  console.log("");

  if (result.errors.length > 0) {
    console.log("Top errors:");
    result.errors.forEach((error, index) => console.log(`  ${index + 1}. Status ${error.status}: ${error.message.slice(0, 80)}`));
    console.log("");
  }

  if (result.p95 < 200) {
    console.log("✅ Excellent performance (p95 < 200ms)");
  } else if (result.p95 < 500) {
    console.log("✅ Good performance (p95 < 500ms)");
  } else if (result.p95 < 1000) {
    console.log("⚠️  Acceptable performance (p95 < 1000ms)");
  } else {
    console.log("❌ Poor performance (p95 >= 1000ms) - optimization needed");
  }
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

function printHelp(): void {
  console.log(`Usage:
  pnpm --filter @nolsaf/api load:test --scenario browse --concurrent 25 --requests 250
  pnpm --filter @nolsaf/api load:test --endpoint /api/public/properties --duration 60 --concurrent 25

Options:
  --scenario browse|detail|home-summary
  --endpoint <path>
  --method <GET|POST|PUT|DELETE>
  --base-url <url>
  --concurrent <number>
  --requests <number>
  --duration <seconds>
  --warmup <requests>
  --timeout-ms <number>
  --header "Key: Value" (repeatable)
  --body-file <path-to-json>
  --report-json <output-path>
`);
}

async function main() {
  try {
    const config = buildConfig(process.argv.slice(2));
    if (process.argv.includes("--help") || process.argv.includes("-h")) {
      printHelp();
      return;
    }

    const result = await runLoadTest(config);
    printResults(result);
    process.exit(result.errorRate > 1 || result.p95 >= 500 ? 1 : 0);
  } catch (error) {
    console.error("❌ Load test failed:", error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}


