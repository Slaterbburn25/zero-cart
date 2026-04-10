# ZeroCart: Execution Changelog

All code changes and development progress will be tracked here.

## 2026-04-10: Agent Calibration & Link Hardening (AAA Polish)

### Added
- **Persona Expansion**: Upgraded the `User` SQLite schema securely via new `ALTER TABLE` migrations to track deeper psychological dimensions: `primary_goal`, `preferred_meats`, and `hated_foods`.
- **UI Calibration Dashboard**: Expanded `App.jsx` React state to surface beautiful dropdowns and text inputs for setting specific persona rules (e.g. tracking "Vegan Explorer" or checking "I don't care" dynamically).
- **Deep Clean**: Permanently wiped old iteration files (`migrate.py`, `test_ideation2.py`, `test_solver.py`, etc.) ensuring terminal and filesystem purity.

### Changed
- **Scraper Link Safeguard**: Updated `llm_scraper.py` System Instructions. The grounder is absolutely forbidden from hallucinative specific structural SKUs. If it cannot extract a perfect structural URL natively, it generates exact `search?query=...` strings to guarantee perfectly working user landing pages.
- **Project Architectural Alignment**: Updated `ProjectPlan.md` and `Changelog.md` to reflect the newly reversed structural reality of ZeroCart (Ideation BEFORE Math execution).

## 2026-04-10: Architecture Reverse (Ideation-First Pipeline)

### Added
- **Agentic Ideation System (`llm_ideation.py`)**: Rebuilt the recipe generator to execute *before* ANY grocery API access and before ANY OR-Tools logic. Gemini dynamically dreams up abstract culinary protocols explicitly chained to User Persona rules, extracting required grocery targets as generic query strings.
- **State Array Control (`App.jsx`)**: Added the new reactive state hooks (`ideating` -> `review_meals` -> `building_cart` -> `review_cart`) so the User can authorize the AI's recipe choices *before* forcing the math execution pipeline.

### Changed
- **Scraper Target Arrays (`llm_scraper.py`)**: Deleted all hardcoded constants like `"Pork Shoulder"`. Re-wired the Scraper to ingest dynamic search payloads from the Ideator toolset, allowing limitless dietary scaling.
- **API Router Destructuring (`main.py`)**: Split generation execution over `/api/v1/ideate`, `/api/v1/build_cart`, and `/api/v1/ideate_single_meal` arrays to accommodate the broken-up workflow logic.
- **Meal Substitution Array**: `App.jsx` now securely replaces the correct single index of the AI recipes and dynamically appends the newly identified ingredients into the pipeline scope.

## 2026-04-09: Phase 1 Environment Setup & Core Logic

### Added
- **Project Structure**: Created `backend/` and `edge-client/` directories.
- **Python Environment**: Initialized a local `venv` inside the `backend` folder and installed dependencies via `requirements.txt` (FastAPI, uvicorn, SQLAlchemy, OR-Tools, google-genai, Pydantic).
- **Database Architecture** (`backend/models.py`):
    - Configured a local SQLite database (`zerocart.db`) to enable smooth local development.
    - Defined `User` schema (budget, dietary constraints).
    - Defined `VirtualFridge` schema (inventory items, quantities, expiration logic).
    - Defined `LocalDeals` schema (scraped grocery products mapping protein, calories, and cost).
- **Core API Server** (`backend/main.py`):
    - Initialized the FastAPI application.
    - Added Pydantic schemas (`FridgeItemCreate`, `FridgeItemResponse`) for strict data validation.
    - Created CRUD endpoints for the "Virtual Fridge" (`GET /api/v1/fridge/{user_id}`, `POST /api/v1/fridge/add`, `DELETE /api/v1/fridge/remove/{item_id}`).
- **Data Injection** (`backend/seed_db.py`):
    - Wrote a mock injection script that dumps 30 realistic UK grocery products (Tesco Blackburn local pricing, calories, and protein grams) into the SQL database to act as the sandbox environment for the OR-Tools math logic.

## 2026-04-09: Phase 2 Google OR-Tools Math Engine
### Added
- **Constraint Solver Logic** (`backend/logic/constraint_solver.py`):
    - Implemented `pywraplp.Solver` explicitly configured to evaluate constraints: (A) budget limit, (B) minimum protein rules, and (C) Virtual Fridge exclusions.
    - Designed the mathematical objective to maximize caloric value out of the allocated budget.
