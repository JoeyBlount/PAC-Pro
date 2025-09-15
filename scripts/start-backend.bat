@echo off
echo ========================================
echo PAC Backend Server Startup
echo ========================================
echo.

REM Get the directory where this batch file is located
set SCRIPT_DIR=%~dp0..

REM Change to backend directory
cd /d "%SCRIPT_DIR%\server\python_backend"
echo Working directory: %CD%
echo.

REM Set PROJECT_ROOT environment variable
set PROJECT_ROOT=%SCRIPT_DIR%
echo PROJECT_ROOT: %PROJECT_ROOT%
echo.

echo Starting Python backend server...
echo.

REM Start the backend server
C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python312-arm64\python.exe main.py

echo.
echo Press any key to exit...
pause >nul
