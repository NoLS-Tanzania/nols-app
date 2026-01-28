# Ensure Redis is running for local development via Docker
# Uses a stable container name so API/web can reconnect “as usual”.

$ErrorActionPreference = 'Stop'

$containerName = 'redis-nolsaf'
$image = 'redis:7-alpine'
$hostPort = 6379
$containerPort = 6379
$volumeName = 'redis-nolsaf-data'

function Test-DockerAvailable {
  try {
    $null = docker version --format '{{.Server.Version}}' 2>$null
    return $true
  } catch {
    return $false
  }
}

if (-not (Test-DockerAvailable)) {
  Write-Host 'Docker is not available. Start Docker Desktop and re-run.' -ForegroundColor Yellow
  return
}

# Create volume if missing (idempotent)
try {
  $null = docker volume inspect $volumeName 2>$null
} catch {
  docker volume create $volumeName | Out-Null
}

# If container exists, start it; otherwise create it.
$existing = docker ps -a --filter "name=^/${containerName}$" --format '{{.Names}}'
if ($existing -eq $containerName) {
  $running = docker ps --filter "name=^/${containerName}$" --format '{{.Names}}'
  if ($running -eq $containerName) {
    Write-Host "Redis already running: $containerName (localhost:$hostPort)" -ForegroundColor Green
    return
  }

  Write-Host "Starting existing Redis container: $containerName" -ForegroundColor Cyan
  docker start $containerName | Out-Null
  Write-Host "Redis started: localhost:$hostPort" -ForegroundColor Green
  return
}

Write-Host "Creating Redis container: $containerName" -ForegroundColor Cyan
# Expose to host for local (non-Docker) dev. Persist data in a named volume.
# Note: If you later run API in Docker, put both on the same network and use redis://redis-nolsaf:6379.
docker run -d --name $containerName --restart unless-stopped `
  -p "${hostPort}:${containerPort}" `
  -v "${volumeName}:/data" `
  $image `
  redis-server --appendonly yes | Out-Null

Write-Host "Redis ready: $containerName (localhost:$hostPort)" -ForegroundColor Green
