# Diagnose and Fix RDS Import Issues
# This script checks what went wrong at line 352 and provides solutions

$ErrorActionPreference = "Stop"

Write-Host "=== RDS Import Diagnostic & Fix Tool ===" -ForegroundColor Cyan
Write-Host ""

# Configuration
$RDS_HOST = "database-1.cl6m044mi2nr.eu-north-1.rds.amazonaws.com"
$RDS_PORT = 3306
$RDS_USER = "admin"
$RDS_PASSWORD = "NoLSAFVersion2026"
$RDS_DATABASE = "nolsaf_production"
$BACKUP_FILE = "nolsaf_aws_migration_20260424_144619.sql"
$BACKUP_PATH = "D:\nolsapp2.1\nolsaf\backups"
$MYSQL = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

# Step 1: Check what's at line 352
Write-Host "Step 1: Checking what's at line 352 (the failure point)..." -ForegroundColor Yellow
Write-Host ""

$fullPath = Join-Path $BACKUP_PATH $BACKUP_FILE

if (-not (Test-Path $fullPath)) {
    Write-Host "ERROR: Backup file not found: $fullPath" -ForegroundColor Red
    exit 1
}

# Get lines 345-365 to see context
$problemLines = Get-Content $fullPath | Select-Object -Skip 344 -First 25

Write-Host "Lines 345-370 from backup file:" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Gray
$lineNum = 345
foreach ($line in $problemLines) {
    if ($lineNum -eq 352) {
        Write-Host "$lineNum : $line" -ForegroundColor Red
    } else {
        Write-Host "$lineNum : $line" -ForegroundColor Gray
    }
    $lineNum++
}
Write-Host ""
Write-Host ""

# Step 2: Check what's already in RDS
Write-Host "Step 2: Checking what's already imported to RDS..." -ForegroundColor Yellow
Write-Host ""

