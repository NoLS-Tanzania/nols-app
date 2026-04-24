# ==============================================================================
# NoLScope API Test Script
# Run from:  d:\nolsapp2.1\nolsaf
# Usage:     .\test-nolscope.ps1
# ==============================================================================

$BASE = "http://localhost:4000/api/public/nolscope"
$pass = 0; $fail = 0

function Write-Header($text) {
    Write-Host ""
    Write-Host ("=" * 70) -ForegroundColor DarkCyan
    Write-Host "  $text" -ForegroundColor Cyan
    Write-Host ("=" * 70) -ForegroundColor DarkCyan
}

function Write-Step($num, $text) {
    Write-Host ""
    Write-Host "[$num] $text" -ForegroundColor Yellow
}

function Assert-OK($label, $condition, $detail = "") {
    if ($condition) {
        Write-Host "    PASS  $label" -ForegroundColor Green
        $script:pass++
    } else {
        Write-Host "    FAIL  $label  $detail" -ForegroundColor Red
        $script:fail++
    }
}

function Invoke-API($method, $path, $body = $null) {
    $uri = "$BASE$path"
    try {
        if ($body) {
            return Invoke-RestMethod -Uri $uri -Method $method `
                -ContentType "application/json" `
                -Body ($body | ConvertTo-Json -Depth 10) `
                -ErrorAction Stop
        } else {
            return Invoke-RestMethod -Uri $uri -Method $method -ErrorAction Stop
        }
    } catch {
        Write-Host "    ERROR calling $method $uri" -ForegroundColor Red
        Write-Host "    $_" -ForegroundColor DarkRed
        return $null
    }
}

# ------------------------------------------------------------------------------
# 0. Health check
# ------------------------------------------------------------------------------
Write-Header "0 / Health Check -- is the API running?"

try {
    $_health = Invoke-RestMethod -Uri "http://localhost:4000/health" -ErrorAction Stop
    Write-Host "    API is UP" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "  API is not running on port 4000." -ForegroundColor Red
    Write-Host "  Start it first:" -ForegroundColor White
    Write-Host "      cd d:\nolsapp2.1\nolsaf" -ForegroundColor White
    Write-Host "      npm run dev" -ForegroundColor White
    Write-Host ""
    exit 1
}

# ------------------------------------------------------------------------------
# 1. Destinations
# ------------------------------------------------------------------------------
Write-Header "1 / GET /destinations"

Write-Step "1.1" "List all active destinations"
$r = Invoke-API GET "/destinations"
Assert-OK "Returns destinations array"      ($r -and $r.destinations)
Assert-OK "At least 5 destinations seeded"  ($r.destinations.Count -ge 5)
Assert-OK "ZANZIBAR is in the list"         ($r.destinations | Where-Object { $_.destinationCode -eq "ZANZIBAR" })
Assert-OK "SERENGETI is in the list"        ($r.destinations | Where-Object { $_.destinationCode -eq "SERENGETI" })
if ($r) {
    Write-Host ""
    Write-Host "    Destinations found:" -ForegroundColor DarkGray
    $r.destinations | ForEach-Object {
        Write-Host ("    {0,-14} {1,-35} [{2}]" -f $_.destinationCode, $_.displayName, $_.destinationType) -ForegroundColor DarkGray
    }
}

# ------------------------------------------------------------------------------
# 2. Visa Fees
# ------------------------------------------------------------------------------
Write-Header "2 / GET /visa-fee/:nationality"

Write-Step "2.1" "US citizen -- must be Multiple Entry Visa at `$100"
$r = Invoke-API GET "/visa-fee/US"
Assert-OK "Returns a result"           ($null -ne $r)
Assert-OK "Amount is 100 USD"          ($r.amount -eq 100)
Assert-OK "Entry type is multiple"     ($r.entries -eq "multiple")
Assert-OK "Processing time is e-visa"  ($r.processingTime -eq "e-visa")
Assert-OK "Duration is 365 days"       ($r.durationDays -eq 365)
if ($r) {
    Write-Host ("    {0}: `${1} / {2}-entry / {3} days / {4}" -f `
        $r.nationality, $r.amount, $r.entries, $r.durationDays, $r.processingTime) -ForegroundColor DarkGray
}

Write-Step "2.2" "UK citizen -- Single Entry `$50 on-arrival"
$r = Invoke-API GET "/visa-fee/GB"
Assert-OK "Amount is 50 USD"      ($r.amount -eq 50)
Assert-OK "Entry type is single"  ($r.entries -eq "single")
if ($r) {
    Write-Host ("    {0}: `${1} / {2}-entry / {3}" -f `
        $r.nationality, $r.amount, $r.entries, $r.processingTime) -ForegroundColor DarkGray
}

Write-Step "2.3" "Kenyan citizen -- EAC visa free"
$r = Invoke-API GET "/visa-fee/KE"
Assert-OK "Amount is 0 (free)"    ($r.amount -eq 0)
if ($r) {
    Write-Host ("    {0}: `${1} -- {2}" -f $r.nationality, $r.amount, $r.description) -ForegroundColor DarkGray
}

Write-Step "2.4" "South African -- SADC visa free"
$r = Invoke-API GET "/visa-fee/ZA"
Assert-OK "Amount is 0 (free)"    ($r.amount -eq 0)
if ($r) {
    Write-Host ("    {0}: `${1} -- {2}" -f $r.nationality, $r.amount, $r.description) -ForegroundColor DarkGray
}

Write-Step "2.5" "Unknown nationality ZZ -- should fall back to default `$50"
$r = Invoke-API GET "/visa-fee/ZZ"
Assert-OK "Falls back gracefully"  ($null -ne $r)
Assert-OK "Returns a fee amount"   ($r.amount -ge 0)
if ($r) {
    Write-Host ("    ZZ (unknown): `${0}  fallback={1}" -f $r.amount, $r.fallback) -ForegroundColor DarkGray
}

# ------------------------------------------------------------------------------
# 3. Activities
# ------------------------------------------------------------------------------
Write-Header "3 / GET /activities"

Write-Step "3.1" "All activities (no filter)"
$r = Invoke-API GET "/activities"
Assert-OK "Returns activities array"  ($r -and $r.activities)
Assert-OK "At least 8 activities"     ($r.activities.Count -ge 8)
if ($r) {
    Write-Host ("    Total activities: {0}" -f $r.activities.Count) -ForegroundColor DarkGray
}

Write-Step "3.2" "Filter by destination Zanzibar"
$r = Invoke-API GET "/activities?dest=Zanzibar"
Assert-OK "Returns Zanzibar activities"   ($r.activities.Count -ge 3)
Assert-OK "All results are for Zanzibar"  (($r.activities | Where-Object { $_.destination -notlike "*Zanzibar*" }).Count -eq 0)
if ($r) {
    Write-Host "    Zanzibar activities:" -ForegroundColor DarkGray
    $r.activities | ForEach-Object {
        Write-Host ("      {0,-35}  avg: `${1}" -f $_.activityName, $_.averageCost) -ForegroundColor DarkGray
    }
}

Write-Step "3.3" "Filter by category safari"
$r = Invoke-API GET "/activities?category=safari"
Assert-OK "Returns safari activities"  ($r.activities.Count -ge 2)
if ($r) {
    Write-Host ("    Safari activities: {0}" -f $r.activities.Count) -ForegroundColor DarkGray
}

# ------------------------------------------------------------------------------
# 4. Estimate
# ------------------------------------------------------------------------------
Write-Header "4 / POST /estimate"

Write-Step "4.1" "US couple | Zanzibar 4n + Serengeti 3n | Aug peak | standard tier"
$body = @{
    nationality         = "US"
    destinations        = @(
        @{ code = "ZANZIBAR";  days = 4 },
        @{ code = "SERENGETI"; days = 3 }
    )
    startDate           = "2026-08-01"
    travelers           = @{ adults = 2; children = 0 }
    transportPreference = "flight"
    activities          = @("zanzibar-diving-2-tank", "zanzibar-sunset-dhow", "safari-full-day-shared")
    tier                = "standard"
}
$r = Invoke-API POST "/estimate" $body
Assert-OK "Returns an estimate"              ($null -ne $r)
Assert-OK "Currency is USD"                  ($r.currency -eq "USD")
Assert-OK "2 adults"                         ($r.travelers.adults -eq 2)
Assert-OK "Season is peak"                   ($r.season -eq "peak")
Assert-OK "Visa total is 200 (2x US `$100)"  ($r.breakdown.visa.total -eq 200)
Assert-OK "Visa is multiple-entry"           ($r.breakdown.visa.entries -eq "multiple")
Assert-OK "Park fees > 0"                    ($r.breakdown.parkFees.total -gt 0)
Assert-OK "Transport > 0"                    ($r.breakdown.transport.total -gt 0)
Assert-OK "Activities > 0"                   ($r.breakdown.activities.total -gt 0)
Assert-OK "Accommodation > 0"                ($r.breakdown.accommodation.total -gt 0)
Assert-OK "totalAvg > totalMin"              ($r.totalAvg -gt $r.totalMin)
Assert-OK "totalMax > totalAvg"              ($r.totalMax -gt $r.totalAvg)
Assert-OK "perAdultAvg = totalAvg / 2"       ([math]::Abs($r.perAdultAvg - ($r.totalAvg / 2)) -lt 1)
Assert-OK "Confidence between 0.5 and 1.0"  ($r.confidence -ge 0.5 -and $r.confidence -le 1.0)
if ($r) {
    Write-Host ""
    Write-Host "    COST BREAKDOWN (2 adults, Aug peak, standard):" -ForegroundColor White
    Write-Host ("      Visa           : `${0}" -f $r.breakdown.visa.total) -ForegroundColor DarkGray
    Write-Host ("      Park fees      : `${0}" -f $r.breakdown.parkFees.total) -ForegroundColor DarkGray
    Write-Host ("      Transport      : `${0}" -f $r.breakdown.transport.total) -ForegroundColor DarkGray
    Write-Host ("      Activities     : `${0}" -f $r.breakdown.activities.total) -ForegroundColor DarkGray
    Write-Host ("      Accommodation  : `${0}" -f $r.breakdown.accommodation.total) -ForegroundColor DarkGray
    Write-Host ("      Service (5pct) : `${0}" -f $r.breakdown.serviceCharge.total) -ForegroundColor DarkGray
    Write-Host "      --------------------------------" -ForegroundColor DarkGray
    Write-Host ("      RANGE : `${0} -- `${1}" -f $r.totalMin, $r.totalMax) -ForegroundColor White
    Write-Host ("      AVG   : `${0}  (per adult: `${1})" -f $r.totalAvg, $r.perAdultAvg) -ForegroundColor Yellow
    Write-Host ("      Season: {0}  |  Confidence: {1}" -f $r.season, $r.confidence) -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "    Transport legs:" -ForegroundColor DarkGray
    $r.breakdown.transport.detail | ForEach-Object {
        if ($_.status -eq "no-data") {
            Write-Host ("      {0} -> {1}  NO DATA" -f $_.from, $_.to) -ForegroundColor DarkYellow
        } else {
            Write-Host ("      {0} -> {1}  [{2}]  avg: `${3}" -f $_.from, $_.to, $_.type, $_.legCostAvg) -ForegroundColor DarkGray
        }
    }
    Write-Host ""
    Write-Host "    Park fees:" -ForegroundColor DarkGray
    $r.breakdown.parkFees.detail | ForEach-Object {
        Write-Host ("      {0}  {1} days  subtotal: `${2}" -f $_.destination, $_.days, $_.subtotal) -ForegroundColor DarkGray
    }
}

Write-Step "4.2" "Kenyan hiker | Kilimanjaro 7n | July | budget tier"
$body = @{
    nationality  = "KE"
    destinations = @(@{ code = "KILIMANJARO"; days = 7 })
    startDate    = "2026-07-10"
    travelers    = @{ adults = 1; children = 0 }
    activities   = @("kilimanjaro-trek-machame")
    tier         = "budget"
}
$r = Invoke-API POST "/estimate" $body
Assert-OK "Returns an estimate"       ($null -ne $r)
Assert-OK "Visa is 0 (EAC free)"      ($r.breakdown.visa.total -eq 0)
Assert-OK "Park fees > 0"             ($r.breakdown.parkFees.total -gt 0)
Assert-OK "Trek activity > 1500"      ($r.breakdown.activities.total -gt 1500)
if ($r) {
    Write-Host ("    Visa: `${0} | Parks: `${1} | Trek: `${2} | TOTAL: `${3}" -f `
        $r.breakdown.visa.total, $r.breakdown.parkFees.total, `
        $r.breakdown.activities.total, $r.totalAvg) -ForegroundColor DarkGray
}

Write-Step "4.3" "German family | Ngorongoro 2n + Serengeti 3n | 2 adults + 2 children | luxury"
$body = @{
    nationality  = "DE"
    destinations = @(
        @{ code = "NGORONGORO"; days = 2 },
        @{ code = "SERENGETI";  days = 3 }
    )
    startDate    = "2026-09-15"
    travelers    = @{ adults = 2; children = 2 }
    activities   = @("ngorongoro-crater-descent", "safari-full-day-private")
    tier         = "luxury"
}
$r = Invoke-API POST "/estimate" $body
Assert-OK "Returns an estimate"          ($null -ne $r)
Assert-OK "Visa 100 (2x 50 for DE)"      ($r.breakdown.visa.total -eq 100)
Assert-OK "4 total travelers"            ($r.travelers.total -eq 4)
Assert-OK "Luxury accommodation > 500"   ($r.breakdown.accommodation.total -gt 500)
if ($r) {
    Write-Host ("    Visa: `${0} | Accommodation: `${1} | TOTAL: `${2}" -f `
        $r.breakdown.visa.total, $r.breakdown.accommodation.total, $r.totalAvg) -ForegroundColor DarkGray
}

Write-Step "4.4" "Off-peak (April) vs peak (August) -- Zanzibar 5n solo UK"
$bodyBase = @{
    nationality  = "GB"
    destinations = @(@{ code = "ZANZIBAR"; days = 5 })
    travelers    = @{ adults = 1 }
    activities   = @("zanzibar-spice-tour", "zanzibar-stone-town-tour")
    tier         = "standard"
}
$bodyBase.startDate = "2026-04-10"
$rOff = Invoke-API POST "/estimate" $bodyBase
$bodyBase.startDate = "2026-08-10"
$rPeak = Invoke-API POST "/estimate" $bodyBase
Assert-OK "Off-peak estimate exists"              ($null -ne $rOff)
Assert-OK "Peak estimate exists"                  ($null -ne $rPeak)
if ($rOff -and $rPeak) {
    Assert-OK "Off-peak (Apr) cheaper than peak (Aug)"  ($rOff.totalAvg -lt $rPeak.totalAvg)
    $saving = [math]::Round($rPeak.totalAvg - $rOff.totalAvg, 2)
    Write-Host ("    Off-peak: `${0}  |  Peak: `${1}  |  Saving: `${2}" -f `
        $rOff.totalAvg, $rPeak.totalAvg, $saving) -ForegroundColor DarkGray
}

Write-Step "4.5" "Validation: missing nationality -- expect 400"
try {
    Invoke-RestMethod -Uri "$BASE/estimate" -Method POST `
        -ContentType "application/json" `
        -Body '{"destinations":[{"code":"ZANZIBAR","days":3}],"travelers":{"adults":1}}' `
        -ErrorAction Stop | Out-Null
    Assert-OK "Should have returned 400" $false
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Assert-OK "Returns HTTP 400 for missing nationality"  ($code -eq 400)
}

Write-Step "4.6" "Validation: unknown destination code -- expect 400"
try {
    Invoke-RestMethod -Uri "$BASE/estimate" -Method POST `
        -ContentType "application/json" `
        -Body '{"nationality":"US","destinations":[{"code":"NARNIA","days":3}],"travelers":{"adults":1}}' `
        -ErrorAction Stop | Out-Null
    Assert-OK "Should have returned 400" $false
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Assert-OK "Returns HTTP 400 for unknown destination"  ($code -eq 400)
}

# ------------------------------------------------------------------------------
# Summary
# ------------------------------------------------------------------------------
Write-Host ""
Write-Host ("=" * 70) -ForegroundColor DarkCyan
$total = $pass + $fail
if ($fail -eq 0) {
    Write-Host ("  ALL TESTS PASSED   $pass / $total") -ForegroundColor Green
} else {
    Write-Host ("  RESULTS: $pass passed,  $fail FAILED  (total: $total)") -ForegroundColor Red
}
Write-Host ("=" * 70) -ForegroundColor DarkCyan
Write-Host ""