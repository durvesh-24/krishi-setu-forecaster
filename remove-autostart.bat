@echo off
rem Double-click to stop the background KrishiSetu backend and remove it from start-up.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scriptsemove-autostart.ps1"
pause
