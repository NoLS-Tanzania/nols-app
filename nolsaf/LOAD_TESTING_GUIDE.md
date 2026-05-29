# Load Testing & Capacity Validation Guide

This guide documents the performance validation harness for the NoLSAF API and real-time socket layer.

## 1. Goals

The capacity suite validates that the platform remains responsive when the API, Redis cache, database, and socket layer are stressed together.

The harness covers:

- API endpoint throughput and latency under concurrency
- Redis connectivity and latency
- Database query responsiveness
- Socket.IO connection and room join behavior
- Structured reporting to JSON files for trend tracking

## 2. Prerequisites

Before running any benchmark, ensure:

1. The API server is running locally or at the target host.
2. Redis is reachable and configured through `REDIS_URL`/`REDIS_URL`.
3. MariaDB/MySQL is reachable through `DATABASE_URL`.
4. The workspace dependencies are installed (`pnpm install`).

Recommended environment variables:

```env
API_URL=http://localhost:3001
SOCKET_URL=http://localhost:3001
DATABASE_URL=mysql://user:password@localhost:3306/nolsdb
REDIS_URL=redis://localhost:6379
PROPERTY_ID=1
```

## 3. Available harnesses

### API load runner

The API runner performs concurrent HTTP requests against any endpoint and emits percentile and error metrics.

Command:

```bash
pnpm --filter @nolsaf/api load:test
```

### Socket stress runner

The socket harness connects a configurable number of clients, joins the public property availability room, and measures connection and room-join latency.

Command:

```bash
pnpm --filter @nolsaf/api load:test:socket
```

### Combined capacity suite

The combined suite checks Redis, the database, API performance, and socket behavior in one run and writes a combined summary JSON report.

Command:

```bash
pnpm --filter @nolsaf/api load:test:capacity
```

## 4. Suggested scenarios

### Smoke

Validate the harness itself and ensure the environment is reachable.

```bash
pnpm --filter @nolsaf/api load:test --scenario browse --concurrent 5 --requests 25
pnpm --filter @nolsaf/api load:test:socket --clients 10 --duration 15
```

### Baseline

Measure a stable baseline against the public browse endpoint.

```bash
pnpm --filter @nolsaf/api load:test --scenario browse --concurrent 25 --requests 250 --warmup 10 --report-json reports/api-browse-baseline.json
```

### Stress

Apply sustained concurrency to the hottest endpoint.

```bash
pnpm --filter @nolsaf/api load:test --endpoint /api/public/properties --concurrent 50 --duration 120 --report-json reports/api-browse-stress.json
```

### Socket stress

Exercise real-time connection volume.

```bash
pnpm --filter @nolsaf/api load:test:socket --clients 100 --duration 120 --property-id 1 --report-json reports/socket-stress.json
```

### Combined capacity run

Run the full suite and capture a consolidated report.

```bash
pnpm --filter @nolsaf/api load:test:capacity --concurrent 25 --requests 250 --socket-clients 50 --socket-duration 120 --report-json reports/capacity-summary.json
```

## 5. CLI options

### API runner

- `--scenario browse|detail|home-summary`
- `--endpoint /api/public/properties`
- `--method GET|POST|PUT|DELETE`
- `--base-url http://localhost:3001`
- `--concurrent 25`
- `--requests 250`
- `--duration 60`
- `--warmup 10`
- `--timeout-ms 30000`
- `--header "Key: Value"` (repeat as needed)
- `--body-file path/to/request.json`
- `--report-json reports/api.json`

### Socket runner

- `--socket-url http://localhost:3001`
- `--clients 25`
- `--duration 60`
- `--property-id 1`
- `--token <jwt>`
- `--timeout-ms 10000`
- `--report-json reports/socket.json`

### Capacity suite

- `--endpoint /api/public/properties`
- `--concurrent 25`
- `--requests 250`
- `--duration 60`
- `--socket-clients 25`
- `--socket-duration 60`
- `--property-id 1`
- `--report-json reports/capacity-summary.json`

## 6. Report interpretation

The API runner returns:

- total requests and success/failure counts
- average, min, max, p50, p95, p99 latency
- requests per second
- error rate
- per-second latency breakdown
- threshold status with a p95 target of 500ms and error-rate target of 1%

The socket runner returns:

- successful vs failed connections
- successful vs failed room joins
- average and p95 connect latencies
- average and p95 room join latencies
- socket error count

The combined suite writes a JSON summary containing Redis, database, API, and socket metrics with readiness flags.

## 7. Operational thresholds

Use the following guardrails during validation:

- API p95 should stay below `500ms` for baseline and stress scenarios.
- API error rate should stay below `1%`.
- Redis latency should remain stable and pings should succeed.
- Database query latency should remain stable through repeated checks.
- Socket connection failures should remain near zero during sustained load.

## 8. Recommended workflow

1. Start the API service, Redis, and database.
2. Run the smoke scenario.
3. Run the baseline scenario and keep the JSON output.
4. Run the stress scenario and compare p95/error deltas.
5. Run socket stress.
6. Run the combined capacity suite.
7. Archive reports under `reports/` and compare week-over-week.

## 9. Report locations

The harness writes JSON files to the configured `--report-json` paths. Recommended folders:

- `reports/api-browse-baseline.json`
- `reports/api-browse-stress.json`
- `reports/socket-stress.json`
- `reports/capacity-summary.json`

## 10. Troubleshooting

- If the API runner fails immediately, confirm the API server is reachable at `API_URL`.
- If Redis checks fail, confirm `REDIS_URL` and that Redis is running.
- If the socket harness fails, confirm the socket server is running and the public room join handler is reachable.
- If the database check fails, confirm `DATABASE_URL` and schema availability.

## 11. Recommended ongoing cadence

Run the combined capacity suite on:

- every deployment candidate
- every weekly performance regression review
- after Redis, database, or Socket.IO changes

This creates measurable evidence instead of relying on code inspection alone.
