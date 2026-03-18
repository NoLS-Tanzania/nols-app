# ============================================================
#  NoLSAF — Automated MySQL Backup Script
#  Runs nightly via Windows Task Scheduler.
#
#  SETUP (run once manually as Administrator):
#    1. Create the credentials file:
#         New-Item -Path "$env:USERPROFILE\.my.cnf" -ItemType File
#         Add-Content "$env:USERPROFILE\.my.cnf" "[mysqldump]`nuser=root`npassword=YOUR_PASSWORD_HERE"
#         icacls "$env:USERPROFILE\.my.cnf" /inheritance:r /grant:r "$($env:USERNAME):(R)"
#    2. Register the scheduled task:
#         cd d:\nolsapp2.1\nolsaf
#         .\scripts\register-backup-task.ps1
#
#  OUTPUT: backups\nolsaf_YYYYMMDD_HHMMSS.sql.gz  (kept for 14 days)
# ============================================================

param(
    [string]$DbHost     = "127.0.0.1",
    [string]$DbPort     = "3306",
    [string]$DbName     = "railway",
    [string]$BackupRoot = "D:\nolsapp2.1\backups",
    [int]   $RetainDays = 14
)

$mysqldump  = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe"
$gzip       = "C:\Program Files\Git\usr\bin\gzip.exe"   # bundled with Git for Windows
$timestamp  = Get-Date -Format "yyyyMMdd_HHmmss"
$backupFile = Join-Path $BackupRoot "nolsaf_$timestamp.sql"
$gzipFile   = "$backupFile.gz"
$logFile    = Join-Path $BackupRoot "backup.log"

# ── Ensure backup directory exists ──────────────────────────
if (-not (Test-Path $BackupRoot)) {
    New-Item -ItemType Directory -Path $BackupRoot -Force | Out-Null
}

function Log($msg) {
    $line = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] $msg"
    Write-Host $line
    Add-Content -Path $logFile -Value $line
}

Log "Starting backup of '$DbName' on $DbHost`:$DbPort"

# ── Run mysqldump using ~/.my.cnf credentials ───────────────
# The --defaults-file flag reads [mysqldump] section only — password never
# appears in the process command line (safe from ps/Get-Process snooping).
$cnfFile = "$env:USERPROFILE\.my.cnf"
if (-not (Test-Path $cnfFile)) {
    Log "ERROR: Credentials file not found at $cnfFile"
    Log "       Run the SETUP steps in this script's header comment."
    exit 1
}

$dumpArgs = @(
    "--defaults-file=$cnfFile",
    "--host=$DbHost",
    "--port=$DbPort",
    "--single-transaction",    # consistent snapshot without locking tables
    "--routines",              # include stored procedures/functions
    "--triggers",              # include triggers
    "--set-gtid-purged=OFF",   # safe for RDS/Railway targets that manage GTIDs
    "--column-statistics=0",   # MySQL 8 client compat flag
    $DbName
)

& $mysqldump @dumpArgs | Out-File -FilePath $backupFile -Encoding utf8

if ($LASTEXITCODE -ne 0 -or -not (Test-Path $backupFile)) {
    Log "ERROR: mysqldump failed (exit code $LASTEXITCODE)"
    exit 1
}

$rawSize = (Get-Item $backupFile).Length
Log "Dump complete — raw size: $([math]::Round($rawSize/1MB, 2)) MB"

# ── Compress with gzip if available, else keep plain .sql ───
if (Test-Path $gzip) {
    & $gzip -9 $backupFile
    if (Test-Path $gzipFile) {
        $gz = (Get-Item $gzipFile).Length
        Log "Compressed to $([math]::Round($gz/1MB, 2)) MB → $gzipFile"
        $finalFile = $gzipFile
    } else {
        Log "WARNING: gzip failed, keeping uncompressed file"
        $finalFile = $backupFile
    }
} else {
    Log "WARNING: gzip not found, keeping uncompressed .sql"
    $finalFile = $backupFile
}

# ── Prune backups older than $RetainDays ────────────────────
$cutoff = (Get-Date).AddDays(-$RetainDays)
$deleted = Get-ChildItem $BackupRoot -File |
    Where-Object { $_.Name -match '^nolsaf_\d{8}_\d{6}' -and $_.LastWriteTime -lt $cutoff }

foreach ($f in $deleted) {
    Remove-Item $f.FullName -Force
    Log "Pruned old backup: $($f.Name)"
}

Log "Backup finished successfully: $(Split-Path $finalFile -Leaf)"
Log "---"
exit 0
