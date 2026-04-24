# Quick Fix: Import RDS Database in Small Chunks
# This bypasses the line 352 timeout issue by splitting the import

$ErrorActionPreference = "Continue"

Write-Host "=== Quick Fix: Chunked RDS Import ===" -ForegroundColor Cyan
Write-Host ""

# Configuration
$RDS_HOST = "database-1.cl6m044mi2nr.eu-north-1.rds.amazonaws.com"
$RDS_USER = "admin"
$RDS_PASSWORD = "NoLSAFVersion2026"
$RDS_DATABASE = "nolsaf_production"
$BACKUP_FILE = "D:\nolsapp2.1\nolsaf\backups\nolsaf_aws_migration_20260424_144619.sql"
$MYSQL = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

Write-Host "Reading backup file..." -ForegroundColor Yellow
Write-Host "File: $BACKUP_FILE" -ForegroundColor Gray
Write-Host ""

if (-not (Test-Path $BACKUP_FILE)) {
    Write-Host "ERROR: Backup file not found!" -ForegroundColor Red
    exit 1
}

# Read entire file
$allLines = Get-Content $BACKUP_FILE

Write-Host "Total lines: $($allLines.Count)" -ForegroundColor Green
Write-Host "Splitting into 500-line chunks..." -ForegroundColor Yellow
Write-Host ""

# Create temp directory for chunks
$tempDir = "D:\nolsapp2.1\nolsaf\backups\import_chunks_temp"
if (Test-Path $tempDir) {
    Remove-Item $tempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $tempDir | Out-Null

# Split into chunks
$chunkSize = 500
$totalChunks = [math]::Ceiling($allLines.Count / $chunkSize)
$currentLine = 0

Write-Host "Creating $totalChunks chunks..." -ForegroundColor Cyan

for ($i = 1; $i -le $totalChunks; $i++) {
    $chunkFile = Join-Path $tempDir "chunk_$($i.ToString('000')).sql"
    $endLine = [math]::Min($currentLine + $chunkSize, $allLines.Count)
    $chunkLines = $allLines[$currentLine..($endLine - 1)]
    
    $chunkLines | Set-Content $chunkFile
    
    if ($i % 10 -eq 0) {
        Write-Host "  Created $i / $totalChunks chunks" -ForegroundColor Gray
    }
    
    $currentLine = $endLine
}

Write-Host ""
Write-Host "[SUCCESS] Created $totalChunks chunks" -ForegroundColor Green
Write-Host ""
Write-Host "Importing to RDS..." -ForegroundColor Cyan
Write-Host "Progress:" -ForegroundColor Yellow
Write-Host ""

$startTime = Get-Date
$successCount = 0
$failedChunks = @()
$lastProgress = 0

Get-ChildItem $tempDir -Filter "chunk_*.sql" | Sort-Object Name | ForEach-Object {
    $chunkNum = $_.BaseName -replace 'chunk_', ''
    $progress = [math]::Floor(($successCount / $totalChunks) * 100)
    
    # Show progress every 10%
    if ($progress -ge $lastProgress + 10) {
        Write-Host "  $progress% complete ($successCount / $totalChunks chunks)" -ForegroundColor Cyan
        $lastProgress = $progress
    }
    
    # Import chunk via cmd /c (handles stderr and < redirection properly)
    $chunkPath = $_.FullName
    $cmdResult = cmd /c "`"$MYSQL`" --host=$RDS_HOST --port=3306 --user=$RDS_USER --password=$RDS_PASSWORD --database=$RDS_DATABASE < `"$chunkPath`"" 2>&1
    $exitCode = $LASTEXITCODE
    Remove-Item $tmpErr -ErrorAction SilentlyContinue
    
    $errorLine = $cmdResult | Where-Object { $_ -match 'ERROR \d+' } | Select-Object -First 1
    
    if ($exitCode -eq 0 -and -not $errorLine) {
        $successCount++
    } else {
        if ($errorLine) {
            $failedChunks += @{
                Chunk = $_.Name
                Error = $errorLine
            }
            Write-Host "  [WARNING] Chunk $($_.Name) failed: $errorLine" -ForegroundColor Yellow
        } else {
            $successCount++
        }
    }
}

$endTime = Get-Date
$duration = $endTime - $startTime

Write-Host ""
Write-Host "================================" -ForegroundColor Gray
Write-Host "Import Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Gray
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Total Chunks: $totalChunks" -ForegroundColor White
Write-Host "  Successful: $successCount" -ForegroundColor Green
Write-Host "  Failed: $($failedChunks.Count)" -ForegroundColor $(if ($failedChunks.Count -gt 0) { "Yellow" } else { "Green" })
Write-Host "  Duration: $($duration.TotalMinutes.ToString('F1')) minutes" -ForegroundColor Gray
Write-Host ""

if ($failedChunks.Count -gt 0) {
    Write-Host "Failed chunks (review if needed):" -ForegroundColor Yellow
    foreach ($failed in $failedChunks) {
        Write-Host "  $($failed.Chunk): $($failed.Error)" -ForegroundColor Gray
    }
    Write-Host ""
}

# Verify import
Write-Host "Verifying import..." -ForegroundColor Cyan
Write-Host ""

$verifyQuery = @"
SELECT 
    'user' as tbl, COUNT(*) as records FROM user
UNION ALL SELECT 'property', COUNT(*) FROM property
UNION ALL SELECT 'booking', COUNT(*) FROM booking
UNION ALL SELECT 'driver', COUNT(*) FROM driver
UNION ALL SELECT 'tripEstimate', COUNT(*) FROM tripEstimate;
"@

$verifyResult = & $MYSQL --host=$RDS_HOST --port=3306 --user=$RDS_USER --password=$RDS_PASSWORD --database=$RDS_DATABASE -e $verifyQuery 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "Record Counts in RDS:" -ForegroundColor Green
    Write-Host $verifyResult
    Write-Host ""
}

# Cleanup
Write-Host "Cleaning up temporary files..." -ForegroundColor Gray
Remove-Item $tempDir -Recurse -Force

Write-Host ""
Write-Host "[SUCCESS] Migration Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Update apps/api/.env with RDS DATABASE_URL" -ForegroundColor White
Write-Host "2. Test API connection: cd apps/api && npx prisma db pull" -ForegroundColor White
Write-Host "3. Start API: npm run dev" -ForegroundColor White
Write-Host ""
