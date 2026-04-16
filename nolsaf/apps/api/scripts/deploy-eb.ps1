# deploy-eb.ps1
# Vendors workspace packages so EB can resolve them without pnpm workspaces,
# then runs `eb deploy` and cleans up.
#
# Usage (from apps/api):
#   powershell -ExecutionPolicy Bypass -File scripts/deploy-eb.ps1

Set-StrictMode -Off
$ErrorActionPreference = "Stop"

$ApiDir     = $PSScriptRoot | Split-Path -Parent   # …/apps/api
$RepoRoot   = $ApiDir | Split-Path -Parent | Split-Path -Parent  # …/nolsaf

Write-Host "=== [deploy-eb] API dir  : $ApiDir"
Write-Host "=== [deploy-eb] Repo root: $RepoRoot"

# ── 1. Rebuild workspace packages with CJS output ─────────────────────────────
Write-Host "`n── Building @nolsaf/prisma …"
Push-Location "$RepoRoot\packages\prisma"
npx tsc -p tsconfig.json
Pop-Location

Write-Host "── Building @nolsaf/shared …"
Push-Location "$RepoRoot\packages\shared"
npx tsc -p tsconfig.json
Pop-Location

# ── 2. Copy packages into apps/api/_workspace (vendor dir) ───────────────────
$VendorRoot = "$ApiDir\_workspace"
Write-Host "`n── Vendoring packages into $VendorRoot …"

foreach ($pkg in @("prisma", "shared")) {
    $src = "$RepoRoot\packages\$pkg"
    $dst = "$VendorRoot\@nolsaf\$pkg"

    Remove-Item $dst -Recurse -Force -ErrorAction SilentlyContinue
    New-Item   -ItemType Directory -Path $dst -Force | Out-Null

    Copy-Item "$src\package.json" -Destination $dst
    Copy-Item "$src\dist"         -Destination $dst -Recurse
}

# ── 3. Patch apps/api/package.json to use vendored paths ─────────────────────
$PkgJsonPath   = "$ApiDir\package.json"
$PkgJsonBackup = "$ApiDir\package.json.predeploy-bak"

Write-Host "── Patching package.json …"
Copy-Item $PkgJsonPath $PkgJsonBackup -Force

$content = Get-Content $PkgJsonPath -Raw
$content = $content -replace '"@nolsaf/prisma":\s*"file:[^"]*"', '"@nolsaf/prisma": "file:./_workspace/@nolsaf/prisma"'
$content = $content -replace '"@nolsaf/shared":\s*"file:[^"]*"', '"@nolsaf/shared": "file:./_workspace/@nolsaf/shared"'
Set-Content $PkgJsonPath $content -Encoding UTF8

# ── 4. Build the API (TypeScript → dist) ─────────────────────────────────────
Write-Host "`n── Building @nolsaf/api …"
Push-Location $ApiDir
Remove-Item dist -Recurse -Force -ErrorAction SilentlyContinue
npx tsc -p tsconfig.json
node scripts/fix-esm-imports.mjs
Pop-Location

# ── 5. Deploy to Elastic Beanstalk ────────────────────────────────────────────
Write-Host "`n── Deploying to Elastic Beanstalk …"
Push-Location $ApiDir
try {
    $ebCmd = Get-Command eb -ErrorAction SilentlyContinue
    if ($ebCmd) {
        $eb = $ebCmd.Source
    } else {
        $eb = "C:\Users\NoLS Tanzania\AppData\Roaming\Python\Python312\Scripts\eb.exe"
    }
    & $eb deploy
} finally {
    Pop-Location
}

# ── 6. Restore package.json and clean up ──────────────────────────────────────
Write-Host "`n── Restoring package.json …"
Move-Item $PkgJsonBackup $PkgJsonPath -Force

Write-Host "── Cleaning vendor dir …"
Remove-Item $VendorRoot -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "`n=== [deploy-eb] Done. ==="
