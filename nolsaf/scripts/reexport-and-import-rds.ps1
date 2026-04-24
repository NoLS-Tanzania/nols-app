# Re-export database with row-by-row inserts (fixes line 352/356 timeout)
# Then immediately imports to RDS

$ErrorActionPreference = "Continue"

Write-Host "=== Re-export + Import Fix ===" -ForegroundColor Cyan
Write-Host "Using --skip-extended-insert to avoid large packet timeouts" -ForegroundColor Gray
Write-Host ""

# Configuration
$RDS_HOST     = "database-1.cl6m044mi2nr.eu-north-1.rds.amazonaws.com"
$RDS_USER     = "admin"
$RDS_PASSWORD = "NoLSAFVersion2026"
$RDS_DATABASE = "nolsaf_production"
$MYSQL        = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$MYSQLDUMP    = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
$BACKUP_DIR   = "D:\nolsapp2.1\nolsaf\backups"
$ENV_FILE     = "D:\nolsapp2.1\nolsaf\apps\api\.env"

# Step 1: Read local DB credentials from .env
Write-Host "Step 1: Reading local DB config from .env..." -ForegroundColor Yellow

Add-Type -AssemblyName System.Web
$dbUrl = $null

Get-Content $ENV_FILE | ForEach-Object {
    if ($_ -match '^DATABASE_URL\s*=\s*[''"]?(.+?)[''"]?\s*$') {
        $dbUrl = $matches[1].Trim('"').Trim("'")
    }
}

if (-not $dbUrl) {
    Write-Host "ERROR: DATABASE_URL not found in .env" -ForegroundColor Red
    exit 1
}

try {
    $uri          = [System.Uri]$dbUrl
    $localHost    = $uri.Host
    $localPort    = if ($uri.Port -gt 0) { $uri.Port } else { 3306 }
    $localDb      = $uri.AbsolutePath.TrimStart('/')
    $userInfo     = $uri.UserInfo.Split(':')
    $localUser    = [System.Web.HttpUtility]::UrlDecode($userInfo[0])
    $localPass    = if ($userInfo.Length -gt 1) { [System.Web.HttpUtility]::UrlDecode($userInfo[1]) } else { "" }
} catch {
    Write-Host "ERROR: Failed to parse DATABASE_URL" -ForegroundColor Red
    exit 1
}

Write-Host "  Host: $localHost" -ForegroundColor Gray
Write-Host "  Database: $localDb" -ForegroundColor Gray
Write-Host "  User: $localUser" -ForegroundColor Gray
Write-Host ""

# Step 2: Export with skip-extended-insert (one INSERT per row)
$timestamp  = Get-Date -Format "yyyyMMdd_HHmmss"
$exportFile = Join-Path $BACKUP_DIR "nolsaf_rowbyrow_$timestamp.sql"

Write-Host "Step 2: Exporting with row-by-row inserts..." -ForegroundColor Yellow
Write-Host "  Output: $exportFile" -ForegroundColor Gray
Write-Host "  Note: File will be larger (~3-5x) but each query tiny" -ForegroundColor Gray
Write-Host ""

$dumpArgs = @(
    "--host=$localHost",
    "--port=$localPort",
    "--user=$localUser",
    "--single-transaction",
    "--routines",
    "--triggers",
    "--skip-extended-insert",      # <-- KEY: one INSERT per row
    "--set-gtid-purged=OFF",
    "--hex-blob",
    "--result-file=$exportFile",
    $localDb
)

if ($localPass) {
    $dumpArgs = @("--password=$localPass") + $dumpArgs
}

$exportStart = Get-Date
& $MYSQLDUMP @dumpArgs
$exportEnd   = Get-Date

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "[ERROR] Export failed!" -ForegroundColor Red
    exit 1
}

$exportSizeMB = [math]::Round((Get-Item $exportFile).Length / 1MB, 2)
$exportTime   = ($exportEnd - $exportStart).TotalSeconds

Write-Host ""
Write-Host "[SUCCESS] Export complete!" -ForegroundColor Green
Write-Host "  Size: $exportSizeMB MB" -ForegroundColor Gray
Write-Host "  Time: $exportTime seconds" -ForegroundColor Gray
Write-Host ""

# Step 3: Wrap with FK checks disabled
Write-Host "Step 3: Adding FK disable wrapper..." -ForegroundColor Yellow

$wrappedFile = Join-Path $BACKUP_DIR "nolsaf_final_import.sql"

