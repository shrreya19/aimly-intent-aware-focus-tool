# Aimly — Intent-Driven Focus Engine

> **HCI Course Project**: A Forest-style focus application that replaces rigid domain blocklists with real-time semantic intent verification powered by sentence embeddings and cosine similarity.

---

## 1. System Architecture

Aimly consists of four integrated components:

```
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│     Chrome Extension (MV3)      │       │       React Web App (Vite)      │
│  - background.js (Tab Tracker)  │       │  - Plus Jakarta Sans + Tailwind │
│  - content.js (Shadow DOM Modal)│       │  - Recharts Weekly Charts       │
│  - popup (Quick Start & Ring)   │       │  - 12-Week Streak Heatmap       │
└────────────────┬────────────────┘       └────────────────┬────────────────┘
                 │                                         │
                 │   HTTP REST API (JWT Authenticated)     │
                 ▼                                         ▼
┌───────────────────────────────────────────────────────────────────────────┐
│                     Node.js Express Backend (Port 8000)                  │
│  - Auth & JWT issuing (bcrypt password hashes)                            │
│  - Multi-tier relevance pipeline (domain priors, sensitivity, feedback)   │
│  - Analytics computation (deep/light/drifted split, focus score, streaks) │
│  - Swagger API Documentation (/docs)                                      │
└────────────────────────┬──────────────────────────┬───────────────────────┘
                         │                          │
                         ▼                          ▼
      ┌─────────────────────────────┐    ┌─────────────────────────────┐
      │     FastAPI ML Service      │    │     Supabase PostgreSQL     │
      │         (Port 8001)         │    │  - users                    │
      │  - all-MiniLM-L6-v2 Model   │    │  - sessions                 │
      │  - 384-dim text embeddings  │    │  - page_visits              │
      │  - Cosine similarity scoring│    │  - feedback                 │
      └─────────────────────────────┘    │  - user_settings            │
                                         │  - reward_events            │
                                         └─────────────────────────────┘
```

> **Security & Privacy Guarantee**:
> The Chrome Extension and React Web App **never** communicate directly with Supabase and **never** see the Supabase service role key. Only the Express backend connects to Supabase.
> The Chrome Extension only observes active tabs during active focus sessions. Nothing is tracked outside a session.

---

## 2. Quick Start: One-Click Demo

### Windows
Double-click `run_demo.bat` in the project root:
```cmd
run_demo.bat
```

### macOS / Linux
Run the bash script:
```bash
chmod +x run_demo.sh
./run_demo.sh
```

The script will automatically:
1. Verify and install dependencies for Backend, ML Service, and Frontend.
2. Seed the database with 3 weeks of historical focus data for demo user `demo@aimly.app`.
3. Start the ML service on `http://127.0.0.1:8001`.
4. Start the Express API on `http://localhost:8000`.
5. Start the Vite React app on `http://localhost:5173`.

---

## 3. Manual Step-by-Step Setup

