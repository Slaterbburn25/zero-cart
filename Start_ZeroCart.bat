@echo off
echo ==============================================
echo       BOOTING ZEROCART AUTOPILOT
echo ==============================================

echo [1/4] Starting Local Firebase Auth Emulator...
start "ZeroCart: Firebase Emulator" cmd /k "firebase emulators:start --only auth --project zerocart-beta"

echo [2/4] Starting Backend Brain (Python / Math Engine)...
start "ZeroCart: Backend Server" cmd /k "cd backend && call venv\Scripts\activate.bat && uvicorn main:app --host 0.0.0.0 --reload"

echo [3/5] Starting BigQuery Distributed Worker...
start "ZeroCart: Autonomous Worker" cmd /k "cd backend && call venv\Scripts\activate.bat && python -m logic.supply_chain_director"

echo [4/5] Starting Frontend UI (PWA / Mobile Interface)...
start "ZeroCart: Frontend Server" cmd /k "cd pwa-client && npm run dev"

echo [5/5] Starting Edge Scraper Node (Playwright Agent)...
start "ZeroCart: Edge Scraper" cmd /k "cd edge-client && npm start"

echo.
echo ALL FOUR servers are successfully launching!
echo Windows Defender might pop up asking to allow network features. Make sure you click "Allow" so your phone can reach your computer.
echo.
echo You can now close this launcher window.
pause
