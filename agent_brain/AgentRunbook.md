# ZeroCart System Runbook

## Booting the Local Development Environment

ZeroCart is a highly distributed system that requires five independent processes to function simultaneously:
1. **Firebase Auth Emulator** (Local Authentication)
2. **FastAPI Backend** (Python Brain API)
3. **BigQuery Worker** (Python Supply Chain Director)
4. **React PWA Frontend** (Vite Dev Server)
5. **Edge Scraper** (Playwright Node.js Agent)

**CRITICAL INSTRUCTION FOR FUTURE AGENTS:**
**Do NOT** attempt to manually start these servers using raw terminal commands (e.g., `npm run dev` or `uvicorn main:app`) within your background shell. Doing so will tie up your execution thread, lead to orphaned processes, and cause severe `EADDRINUSE` port conflicts if the processes detach improperly.

Instead, you must **always** rely on the centralized Windows batch script located in the root directory:

```powershell
Start-Process "c:\Users\SSlat\Desktop\Zero Cart\Start_ZeroCart.bat"
```

Executing this script will cleanly spawn five detached, interactive command prompt windows directly on the user's desktop. This guarantees the servers boot reliably, provides the user with visible logs, and prevents your agent shell from hanging.

## Troubleshooting & Port Conflicts
If the system crashes, fails to connect, or throws `EADDRINUSE` errors, the cleanest recovery method is:
1. Instruct the user to physically click the 'X' to close all black terminal windows on their Windows desktop.
2. Instruct the user to double-click the `Start_ZeroCart.bat` file to spawn a fresh instance of all five servers.

Do not attempt complex PowerShell `Stop-Process` array scripts unless absolutely necessary, as killing Node.js aggressively can inadvertently take down the user's frontend.

## Testing the Pipeline
Once booted, the user interacts with the app at `http://localhost:5173`. 
The pipeline is entirely UI-driven. The agent (Edge Scraper) does not autonomously execute upon boot; it only executes when the user explicitly clicks "Deploy Agent" or "Build My Cart" within the React frontend.
