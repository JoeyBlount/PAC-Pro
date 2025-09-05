@echo off
echo Starting Python FastAPI Backend...
echo.

cd /d "%~dp0python_backend"

if not exist "main.py" (
    echo Error: main.py not found in python_backend directory
    echo Make sure you're running this from the server directory
    pause
    exit /b 1
)

echo Starting server from: %CD%
echo Server will be available at: http://localhost:5140
echo API Documentation: http://localhost:5140/docs
echo Health Check: http://localhost:5140/api/pac/health
echo.
echo Press Ctrl+C to stop the server
echo.

python -m uvicorn main:app --host 127.0.0.1 --port 5140 --reload

pause
