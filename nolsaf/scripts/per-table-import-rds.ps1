# Per-Table RDS Import - Most reliable method
# Each table uses its own connection - no timeout possible

$ErrorActionPreference = "Continue"

Write-Host "=== Per-Table RDS Import ===" -ForegroundColor Cyan
Write-Host "Each table imported with its own connection" -ForegroundColor Gray
Write-Host ""

# Configuration
$RDS_HOST     = "database-1.cl6m044mi2nr.eu-north-1.rds.amazonaws.com"
$RDS_USER     = "admin"
$RDS_PASSWORD = "NoLSAFVersion2026"
$RDS_DATABASE = "nolsaf_production"
$MYSQL        = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$MYSQLDUMP    = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
$SSL_CA       = "D:\nolsapp2.1\nolsaf\backups\rds-ca-bundle.pem"
$ENV_FILE     = "D:\nolsapp2.1\nolsaf\apps\api\.env"
$TEMP_DIR     = "D:\nolsapp2.1\nolsaf\backups\per_table_temp"

# Build SSL flags
$SSL = if (Test-Path $SSL_CA) { "--ssl-ca=`"$SSL_CA`" --ssl-mode=VERIFY_CA" } else { "--ssl-mode=REQUIRED --tls-version=TLSv1.2" }

# Helper: run mysql command on RDS
function Invoke-RDS {
    param([string]$Query, [string]$Database = "")
    $dbFlag = if ($Database) { "--database=$Database" } else { "" }
    $result = cmd /c "`"$MYSQL`" --host=$RDS_HOST --port=3306 --user=$RDS_USER --password=$RDS_PASSWORD $dbFlag $SSL -e `"$Query`"" 2>&1
    return $result | Where-Object { $_ -notmatch '\[Warning\]' }
}

# Step 1: Read local DB credentials
Write-Host "Step 1: Reading local DB config..." -ForegroundColor Yellow
Add-Type -AssemblyName System.Web
$dbUrl = $null
Get-Content $ENV_FILE | ForEach-Object {
    if ($_ -match '^DATABASE_URL\s*=\s*[''"]?(.+?)[''"]?\s*$') {
        $dbUrl = $matches[1].Trim('"').Trim("'")
    }
}

if (-not $dbUrl) { Write-Host "ERROR: DATABASE_URL not found in .env" -ForegroundColor Red; exit 1 }

$uri       = [System.Uri]$dbUrl
$L_HOST    = $uri.Host
$L_PORT    = if ($uri.Port -gt 0) { $uri.Port } else { 3306 }
$L_DB      = $uri.AbsolutePath.TrimStart('/')
$userInfo  = $uri.UserInfo.Split(':')
$L_USER    = [System.Web.HttpUtility]::UrlDecode($userInfo[0])
$L_PASS    = if ($userInfo.Length -gt 1) { [System.Web.HttpUtility]::UrlDecode($userInfo[1]) } else { "" }

Write-Host "  Local: $L_USER@$L_HOST/$L_DB" -ForegroundColor Gray
Write-Host ""

# Step 2: Get table list from local DB
Write-Host "Step 2: Getting table list from local database..." -ForegroundColor Yellow

$localPassFlag = if ($L_PASS) { "--password=$L_PASS" } else { "" }
$tablesRaw = cmd /c "`"$MYSQL`" --host=$L_HOST --port=$L_PORT --user=$L_USER $localPassFlag --database=$L_DB --skip-column-names -e `"SHOW TABLES;`"" 2>&1
$tables = $tablesRaw | Where-Object { $_ -notmatch '\[Warning\]' -and $_ -match '\S' }

Write-Host "  Found $($tables.Count) tables" -ForegroundColor Green
Write-Host ""

# Step 3: Reset RDS database
Write-Host "Step 3: Resetting RDS database (clean slate)..." -ForegroundColor Yellow

$resetResult = Invoke-RDS "DROP DATABASE IF EXISTS ``$RDS_DATABASE``; CREATE DATABASE ``$RDS_DATABASE`` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
if ($resetResult -match 'ERROR \d+') {
    Write-Host "[ERROR] $resetResult" -ForegroundColor Red; exit 1
}
Write-Host "[SUCCESS] RDS database reset" -ForegroundColor Green
Write-Host ""

# Step 4: Import schema (structure only, no data)
Write-Host "Step 4: Importing table structure (schema)..." -ForegroundColor Yellow

$schemaFile = Join-Path $TEMP_DIR "schema.sql"
New-Item -ItemType Directory -Path $TEMP_DIR -Force | Out-Null

$schemaArgs = "--host=$L_HOST --port=$L_PORT --user=$L_USER $localPassFlag --no-data --single-transaction --routines --triggers --set-gtid-purged=OFF --result-file=`"$schemaFile`" $L_DB"
$schemaResult = cmd /c "`"$MYSQLDUMP`" $schemaArgs" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Schema export failed: $schemaResult" -ForegroundColor Red; exit 1
}

