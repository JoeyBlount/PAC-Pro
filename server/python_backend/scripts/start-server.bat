@echo off
echo ========================================
echo PAC Backend Server Startup
echo ========================================
echo.

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0..
set PROJECT_ROOT=%SCRIPT_DIR%\..\..

REM Change to backend directory
cd /d "%SCRIPT_DIR%"
echo Working directory: %CD%
echo.

REM Set PROJECT_ROOT environment variable
echo PROJECT_ROOT: %PROJECT_ROOT%
echo.

echo Starting Python backend server...
echo.

REM Start the backend server
python main.py

echo.
echo Press any key to exit...
pause >nul