try {
    $tablesResult = & $MYSQL --host=$RDS_HOST --port=$RDS_PORT --user=$RDS_USER --password=$RDS_PASSWORD --database=$RDS_DATABASE -e "SHOW TABLES;" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Tables in RDS:" -ForegroundColor Green
        Write-Host $tablesResult
        Write-Host ""
        
        # Count records in key tables
        Write-Host "Checking record counts..." -ForegroundColor Cyan
        $countQueries = @(
            "SELECT 'user' as tbl, COUNT(*) as cnt FROM user",
            "SELECT 'property' as tbl, COUNT(*) as cnt FROM property", 
            "SELECT 'booking' as tbl, COUNT(*) as cnt FROM booking",
            "SELECT 'driver' as tbl, COUNT(*) as cnt FROM driver"
        )
        
        foreach ($query in $countQueries) {
            $result = & $MYSQL --host=$RDS_HOST --port=$RDS_PORT --user=$RDS_USER --password=$RDS_PASSWORD --database=$RDS_DATABASE -e "$query" 2>&1 | Select-String -Pattern "^\w+\s+\d+"
            if ($result) {
                Write-Host "  $result" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "Could not query RDS (might be empty or connection issue)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error checking RDS: $_" -ForegroundColor Yellow
}

Write-Host ""
Write-Host ""

# Step 3: Provide solutions
Write-Host "Step 3: Available Solutions" -ForegroundColor Yellow
Write-Host "===========================" -ForegroundColor Gray
Write-Host ""
Write-Host "Choose an option:" -ForegroundColor Cyan
Write-Host ""
Write-Host "[1] Skip line 352 and continue from line 353" -ForegroundColor White
Write-Host "    (Use if line 352 is not critical)" -ForegroundColor Gray
Write-Host ""
Write-Host "[2] Split import into schema + data chunks" -ForegroundColor White
Write-Host "    (More reliable, takes longer)" -ForegroundColor Gray
Write-Host ""
Write-Host "[3] Create smaller backup without problematic data" -ForegroundColor White
Write-Host "    (Export fresh from local DB with different settings)" -ForegroundColor Gray
Write-Host ""
Write-Host "[4] Import schema only, then use Prisma to migrate data" -ForegroundColor White
Write-Host "    (Most reliable for production)" -ForegroundColor Gray
Write-Host ""
Write-Host "[5] Exit and investigate line 352 manually" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter choice (1-5)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "Creating new SQL file skipping line 352..." -ForegroundColor Cyan
        
        # Read all lines except line 352
        $allLines = Get-Content $fullPath
        $newFile = Join-Path $BACKUP_PATH "nolsaf_migration_fixed.sql"
        
        $lineCount = 0
        $allLines | ForEach-Object {
            $lineCount++
            if ($lineCount -ne 352) {
                Add-Content -Path $newFile -Value $_
            }
        }
        
        Write-Host "Created: $newFile (without line 352)" -ForegroundColor Green
        Write-Host ""
        Write-Host "Importing..." -ForegroundColor Yellow
        
        Get-Content $newFile | & $MYSQL --host=$RDS_HOST --port=$RDS_PORT --user=$RDS_USER --password=$RDS_PASSWORD --database=$RDS_DATABASE
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "[SUCCESS] Import completed!" -ForegroundColor Green
        } else {
            Write-Host ""
            Write-Host "[ERROR] Import failed again. Try option 2 or 3." -ForegroundColor Red
        }
    }
    
    "2" {
        Write-Host ""
        Write-Host "Splitting import into chunks..." -ForegroundColor Cyan
        Write-Host "This will take longer but is more reliable." -ForegroundColor Gray
        Write-Host ""
        
        # Create chunks directory
        $chunksDir = Join-Path $BACKUP_PATH "chunks"
        if (Test-Path $chunksDir) {
            Remove-Item $chunksDir -Recurse -Force
        }
        New-Item -ItemType Directory -Path $chunksDir | Out-Null
        
        # Read file and split into chunks
        $allLines = Get-Content $fullPath
        $chunkSize = 1000
        $chunkNum = 1
        $currentChunk = @()
        
        Write-Host "Creating chunks (1000 lines each)..." -ForegroundColor Yellow
        
        foreach ($line in $allLines) {
            $currentChunk += $line
            
            if ($currentChunk.Count -ge $chunkSize) {
                $chunkFile = Join-Path $chunksDir "chunk_$($chunkNum.ToString('000')).sql"
                $currentChunk | Set-Content $chunkFile
                Write-Host "  Created chunk $chunkNum ($chunkSize lines)" -ForegroundColor Gray
                $currentChunk = @()
                $chunkNum++
            }
        }
        
        # Save last chunk
        if ($currentChunk.Count -gt 0) {
            $chunkFile = Join-Path $chunksDir "chunk_$($chunkNum.ToString('000')).sql"
            $currentChunk | Set-Content $chunkFile
            Write-Host "  Created chunk $chunkNum ($($currentChunk.Count) lines)" -ForegroundColor Gray
        }
        
        Write-Host ""
        Write-Host "Created $chunkNum chunks" -ForegroundColor Green
        Write-Host ""
        Write-Host "Importing chunks one by one..." -ForegroundColor Cyan
        Write-Host "(This may take 30-45 minutes)" -ForegroundColor Gray
        Write-Host ""
        
        $startTime = Get-Date
        $successCount = 0
        $failedChunks = @()
        
        Get-ChildItem $chunksDir -Filter "chunk_*.sql" | Sort-Object Name | ForEach-Object {
            $chunkName = $_.Name
            Write-Host "Importing $chunkName..." -ForegroundColor Yellow -NoNewline
            
            Get-Content $_.FullName | & $MYSQL --host=$RDS_HOST --port=$RDS_PORT --user=$RDS_USER --password=$RDS_PASSWORD --database=$RDS_DATABASE 2>&1 | Out-Null
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host " [OK]" -ForegroundColor Green
                $successCount++
            } else {
                Write-Host " [FAILED]" -ForegroundColor Red
                $failedChunks += $chunkName
            }
        }
        
        $endTime = Get-Date
        $duration = $endTime - $startTime
        
        Write-Host ""
        Write-Host "Import Summary:" -ForegroundColor Cyan
        Write-Host "  Successful: $successCount / $chunkNum chunks" -ForegroundColor Green
        Write-Host "  Duration: $($duration.TotalMinutes.ToString('F1')) minutes" -ForegroundColor Gray
        
        if ($failedChunks.Count -gt 0) {
            Write-Host "  Failed chunks: $($failedChunks -join ', ')" -ForegroundColor Red
            Write-Host ""
            Write-Host "Review failed chunks in: $chunksDir" -ForegroundColor Yellow
        } else {
            Write-Host ""
            Write-Host "[SUCCESS] All chunks imported!" -ForegroundColor Green
        }
    }
    
    "3" {
        Write-Host ""
        Write-Host "Creating fresh export with safer settings..." -ForegroundColor Cyan
        Write-Host ""
        
        # Check local database connection
        $envPath = "D:\nolsapp2.1\nolsaf\apps\api\.env"
        $dbUrl = $null
        
        if (Test-Path $envPath) {
            Get-Content $envPath | ForEach-Object {
                if ($_ -match '^DATABASE_URL\s*=\s*[''"]?(.+?)[''"]?\s*$') {
                    $dbUrl = $matches[1].Trim('"').Trim("'")
                }
            }
        }
        
        if (-not $dbUrl) {
            Write-Host "ERROR: Could not find DATABASE_URL in .env" -ForegroundColor Red
            exit 1
        }
        
        # Parse local DATABASE_URL
        Add-Type -AssemblyName System.Web
        try {
            $uri = [System.Uri]$dbUrl
            $localHost = $uri.Host
            $localPort = if ($uri.Port -gt 0) { $uri.Port } else { 3306 }
            $localDatabase = $uri.AbsolutePath.TrimStart('/')
            $userInfo = $uri.UserInfo.Split(':')
            $localUser = [System.Web.HttpUtility]::UrlDecode($userInfo[0])
            $localPass = if ($userInfo.Length -gt 1) { [System.Web.HttpUtility]::UrlDecode($userInfo[1]) } else { "" }
        } catch {
            Write-Host "ERROR: Failed to parse DATABASE_URL" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "Local Database:" -ForegroundColor Gray
        Write-Host "  Host: $localHost" -ForegroundColor Gray
        Write-Host "  Database: $localDatabase" -ForegroundColor Gray
        Write-Host ""
        
        # Find mysqldump
        $mysqldumpPaths = @(
            "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe",
            "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqldump.exe",
            "C:\xampp\mysql\bin\mysqldump.exe"
        )
        
        $mysqldump = $null
        foreach ($path in $mysqldumpPaths) {
            if (Test-Path $path) {
                $mysqldump = $path
                break
            }
        }
        
        if (-not $mysqldump) {
            Write-Host "ERROR: mysqldump not found!" -ForegroundColor Red
            exit 1
        }
        
        $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
        $newBackup = Join-Path $BACKUP_PATH "nolsaf_chunked_$timestamp.sql"
        
        Write-Host "Exporting with smaller packet size..." -ForegroundColor Yellow
        Write-Host ""
        
        # Export with safer settings
        $dumpArgs = @(
            "--host=$localHost",
            "--port=$localPort",
            "--user=$localUser",
            "--single-transaction",
            "--quick",
            "--skip-extended-insert",  # One INSERT per row (slower but safer)
            "--set-gtid-purged=OFF",
            "--max_allowed_packet=64M",
            "--result-file=$newBackup",
            $localDatabase
        )
        
        if ($localPass) {
            $dumpArgs = @("--password=$localPass") + $dumpArgs
        }
        
        & $mysqldump @dumpArgs
        
        if ($LASTEXITCODE -eq 0) {
            $fileSize = (Get-Item $newBackup).Length
            $fileSizeMB = [math]::Round($fileSize / 1MB, 2)
            
            Write-Host ""
            Write-Host "[SUCCESS] Created new backup: $fileSizeMB MB" -ForegroundColor Green
            Write-Host "  File: $newBackup" -ForegroundColor Gray
            Write-Host ""
            Write-Host "Importing to RDS..." -ForegroundColor Cyan
            Write-Host "(This will take 30-60 minutes due to single-row inserts)" -ForegroundColor Gray
            Write-Host ""
            
            Get-Content $newBackup | & $MYSQL --host=$RDS_HOST --port=$RDS_PORT --user=$RDS_USER --password=$RDS_PASSWORD --database=$RDS_DATABASE
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host ""
                Write-Host "[SUCCESS] Import completed!" -ForegroundColor Green
            } else {
                Write-Host ""
                Write-Host "[ERROR] Import still failed. Try option 2 (chunked import)." -ForegroundColor Red
            }
        } else {
            Write-Host ""
            Write-Host "[ERROR] Export failed!" -ForegroundColor Red
        }
    }
    
    "4" {
        Write-Host ""
        Write-Host "Schema-only import + Prisma data migration" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "This approach:" -ForegroundColor Gray
        Write-Host "1. Imports only table structure to RDS" -ForegroundColor Gray
        Write-Host "2. Uses Prisma to copy data from local to RDS" -ForegroundColor Gray
        Write-Host "3. Most reliable but requires Node.js script" -ForegroundColor Gray
        Write-Host ""
        
        # Extract schema only (lines before first INSERT)
        Write-Host "Extracting schema..." -ForegroundColor Yellow
        
        $allLines = Get-Content $fullPath
        $schemaFile = Join-Path $BACKUP_PATH "schema_only.sql"
        $schemaLines = @()
        
        foreach ($line in $allLines) {
            if ($line -match "^INSERT INTO" -or $line -match "^LOCK TABLES") {
                break
            }
            $schemaLines += $line
        }
        
        $schemaLines | Set-Content $schemaFile
        
        Write-Host "Created schema file: schema_only.sql" -ForegroundColor Green
        Write-Host ""
        Write-Host "Importing schema to RDS..." -ForegroundColor Yellow
        
        Get-Content $schemaFile | & $MYSQL --host=$RDS_HOST --port=$RDS_PORT --user=$RDS_USER --password=$RDS_PASSWORD --database=$RDS_DATABASE
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[SUCCESS] Schema imported!" -ForegroundColor Green
            Write-Host ""
            Write-Host "Next steps:" -ForegroundColor Cyan
            Write-Host "1. Update apps/api/.env with RDS DATABASE_URL" -ForegroundColor White
            Write-Host "2. Run: cd D:\nolsapp2.1\nolsaf\apps\api" -ForegroundColor White
            Write-Host "3. Run: npx prisma db pull" -ForegroundColor White
            Write-Host "4. Create a Node.js script to copy data from local to RDS" -ForegroundColor White
            Write-Host ""
            Write-Host "Would you like me to create the data migration script? (yes/no)" -ForegroundColor Yellow
            $createScript = Read-Host
            
            if ($createScript -eq "yes") {
                Write-Host ""
                Write-Host "Data migration script would be created at:" -ForegroundColor Gray
                Write-Host "  D:\nolsapp2.1\nolsaf\scripts\migrate-data-to-rds.ts" -ForegroundColor Gray
                Write-Host ""
                Write-Host "This requires manual implementation based on your schema." -ForegroundColor Yellow
            }
        } else {
            Write-Host "[ERROR] Schema import failed!" -ForegroundColor Red
        }
    }
    
    "5" {
        Write-Host ""
        Write-Host "Manual Investigation:" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "To view line 352 in detail:" -ForegroundColor Gray
        Write-Host "  Get-Content '$fullPath' | Select-Object -Skip 351 -First 1" -ForegroundColor White
        Write-Host ""
        Write-Host "To test that line directly on RDS:" -ForegroundColor Gray
        Write-Host "  `$line352 = Get-Content '$fullPath' | Select-Object -Skip 351 -First 1" -ForegroundColor White
        Write-Host "  `$line352 | & '$MYSQL' --host=$RDS_HOST --port=$RDS_PORT --user=$RDS_USER --password=$RDS_PASSWORD --database=$RDS_DATABASE" -ForegroundColor White
        Write-Host ""
        exit 0
    }
    
    default {
        Write-Host ""
        Write-Host "Invalid choice. Run the script again." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