# Wrap schema with FK disable
$schemaContent = "SET FOREIGN_KEY_CHECKS=0;`n" + [System.IO.File]::ReadAllText($schemaFile) + "`nSET FOREIGN_KEY_CHECKS=1;"
[System.IO.File]::WriteAllText($schemaFile, $schemaContent)

$schemaImport = cmd /c "`"$MYSQL`" --host=$RDS_HOST --port=3306 --user=$RDS_USER --password=$RDS_PASSWORD --database=$RDS_DATABASE $SSL < `"$schemaFile`"" 2>&1
$schemaErrors = $schemaImport | Where-Object { $_ -match 'ERROR \d+' }

if ($schemaErrors) {
    Write-Host "[ERROR] Schema import failed:" -ForegroundColor Red
    $schemaErrors | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    exit 1
}

Write-Host "[SUCCESS] Schema imported" -ForegroundColor Green
Write-Host ""

# Step 5: Import data table by table
Write-Host "Step 5: Importing data table by table..." -ForegroundColor Yellow
Write-Host ""

$startTime    = Get-Date
$successCount = 0
$failedTables = @()
$tableNum     = 0

# Disable FK checks on RDS for data import
Invoke-RDS "SET FOREIGN_KEY_CHECKS=0;" -Database $RDS_DATABASE | Out-Null

foreach ($table in $tables) {
    $tableNum++
    $tableFile = Join-Path $TEMP_DIR "table_$table.sql"
    
    Write-Host "  [$tableNum/$($tables.Count)] $table ..." -ForegroundColor Gray -NoNewline
    
    # Export single table data
    $dumpArgs = "--host=$L_HOST --port=$L_PORT --user=$L_USER $localPassFlag --no-create-info --single-transaction --skip-extended-insert --set-gtid-purged=OFF --result-file=`"$tableFile`" $L_DB $table"
    
    $dumpResult = cmd /c "`"$MYSQLDUMP`" $dumpArgs" 2>&1
    
    if ($LASTEXITCODE -ne 0 -or ($dumpResult | Where-Object { $_ -match 'ERROR \d+' })) {
        Write-Host " [EXPORT FAILED]" -ForegroundColor Red
        $failedTables += "$table (export)"
        continue
    }
    
    # Import table data to RDS (each table = fresh connection)
    $tableContent = "SET FOREIGN_KEY_CHECKS=0;`n" + [System.IO.File]::ReadAllText($tableFile) + "`nSET FOREIGN_KEY_CHECKS=1;"
    [System.IO.File]::WriteAllText($tableFile, $tableContent)
    
    $importResult = cmd /c "`"$MYSQL`" --host=$RDS_HOST --port=3306 --user=$RDS_USER --password=$RDS_PASSWORD --database=$RDS_DATABASE $SSL < `"$tableFile`"" 2>&1
    $importErrors = $importResult | Where-Object { $_ -match 'ERROR \d+' }
    
    if ($importErrors) {
        Write-Host " [FAILED]" -ForegroundColor Red
        $failedTables += "$table ($($importErrors | Select-Object -First 1))"
    } else {
        Write-Host " [OK]" -ForegroundColor Green
        $successCount++
    }
    
    # Cleanup table file
    Remove-Item $tableFile -ErrorAction SilentlyContinue
}

$duration = (Get-Date) - $startTime

Write-Host ""
Write-Host "==============================" -ForegroundColor Gray
Write-Host "Import Complete!" -ForegroundColor Green
Write-Host "==============================" -ForegroundColor Gray
Write-Host "  Successful: $successCount / $($tables.Count) tables" -ForegroundColor Green
Write-Host "  Failed:     $($failedTables.Count) tables" -ForegroundColor $(if ($failedTables.Count -gt 0) { "Yellow" } else { "Green" })
Write-Host "  Duration:   $($duration.TotalMinutes.ToString('F1')) minutes" -ForegroundColor Gray

if ($failedTables.Count -gt 0) {
    Write-Host ""
    Write-Host "Failed tables:" -ForegroundColor Yellow
    $failedTables | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
}

# Step 6: Verify
Write-Host ""
Write-Host "Step 6: Record counts in RDS:" -ForegroundColor Yellow

$verifyQ = "SELECT TABLE_NAME, TABLE_ROWS FROM information_schema.TABLES WHERE TABLE_SCHEMA='$RDS_DATABASE' AND TABLE_ROWS > 0 ORDER BY TABLE_ROWS DESC LIMIT 20;"
$verifyResult = cmd /c "`"$MYSQL`" --host=$RDS_HOST --port=3306 --user=$RDS_USER --password=$RDS_PASSWORD --database=$RDS_DATABASE $SSL -e `"$verifyQ`"" 2>&1
$verifyResult | Where-Object { $_ -notmatch '\[Warning\]' } | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }

# Cleanup
Remove-Item $TEMP_DIR -Recurse -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Done! Run .\verify-rds-import.ps1 for full comparison." -ForegroundColor Cyan
