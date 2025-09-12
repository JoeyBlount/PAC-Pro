@echo off
echo ========================================
echo PAC Backend Setup - Windows
echo ========================================
echo.

REM Get the directory where this script is located
set SCRIPT_DIR=%~dp0..

REM Change to backend directory
cd /d "%SCRIPT_DIR%"
echo Working directory: %CD%
echo.

echo Installing Python dependencies...
echo.

REM Install cross-platform requirements
C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python312-arm64\python.exe -m pip install -r requirements-cross-platform.txt

echo.
echo Setup complete!
echo.
echo To start the server, run:
echo   scripts\start-server.bat
echo.
echo Press any key to exit...
pause >nul