$header = @"
SET FOREIGN_KEY_CHECKS=0;
SET UNIQUE_CHECKS=0;
SET AUTOCOMMIT=0;
SET sql_mode='NO_AUTO_VALUE_ON_ZERO';

"@

$footer = @"

SET FOREIGN_KEY_CHECKS=1;
SET UNIQUE_CHECKS=1;
COMMIT;
"@

[System.IO.File]::WriteAllText($wrappedFile, $header)
[System.IO.File]::AppendAllText($wrappedFile, [System.IO.File]::ReadAllText($exportFile))
[System.IO.File]::AppendAllText($wrappedFile, $footer)

$finalSizeMB = [math]::Round((Get-Item $wrappedFile).Length / 1MB, 2)
Write-Host "[SUCCESS] Final import file: $finalSizeMB MB" -ForegroundColor Green
Write-Host ""

# Step 4: Drop & recreate database on RDS (clean slate)
Write-Host "Step 4: Clearing RDS database (clean slate)..." -ForegroundColor Yellow

$resetSQL = "DROP DATABASE IF EXISTS ``$RDS_DATABASE``; CREATE DATABASE ``$RDS_DATABASE`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
$resetResult = cmd /c "`"$MYSQL`" --host=$RDS_HOST --port=3306 --user=$RDS_USER --password=$RDS_PASSWORD -e `"$resetSQL`"" 2>&1
$resetErrors = $resetResult | Where-Object { $_ -match 'ERROR \d+' }

if ($resetErrors) {
    Write-Host "[WARNING] Reset issue: $resetErrors" -ForegroundColor Yellow
} else {
    Write-Host "[SUCCESS] RDS database cleared" -ForegroundColor Green
}
Write-Host ""

# Step 5: Import
Write-Host "Step 5: Importing to RDS..." -ForegroundColor Yellow
Write-Host "  Each INSERT is one row - no timeout risk!" -ForegroundColor Gray
Write-Host "  Estimated time: 20-45 minutes for $finalSizeMB MB" -ForegroundColor Gray
Write-Host ""

$importStart  = Get-Date
$importResult = cmd /c "`"$MYSQL`" --host=$RDS_HOST --port=3306 --user=$RDS_USER --password=$RDS_PASSWORD --database=$RDS_DATABASE < `"$wrappedFile`"" 2>&1
$importExit   = $LASTEXITCODE
$importEnd    = Get-Date
$importMins   = ($importEnd - $importStart).TotalMinutes

$importErrors = $importResult | Where-Object { $_ -match 'ERROR \d+' }

Write-Host ""
Write-Host "=============================" -ForegroundColor Gray

if ($importExit -eq 0 -and -not $importErrors) {
    Write-Host "[SUCCESS] Import Complete!" -ForegroundColor Green
    Write-Host "=============================" -ForegroundColor Gray
    Write-Host "Duration: $($importMins.ToString('F1')) minutes" -ForegroundColor Gray
} else {
    Write-Host "[ERROR] Import failed" -ForegroundColor Red
    Write-Host "=============================" -ForegroundColor Gray
    Write-Host "Duration: $($importMins.ToString('F1')) minutes" -ForegroundColor Gray
    if ($importErrors) {
        Write-Host ""
        Write-Host "Errors:" -ForegroundColor Yellow
        $importErrors | Select-Object -First 5 | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    }
}

# Step 6: Verify
Write-Host ""
Write-Host "Step 6: Verifying import..." -ForegroundColor Yellow

$verifyQ = "SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA='$RDS_DATABASE' AND TABLE_ROWS > 0 ORDER BY TABLE_ROWS DESC LIMIT 20;"
$verifyResult = cmd /c "`"$MYSQL`" --host=$RDS_HOST --port=3306 --user=$RDS_USER --password=$RDS_PASSWORD --database=$RDS_DATABASE -e `"$verifyQ`"" 2>&1
$verifyResult | Where-Object { $_ -notmatch '\[Warning\]' } | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }

# Cleanup
Write-Host ""
Write-Host "Cleaning up temp files..." -ForegroundColor Gray
Remove-Item $wrappedFile   -ErrorAction SilentlyContinue
# Keep the row-by-row export as backup
Write-Host "Row-by-row export kept at: $exportFile" -ForegroundColor Gray

Write-Host ""
Write-Host "Next: run .\verify-rds-import.ps1 for full comparison with local DB" -ForegroundColor Cyan
