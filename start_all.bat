@echo off
echo ===================================================
echo   CrowdSafe AI - Intelligent Crowd Management System
echo   Final Year Project & SIH Innovation Edition
echo ===================================================
echo.
echo Starting Backend (FastAPI on http://localhost:8000)...
start "CrowdSafe AI - Backend Server" cmd /k "cd backend && uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 2 /nobreak >nul

echo Starting Frontend (React + Vite on http://localhost:5173)...
start "CrowdSafe AI - Frontend UI" cmd /k "cd frontend && npm run dev"

echo.
echo ===================================================
echo   CrowdSafe AI is running:
echo   - Frontend: http://localhost:5173
echo   - Backend:  http://localhost:8000
echo   - Swagger:  http://localhost:8000/docs
echo ===================================================
pause
