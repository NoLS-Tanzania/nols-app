# ============================================================
#  NoLSAF — Register Windows Task Scheduler backup task
#  Run ONCE as Administrator from the nolsaf directory.
#
#  Usage:
#    cd d:\nolsapp2.1\nolsaf
#    .\scripts\register-backup-task.ps1
# ============================================================

$taskName   = "NoLSAF-DB-Backup"
$scriptPath = "D:\nolsapp2.1\nolsaf\scripts\backup-database.ps1"
$runAt      = "02:00"   # 2 AM daily — adjust to your preference

# ── Check running as Administrator ──────────────────────────
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Error "This script must be run as Administrator."
    Write-Host  "Right-click PowerShell → 'Run as Administrator' then re-run."
    exit 1
}

# ── Remove old task if it exists ────────────────────────────
if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
    Write-Host "Removed existing task: $taskName"
}

# ── Build task components ────────────────────────────────────
$action  = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NonInteractive -ExecutionPolicy Bypass -File `"$scriptPath`""

$trigger = New-ScheduledTaskTrigger -Daily -At $runAt

$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Hours 1) `
    -StartWhenAvailable `          # run missed trigger if machine was off at 2 AM
    -MultipleInstances IgnoreNew

$principal = New-ScheduledTaskPrincipal `
    -UserId $env:USERNAME `
    -LogonType S4U `               # runs whether user is logged in or not
    -RunLevel Highest

# ── Register the task ───────────────────────────────────────
Register-ScheduledTask `
    -TaskName  $taskName `
    -Action    $action `
    -Trigger   $trigger `
    -Settings  $settings `
    -Principal $principal `
    -Force | Out-Null

Write-Host ""
Write-Host "Task registered successfully!"
Write-Host "  Name    : $taskName"
Write-Host "  Runs at : $runAt daily"
Write-Host "  Script  : $scriptPath"
Write-Host "  Backups : D:\nolsapp2.1\backups\"
Write-Host ""
Write-Host "To test it right now:"
Write-Host "  Start-ScheduledTask -TaskName '$taskName'"
Write-Host "  Get-ScheduledTask    -TaskName '$taskName' | Get-ScheduledTaskInfo"
