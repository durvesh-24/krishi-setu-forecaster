# Keeps the KrishiSetu API and its public ngrok link running in the background.
# Started hidden at Windows log-on by the "KrishiSetu Backend" scheduled task
# (see install-autostart.ps1). Checks every 30 seconds and restarts whatever stopped.
# Logs: backend\logs\

$ErrorActionPreference = "Continue"
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$backend = Join-Path $root "backend"
$logs = Join-Path $backend "logs"
$port = 8000
New-Item -ItemType Directory -Force -Path $logs | Out-Null

# Only one copy may run at a time
$mutex = New-Object System.Threading.Mutex($false, "Global\KrishiSetuBackendService")
if (-not $mutex.WaitOne(0)) { exit 0 }

function Log($msg) {
    $file = Join-Path $logs "service.log"
    if ((Test-Path $file) -and (Get-Item $file).Length -gt 5MB) { Move-Item $file "$file.old" -Force }
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $msg" | Out-File -Append -Encoding utf8 $file
}

function Read-EnvValue($name) {
    $envFile = Join-Path $root ".env"
    if (-not (Test-Path $envFile)) { return $null }
    foreach ($line in Get-Content $envFile) {
        if ($line -match "^\s*$name\s*=\s*""?([^""#\s]+)") { return $Matches[1] }
    }
    return $null
}

function Find-Ngrok {
    $cmd = (Get-Command ngrok -ErrorAction SilentlyContinue).Source
    if ($cmd) { return $cmd }
    return Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Ngrok.Ngrok*\ngrok.exe" -ErrorAction SilentlyContinue |
        Select-Object -First 1 -ExpandProperty FullName
}

function Test-Api {
    try { Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$port/" -TimeoutSec 5 | Out-Null; return $true } catch { return $false }
}

function Test-Tunnel($domain) {
    # the ngrok agent reports its tunnels on http://127.0.0.1:4040
    try {
        $t = Invoke-RestMethod "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 5
        return [bool]($t.tunnels | Where-Object { $_.public_url -like "*$domain*" })
    } catch { return $false }
}

function Rotate($name) {
    $f = Join-Path $logs $name
    if ((Test-Path $f) -and (Get-Item $f).Length -gt 10MB) { Move-Item $f "$f.old" -Force }
    return $f
}

Log "service started"
$apiProc = $null
$ngrokProc = $null
$warned = $false

while ($true) {
    $domain = (Read-EnvValue "NGROK_DOMAIN") -replace "^https?://", "" -replace "/$", ""
    $ngrok = Find-Ngrok

    if (-not (Test-Api)) {
        if ($apiProc -and -not $apiProc.HasExited) { Stop-Process -Id $apiProc.Id -Force -ErrorAction SilentlyContinue }
        Log "starting API"
        $apiProc = Start-Process -FilePath "py" -ArgumentList "-3.11", "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "$port" `
            -WorkingDirectory $backend -WindowStyle Hidden -PassThru `
            -RedirectStandardOutput (Rotate "api.log") -RedirectStandardError (Rotate "api-error.log")
        for ($i = 0; $i -lt 60 -and -not (Test-Api); $i++) { Start-Sleep -Seconds 2 }
        if (Test-Api) { Log "API is up" } else { Log "API did not start - see api-error.log" }
    }

    if ($domain -and $ngrok -and (Test-Api) -and -not (Test-Tunnel $domain)) {
        if ($ngrokProc -and -not $ngrokProc.HasExited) { Stop-Process -Id $ngrokProc.Id -Force -ErrorAction SilentlyContinue }
        Log "starting ngrok for https://$domain"
        $ngrokProc = Start-Process -FilePath $ngrok -ArgumentList "http", "$port", "--url", "https://$domain", "--log", "stdout" `
            -WindowStyle Hidden -PassThru -RedirectStandardOutput (Rotate "ngrok.log") -RedirectStandardError (Rotate "ngrok-error.log")
        Start-Sleep -Seconds 10
        if (Test-Tunnel $domain) { Log "public link is online: https://$domain" } else { Log "ngrok not online yet (no internet?) - retrying" }
    }
    elseif ((-not $domain -or -not $ngrok) -and -not $warned) {
        Log "NGROK_DOMAIN missing in .env or ngrok not installed - only the local API is running"
        $warned = $true
    }

    Start-Sleep -Seconds 30
}
