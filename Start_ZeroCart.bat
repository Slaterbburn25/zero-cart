@echo off
echo ==============================================
echo       BOOTING ZEROCART AUTOPILOT
echo ==============================================

echo [1/2] Starting Backend Brain (Python / Math Engine)...
start "ZeroCart: Backend Server" cmd /k "cd backend && venv\Scripts\activate && uvicorn main:app --host 0.0.0.0 --reload"

echo [2/2] Starting Frontend UI (PWA / Mobile Interface)...
start "ZeroCart: Frontend Server" cmd /k "cd pwa-client && npm run dev"

echo.
echo Both servers are successfully launching!
echo Windows Defender might pop up asking to allow network features. Make sure you click "Allow" so your phone can reach your computer.
echo.
echo You can now close this launcher window.
pause
