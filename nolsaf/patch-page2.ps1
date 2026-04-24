$fp = 'D:\nolsapp2.1\nolsaf\apps\web\app\public\properties\[slug]\page.tsx'
$lines = [System.IO.File]::ReadAllLines($fp)

Write-Host ("Total lines: " + $lines.Length)

# Verify the targets before patching
Write-Host ("L1428: " + $lines[1428].TrimStart())
Write-Host ("L1430: " + $lines[1430].TrimStart())
Write-Host ("L2378: " + $lines[2378].TrimStart())
Write-Host ("L2380: " + $lines[2380].TrimStart())
Write-Host ("L2458: " + $lines[2458].TrimStart())
Write-Host ("L2476: " + $lines[2476].TrimStart())

# Patch 1 - inline availability check: blank the const API line
$lines[1428] = ""

# Patch 2 - inline availability check: replace ${API}/ with / in the fetch URL
$lines[1430] = $lines[1430].Replace('${API}/api/public/availability/check', '/api/public/availability/check')

# Patch 3 - modal availability check: blank the const API line
$lines[2378] = ""

# Patch 4 - modal availability check: replace ${API}/ with / in the fetch URL
$lines[2380] = $lines[2380].Replace('${API}/api/public/availability/check', '/api/public/availability/check')

# Patch 5 - socket: blank the socketUrl declaration
$lines[2458] = ""

# Patch 6 - socket: use same-origin io() without URL
$lines[2476] = $lines[2476].Replace('io(socketUrl, {', 'io({')

# Write back with UTF-8 and CRLF (Windows default for WriteAllLines)
[System.IO.File]::WriteAllLines($fp, $lines, [System.Text.Encoding]::UTF8)

# Verify
$verify = [System.IO.File]::ReadAllText($fp)
$apiRefs = [regex]::Matches($verify, 'NEXT_PUBLIC_API_URL').Count
$sockRefs = [regex]::Matches($verify, 'NEXT_PUBLIC_SOCKET_URL').Count
Write-Host ("NEXT_PUBLIC_API_URL refs remaining: " + $apiRefs)
Write-Host ("NEXT_PUBLIC_SOCKET_URL refs remaining: " + $sockRefs)

# Show the patched lines
$lines2 = [System.IO.File]::ReadAllLines($fp)
Write-Host "--- Patched L1426-1435 ---"
$lines2[1426..1435]
Write-Host "--- Patched L2376-2385 ---"
$lines2[2376..2385]
Write-Host "--- Patched L2455-2480 ---"
$lines2[2455..2480]
