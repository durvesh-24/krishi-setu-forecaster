# Starts the KrishiSetu API on this laptop and makes it public through ngrok,
# so the website on Vercel can use it.
#
# Needs (one time):  Python 3.11 with backend\requirements.txt installed,
#                    ngrok installed and logged in (ngrok config add-authtoken ...),
#                    NGROK_DOMAIN=your-name.ngrok-free.app in the .env file.
#
# Run: double-click start-backend.bat (or: powershell -ExecutionPolicy Bypass -File start-backend.ps1)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$port = 8000

function Read-EnvValue($name) {
    $envFile = Join-Path $root ".env"
    if (-not (Test-Path $envFile)) { return $null }
    foreach ($line in Get-Content $envFile) {
        if ($line -match "^\s*$name\s*=\s*""?([^""#\s]+)") { return $Matches[1] }
    }
    return $null
}

Write-Host ""
Write-Host "  KrishiSetu backend" -ForegroundColor Green
Write-Host "  ------------------"

# 1. Check the tools are there
$python = "py"
$hasPython = $false
try { & py -3.11 -c "import fastapi, xgboost" 2>$null; $hasPython = ($LASTEXITCODE -eq 0) } catch {}
if (-not $hasPython) {
    Write-Host "  Python 3.11 with the backend packages was not found. Run once:" -ForegroundColor Red
    Write-Host "    py -3.11 -m pip install -r backend\requirements.txt"
    Read-Host "  Press Enter to close"; exit 1
}
$ngrok = (Get-Command ngrok -ErrorAction SilentlyContinue).Source
if (-not $ngrok) {
    # winget sometimes installs ngrok without adding it to PATH
    $ngrok = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Ngrok.Ngrok*\ngrok.exe" -ErrorAction SilentlyContinue |
        Select-Object -First 1 -ExpandProperty FullName
}
if (-not $ngrok) {
    Write-Host "  ngrok is not installed. Install it with:  winget install ngrok.ngrok" -ForegroundColor Red
    Read-Host "  Press Enter to close"; exit 1
}
$domain = Read-EnvValue "NGROK_DOMAIN"
if (-not $domain) {
    Write-Host "  Add your free ngrok domain to .env, e.g.  NGROK_DOMAIN=your-name.ngrok-free.app" -ForegroundColor Red
    Read-Host "  Press Enter to close"; exit 1
}
$domain = $domain -replace "^https?://", "" -replace "/$", ""

# Already running in the background (install-autostart.bat)? Then there is nothing to do.
try {
    $tunnels = Invoke-RestMethod "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 3
    if ($tunnels.tunnels | Where-Object { $_.public_url -like "*$domain*" }) {
        Write-Host "  The backend is already running in the background:" -ForegroundColor Green
        Write-Host "  https://$domain"
        Read-Host "  Press Enter to close"; exit 0
    }
} catch {}

# 2. Start the API (its own window, so you can see the log)
$apiRunning = $false
try { Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$port/" -TimeoutSec 2 | Out-Null; $apiRunning = $true } catch {}
if ($apiRunning) {
    Write-Host "  API is already running on port $port."
} else {
    Write-Host "  Starting the API (first start takes about 30 seconds)..."
    Start-Process -FilePath $python -ArgumentList "-3.11", "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "$port" `
        -WorkingDirectory $backend -WindowStyle Minimized
    $ready = $false
    for ($i = 0; $i -lt 90 -and -not $ready; $i++) {
        Start-Sleep -Seconds 2
        try { Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$port/" -TimeoutSec 2 | Out-Null; $ready = $true } catch {}
    }
    if (-not $ready) {
        Write-Host "  The API did not start. Run this to see the error:" -ForegroundColor Red
        Write-Host "    cd backend; py -3.11 -m uvicorn main:app --port $port"
        Read-Host "  Press Enter to close"; exit 1
    }
    Write-Host "  API is running." -ForegroundColor Green
}

# 3. Make it public on your fixed ngrok link (keeps running in this window)
Write-Host ""
Write-Host "  Public API link:  https://$domain" -ForegroundColor Cyan
Write-Host "  (Vercel's VITE_BACKEND must be exactly this link.)"
Write-Host "  Keep this window open while the website is in use. Close it to stop."
Write-Host ""
& $ngrok http $port --url "https://$domain"