- **API Extension** (`backend/main.py`):
    - Added the `POST /api/v1/optimize_basket?user_id=1` operational route linking our local DB directly to the math engine.

## 2026-04-09: Phase 3 Gemini Orchestrator (Right Brain)
### Added
- **LLM Recipe Engine** (`backend/logic/llm_chef.py`):
    - Integrated `google-genai` SDK using `gemini-1.5-pro`.
    - Enforced strict Structured Outputs mapping to a Pydantic `WeeklyPlan` schema.
    - Set explicit prompt protections preventing Gemini from hallucinating ingredients outside the math basket.
- **System Config**:
    - Installed `python-dotenv` and generated `.env` for the `GEMINI_API_KEY`.
- **API Extension** (`backend/main.py`):
    - Wrote the `POST /api/v1/generate_plan` endpoint. This acts as the bridge—capturing the mathematical basket instantly sending it via API to Google, and delivering the finished Meal Plan JSON to the client.

## 2026-04-09: Phase 4 Edge Execution (The Hands)
### Added
- **Node.js Environment** (`edge-client/`):
    - Initialized NPM and installed the `playwright` browser automation framework.
- **The Symbiote Bot** (`edge-client/cart_injector.js`):
    - Engineered a local Node script to bypass supermarket anti-bot defenses by commandeering the user’s natively installed Google Chrome (`channel: 'chrome'`) and hijacking their exact `User Data` profile to maintain logged-in cookie sessions.
    - Script dynamically requests the optimized £90 basket from the Python local backend, iterates through the SKUs, and executes timed DOM manipulations (to mimic human click velocities).
    - **Payment Handoff:** Added strict logic ensuring the bot terminates execution at the checkout portal, safely passing the final 3D Secure / FaceID authorization purely to the human user.

## 2026-04-09: Phase 5 The Interface (WhatsApp Integration)
### Added
- **System Config**:
    - Installed `twilio` Python SDK into the backend environment.
- **Conversational Router** (`backend/logic/whatsapp_bot.py`):
    - Created the core WhatsApp logic router. It parses text strings (e.g., "Build my cart") and triggers Phase 2 Math Engine execution.
    - Features a rudimentary in-memory state engine (`user_states["phone_number"] = "WAITING_FOR_YES"`) to facilitate human-in-the-loop conversational authorization before executing the edge-agent.
    - Uses `subprocess.Popen` to asynchronously launch the external Node.js logic (`cart_injector.js`) the moment the user replies "YES".
- **API Extension** (`backend/main.py`):
    - Added the `POST /api/v1/whatsapp_webhook` endpoint to catch Twilio POST payloads.

## 2026-04-10: Phase 5 Pivot (PWA Integration & Store Selection)
### Removed
- **Twilio / WhatsApp Logic**: 
    - Uninstalled `twilio` SDK.
    - Deleted `backend/logic/whatsapp_bot.py` and `backend/local_chat.py`. All conversational loops were removed to pivot to a Progressive Web App (PWA).
    - Removed `POST /api/v1/whatsapp_webhook` from FastAPI routes.

### Added
- **Progressive Web App** (`pwa-client/`):
    - Scaffolded a modern Vite + React frontend application configured with `vite-plugin-pwa` for native installation and service worker offline support.
    - Implemented a clean, pastel, grounded aesthetic with responsive Card and Carousel UI components using vanilla CSS.
    - Integrated browser-native HTML5 Push Notifications to trigger alerts when the Math engine builds carts.
    - Added UI handling the retrieval and structured display of Gemini 7-Day Meal Plans (`WeeklyPlan` JSON Schema) natively in the app.
- **Backend Refactor**:
    - **CORS Support**: Implemented FastApi `CORSMiddleware` to allow local PWA communication.
    - **Store Selection Filtering**: Added ASDA dummy data to `seed_db.py`. Modified `constraint_solver.py` and endpoints to dynamically filter `LocalDeals` based on a requested `store_name` (e.g. "Tesco Blackburn" vs "ASDA Blackburn").
    - **End-to-End Triggers**: Built `POST /api/v1/cart/approve` API that successfully triggers the local Edge Agent subprocess (`cart_injector.js`) via standard web payload rather than SMS response.
