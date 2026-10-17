# Makes the KrishiSetu backend start by itself, hidden, every time you log in to Windows,
# and starts it right now. Run once: double-click install-autostart.bat
# To undo: double-click remove-autostart.bat

$ErrorActionPreference = "Stop"
$taskName = "KrishiSetu Backend"
$service = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "backend-service.ps1"

$action = New-ScheduledTaskAction -Execute "powershell.exe" `
    -Argument "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$service`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit ([TimeSpan]::Zero) `
    -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
    -MultipleInstances IgnoreNew -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings `
    -Principal $principal -Description "Runs the KrishiSetu API and its ngrok link in the background." -Force | Out-Null

# Close a manually started copy (start-backend.bat) so the background one takes over cleanly
Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Start-ScheduledTask -TaskName $taskName
Write-Host ""
Write-Host "  Done. The KrishiSetu backend now starts automatically when you log in." -ForegroundColor Green
Write-Host "  It is starting in the background now (about 30-60 seconds)."
Write-Host "  Logs: backend\logs\service.log"
Write-Host ""
