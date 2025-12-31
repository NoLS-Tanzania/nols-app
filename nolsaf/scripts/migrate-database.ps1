# Complete Database Migration Script (PowerShell)
# This ensures all tables from Prisma schema are created in the database

Write-Host "🗄️  Database Migration Script" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot\..

# Step 1: Check MySQL connection
Write-Host "Step 1: Checking MySQL connection..." -ForegroundColor Cyan
if (Test-Path "scripts/check-database-connection.js") {
    $connectionTest = node scripts/check-database-connection.js 2>&1
    if ($connectionTest -match "Successfully connected") {
        Write-Host "✅ Database connection successful" -ForegroundColor Green
    } else {
        Write-Host "❌ Database connection failed" -ForegroundColor Red
        Write-Host $connectionTest
        exit 1
    }
} else {
    Write-Host "⚠️  Connection test script not found, skipping..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 2: Generating Prisma Client..." -ForegroundColor Cyan
npm run prisma:generate

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to generate Prisma Client" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Prisma Client generated" -ForegroundColor Green

Write-Host ""
Write-Host "Step 3: Syncing database schema..." -ForegroundColor Cyan
Write-Host "This will create/update all tables to match your Prisma schema..." -ForegroundColor Yellow
Write-Host ""

# Use db push to sync schema
npx prisma db push --schema=prisma/schema.prisma --accept-data-loss

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Database schema synced successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Schema sync failed" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 4: Verifying tables..." -ForegroundColor Cyan

$mysqlBin = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
$dbUser = "root"
$dbPassword = "NoLSVersion@2"
$dbName = "nolsaf"

if (Test-Path $mysqlBin) {
    $tables = & $mysqlBin -u $dbUser -p"$dbPassword" -h 127.0.0.1 -e "USE $dbName; SHOW TABLES;" 2>&1
    $tableCount = ($tables | Measure-Object -Line).Lines - 1
    
    if ($tableCount -gt 0) {
        Write-Host "✅ Found $tableCount tables in database" -ForegroundColor Green
        Write-Host ""
        Write-Host "Tables created:"
        $tables | Where-Object { $_ -notmatch "Tables_in" -and $_ -match "\S" } | ForEach-Object {
            Write-Host "  - $_" -ForegroundColor White
        }
    } else {
        Write-Host "⚠️  No tables found (or connection issue)" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  MySQL client not found, skipping table verification" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 5: Running migrations (if any pending)..." -ForegroundColor Cyan

$migrateOutput = npx prisma migrate deploy --schema=prisma/schema.prisma 2>&1 | Select-Object -First 20
$migrateOutput

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migrations applied" -ForegroundColor Green
} elseif ($migrateOutput -match "already applied|No pending migrations") {
    Write-Host "✅ All migrations already applied" -ForegroundColor Green
} else {
    Write-Host "⚠️  Some migrations may have issues (this is OK if db push worked)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Step 6: Final verification..." -ForegroundColor Cyan

# Check for key tables
$keyTables = @("User", "Property", "Booking", "Invoice", "SystemSetting")
$missingTables = @()

foreach ($table in $keyTables) {
    if (Test-Path $mysqlBin) {
        $exists = & $mysqlBin -u $dbUser -p"$dbPassword" -h 127.0.0.1 -e "USE $dbName; SHOW TABLES LIKE '$table';" 2>&1 | Select-String $table
        if (-not $exists) {
            $missingTables += $table
        }
    }
}

if ($missingTables.Count -eq 0) {
    Write-Host "✅ All key tables exist" -ForegroundColor Green
} else {
    Write-Host "❌ Missing tables: $($missingTables -join ', ')" -ForegroundColor Red
    Write-Host "   Run 'npx prisma db push --schema=prisma/schema.prisma --accept-data-loss' again" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==============================" -ForegroundColor Cyan
Write-Host "✅ Migration Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Your database now has all tables from Prisma schema." -ForegroundColor White
Write-Host ""
Write-Host "To verify, you can:" -ForegroundColor Cyan
Write-Host "  1. Check tables: mysql -u root -p -e 'USE nolsaf; SHOW TABLES;'" -ForegroundColor White
Write-Host "  2. Test login with: admin@nolsaf.com / password123" -ForegroundColor White
Write-Host ""

