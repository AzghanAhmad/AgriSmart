<#
.SYNOPSIS
  AgriSmart Docker Compose runtime validation (Phases 1-8).

.EXAMPLE
  .\scripts\compose-runtime-validation.ps1

.EXAMPLE
  .\scripts\compose-runtime-validation.ps1 -SkipUp
#>
[CmdletBinding()]
param(
    [switch]$SkipUp,
    [string]$BaseUrl = "http://127.0.0.1:5000",
    [string]$ReportPath = ""
)

$ErrorActionPreference = "Continue"
$lines = New-Object System.Collections.Generic.List[string]

function Report([string]$msg) {
    $null = $script:lines.Add($msg)
    Write-Host $msg
}

function Try-Http([string]$method, [string]$url) {
    try {
        $r = Invoke-WebRequest -Uri $url -Method $method -UseBasicParsing -TimeoutSec 45
        $body = if ($r.Content) { $r.Content.Substring(0, [Math]::Min(1500, $r.Content.Length)) } else { "" }
        return @{ Ok = $true; Code = [int]$r.StatusCode; Body = $body }
    }
    catch {
        $code = $null
        if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
        return @{ Ok = $false; Code = $code; Body = $_.Exception.Message }
    }
}

function Docker-Exec([string]$container, [string[]]$ArgumentList) {
    & docker exec $container @ArgumentList 2>&1 | Out-String
}

$scriptDir = $PSScriptRoot
if ([string]::IsNullOrWhiteSpace($scriptDir)) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
if ([string]::IsNullOrWhiteSpace($ReportPath)) {
    $ReportPath = Join-Path $scriptDir "compose-validation-report.txt"
}

$root = (Resolve-Path (Join-Path $scriptDir "..")).Path
Set-Location $root

if (-not (Test-Path (Join-Path $root "docker-compose.yml"))) {
    Report "ERROR: docker-compose.yml not found at $root"
    exit 1
}

Report "=== AgriSmart Compose Runtime Validation ==="
Report "Repo: $root"
Report "Started: $(Get-Date -Format o)"

Report ""
Report "--- PHASE 1: Container runtime ---"
if (-not $SkipUp) {
    docker compose up -d 2>&1 | ForEach-Object { Report $_ }
}
Start-Sleep -Seconds 5
Report (docker ps -a --format "table {{.Names}}`t{{.Status}}`t{{.Ports}}" 2>&1 | Out-String)

foreach ($c in @("agrismart-postgres", "agrismart-yolo", "agrismart-chatbot", "agrismart-backend")) {
    $running = docker ps -q -f "name=$c"
    if (-not $running) {
        Report "SKIP logs: container $c not running"
        continue
    }
    Report "-- logs (tail 35): $c --"
    Report (docker logs $c --tail 35 2>&1 | Out-String)
}

Report ""
Report "--- PHASE 2: Service communication (from backend container) ---"
$be = "agrismart-backend"
if (-not (docker ps -q -f "name=$be")) {
    Report "ERROR: backend container not running - cannot probe internal DNS."
}
else {
    $yH = (Docker-Exec $be @("curl", "-sS", "-o", "/dev/null", "-w", "%{http_code}", "http://yolo-service:8001/health")).Trim()
    $yR = (Docker-Exec $be @("curl", "-sS", "-o", "/dev/null", "-w", "%{http_code}", "http://yolo-service:8001/ready")).Trim()
    $cH = (Docker-Exec $be @("curl", "-sS", "-o", "/dev/null", "-w", "%{http_code}", "http://chatbot-service:8002/health")).Trim()
    $cR = (Docker-Exec $be @("curl", "-sS", "-o", "/dev/null", "-w", "%{http_code}", "http://chatbot-service:8002/ready")).Trim()
    Report "backend -> yolo-service:8001 /health HTTP $yH"
    Report "backend -> yolo-service:8001 /ready HTTP $yR"
    Report "backend -> chatbot-service:8002 /health HTTP $cH"
    Report "backend -> chatbot-service:8002 /ready HTTP $cR"
    $pgDns = (Docker-Exec $be @("getent", "hosts", "postgres")).Trim()
    Report "backend -> postgres DNS: $pgDns"
    $pgPy = "import socket; socket.create_connection(('postgres',5432), 3).close(); print('tcp_ok')"
    $pg = (Docker-Exec $be @("python", "-c", $pgPy)).Trim()
    Report "backend -> postgres:5432 $pg"
}
Report "Note: compose healthchecks use 127.0.0.1 inside the same container only."

