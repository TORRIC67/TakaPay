@echo off
start "Taka Pay - Backend" cmd /k "cd /d %~dp0backend && call .venv\Scripts\activate && uvicorn app.main:app --reload"
start "Taka Pay - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
