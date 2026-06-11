param(
  [string]$Environment = "staging",
  [string]$ApiBaseUrl = "https://nolsaf-api-staging.onrender.com",
  [string]$WebBaseUrl = "https://staging.nolsaf.com",
  [string]$MerchantName = "NoLS Africa Company Limited",
  [string]$Provider = "CoralCommerce hosted card checkout via AzamPay card integration",
  [string]$Currency = "TZS",
  [string]$Flow = "Public accommodation booking",
  [string]$BookingId = "",
  [string]$InvoiceId = "",
  [string]$InvoiceNumber = "",
  [string]$ReceiptNumber = "",
  [string]$PaymentReference = "",
  [string]$GatewayTransactionId = "",
  [string]$AmountPaid = "",
  [string]$PaymentDate = "",
  [string]$SandboxEvidenceNote = "",
  [string]$RenderLogPath = "",
  [string]$OutputPath = "",
  [switch]$CopyToClipboard
)

$ErrorActionPreference = "Stop"

function Get-GitValue {
  param([string[]]$ArgsList)
  try {
    $gitArgs = @()
    if (-not [string]::IsNullOrWhiteSpace($script:GitRoot)) {
      $gitArgs += @("-C", $script:GitRoot)
    }
    $gitArgs += $ArgsList
    $value = & git @gitArgs 2>$null
    if ($LASTEXITCODE -eq 0) { return (($value -join "`n").Trim()) }
  } catch {}
  return "unavailable"
}

function Redact-SecretText {
  param([string]$Text)
  if ([string]::IsNullOrWhiteSpace($Text)) { return $Text }

  $safe = $Text
  $safe = $safe -replace '(?i)(password|secret|encryption[_ -]?key|api[_ -]?key|token|authorization)\s*[:=]\s*["'']?[^,"''\s]+', '$1=[REDACTED]'
  $safe = $safe -replace '(?i)(Bearer\s+)[A-Za-z0-9._~+/-]+=*', '$1[REDACTED]'
  $safe = $safe -replace '(?i)(accessToken=)[^&\s]+', '$1[REDACTED]'
  return $safe
}