### Step 1: Database Setup (Supabase)
1. Log in to [Supabase](https://supabase.com) and create a new project.
2. Open the **SQL Editor** in the left sidebar.
3. Paste the contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.
4. Go to **Project Settings -> API** and copy:
   - **Project URL**
   - **Service Role Secret Key** (`service_role`, not `anon`)

### Step 2: Configure Environment Variables
In `backend/.env` (copied from `backend/.env.example`):
```env
PORT=8000
NODE_ENV=development
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_KEY=your-supabase-service-role-key
JWT_SECRET=aimly-super-secret-jwt-key-2026-development-change-in-production
ML_SERVICE_URL=http://127.0.0.1:8001
DEMO_MODE=true
```
*(Note: If `DEMO_MODE=true`, Aimly includes an automatic in-memory database fallback so you can demo offline or before entering credentials).*

### Step 3: Install & Start Services

#### 1. ML Service (Python FastAPI)
```bash
cd ml-service
pip install -r requirements.txt
python -u -m uvicorn main:app --host 127.0.0.1 --port 8001
```
*Health check: [http://127.0.0.1:8001/health](http://127.0.0.1:8001/health)*

#### 2. Backend (Node.js + Express)
```bash
cd backend
npm install
npm run seed     # Seeds demo@aimly.app with 3 weeks of focus history
npm run dev
```
*Swagger UI Docs: [http://localhost:8000/docs](http://localhost:8000/docs)*  
*Health Check: [http://localhost:8000/health](http://localhost:8000/health)*

#### 3. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
*Web App: [http://localhost:5173](http://localhost:5173)*

### Step 4: Load Chrome Extension
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Toggle on **Developer mode** in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select the `extension/` directory in this repository.
5. The Aimly icon will appear in your Chrome extension toolbar.

---

## 4. 6-Step Interactive Demo Script (For Course Viva)

Follow these 6 steps to demonstrate the end-to-end functionality to your professor:

### Step 1: Log In as the Demo User
1. Open [http://localhost:5173](http://localhost:5173) and click **Log In**.
2. Click the **"Use Demo Account (1-Click Login)"** button (or enter `demo@aimly.app` / `demo1234`).
3. You are redirected to the **Focus Dashboard**.

### Step 2: Showcase Analytics & Intent Insights
1. Point out the **Weekly Output Hero Number** (e.g., `4h 15m`).
2. Show the **Deep / Light / Drifted** segmented distribution bar.
3. Highlight the **7-Day Focus Minutes** bar chart built with Recharts.
4. Show the **Focus Insights** card: Peak focus window (`8:00 PM - 9:00 PM`), weekly trend (+24%), and top distractors (`youtube.com`).
5. Click **Streak & History** in the left sidebar to reveal the **12-Week Heatmap** (84 days) and unlocked milestone badges.

### Step 3: Start a Strict Session via Extension or Web App
1. Click the Aimly extension icon in your Chrome toolbar (or navigate to `/start` in the web app).
2. Enter the goal: `"Study Graph Traversal Algorithms in DSA"`.
3. Set duration to `25 min` and toggle **Strict Mode**.
4. Click **Start Focus Session**. The 180px orange countdown ring starts ticking.

### Step 4: Visit an On-Topic Academic Page (No Warning)
1. Open a new tab and visit:
   `https://www.geeksforgeeks.org/breadth-first-search-or-bfs-for-a-graph/`
2. Wait 8 seconds.
3. In the extension popup or active session web feed, notice the tab evaluates with a high relevance score (~`0.75 - 0.85`).
4. **Result**: Zero interruption. Academic exploration continues seamlessly.

### Step 5: Visit an Off-Topic Tab (Drift Overlay Triggers)
1. Open a new tab and visit a comedy or meme page (e.g. YouTube standup comedy):
   `https://www.youtube.com/watch?v=standup_comedy_highlights`
2. Wait 8 seconds.
3. **Result**: The page dims and blurs. Inside a secure Shadow DOM, the **Aimly Drift Overlay** appears:
   - Warning heading: *"You're drifting from your aim"*
   - Goal chip: *"Study Graph Traversal Algorithms in DSA"*
   - Match score: *"Relevance: 8%"*
   - Because **Strict Mode** is active: Escape is disabled and the only action is **"Close This Tab"**.
4. Click "Close This Tab" to eliminate the distraction.

### Step 6: Soft Mode, Feedback Personalization & Report
1. Open the extension popup or Settings to test **Soft Mode**.
2. Visit a borderline tab. The soft modal displays:
   - *"Continue with Goal"*
   - *"Discard Session"*
   - *"This page is relevant to my goal"* link.
3. Click *"This page is relevant"* -> Feedback is sent to the backend. After 3 relevant ratings, the domain is auto-added to your whitelist.
4. Click **End Session -> Mark Complete**.
5. Confetti explodes on screen, and you are directed to the **Session Report** showing:
   - Final Focus Score percentage
   - Longest uninterrupted on-goal stretch in minutes
   - Full chronological browsing timeline with relevance scores.

---

## 5. Scope & Viva Transparency: What is Built vs Future Work

| Feature Component | Status | Implementation Details |
| :--- | :---: | :--- |
| **Database Schema** | **DONE** | Complete Postgres schema with tables, UUID PKs, indexes, and cascades. |
| **Custom Auth** | **DONE** | Express-issued JWT with bcrypt hashing; no Supabase Auth dependency. |
| **ML Relevance Service** | **DONE** | FastAPI + `all-MiniLM-L6-v2` generating 384-dim embeddings & cosine similarity. |
| **Express API** | **DONE** | Zod input validation, rate limiting, Helmet, CORS, Swagger docs at `/docs`. |
| **Multi-Tier Relevance Pipeline**| **DONE** | Dwell timer, whitelist, ML scoring, academic domain priors, sensitivity, feedback loop. |
| **Fail-Safe Heuristics** | **DONE** | Keyword fallback ensures demo never crashes if ML service or Supabase is offline. |
| **React Web App** | **DONE** | 8 screens created from Stitch designs with Tailwind tokens and WCAG AA contrast. |
| **Chrome Extension (MV3)** | **DONE** | Service worker, tab tracking, shadow DOM overlay (Soft/Strict), 360x540px popup. |
| **Privacy & GDPR** | **DONE** | Session-only tracking, consent checkbox, `/me/export` JSON download, `/me/data` wipe. |
| **Demo Seeder** | **DONE** | 3 weeks of varied sessions, drift events, and 1-click `/demo/reset` endpoint. |
| **Focus Rewards & Streak Protection** | **DONE** | Points, lifetime tiers, multipliers, 600-pt daily cap, milestones, auto-consumed streak freezes, comeback bonus, and Earn-a-Break. |
| *Supabase RLS & Auth* | *PARTIAL / FUTURE* | Service role key securely isolates DB in Express; client RLS policies deferred. |
| *Secondary LLM Reranker* | *FUTURE* | Fast MiniLM handles 100% of checks; heavy LLMs (e.g. Gemini/GPT) planned for borderline scores. |
| *CI/CD & Automated Pipeline* | *FUTURE* | Local automated verification scripts implemented; GitHub Actions pipeline planned. |
| *Chrome Web Store Deployment*| *FUTURE* | Manifest V3 is fully compliant; store asset package and fee payment deferred. |

---

## 6. Key Features

### Focus Rewards & Streak Protection
Aimly includes a server-authoritative, opt-in rewards layer built directly into the Express backend, React dashboard, and Chrome MV3 extension:

- **Quality-Based Earning**: Completed sessions ≥ 10 minutes earn **2 points per on-topic minute** (paused time excluded), scaled by a **focus-quality multiplier** (≥90% → x1.5, 75–89% → x1.25) and a **streak multiplier** (3–6d → x1.1, 7–13d → x1.2, 14+d → x1.3; max combined x2.0), plus a **+20 deep-stretch bonus** for ≥20 uninterrupted on-goal minutes. Daily session earnings are capped at **600 points/day** (milestones and comeback bonuses are exempt). Points are **never deducted** for drifting.
- **Lifetime Tiers**: Spendable `points_balance` and permanent `lifetime_points` are tracked separately. Lifetime tiers progress through **Beginner (0)** → **Focused (500)** → **Deep Worker (1,500)** → **Flow Master (4,000)** → **Zen (9,000)**.
- **Streak Milestones**: Qualifying streak days (≥10 min AND ≥60% focus score) unlock one-time per-streak bonuses at **3 (+50)**, **7 (+150)**, **14 (+350)**, **30 (+800)**, **60 (+1,800)**, and **100 (+3,500)** days.
- **Streak Protection (Freezes & Comebacks)**: Users can purchase up to 2 single-use **Streak Freezes** (250 pts each). If a day is missed, one freeze is automatically and idempotently consumed on the next rollover/login check to bridge the gap. If no freeze is available, the streak resets gently to 0 without deducting points, and the next qualifying session awards a **+75 Comeback Bonus** (*"Welcome back! Fresh start."*). When an active streak ≥ 3 days has no session yet today, a non-blocking `streak_at_risk` nudge appears.
- **Earn-a-Break**: Spend **100 points** during an active session (max 2 per session) for a guilt-free **5-minute break**. Both the backend relevance engine and the Chrome extension (`chrome.alarms` + `chrome.storage.local`) pause drift evaluation while the session timer keeps running.
- **Opt-Out Switch**: Users can disable rewards at any time via **Settings → Show Rewards** (`rewards_enabled`) while keeping all core focus tracking, streaks, and heatmap analytics intact.

> **Design Rationale**:
> Rewards are calculated from **focus quality** (on-topic minutes and uninterrupted stretches) rather than raw elapsed time, and **never punish drifting** with point deductions. **Streak freezes** and **comeback bonuses** directly counter the behavioral *"what-the-hell" effect* after an accidental missed day so users resume their habit instead of giving up. Finally, a **600-point daily cap** paired with an **off switch** (`rewards_enabled`) reduces overjustification and prevents gaming or burnout.

---

## 7. Project Directory Map

```text
Aimly/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── rewards.config.js  # Centralized tunable parameters for rewards & streaks
│   │   │   ├── supabase.js        # Supabase client & in-memory demo fallback store
│   │   │   └── swagger.js         # OpenAPI / Swagger UI documentation (/docs)
│   │   ├── middleware/            # JWT auth, Zod validation schemas, error handler
│   │   ├── routes/                # auth, sessions, relevance, analytics, settings, rewards, demo
│   │   ├── services/              # dbService, relevance, analytics, rewards
│   │   ├── utils/dateUtils.js     # Local date & timezone-safe day-boundary helpers
│   │   ├── seed.js                # 3-week demo seeder (sessions, streaks, reward_events)
│   │   └── test_rewards.js        # Unit & integration tests for rewards & streak protection
├── frontend/
│   └── src/
│       ├── components/Layout.jsx  # Sidebar with Level & Points chip
│       ├── context/AuthContext.jsx# Auth, active session & rewards summary state
│       ├── pages/                 # Dashboard, StartSession, RunningSession, SessionReport, StreakHistory, Settings
│       └── services/api.js        # JWT API client with automatic local date/timezone headers
├── extension/                     # Chrome Manifest V3 extension (popup, background, content, overlay)
├── ml-service/                    # Python FastAPI microservice (all-MiniLM-L6-v2)
└── supabase/
    ├── schema.sql                 # Full PostgreSQL schema (users, user_settings, sessions, page_visits, feedback, reward_events)
    └── migrations/
        └── 20261118_rewards.sql   # Additive migration for Focus Rewards & Streak Protection
```

---

## 8. Known Bugs & Notes
1. **Chrome Extension Service Worker Inactivity**: Chrome MV3 service workers unload after 30 seconds of inactivity. Aimly persists active session data in `chrome.storage.local` to resume instantly when tabs change.
2. **First-Load PyTorch Initialization**: On systems loading `all-MiniLM-L6-v2` for the first time, PyTorch downloads ~80MB of weights from Hugging Face. The model is cached in memory for sub-25ms inference.
3. **Single Session Rule**: By design, users can only have one active or paused session at a time. Starting a second session returns `409 Conflict` until the existing session is completed or discarded.
