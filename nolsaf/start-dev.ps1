# Start development servers
Write-Host "Starting NoLSAF development servers..." -ForegroundColor Green

# Check if ports are in use
$portsToFree = @(3000, 4000)
foreach ($port in $portsToFree) {
    $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if (-not $listeners) { continue }

    $pids = @($listeners | Select-Object -ExpandProperty OwningProcess -Unique)
    if ($pids.Count -eq 0) { continue }

    Write-Host "Port $port is already in use. Stopping PID(s): $($pids -join ', ')" -ForegroundColor Yellow
    foreach ($pid in $pids) {
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
}

# Change to project directory
Set-Location $PSScriptRoot

# Best-effort: ensure Redis is running in Docker for local caching.
# If Docker isn't available, we continue (API already falls back gracefully).
try {
    $redisScript = Join-Path $PSScriptRoot 'start-redis.ps1'
    if (Test-Path $redisScript) {
        Write-Host "Ensuring Redis is running (Docker)..." -ForegroundColor Cyan
        & $redisScript | Out-Host
    }
} catch {
    Write-Host "Redis auto-start skipped: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Clean Next.js build output to prevent stale asset references (e.g. /_next/static/css/app/layout.css errors)
$webNextPath = Join-Path $PSScriptRoot "apps\web\.next"
if (Test-Path $webNextPath) {
    Write-Host "Cleaning apps/web/.next..." -ForegroundColor Cyan
    Remove-Item -Recurse -Force $webNextPath -ErrorAction SilentlyContinue
}

# Silence Node.js warnings in dev (e.g. DEP0060 util._extend)
# NODE_NO_WARNINGS disables all process warnings; NODE_OPTIONS provides CLI-equivalent flags.
$env:NODE_NO_WARNINGS = "1"
$env:NODE_OPTIONS = (($env:NODE_OPTIONS + ' ') + '--no-warnings').Trim()

# Start the servers
Write-Host "Starting pnpm dev..." -ForegroundColor Cyan
pnpm dev

