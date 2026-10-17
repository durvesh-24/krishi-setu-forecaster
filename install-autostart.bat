@echo off
rem Double-click once: the KrishiSetu backend will then start by itself at every Windows log-in.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-autostart.ps1"
pause