Report ""
Report "--- PHASE 3: Health and readiness (host -> backend) ---"
$h = Try-Http "GET" "$BaseUrl/health"
Report "/health -> HTTP $($h.Code)"
$d = Try-Http "GET" "$BaseUrl/health/dependencies"
Report "/health/dependencies -> HTTP $($d.Code)"
if ($d.Body) { Report $d.Body }

Report ""
Report "--- PHASE 4: Endpoint smoke ---"
if (docker ps -q -f "name=$be") {
    $py = "import io; from PIL import Image; im=Image.new('RGB',(64,64),(10,120,40)); b=io.BytesIO(); im.save(b, format='JPEG'); open('/tmp/compose_smoke.jpg','wb').write(b.getvalue())"
    Report (Docker-Exec $be @("python", "-c", $py))
    $pred = Docker-Exec $be @("curl", "-sS", "-w", "`nHTTP_CODE:%{http_code}", "-F", "file=@/tmp/compose_smoke.jpg", "-F", "cropType=wheat", "http://127.0.0.1:5000/predict")
    Report "/predict (via loopback inside backend):`n$($pred.Trim())"
}
$warm = Try-Http "GET" "$BaseUrl/api/chatbot/warmup"
Report "/api/chatbot/warmup -> HTTP $($warm.Code)"
$login = Try-Http "POST" "$BaseUrl/api/auth/login"
Report "/api/auth/login (no body) -> HTTP $($login.Code) (expect 4xx without JSON)"

Report ""
Report "--- PHASE 5: Failure simulation ---"
if (docker ps -q -f "name=agrismart-yolo") {
    docker stop agrismart-yolo 2>&1 | ForEach-Object { Report $_ }
    Start-Sleep -Seconds 3
    if (docker ps -q -f "name=$be") {
        $predDown = Docker-Exec $be @("curl", "-sS", "-w", "`nHTTP_CODE:%{http_code}", "-F", "file=@/tmp/compose_smoke.jpg", "-F", "cropType=wheat", "http://127.0.0.1:5000/predict")
        Report "/predict with yolo stopped:`n$($predDown.Trim())"
    }
    $depsDown = Try-Http "GET" "$BaseUrl/health/dependencies"
    Report "/health/dependencies with yolo down -> HTTP $($depsDown.Code)"
    docker start agrismart-yolo 2>&1 | ForEach-Object { Report $_ }
    $deadline = (Get-Date).AddMinutes(4)
    while ((Get-Date) -lt $deadline -and (docker ps -q -f "name=$be")) {
        $rc = (Docker-Exec $be @("curl", "-sS", "-o", "/dev/null", "-w", "%{http_code}", "http://yolo-service:8001/ready")).Trim()
        if ($rc -eq "200") {
            Report "yolo /ready recovered: HTTP 200"
            break
        }
        Start-Sleep -Seconds 4
    }
}
else {
    Report "SKIP: yolo container not running"
}

Report ""
Report "--- PHASE 6: Persistence (uploads volume) ---"
if (docker ps -q -f "name=$be") {
    $ts = Get-Date -Format "yyyyMMddHHmmss"
    $marker = "compose-marker-$ts"
    Docker-Exec $be @("sh", "-c", "echo $marker > /app/Backend/static/uploads/compose_validation_marker.txt") | Out-Null
    $m1 = (Docker-Exec $be @("cat", "/app/Backend/static/uploads/compose_validation_marker.txt")).Trim()
    Report "marker before backend restart: $m1"
    docker restart agrismart-backend 2>&1 | ForEach-Object { Report $_ }
    Start-Sleep -Seconds 10
    $m2 = (Docker-Exec $be @("cat", "/app/Backend/static/uploads/compose_validation_marker.txt")).Trim()
    Report "marker after backend restart: $m2"
}
Report "Postgres persists in volume postgres_data."
Report "Chroma persists in bind mount ./Backend/chatbot/wheat_cotton_rice_db."
Report "Models persist in bind mount ./models."

Report ""
Report "--- PHASE 7: Hardening ---"
Report "Backend dependency probes use _http_get_with_retries (Backend/app.py)."

Report ""
Report "--- PHASE 8: Kubernetes ---"
Report "Do not deploy to Kubernetes until this script passes expected checks."
Report "Finished: $(Get-Date -Format o)"

$lines | Set-Content -Path $ReportPath -Encoding utf8
Write-Host ""
Write-Host "Report written: $ReportPath"
