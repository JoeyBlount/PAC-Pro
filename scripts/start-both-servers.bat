@echo off
echo ========================================
echo PAC Full Stack Application Startup
echo ========================================
echo.

REM Get the directory where this batch file is located
set SCRIPT_DIR=%~dp0..

echo Starting Backend Server...
echo.

REM Start backend in a new window
start "PAC Backend" cmd /k "cd /d %SCRIPT_DIR%\server\python_backend && set PROJECT_ROOT=%SCRIPT_DIR% && C:\Users\%USERNAME%\AppData\Local\Programs\Python\Python312-arm64\python.exe main.py"

echo Waiting 5 seconds for backend to start...
timeout /t 5 /nobreak >nul

echo Starting Frontend Server...
echo.

REM Start frontend using PATH approach
start "PAC Frontend" cmd /k "cd /d %SCRIPT_DIR%\client && set PATH=%PATH%;C:\Program Files\nodejs && npm start"

echo.
echo ========================================
echo Both servers are starting in new windows
echo ========================================
echo.
echo Backend: http://localhost:5140
echo Frontend: http://localhost:3000
echo.
echo Press any key to close this window...
pause >nul
