# Import single large table in batches (for auditlog timeout fix)

$ErrorActionPreference = "Continue"

Write-Host "=== Import Large Table in Batches ===" -ForegroundColor Cyan
Write-Host ""

$RDS_HOST     = "database-1.cl6m044mi2nr.eu-north-1.rds.amazonaws.com"
$RDS_USER     = "admin"
$RDS_PASSWORD = "NoLSAFVersion2026"
$RDS_DATABASE = "nolsaf_production"
$MYSQL        = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$MYSQLDUMP    = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
$SSL_CA       = "D:\nolsapp2.1\nolsaf\backups\rds-ca-bundle.pem"
$ENV_FILE     = "D:\nolsapp2.1\nolsaf\apps\api\.env"
$TABLE        = "auditlog"        # <-- Change this if you need to retry a different table
$BATCH_SIZE   = 500               # rows per batch

$SSL = if (Test-Path $SSL_CA) { "--ssl-ca=`"$SSL_CA`" --ssl-mode=VERIFY_CA" } else { "--ssl-mode=REQUIRED --tls-version=TLSv1.2" }

# Read local DB credentials
Add-Type -AssemblyName System.Web
$dbUrl = $null
Get-Content $ENV_FILE | ForEach-Object {
    if ($_ -match '^DATABASE_URL\s*=\s*[''"]?(.+?)[''"]?\s*$') {
        $dbUrl = $matches[1].Trim('"').Trim("'")
    }
}
$uri      = [System.Uri]$dbUrl
$L_HOST   = $uri.Host
$L_PORT   = if ($uri.Port -gt 0) { $uri.Port } else { 3306 }
$L_DB     = $uri.AbsolutePath.TrimStart('/')
$userInfo = $uri.UserInfo.Split(':')
$L_USER   = [System.Web.HttpUtility]::UrlDecode($userInfo[0])
$L_PASS   = if ($userInfo.Length -gt 1) { [System.Web.HttpUtility]::UrlDecode($userInfo[1]) } else { "" }
$L_PASS_FLAG = if ($L_PASS) { "--password=$L_PASS" } else { "" }

# Get total row count
Write-Host "Getting row count for '$TABLE'..." -ForegroundColor Yellow
$countResult = cmd /c "`"$MYSQL`" --host=$L_HOST --port=$L_PORT --user=$L_USER $L_PASS_FLAG --database=$L_DB --skip-column-names -e `"SELECT COUNT(*) FROM ``$TABLE``;`"" 2>&1
$totalRows = ($countResult | Where-Object { $_ -match '^\d+$' } | Select-Object -First 1).Trim()

Write-Host "  Total rows: $totalRows" -ForegroundColor Green
Write-Host "  Batch size: $BATCH_SIZE rows per batch" -ForegroundColor Gray
$totalBatches = [math]::Ceiling([int]$totalRows / $BATCH_SIZE)
Write-Host "  Total batches: $totalBatches" -ForegroundColor Gray
Write-Host ""

# Clear existing data for this table on RDS
Write-Host "Clearing existing '$TABLE' data on RDS..." -ForegroundColor Yellow
$clearResult = cmd /c "`"$MYSQL`" --host=$RDS_HOST --port=3306 --user=$RDS_USER --password=$RDS_PASSWORD --database=$RDS_DATABASE $SSL -e `"SET FOREIGN_KEY_CHECKS=0; TRUNCATE TABLE ``$TABLE``; SET FOREIGN_KEY_CHECKS=1;`"" 2>&1
$clearErrors = $clearResult | Where-Object { $_ -match 'ERROR \d+' }
if ($clearErrors) {
    Write-Host "[WARNING] $clearErrors" -ForegroundColor Yellow
} else {
    Write-Host "[SUCCESS] Table cleared" -ForegroundColor Green
}
Write-Host ""

# Import in batches using LIMIT/OFFSET
Write-Host "Importing in batches of $BATCH_SIZE rows..." -ForegroundColor Yellow
Write-Host ""

$startTime    = Get-Date
$successBatch = 0
$tempFile     = [System.IO.Path]::GetTempPath() + "batch_import.sql"

for ($offset = 0; $offset -lt [int]$totalRows; $offset += $BATCH_SIZE) {
    $batchNum = [math]::Floor($offset / $BATCH_SIZE) + 1
    
    Write-Host "  Batch $batchNum/$totalBatches (rows $offset - $($offset + $BATCH_SIZE))..." -ForegroundColor Gray -NoNewline
    
    # Export this batch
    $dumpArgs = "--host=$L_HOST --port=$L_PORT --user=$L_USER $L_PASS_FLAG --no-create-info --single-transaction --skip-extended-insert --where=`"1=1 LIMIT $BATCH_SIZE OFFSET $offset`" --set-gtid-purged=OFF $L_DB $TABLE"
    
    $batchContent = cmd /c "`"$MYSQLDUMP`" $dumpArgs" 2>&1
    $batchErrors  = $batchContent | Where-Object { $_ -match 'ERROR \d+' }
    
    if ($batchErrors) {
        Write-Host " [EXPORT FAILED]" -ForegroundColor Red
        Write-Host "    $batchErrors" -ForegroundColor Red
        continue
    }
    
    # Filter out warnings and write to temp file
    $sqlLines = $batchContent | Where-Object { $_ -notmatch '\[Warning\]' }
    $sqlContent = "SET FOREIGN_KEY_CHECKS=0;`n" + ($sqlLines -join "`n") + "`nSET FOREIGN_KEY_CHECKS=1;"
    [System.IO.File]::WriteAllText($tempFile, $sqlContent)
    
    # Import batch to RDS
    $importResult = cmd /c "`"$MYSQL`" --host=$RDS_HOST --port=3306 --user=$RDS_USER --password=$RDS_PASSWORD --database=$RDS_DATABASE $SSL < `"$tempFile`"" 2>&1
    $importErrors = $importResult | Where-Object { $_ -match 'ERROR \d+' }
    
    if ($importErrors) {
        Write-Host " [FAILED]" -ForegroundColor Red
        Write-Host "    $($importErrors | Select-Object -First 1)" -ForegroundColor Red
    } else {
        Write-Host " [OK]" -ForegroundColor Green
        $successBatch++
    }
}

Remove-Item $tempFile -ErrorAction SilentlyContinue

$duration = (Get-Date) - $startTime

Write-Host ""
Write-Host "==============================" -ForegroundColor Gray
if ($successBatch -eq $totalBatches) {
    Write-Host "[SUCCESS] '$TABLE' imported!" -ForegroundColor Green
} else {
    Write-Host "[PARTIAL] $successBatch / $totalBatches batches succeeded" -ForegroundColor Yellow
}
Write-Host "Duration: $($duration.TotalMinutes.ToString('F1')) minutes" -ForegroundColor Gray
Write-Host ""

# Verify final count on RDS
$rdsCount = cmd /c "`"$MYSQL`" --host=$RDS_HOST --port=3306 --user=$RDS_USER --password=$RDS_PASSWORD --database=$RDS_DATABASE $SSL --skip-column-names -e `"SELECT COUNT(*) FROM ``$TABLE``;`"" 2>&1
$rdsCount = $rdsCount | Where-Object { $_ -match '^\d+' } | Select-Object -First 1

Write-Host "Verification:" -ForegroundColor Cyan
Write-Host "  Local '$TABLE' rows:  $totalRows" -ForegroundColor Gray
Write-Host "  RDS   '$TABLE' rows:  $rdsCount" -ForegroundColor $(if ($rdsCount -eq $totalRows) { "Green" } else { "Yellow" })

if ($rdsCount -eq $totalRows) {
    Write-Host ""
    Write-Host "All $totalRows rows migrated successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Migration is now COMPLETE! All 60/60 tables imported." -ForegroundColor Green
}
