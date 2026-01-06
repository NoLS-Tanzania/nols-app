/**
 * Load Testing Script
 * 
 * Tests API endpoints under load to identify performance bottlenecks
 * 
 * Usage:
 *   npx tsx scripts/load-test.ts
 *   npx tsx scripts/load-test.ts --endpoint /api/public/properties --concurrent 50 --requests 1000
 */

import { performance } from "perf_hooks";

interface TestConfig {
  baseUrl: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  concurrent: number;
  requests: number;
  headers?: Record<string, string>;
  body?: any;
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
  errors: Array<{ status: number; message: string }>;
}

async function makeRequest(config: TestConfig, requestId: number): Promise<{ duration: number; status: number; error?: string }> {
  const start = performance.now();
  try {
    const url = `${config.baseUrl}${config.endpoint}`;
    const options: RequestInit = {
      method: config.method,
      headers: {
        "Content-Type": "application/json",
        ...config.headers,
      },
    };

    if (config.body && (config.method === "POST" || config.method === "PUT")) {
      options.body = JSON.stringify(config.body);
    }

    const response = await fetch(url, options);
    const duration = performance.now() - start;
    const text = await response.text();

    return {
      duration,
      status: response.status,
      error: !response.ok ? text.substring(0, 100) : undefined,
    };
  } catch (error: any) {
    const duration = performance.now() - start;
    return {
      duration,
      status: 0,
      error: error.message || String(error),
    };
  }
}

async function runLoadTest(config: TestConfig): Promise<TestResult> {
  console.log(`\n🚀 Starting load test:`);
  console.log(`   Endpoint: ${config.method} ${config.endpoint}`);
  console.log(`   Concurrent: ${config.concurrent}`);
  console.log(`   Total Requests: ${config.requests}`);
  console.log(`   Base URL: ${config.baseUrl}\n`);

  const durations: number[] = [];
  const errors: Array<{ status: number; message: string }> = [];
  let successfulRequests = 0;
  let failedRequests = 0;

  const totalStart = performance.now();

  // Create batches of concurrent requests
  const batches = Math.ceil(config.requests / config.concurrent);
  
  for (let batch = 0; batch < batches; batch++) {
    const batchStart = (batch * config.concurrent);
    const batchEnd = Math.min(batchStart + config.concurrent, config.requests);
    const batchSize = batchEnd - batchStart;

    const promises = Array.from({ length: batchSize }, (_, i) => {
      const requestId = batchStart + i;
      return makeRequest(config, requestId);
    });

    const results = await Promise.all(promises);

    for (const result of results) {
      durations.push(result.duration);
      if (result.status >= 200 && result.status < 300) {
        successfulRequests++;
      } else {
        failedRequests++;
        if (result.error) {
          errors.push({ status: result.status, message: result.error });
        }
      }
    }

    // Progress indicator
    const progress = ((batch + 1) / batches) * 100;
    process.stdout.write(`\r   Progress: ${progress.toFixed(1)}% (${batchEnd}/${config.requests} requests)`);
  }

  const totalDuration = performance.now() - totalStart;

  // Calculate percentiles
  durations.sort((a, b) => a - b);
  const p50 = durations[Math.floor(durations.length * 0.5)] || 0;
  const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
  const p99 = durations[Math.floor(durations.length * 0.99)] || 0;

  const result: TestResult = {
    totalRequests: config.requests,
    successfulRequests,
    failedRequests,
    totalDuration,
    averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
    minDuration: Math.min(...durations),
    maxDuration: Math.max(...durations),
    p50,
    p95,
    p99,
    requestsPerSecond: (config.requests / totalDuration) * 1000,
    errors: errors.slice(0, 10), // Keep first 10 errors
  };

  console.log("\n");
  return result;
}

function printResults(result: TestResult) {
  console.log("📊 Load Test Results:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Total Requests:      ${result.totalRequests}`);
  console.log(`Successful:          ${result.successfulRequests} (${((result.successfulRequests / result.totalRequests) * 100).toFixed(1)}%)`);
  console.log(`Failed:              ${result.failedRequests} (${((result.failedRequests / result.totalRequests) * 100).toFixed(1)}%)`);
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
    console.log("Errors (first 10):");
    result.errors.forEach((error, i) => {
      console.log(`  ${i + 1}. Status ${error.status}: ${error.message.substring(0, 80)}`);
    });
    console.log("");
  }

  // Performance assessment
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

async function main() {
  const args = process.argv.slice(2);
  
  // Parse command line arguments
  const config: TestConfig = {
    baseUrl: process.env.API_URL || "http://localhost:3001",
    endpoint: "/api/public/properties",
    method: "GET",
    concurrent: 10,
    requests: 100,
  };

  // Simple argument parser
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--endpoint" && args[i + 1]) {
      config.endpoint = args[i + 1];
      i++;
    } else if (arg === "--concurrent" && args[i + 1]) {
      config.concurrent = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === "--requests" && args[i + 1]) {
      config.requests = parseInt(args[i + 1], 10);
      i++;
    } else if (arg === "--method" && args[i + 1]) {
      config.method = args[i + 1].toUpperCase() as any;
      i++;
    } else if (arg === "--base-url" && args[i + 1]) {
      config.baseUrl = args[i + 1];
      i++;
    }
  }

  try {
    const result = await runLoadTest(config);
    printResults(result);
  } catch (error) {
    console.error("❌ Load test failed:", error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}


