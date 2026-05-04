# NoLSAF Pre-Push Checklist
# Run this before merging staging -> main (production).
# Usage: .\scripts\pre-push-check.ps1 [-ApiUrl "https://your-staging-api.onrender.com"] [-TestPropertyId 3]

param(
  [string]$ApiUrl = "http://localhost:4000",
  [int]$TestPropertyId = 0
)

$ErrorActionPreference = "Stop"
$allPassed = $true

function Pass([string]$msg) { Write-Host "  [PASS] $msg" -ForegroundColor Green }
function Fail([string]$msg) { Write-Host "  [FAIL] $msg" -ForegroundColor Red; $script:allPassed = $false }
function Info([string]$msg) { Write-Host "  [....] $msg" -ForegroundColor Gray }

Write-Host ""
Write-Host "NoLSAF Pre-Push Checklist" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. On staging branch? ────────────────────────────────────────────────────
Info "Checking current branch..."
$branch = git rev-parse --abbrev-ref HEAD 2>&1
if ($branch -eq "staging") {
  Pass "On staging branch"
} else {
  Fail "Not on staging branch (currently on: $branch). Switch to staging first."
}

# ── 2. No uncommitted changes ────────────────────────────────────────────────
Info "Checking for uncommitted changes..."
$status = git status --porcelain 2>&1
if ([string]::IsNullOrWhiteSpace($status)) {
  Pass "Working tree clean"
} else {
  Fail "Uncommitted changes detected. Commit or stash before deploying."
}

# ── 3. TypeScript compile check ──────────────────────────────────────────────
Info "Running TypeScript check (web)..."
try {
  $result = npm run --workspace=@nolsaf/web typecheck 2>&1
  if ($LASTEXITCODE -eq 0) {
    Pass "TypeScript (web) — no errors"
  } else {
    Fail "TypeScript (web) errors found. Run: npm run --workspace=@nolsaf/web typecheck"
  }
} catch {
  Fail "TypeScript check failed to run: $_"
}

Info "Running TypeScript check (api)..."
try {
  $result = npm run --workspace=@nolsaf/api typecheck 2>&1
  if ($LASTEXITCODE -eq 0) {
    Pass "TypeScript (api) — no errors"
  } else {
    Fail "TypeScript (api) errors found. Run: npm run --workspace=@nolsaf/api typecheck"
  }
} catch {
  Fail "TypeScript check failed to run: $_"
}

# ── 4. Smoke test ────────────────────────────────────────────────────────────
Info "Running smoke test against: $ApiUrl ..."
try {
  $env:API_URL = $ApiUrl
  $env:TEST_PROPERTY_ID = $TestPropertyId
  node scripts/smoke-test.mjs
  if ($LASTEXITCODE -eq 0) {
    Pass "Smoke test passed"
  } else {
    Fail "Smoke test failed. Fix issues before merging to main."
  }
} catch {
  Fail "Smoke test could not run: $_"
}

# ── 5. Summary ───────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "=================================" -ForegroundColor Cyan
if ($allPassed) {
  Write-Host "  ALL CHECKS PASSED" -ForegroundColor Green
  Write-Host "  Safe to merge staging -> main (production)" -ForegroundColor Green
  Write-Host ""
  Write-Host "  Next step:" -ForegroundColor White
  Write-Host "    git checkout main" -ForegroundColor White
  Write-Host "    git merge staging" -ForegroundColor White
  Write-Host "    git push origin main" -ForegroundColor White
} else {
  Write-Host "  CHECKS FAILED — do not merge to main" -ForegroundColor Red
  Write-Host "  Fix the issues above, then re-run this script." -ForegroundColor Red
  exit 1
}
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""
