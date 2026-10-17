# Stops the background KrishiSetu backend and removes it from Windows log-on.

$taskName = "KrishiSetu Backend"
Stop-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

# Stop the service loop, the API and ngrok
Get-CimInstance Win32_Process -Filter "Name='powershell.exe'" |
    Where-Object { $_.CommandLine -like "*backend-service.ps1*" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
$api = (Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1).OwningProcess
if ($api) { Stop-Process -Id $api -Force -ErrorAction SilentlyContinue }
Get-Process ngrok -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "  KrishiSetu backend stopped and removed from start-up." -ForegroundColor Yellow
Write-Host "  (You can still start it by hand with start-backend.bat.)"
Write-Host ""
