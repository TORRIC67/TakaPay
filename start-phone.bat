@echo off
cd /d "%~dp0"
echo Natafuta IP ya PC na kuweka mipangilio...
"backend\.venv\Scripts\python.exe" phone_mode.py
if errorlevel 1 (
  echo.
  echo Kuna tatizo. Soma ujumbe hapo juu.
  pause
  exit /b 1
)
start "Smart Taka - Backend (simu)" cmd /k "cd /d %~dp0backend && call .venv\Scripts\activate && uvicorn app.main:app --reload --host 0.0.0.0"
start "Smart Taka - Frontend (simu)" cmd /k "cd /d %~dp0frontend && npm run dev -- --host"
