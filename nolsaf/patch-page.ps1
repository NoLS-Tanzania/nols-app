$fp = 'D:\nolsapp2.1\nolsaf\apps\web\app\public\properties\[slug]\page.tsx'
$text = [System.IO.File]::ReadAllText($fp)

# ── Patch 1: inline availability checker (first occurrence) ───────────────────
# Old: const API = (...); const response = await fetch(`${API}/api/public/availability/check`, {
#      method: "POST", headers: { "Content-Type": "application/json" },  signal: controller.signal,
$old1 = @'
      const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
      const response = await fetch(`${API}/api/public/availability/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
'@

$new1 = @'
      const response = await fetch(`/api/public/availability/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
'@

$patched = $text.Replace($old1, $new1)
if ($patched -eq $text) { Write-Host "WARN: patch 1 had no match" } else { Write-Host "OK: patch 1 applied" }
$text = $patched

# ── Patch 2: modal availability checker (second occurrence) ───────────────────
$old2 = @'
        const API = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
        const response = await fetch(`${API}/api/public/availability/check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyId,
            checkIn: checkInDate.toISOString(),
            checkOut: checkOutDate.toISOString(),
            roomCode: roomCode ? String(roomCode).trim() : null,
          }),
        });
'@

$new2 = @'
        const response = await fetch(`/api/public/availability/check`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            propertyId,
            checkIn: checkInDate.toISOString(),
            checkOut: checkOutDate.toISOString(),
            roomCode: roomCode ? String(roomCode).trim() : null,
          }),
        });
'@

$patched = $text.Replace($old2, $new2)
if ($patched -eq $text) { Write-Host "WARN: patch 2 had no match" } else { Write-Host "OK: patch 2 applied" }
$text = $patched

# ── Patch 3: Socket.IO URL ───────────────────────────────────────────────────
$old3 = @'
    const socketUrl = (process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:4000").replace(/\/$/, "");

    let cancelled = false;
    let socket: Socket | null = null;

    (async () => {
      try {
        const { io } = await import("socket.io-client");
        if (cancelled) return;
        const newSocket = io(socketUrl, {
          transports: ["websocket", "polling"],
          withCredentials: true,
        });
'@

$new3 = @'
    let cancelled = false;
    let socket: Socket | null = null;

    (async () => {
      try {
        const { io } = await import("socket.io-client");
        if (cancelled) return;
        const newSocket = io(undefined as any, {
          path: "/socket.io",
          transports: ["websocket", "polling"],
          withCredentials: true,
        });
'@

$patched = $text.Replace($old3, $new3)
if ($patched -eq $text) { Write-Host "WARN: patch 3 had no match" } else { Write-Host "OK: patch 3 applied" }
$text = $patched

[System.IO.File]::WriteAllText($fp, $text, [System.Text.Encoding]::UTF8)
Write-Host "Done. File length: $($text.Length)"
Write-Host "Remaining NEXT_PUBLIC_API_URL refs: $(([regex]::Matches($text, 'NEXT_PUBLIC_API_URL')).Count)"
