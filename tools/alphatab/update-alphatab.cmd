@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0update-alphatab.ps1" %*
set "updateResult=%errorlevel%"
echo.
pause
exit /b %updateResult%
