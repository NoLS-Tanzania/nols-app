# Start development servers
Write-Host "Starting NoLSAF development servers..." -ForegroundColor Green

# Check if ports are in use
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
$port4000 = Get-NetTCPConnection -LocalPort 4000 -ErrorAction SilentlyContinue

if ($port3000) {
    Write-Host "Port 3000 is already in use. Stopping process..." -ForegroundColor Yellow
    $process = Get-Process -Id $port3000.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

if ($port4000) {
    Write-Host "Port 4000 is already in use. Stopping process..." -ForegroundColor Yellow
    $process = Get-Process -Id $port4000.OwningProcess -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
    }
}

# Change to project directory
Set-Location $PSScriptRoot

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
Write-Host "Starting npm run dev..." -ForegroundColor Cyan
npm run dev

