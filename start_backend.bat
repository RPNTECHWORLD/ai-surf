@echo off
title AI Surf Local Backends (FastAPI :8000 + AquaticX :5000)
echo ========================================================
echo   Starting Local AquaticX Heats Backend on port 5000...
echo ========================================================
start "AquaticX Heats Backend (Port 5000)" cmd /k "cd /d %~dp0aquaticxsportssoftware\backend && node server.js"

echo ========================================================
echo   Starting AI Surf Local Backend on port 8000...
echo ========================================================
cd /d "%~dp0backend"
venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload
pause
