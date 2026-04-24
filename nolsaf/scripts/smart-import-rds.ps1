# Smart RDS Import - Handles FK constraints and timeouts properly
# Wraps the backup with SET FOREIGN_KEY_CHECKS=0 so order doesn't matter

$ErrorActionPreference = "Continue"

Write-Host "=== Smart RDS Import ===" -ForegroundColor Cyan
Write-Host ""

$RDS_HOST     = "database-1.cl6m044mi2nr.eu-north-1.rds.amazonaws.com"
$RDS_USER     = "admin"
$RDS_PASSWORD = "NoLSAFVersion2026"
$RDS_DATABASE = "nolsaf_production"
$MYSQL        = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$BACKUP_FILE  = "D:\nolsapp2.1\nolsaf\backups\nolsaf_rowbyrow_20260424_152653.sql"
$WRAPPED_FILE = "D:\nolsapp2.1\nolsaf\backups\nolsaf_import_wrapped.sql"
$SSL_CA       = "D:\nolsapp2.1\nolsaf\backups\rds-ca-bundle.pem"

# SSL flag - uses CA cert if available, otherwise tries TLS without verification
$SSL_FLAGS = if (Test-Path $SSL_CA) { "--ssl-ca=`"$SSL_CA`" --ssl-mode=VERIFY_CA" } else { "--ssl-mode=REQUIRED --tls-version=TLSv1.2" }

# Step 1: Verify backup exists
if (-not (Test-Path $BACKUP_FILE)) {
    Write-Host "ERROR: Backup file not found: $BACKUP_FILE" -ForegroundColor Red
    exit 1
}

$sizeMB = [math]::Round((Get-Item $BACKUP_FILE).Length / 1MB, 2)
Write-Host "Backup file: $BACKUP_FILE" -ForegroundColor Gray
Write-Host "Size: $sizeMB MB" -ForegroundColor Gray
Write-Host ""

# Step 2: Clear RDS database first (remove partial data from previous attempts)
Write-Host "Step 1: Clearing previous import attempts from RDS..." -ForegroundColor Yellow

$clearSQL = "SET FOREIGN_KEY_CHECKS=0; DROP DATABASE IF EXISTS ``$RDS_DATABASE``; CREATE DATABASE ``$RDS_DATABASE`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; USE ``$RDS_DATABASE``; SET FOREIGN_KEY_CHECKS=1;"

$clearResult = cmd /c "`"$MYSQL`" --host=$RDS_HOST --port=3306 --user=$RDS_USER --password=$RDS_PASSWORD $SSL_FLAGS -e `"$clearSQL`"" 2>&1
if ($clearResult -match 'ERROR \d+') {
    Write-Host "[WARNING] Could not clear database - continuing anyway" -ForegroundColor Yellow
    Write-Host $clearResult -ForegroundColor Gray
} else {
    Write-Host "[SUCCESS] Database cleared and recreated" -ForegroundColor Green
}
Write-Host ""

# Step 3: Create wrapped SQL file with FK checks disabled
Write-Host "Step 2: Preparing import file with FK checks disabled..." -ForegroundColor Yellow

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

# Write header + original file + footer
[System.IO.File]::WriteAllText($WRAPPED_FILE, $header)
$originalContent = [System.IO.File]::ReadAllText($BACKUP_FILE)
[System.IO.File]::AppendAllText($WRAPPED_FILE, $originalContent)
[System.IO.File]::AppendAllText($WRAPPED_FILE, $footer)

$wrappedSizeMB = [math]::Round((Get-Item $WRAPPED_FILE).Length / 1MB, 2)
Write-Host "[SUCCESS] Prepared import file: $wrappedSizeMB MB" -ForegroundColor Green
Write-Host ""

# Step 4: Import using cmd /c (supports < redirection, suppresses password warning)
Write-Host "Step 3: Importing to RDS..." -ForegroundColor Yellow
Write-Host "This will take 15-30 minutes. Do not interrupt!" -ForegroundColor Gray
Write-Host ""

$startTime = Get-Date

$importResult = cmd /c "`"$MYSQL`" --host=$RDS_HOST --port=3306 --user=$RDS_USER --password=$RDS_PASSWORD --database=$RDS_DATABASE $SSL_FLAGS --max_allowed_packet=256M < `"$WRAPPED_FILE`"" 2>&1

$exitCode = $LASTEXITCODE
$endTime   = Get-Date
$duration  = $endTime - $startTime

# Filter actual errors (ignore password warning)
$errors = $importResult | Where-Object { $_ -match 'ERROR \d+' }

Write-Host ""

if ($exitCode -eq 0 -and -not $errors) {
    Write-Host "=============================" -ForegroundColor Gray
    Write-Host "[SUCCESS] Import Complete!" -ForegroundColor Green
    Write-Host "=============================" -ForegroundColor Gray
    Write-Host "Duration: $($duration.TotalMinutes.ToString('F1')) minutes" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "=============================" -ForegroundColor Gray
    Write-Host "[ERROR] Import encountered issues" -ForegroundColor Red
    Write-Host "=============================" -ForegroundColor Gray
    Write-Host "Duration: $($duration.TotalMinutes.ToString('F1')) minutes" -ForegroundColor Gray
    Write-Host ""
    if ($errors) {
        Write-Host "Errors found:" -ForegroundColor Yellow
        $errors | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    }
    Write-Host ""
    Write-Host "Note: Some warnings are normal (e.g. password warning, table already exists)" -ForegroundColor Gray
    Write-Host "Run verify-rds-import.ps1 to check what data made it to RDS" -ForegroundColor Gray
}

# Step 5: Quick verification
Write-Host ""
Write-Host "Step 4: Verifying import..." -ForegroundColor Yellow

$verifyQuery = "SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA='$RDS_DATABASE' ORDER BY TABLE_ROWS DESC LIMIT 15;"

$verifyResult = cmd /c "`"$MYSQL`" --host=$RDS_HOST --port=3306 --user=$RDS_USER --password=$RDS_PASSWORD --database=$RDS_DATABASE $SSL_FLAGS -e `"$verifyQuery`"" 2>&1

$tableData = $verifyResult | Where-Object { $_ -notmatch '\[Warning\]' }
if ($tableData) {
    Write-Host ""
    Write-Host "Tables imported (approximate row counts):" -ForegroundColor Green
    Write-Host $tableData
}

# Cleanup wrapped file
Write-Host ""
Write-Host "Cleaning up temporary files..." -ForegroundColor Gray
Remove-Item $WRAPPED_FILE -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Done! Run .\verify-rds-import.ps1 for full verification." -ForegroundColor Cyan
