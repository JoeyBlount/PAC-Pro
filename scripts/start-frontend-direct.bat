@echo off
echo ========================================
echo PAC Frontend Server Startup (Direct)
echo ========================================
echo.

REM Get the directory where this batch file is located
set SCRIPT_DIR=%~dp0..

echo Changing to client directory...
cd /d "%SCRIPT_DIR%\client"
echo Current directory: %CD%
echo.

echo Starting frontend server with direct npm path...
echo.

REM Try PATH approach
set PATH=%PATH%;C:\Program Files\nodejs
npm start

echo.
echo Press any key to exit...
pause >nul
