@echo off
setlocal
if not defined GTS_BRIDGE_ROOT set "GTS_BRIDGE_ROOT=%~dp0..\..\..\..\Lesson Bridge"
node "%GTS_BRIDGE_ROOT%\tools\qualify-alphatab.cjs" "%~1" "%~dp0..\.." %2
exit /b %errorlevel%
