# ZEROCART: TECHNICAL PROJECT PLAN
**Status:** Active Development
**Developer:** Gemini AI Assistant
**Project Manager:** Non-Technical Founder
**Location Focus:** UK Market (Initial Target: Iceland Live)

## 🎯 SYSTEM CONTEXT & ARCHITECTURAL RULES
You are building "ZeroCart," an autonomous grocery supply-chain manager that functions as a hands-off, habit-based auto-restocking autopilot. The Project Manager DOES NOT CODE. You must write 100% of the code, provide exact terminal commands, and guide the deployment.

**STRICT ARCHITECTURAL RULES:**
1. **Split-Brain Cloud:** We use a Python/FastAPI backend. Gemini 2.5 Pro handles "Dietary DNA" extraction from raw HTML receipts and ideates the optimized cart.
2. **Edge Execution (The Moat):** To bypass Cloudflare, CAPTCHAs, and PSD2/3D Secure banking laws, execution happens locally via a Node.js/Playwright script on the user's machine, using their own IP and authenticated sessions.
3. **No Placeholders:** Never write `// add logic here` or `...rest of code`. Provide complete files.
4. **Step-by-Step:** You must NEVER jump ahead. Complete one task, provide a way to test it locally, and wait for the user to say "Next" before moving on.

---

## 🚀 DEVELOPMENT ROADMAP (PHASE-BY-PHASE)

### PHASE 1: Environment Setup & Central Architecture [COMPLETED]
**Objective:** Set up the Python backend, SQLite tracking, and Edge Scraper communication.
*   **Task 1.1:** Initialize Python virtual environment (`/backend`) and Node.js environment (`/edge-client`).
*   **Task 1.2:** Establish FastAPI server with endpoints for Edge Node communication.
*   **Task 1.3:** Configure Firebase Auth Local Emulator for multi-tenant isolation.

### PHASE 2: Native Taste Profiling (The Dietary DNA Extractor) [COMPLETED]
**Objective:** Exploit the Edge Node to autonomously scrape the user's historical purchase behavior to map their habits.
*   **Task 2.1:** Build a Playwright execution route that autonomously navigates the Iceland SPA (Single Page Application) using a Two-Phase URL Harvester.
*   **Task 2.2:** Vacuum the raw HTML receipts of past orders.
*   **Task 2.3:** Pipe the scraped item data directly into a Gemini context to output a permanent `taste_profile` JSON outlining Core Staples and Brand Loyalties.

### PHASE 3: The Interface (Progressive Web App - PWA) [COMPLETED]
**Objective:** Build the consumer-facing Dashboard Hub for controlling the agent.
*   **Task 3.1:** Scaffold a Vite + React web application.
*   **Task 3.2:** Build the Onboarding Workflow for training the agent (extracting the DNA).
*   **Task 3.3:** Design the "Profile Hub" featuring a friendly "Soft Light Mode" aesthetic (Pastel colors, Nunito font) to display the extracted Dietary DNA.
*   **Task 3.4:** Implement the "Build My Cart" execution trigger.

### PHASE 4: The Autonomous Cart Builder (Agentic Shopping) [ACTIVE]
**Objective:** Use the Dietary DNA to actively build a shopping list and execute the purchase.
*   **Task 4.1:** **(Next Objective)** Integrate the Cart Builder endpoint (`/api/v1/build_cart`) to take the extracted `taste_profile` staples and command the Edge Scraper to search the Iceland live site for live pricing.
*   **Task 4.2:** Parse the scraped pricing telemetry.
*   **Task 4.3:** **The Trolley Handoff:** Once injection completes, cleanly drop the user at the `/trolley` page and completely terminate automation. We explicitly do NOT automate checkout/delivery-slots to preserve human calendar preference and banking security.

### PHASE 5: The Revenue Engine (Stripe Integration)
**Objective:** Construct a frictionless SaaS monetization wall via Stripe Webhooks.
*   **Task 5.1:** Lock the autonomous restock agent behind authorization.
*   **Task 5.2:** Integrate a Stripe Payment Gateway offering a scalable £14.99/mo subscription.

### PHASE 6: Cloud Deployment & Hardening
**Objective:** Move the central brain to Google Cloud Platform.
*   **Task 6.1:** Containerize the FastAPI backend via Docker.
*   **Task 6.2:** Provide the exact `gcloud` terminal commands to deploy the backend securely to Google Cloud Run, and set up the live Cloud SQL instance.

### PHASE 7: Out-of-Stock (OOS) Mitigation Loop
**Objective:** Automatically repair the mathematical execution payload if physical grocery stock fails during delivery.
*   **Task 7.1:** Construct an asynchronous receipt parser. Upon final delivery confirmation, iterate the delivered items against the target list.
*   **Task 7.2:** If an item is missing, instantly trigger Gemini to recalculate substitutions utilizing the closest alternative brand identified in the user's Dietary DNA.

### PHASE 8: The B2B Telemetry Engine 
**Objective:** Scale FMCG data pipelines to unlock enterprise monetization. 
*   **Task 8.1:** Develop a `decay_telemetry.py` heartbeat that aggregates the delta between "purchase date" and "consumption date" natively out of the tracking database.
*   **Task 8.2:** Forward anonymized household metrics to a secondary BigQuery Data Warehouse for enterprise FMCG reporting.

### PHASE 9: Algorithmic Shelf Space Integration
**Objective:** Replace Supermarket Ad Revenue with the ZeroCart Digital End-Cap.
*   **Task 9.1:** Modify the cart-building logic to ingest dynamic "Brand Subsidies." If Heinz offers £0.50 cash back to replace the generic beans, calculate if the user's hard budget survives the swap.
*   **Task 9.2:** If math holds, natively manipulate the final payload to target the Heinz SKU.

### PHASE 10: Seamless Chrome Extension Native Deployment
**Objective:** Move the execution "Hands" out of the terminal and into the browser naturally for mass consumer installation.
*   **Task 10.1:** Port the Edge Scraper logic into an explicit `manifest.json` Chrome Extension infrastructure.
*   **Task 10.2:** Remove all dependencies on `Node` and `Playwright`, relying fundamentally on the user's native signed-in cookie session for frictionless setup.