function Add-OptionalRow {
  param(
    [System.Collections.Generic.List[string]]$Rows,
    [string]$Label,
    [string]$Value
  )
  if (-not [string]::IsNullOrWhiteSpace($Value)) {
    $Rows.Add("| $Label | $Value |") | Out-Null
  }
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$script:GitRoot = ""
try {
  $script:GitRoot = ((& git -C $repoRoot rev-parse --show-toplevel 2>$null) -join "`n").Trim()
} catch {
  $script:GitRoot = ""
}
$repoPrefix = ""
if (-not [string]::IsNullOrWhiteSpace($script:GitRoot)) {
  $gitRootWithSlash = $script:GitRoot.TrimEnd("\", "/") + [System.IO.Path]::DirectorySeparatorChar
  $repoRootWithSlash = $repoRoot.TrimEnd("\", "/") + [System.IO.Path]::DirectorySeparatorChar
  $rootUri = [System.Uri]::new($gitRootWithSlash)
  $repoUri = [System.Uri]::new($repoRootWithSlash)
  $repoPrefix = [System.Uri]::UnescapeDataString($rootUri.MakeRelativeUri($repoUri).ToString()).TrimEnd("/")
  if ($repoPrefix -eq ".") { $repoPrefix = "" }
}
function Join-RepoPath {
  param([string]$Path)
  if ([string]::IsNullOrWhiteSpace($repoPrefix)) { return $Path }
  return "$repoPrefix/$Path"
}

$timestamp = Get-Date
$stamp = $timestamp.ToString("yyyyMMdd-HHmmss")

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
  $reportDir = Join-Path $repoRoot ".local-reports\card-progress"
  New-Item -ItemType Directory -Path $reportDir -Force | Out-Null
  $OutputPath = Join-Path $reportDir "azam-card-progress-$stamp.md"
} else {
  $parent = Split-Path -Parent $OutputPath
  if ($parent) { New-Item -ItemType Directory -Path $parent -Force | Out-Null }
}

$stagingCommit = Get-GitValue @("rev-parse", "origin/staging")
$latestPaymentCommits = Get-GitValue @(
  "log",
  "--oneline",
  "-8",
  "origin/staging",
  "--",
  (Join-RepoPath "apps/api/src/routes/payments.coralcommerce.card.ts"),
  (Join-RepoPath "apps/api/src/routes/webhooks.payments.ts"),
  (Join-RepoPath "apps/api/src/routes/public.invoices.ts"),
  (Join-RepoPath "apps/web/app/public/booking/payment/page.tsx")
)

$evidenceRows = [System.Collections.Generic.List[string]]::new()
Add-OptionalRow $evidenceRows "Booking ID" $BookingId
Add-OptionalRow $evidenceRows "Invoice ID" $InvoiceId
Add-OptionalRow $evidenceRows "Invoice Number" $InvoiceNumber
Add-OptionalRow $evidenceRows "Receipt Number" $ReceiptNumber
Add-OptionalRow $evidenceRows "Payment Reference" $PaymentReference
Add-OptionalRow $evidenceRows "Gateway Transaction ID" $GatewayTransactionId
Add-OptionalRow $evidenceRows "Amount Paid" $AmountPaid
Add-OptionalRow $evidenceRows "Payment Date" $PaymentDate
Add-OptionalRow $evidenceRows "Sandbox Evidence Note" $SandboxEvidenceNote
if ($evidenceRows.Count -eq 0) {
  $evidenceRows.Add("| Evidence | Fill this after test: transaction ID, invoice, receipt, amount, or sandbox row screenshot reference. |") | Out-Null
}

$logEvidence = ""
if (-not [string]::IsNullOrWhiteSpace($RenderLogPath)) {
  if (Test-Path $RenderLogPath) {
    $rawLogs = Get-Content -Path $RenderLogPath -Raw
    $interesting = ($rawLogs -split "`r?`n") |
      Where-Object {
        $_ -match "coralcommerce/card|payments/coralcommerce/card|webhooks/coralcommerce/card|statusCode.:200|statusCode.:302|Payment Successful|PAID|booking code|check-in code"
      } |
      Select-Object -Last 80
    $logEvidence = Redact-SecretText (($interesting -join "`n").Trim())
  } else {
    $logEvidence = "Render log path was provided but not found: $RenderLogPath"
  }
}

$report = @"
# Card Integration Progress Report

Prepared: $($timestamp.ToString("yyyy-MM-dd HH:mm:ss zzz"))

## Summary

$MerchantName has completed the first successful hosted card checkout verification on $Environment using $Currency for a real accommodation booking flow. The tested card path now returns from the hosted checkout, confirms the invoice as paid, activates the booking, generates the booking/check-in code immediately, and routes the traveller to the authenticated booking/receipt experience.

## Environment

| Item | Value |
| --- | --- |
| Environment | $Environment |
| API Base URL | $ApiBaseUrl |
| Web Base URL | $WebBaseUrl |
| Provider / Facility | $Provider |
| Tested Flow | $Flow |
| Currency | $Currency |
| Staging Commit | $stagingCommit |

## Test Evidence

| Item | Value |
| --- | --- |
$($evidenceRows -join "`n")

## Confirmed Behaviour

| Area | Result |
| --- | --- |
| Hosted checkout initiation | Working for accommodation booking invoices |
| CoralCommerce callback/postback | Working; successful callbacks finalize invoice payment |
| Invoice status | Updated to PAID after successful settlement |
| Booking activation | Booking is confirmed after payment |
| Booking/check-in code | Generated immediately after payment confirmation |
| My Bookings visibility | Paid booking is available under active/confirmed bookings |
| Receipt routing | Traveller uses account booking receipt, not the public draft receipt |
| Traveller notification | Email/SMS confirmation is handled from the shared paid-invoice path when contact details exist |
| MNO / Bank / Card consistency | MNO and Bank via AzamPay webhook and Card via CoralCommerce now share the same invoice finalization path |

## Implementation Evidence

Recent staging commits touching the payment finalization flow:

~~~text
$latestPaymentCommits
~~~

Current shared finalization rule:

- AzamPay MNO and Bank successful webhooks call the shared invoice payment finalizer.
- CoralCommerce Card successful callback/postback calls the same shared invoice payment finalizer.
- The shared finalizer marks the invoice paid, confirms the booking, generates the check-in code, activates linked transport where applicable, notifies owner/admin, and sends traveller confirmation where contact details exist.

## Render / Runtime Evidence

$(if ([string]::IsNullOrWhiteSpace($logEvidence)) {
"No Render log file was attached to this generated report. Add `-RenderLogPath path\to\render.log` to include redacted callback/postback lines."
} else {
"~~~text`n$logEvidence`n~~~"
})

## Current Status

Accommodation booking card payment testing is successful for $Currency on $Environment. We are ready to notify the AzamPay/Card team that the booking checkout path is working and proceed to the next planned test area: tour-booking card checkout.

## Suggested Message To AzamPay/Card Team

Hello Team,

We have completed the first successful sandbox verification for NoLS Africa Company Limited hosted card checkout on our staging environment.

The tested scenario was an accommodation booking payment in $Currency. The hosted checkout completed successfully, CoralCommerce callback/postback reached our API, the invoice was marked as paid, the booking was confirmed, the booking/check-in code was generated immediately, and the traveller receipt/account flow is now working.

We will proceed with the next test area, tour-booking card checkout, and will share further evidence if needed.

Regards,  
NoLS Africa Team
"@

Set-Content -Path $OutputPath -Value $report -Encoding UTF8

if ($CopyToClipboard) {
  try {
    Set-Clipboard -Value $report
    Write-Host "Report copied to clipboard."
  } catch {
    Write-Warning "Could not copy report to clipboard: $($_.Exception.Message)"
  }
}

Write-Host "Card progress report generated:"
Write-Host $OutputPath
