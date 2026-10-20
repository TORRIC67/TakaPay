@echo off
cd /d "%~dp0"
"backend\.venv\Scripts\python.exe" phone_mode.py --local
echo.
echo Imerudi kwenye hali ya kawaida. Sasa tumia start.bat
pause
