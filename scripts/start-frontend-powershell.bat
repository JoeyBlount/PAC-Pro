@echo off
echo ========================================
echo PAC Frontend Server (PowerShell)
echo ========================================
echo.

REM Get the directory where this batch file is located
set SCRIPT_DIR=%~dp0..

echo Starting frontend using PowerShell...
echo.

REM Use PowerShell to execute npm start with direct path
powershell -ExecutionPolicy Bypass -Command "Set-Location '%SCRIPT_DIR%\client'; 'C:\Program Files\nodejs\npm.cmd' start; pause"

echo.
echo Press any key to exit...
pause >nul
