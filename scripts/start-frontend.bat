@echo off
echo ========================================
echo PAC Frontend Server Startup
echo ========================================
echo.

REM Get the directory where this batch file is located
set SCRIPT_DIR=%~dp0..

REM Change to client directory
cd /d "%SCRIPT_DIR%\client"
echo Working directory: %CD%
echo.

echo Executing: npm start
echo.

REM Set the npm path as a variable to avoid quoting issues
set NPM_PATH=C:\Program Files\nodejs\npm.cmd

REM Execute npm start using direct path
call "C:\Program Files\nodejs\npm.cmd" start

echo.
echo Press any key to exit...
pause >nul
