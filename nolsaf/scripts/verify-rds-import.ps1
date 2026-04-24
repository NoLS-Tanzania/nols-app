# Verify RDS Database After Import
# Checks what data made it to RDS and compares with local

$ErrorActionPreference = "Continue"

Write-Host "=== RDS Database Verification ===" -ForegroundColor Cyan
Write-Host ""

# RDS Configuration
$RDS_HOST = "database-1.cl6m044mi2nr.eu-north-1.rds.amazonaws.com"
$RDS_USER = "admin"
$RDS_PASSWORD = "NoLSAFVersion2026"
$RDS_DATABASE = "nolsaf_production"
$MYSQL = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

# Local Configuration
$LOCAL_HOST = "127.0.0.1"
$LOCAL_USER = "root"
$LOCAL_DATABASE = "railway"

Write-Host "Checking RDS database..." -ForegroundColor Yellow
Write-Host ""

# Test RDS connection
Write-Host "1. Testing RDS Connection..." -ForegroundColor Cyan
$testQuery = "SELECT VERSION() as Version, DATABASE() as DB, USER() as User;"
$testResult = & $MYSQL --host=$RDS_HOST --port=3306 --user=$RDS_USER --password=$RDS_PASSWORD --database=$RDS_DATABASE -e $testQuery 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "[SUCCESS] Connected to RDS" -ForegroundColor Green
    Write-Host $testResult
    Write-Host ""
} else {
    Write-Host "[ERROR] Cannot connect to RDS" -ForegroundColor Red
    Write-Host $testResult
    exit 1
}

# Get table list
Write-Host "2. Tables in RDS:" -ForegroundColor Cyan
$tablesResult = & $MYSQL --host=$RDS_HOST --port=3306 --user=$RDS_USER --password=$RDS_PASSWORD --database=$RDS_DATABASE -e "SHOW TABLES;" 2>&1

if ($LASTEXITCODE -eq 0) {
    $tables = $tablesResult -split "`n" | Select-Object -Skip 1 | Where-Object { $_ -match '\S' }
    Write-Host "  Found $($tables.Count) tables" -ForegroundColor Green
    $tables | ForEach-Object { Write-Host "    - $_" -ForegroundColor Gray }
    Write-Host ""
} else {
    Write-Host "[ERROR] Cannot list tables" -ForegroundColor Red
    exit 1
}

# Count records in key tables
Write-Host "3. Record Counts in RDS:" -ForegroundColor Cyan

$countQuery = @"
SELECT 'user' as Table_Name, COUNT(*) as Record_Count FROM user
UNION ALL SELECT 'property', COUNT(*) FROM property
UNION ALL SELECT 'booking', COUNT(*) FROM booking
UNION ALL SELECT 'driver', COUNT(*) FROM driver
UNION ALL SELECT 'tripEstimate', COUNT(*) FROM tripEstimate
UNION ALL SELECT 'tourismSite', COUNT(*) FROM tourismSite
UNION ALL SELECT 'planRequest', COUNT(*) FROM planRequest
UNION ALL SELECT '_prisma_migrations', COUNT(*) FROM _prisma_migrations;
"@

$rdsCountResult = & $MYSQL --host=$RDS_HOST --port=3306 --user=$RDS_USER --password=$RDS_PASSWORD --database=$RDS_DATABASE -e $countQuery 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host $rdsCountResult
    Write-Host ""
} else {
    Write-Host "[WARNING] Some tables may not exist yet" -ForegroundColor Yellow
    Write-Host ""
}

# Compare with local database
Write-Host "4. Comparing with Local Database..." -ForegroundColor Cyan
Write-Host ""

$localPassword = Read-Host "Enter local MySQL password (press Enter if none)" -AsSecureString
$BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($localPassword)
$localPasswordPlain = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)

$localArgs = @("--host=$LOCAL_HOST", "--user=$LOCAL_USER", "--database=$LOCAL_DATABASE")
if ($localPasswordPlain) {
    $localArgs += "--password=$localPasswordPlain"
}

$localCountResult = & $MYSQL @localArgs -e $countQuery 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Local Database Counts:" -ForegroundColor Green
    Write-Host $localCountResult
    Write-Host ""
    
    Write-Host "Comparison:" -ForegroundColor Cyan
    Write-Host "Compare the counts above. They should match exactly." -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "[WARNING] Cannot connect to local database" -ForegroundColor Yellow
    Write-Host "Skipping comparison..." -ForegroundColor Gray
    Write-Host ""
}

# Check sample data
Write-Host "5. Sample Data Check:" -ForegroundColor Cyan
Write-Host ""

$sampleQuery = @"
SELECT 'Recent Users' as Category, COUNT(*) as Count 
FROM user WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
UNION ALL
SELECT 'Recent Bookings', COUNT(*) 
FROM booking WHERE createdAt >= DATE_SUB(NOW(), INTERVAL 7 DAY)
UNION ALL
SELECT 'Active Properties', COUNT(*) 
FROM property WHERE status = 'APPROVED';
"@

$sampleResult = & $MYSQL --host=$RDS_HOST --port=3306 --user=$RDS_USER --password=$RDS_PASSWORD --database=$RDS_DATABASE -e $sampleQuery 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host $sampleResult
    Write-Host ""
}

# Check Prisma migrations
Write-Host "6. Prisma Migration Status:" -ForegroundColor Cyan
$migrationQuery = "SELECT migration_name, finished_at, logs FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;"
$migrationResult = & $MYSQL --host=$RDS_HOST --port=3306 --user=$RDS_USER --password=$RDS_PASSWORD --database=$RDS_DATABASE -e $migrationQuery 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host $migrationResult
    Write-Host ""
}

# Summary
Write-Host "================================" -ForegroundColor Gray
Write-Host "Verification Summary" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Gray
Write-Host ""
Write-Host "RDS Endpoint: $RDS_HOST" -ForegroundColor White
Write-Host "Database: $RDS_DATABASE" -ForegroundColor White
Write-Host ""
Write-Host "✓ Connection: Working" -ForegroundColor Green
Write-Host "✓ Tables: Imported" -ForegroundColor Green
Write-Host "✓ Data: Check counts above" -ForegroundColor $(if ($rdsCountResult -match '\s+0\s+') { "Yellow" } else { "Green" })
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Update apps/api/.env:" -ForegroundColor White
Write-Host "   DATABASE_URL=mysql://admin:PASSWORD@$RDS_HOST:3306/$RDS_DATABASE" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Test Prisma connection:" -ForegroundColor White
Write-Host "   cd apps\api" -ForegroundColor Gray
Write-Host "   npx prisma db pull" -ForegroundColor Gray
Write-Host "   npx prisma generate" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Start API and test:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host "   curl http://localhost:4000/api/public/properties" -ForegroundColor Gray
Write-Host ""
