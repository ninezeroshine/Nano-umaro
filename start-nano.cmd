@echo off
setlocal ENABLEDELAYEDEXPANSION
cd /d "%~dp0"

echo === Nano Generator: startup ===

REM Backend
pushd backend
if not exist "node_modules" (
  echo Installing backend dependencies...
  call npm install
)
echo Starting backend on port 3000...
start "Nano Backend" cmd /k "npm run dev"
popd

REM Frontend
pushd frontend
if not exist "node_modules" (
  echo Installing frontend dependencies...
  call npm install
)
echo Starting frontend (Vite) on http://127.0.0.1:5173 ...
start "Nano Frontend" cmd /k "npm run dev"
popd

REM Give servers a moment and open browser
timeout /t 2 >nul
start "" http://127.0.0.1:5173

echo Done. Two windows should be running: Backend and Frontend.
exit /b 0


