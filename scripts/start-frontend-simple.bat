@echo off
echo ========================================
echo PAC Frontend Server Startup
echo ========================================
echo.

REM Get the directory where this batch file is located
set SCRIPT_DIR=%~dp0..

echo Changing to client directory...
cd /d "%SCRIPT_DIR%\client"
echo Current directory: %CD%
echo.

echo Starting frontend server...
echo.

REM Use PowerShell to run npm since it's a PowerShell script
powershell -ExecutionPolicy Bypass -Command "npm start; Read-Host 'Press Enter to close'"

echo.
echo Press any key to exit...
pause >nul
