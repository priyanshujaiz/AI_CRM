# AI CSV Lead Importer

> Built by: Priyanshu Ranjan

An AI-powered CSV ingestion platform that accepts **any CSV format** — Facebook Ads exports, Google Ads reports, real-estate CRM dumps, manual spreadsheets — and intelligently maps arbitrary column names into the unified GrowEasy CRM schema using OpenAI GPT-4o-mini with structured JSON output.

---

## 🌐 Live Demo

| Service | URL |
|---------|-----|
| **Frontend** | `https://ai-crm-eta-ten.vercel.app/` |
| **Backend API** | `https://ai-crm-id9w.onrender.com`  |
| **Health Check** | `https://ai-crm-id9w.onrender.com/health` |

---

## ✨ Features

### Core 
- ✅ **Upload any CSV format** — column names never need to match
- ✅ **Client-side preview** — instant parse with PapaParse before any AI call
- ✅ **Responsive scrollable table** — sticky headers, horizontal + vertical scroll
- ✅ **Confirmation guard** — user reviews preview, then clicks Confirm to trigger AI
- ✅ **AI field mapping** — GPT-4o-mini with strict JSON schema extracts all 15 CRM fields
- ✅ **Batch processing** — 25 rows/batch, 3 concurrent requests (p-limit)
- ✅ **Skip rule** — records with no email AND no mobile are skipped with reason logged
- ✅ **Multi-contact handling** — first email/phone in field; extras labeled in `crm_note`
- ✅ **Enum enforcement** — `crm_status` and `data_source` strict at prompt + schema + Zod levels
- ✅ **Import summary** — Imported count, Skipped count, Total rows
- ✅ **Skipped records panel** — shows raw row + reason for each skip
- 🎯 **Drag & Drop upload** (`react-dropzone`)
- 🎯 **Real-time SSE progress bar** — live "Batch X of Y · Z%" as AI processes
- 🎯 **Streaming architecture** — `POST` returns `jobId` instantly; `GET /progress` streams via Server-Sent Events
- 🎯 **Retry with exponential backoff** — failed AI batches retry 3× before graceful degradation
- 🎯 **Expandable result rows** — click "Details" to see all 15 CRM fields + amber-highlighted `crm_note`
- 🎯 **Dark mode** — full system-preference-aware theme toggle
- 🎯 **Rate limiting** — 30 requests / IP / 15 min
- 🎯 **Unit tests** — 9 Vitest tests (validation, CSV parsing, retry logic)
- 🎯 **Docker + Docker Compose** — full container orchestration
- 🎯 **Download sample CSV** — shows AI mapping in action with messy real-world column names

---

## 🗺️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│  1. Drag & Drop / File Picker → PapaParse preview (6 rows)  │
│  2. User clicks "Confirm Import"                            │
└─────────────────────────┬───────────────────────────────────┘
                          │  POST /api/leads/import
                          │  multipart/form-data (CSV buffer)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                  EXPRESS BACKEND                             │
│  ① Multer → parse CSV buffer (PapaParse, in-memory)        │
│  ② Register job (UUID) in JobStore (EventEmitter)           │
│  ③ Return 202 { jobId, totalRows } immediately              │
│  ④ Background: BatchService splits into 25-row chunks       │
│  ⑤ p-limit(3) caps concurrent OpenAI requests              │
└────────────┬────────────────────────────────────────────────┘
             │  Parallel AI calls (retried 3× with backoff)
             ▼
┌─────────────────────────────────────────────────────────────┐
│              OpenAI GPT-4o-mini (Structured Output)         │
│  • System prompt with 7 explicit rules (A–G)                │
│  • 2 few-shot examples demonstrate crm_note assembly        │
│  • JSON schema enforces exact field types + enum values     │
│  • Low temperature (0.1) for consistent extraction          │
└────────────┬────────────────────────────────────────────────┘
             │  Raw CrmRecord[]
             ▼
┌─────────────────────────────────────────────────────────────┐
│                  ZOD VALIDATION GUARD                        │
│  • Enum values sanitized via .catch("") — no hallucination  │
│  • Dates normalised → "YYYY-MM-DD HH:mm:ss"                 │
│  • Skip rule: no valid email AND no valid mobile → skipped  │
│  • Email regex + 7-digit mobile minimum enforced            │
└────────────┬────────────────────────────────────────────────┘
             │  emitProgress(batchesDone, batchesTotal)
             │  emitDone(ImportResponse)
             ▼
┌─────────────────────────────────────────────────────────────┐
│           SSE STREAM  GET /api/leads/import/:jobId/progress  │
│  event: progress  →  { batchesDone, batchesTotal }          │
│  event: done      →  { result: ImportResponse }             │
│  event: error     →  { error: string }                      │
└────────────┬────────────────────────────────────────────────┘
             │  EventSource on frontend
             ▼
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND RESULTS                          │
│  • Live progress bar: "Batch 3 of 6 · 50%"                 │
│  • Summary cards: Total / Imported / Skipped               │
│  • Imported table: expandable rows → all 15 CRM fields     │
│  • "+contacts" badge when crm_note has extra emails/phones  │
│  • Skipped table: raw row + reason per skipped record       │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 (App Router), Tailwind CSS v4, lucide-react, react-dropzone, PapaParse |
| **Backend** | Node.js, Express 5, TypeScript |
| **AI Engine** | OpenAI GPT-4o-mini · Structured Outputs · strict JSON schema |
| **Validation** | Zod v4 |
| **Concurrency** | p-limit (3 concurrent AI batches) |
| **Progress** | Server-Sent Events (SSE) via Node.js EventEmitter + JobStore |
| **Rate Limiting** | express-rate-limit (30 req / IP / 15 min) |
| **Security** | Helmet.js |
| **Testing** | Vitest (9 tests across validation, CSV, retry modules) |
| **Containers** | Docker, Docker Compose |

---

## 📁 Project Structure

```
AI CSV/
├── backend/
│   ├── src/
│   │   ├── controllers/        # LeadsController — parse, register job, return 202
│   │   ├── middleware/         # Global error handler (Multer + Express errors)
│   │   ├── prompts/            # SYSTEM_PROMPT (rules A–G) + few-shot examples
│   │   ├── routes/             # POST /import + GET /import/:id/progress (SSE)
│   │   ├── services/
│   │   │   ├── ai.ts           # OpenAI structured output extraction
│   │   │   ├── batch.ts        # Chunking, p-limit, progress callbacks
│   │   │   ├── csv.ts          # PapaParse buffer → records[]
│   │   │   └── validation.ts   # Zod schema + skip rule enforcement
│   │   ├── tests/
│   │   │   ├── csv.test.ts
│   │   │   ├── retry.test.ts
│   │   │   └── validation.test.ts
│   │   ├── types/
│   │   │   └── crmRecord.ts    # CrmRecord Zod schema + interfaces
│   │   ├── utils/
│   │   │   ├── jobStore.ts     # In-memory SSE job registry (EventEmitter)
│   │   │   ├── logger.ts       # Colored structured logger (INFO/WARN/ERROR/DEBUG)
│   │   │   └── retry.ts        # Exponential backoff retry helper
│   │   └── server.ts           # Express app entry point
│   ├── Dockerfile
│   └── package.json
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Main dashboard (Lead Sources view)
│   │   └── globals.css         # Brand tokens, Tailwind theme, dark mode
│   ├── components/
│   │   ├── sidebar/            # AppSidebar (navigation)
│   │   ├── shared/             # ThemeToggle
│   │   ├── tables/             # StatusBadge (color pills for CRM status)
│   │   └── upload/             # ImportModal — full upload → progress → results flow
│   ├── Dockerfile
│   └── package.json
├── docs/
│   ├── test_cases/             # 13 stress-test CSV files
│   ├── Real.md                 # Original assignment spec
│   ├── PHASES.md               # 11-phase implementation roadmap
│   └── PROJECT.md              # Architecture & design specification
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## ⚙️ Local Setup

### Prerequisites
- Node.js 18+
- npm
- An OpenAI API key (GPT-4o access or GPT-4o-mini)

### 1. Clone and configure environment

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd "AI CSV"
```

**Backend env** — create `backend/.env`:
```env
PORT=5000
NODE_ENV=development
OPENAI_API_KEY=sk-...your-key-here...
```

**Frontend env** — create `frontend/.env` (optional, defaults to localhost):
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### 2. Start the backend

```bash
cd backend
npm install
npm run dev
# ✅ Server live at http://localhost:5000
```

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
# ✅ App live at http://localhost:3000
```

---

## 🐳 Docker (One-Command Launch)

Ensure your root `.env` has `OPENAI_API_KEY=sk-...`, then:

```bash
docker compose up --build
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| Health check | http://localhost:5000/health |

```bash
docker compose down   # stop
```

---

## 🧪 Running Tests

```bash
cd backend
npm run test
```

```
✓ csv.test.ts         (2 tests)  — buffer parsing, empty CSV
✓ retry.test.ts       (3 tests)  — backoff, success on retry, exhausted retries
✓ validation.test.ts  (4 tests)  — email/mobile skip rule, enum enforcement, date fallback

Test Files  3 passed (3)
Tests       9 passed (9)
```

---

## 🗂️ Test Case Suite

13 hand-crafted CSVs in `docs/test_cases/` — drag any into the importer to validate:

| # | File | Tests |
|---|------|-------|
| 01 | `01_clean_baseline.csv` | All 15 fields exact — clean baseline |
| 02 | `02_facebook_leads.csv` | Facebook Ads export column mapping |
| 03 | `03_google_ads.csv` | Google Ads export — no name column |
| 04 | `04_real_estate_crm.csv` | Real-estate portal format |
| 05 | `05_sales_agency_report.csv` | Agency report with `Sales Rep` → lead_owner |
| 06 | `06_messy_manual_spreadsheet.csv` | Whitespace headers, junk cols, blank rows |
| 07 | `07_multiple_contacts.csv` | Multi-email/phone → `crm_note` consolidation |
| 08 | `08_skip_rule_stress.csv` | 8 skip-rule edge cases (whitespace-only, malformed) |
| 09 | `09_date_format_chaos.csv` | DD/MM/YYYY, text, ISO, invalid → fallback |
| 10 | `10_enum_fuzziness.csv` | Typo enums → `""`, not hallucinated |
| 11 | `11_csv_robustness.csv` | Embedded quotes, commas, multiline, emoji, unicode |
| 12 | `12_zero_rows.csv` | Headers only → graceful 400 |
| 13 | `13_300_rows_performance.csv` | 300 rows → batch/SSE progress stress test |

---

## 🔌 API Reference

### `POST /api/leads/import`

Upload a CSV file. Returns a `jobId` immediately (202 Accepted) while AI processing runs in the background.

**Request:** `multipart/form-data`, field name `file`, `.csv` only, max 5MB

**Response `202 Accepted`:**
```json
{
  "jobId": "b3f9c12e-4d8a-41f0-9c3e-0e7a3d5b2c1f",
  "totalRows": 150
}
```

---

### `GET /api/leads/import/:jobId/progress`

Server-Sent Events stream. Subscribe immediately after receiving `jobId`.

**Events:**

`event: progress` — emitted after each batch completes:
```json
{ "batchesDone": 3, "batchesTotal": 6 }
```

`event: done` — emitted when all processing finishes:
```json
{
  "result": {
    "success": true,
    "totalRows": 150,
    "totalImported": 142,
    "totalSkipped": 8,
    "imported": [
      {
        "created_at": "2026-05-13 14:20:48",
        "name": "John Doe",
        "email": "john.doe@example.com",
        "country_code": "+91",
        "mobile_without_country_code": "9876543210",
        "company": "GrowEasy",
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India",
        "lead_owner": "owner@groweasy.ai",
        "crm_status": "GOOD_LEAD_FOLLOW_UP",
        "crm_note": "Remarks: Interested in 2BHK. | Additional Email: john.work@corp.com",
        "data_source": "leads_on_demand",
        "possession_time": "Ready to move",
        "description": "Campaign: Google Ads Search"
      }
    ],
    "skipped": [
      {
        "rowIndex": 14,
        "raw": { "Name": "Anonymous", "Email": "", "Phone": "" },
        "reason": "Skipped: Record does not contain a valid email address or mobile number."
      }
    ]
  }
}
```

`event: error` — emitted if catastrophic failure:
```json
{ "error": "AI processing failed after all retries." }
```

### `GET /health`

```json
{ "status": "OK", "message": "Backend is running 🚀" }
```

---

## 🤖 AI Engine Design

### Why GPT-4o-mini with Structured Outputs?

- **Structured Outputs** (`json_schema` with `strict: true`) guarantees the model **never returns a malformed response** — no JSON parse errors, ever.
- **Low temperature (0.1)** suppresses creativity, maximises schema adherence.
- **Two-layer enum enforcement** — JSON schema `enum` array + Zod `.catch("")` post-validation ensures hallucinated enum values (e.g., `"GOOD_LEAD"` instead of `"GOOD_LEAD_FOLLOW_UP"`) are silently blanked.

### Prompt Design (7 Explicit Rules)

| Rule | Handles |
|------|---------|
| **A** — Map Every Record | AI never drops records; server-side validates skip |
| **B** — Whitespace = Empty | `"   "` treated as `""` for email/mobile |
| **C** — Multi-Contact (CRITICAL) | First email/phone in field; extras → `crm_note` labeled |
| **D** — crm_note Assembly | `"Remarks: X \| Additional Email: Y \| Additional Phone: Z"` |
| **E** — Enum Strictness | Typos → `""`, unrelated values → `""`, never invents values |
| **F** — Phone Cleanup | Digits only, no spaces/dashes, min 7 digits |
| **G** — Line Break Escaping | `\n` escaped for CSV validity |

---

## 🚀 Deployment Guide

### Option A — Vercel (Frontend) + Railway (Backend) · Recommended

#### Step 1: Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select your repo → choose the `backend/` folder as root *(or set `Root Directory` to `backend` in settings)*
3. Add environment variables in Railway dashboard:
   ```
   PORT=5000
   NODE_ENV=production
   OPENAI_API_KEY=sk-...your-key...
   ```
4. Railway auto-detects `npm start` from `package.json`. Your backend URL will be something like:  
   `https://your-app.railway.app`
5. Test: visit `https://your-app.railway.app/health` — should return `{ "status": "OK" }`

#### Step 2: Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → Import your GitHub repo
2. Set **Root Directory** to `frontend`
3. Add environment variable:
   ```
   NEXT_PUBLIC_API_URL=https://your-app.railway.app
   ```
4. Deploy — Vercel auto-detects Next.js. Your URL will be:  
   `https://your-app.vercel.app`

#### Step 3: Update README

Replace the placeholder URLs at the top of this README with your live URLs.

---

### Option B — Render (Alternative for Backend)

1. Go to [render.com](https://render.com) → **New Web Service** → Connect GitHub
2. Set **Root Directory** to `backend`
3. Build command: `npm install && npm run build`
4. Start command: `node dist/server.js`
5. Add env vars: `PORT=10000`, `NODE_ENV=production`, `OPENAI_API_KEY=sk-...`

> ⚠️ **Note:** Render free tier spins down after inactivity. Use Railway or a paid Render plan for consistent demo performance.

---

### Option C — Docker on VPS (DigitalOcean / AWS EC2)

```bash
# On your server:
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd "AI CSV"
echo "OPENAI_API_KEY=sk-..." > .env
docker compose up --build -d
```

The app runs on ports `3000` (frontend) and `5000` (backend).
---

## 🏗️ CRM Fields Reference

| Field | Description | Notes |
|-------|-------------|-------|
| `created_at` | Lead creation date | Accepts any date format |
| `name` | Lead full name | — |
| `email` | Primary email | First if multiple |
| `country_code` | Country prefix | e.g. `+91` |
| `mobile_without_country_code` | Local mobile digits | Min 7 digits |
| `company` | Company name | — |
| `city` | City | — |
| `state` | State/province | — |
| `country` | Country | — |
| `lead_owner` | Assigned owner email | Default: `owner@groweasy.ai` |
| `crm_status` | Lead status enum | `GOOD_LEAD_FOLLOW_UP` \| `DID_NOT_CONNECT` \| `BAD_LEAD` \| `SALE_DONE` \| `""` |
| `crm_note` | Consolidated notes | Extra emails, phones, remarks |
| `data_source` | Source channel enum | `leads_on_demand` \| `meridian_tower` \| `eden_park` \| `varah_swamy` \| `sarjapur_plots` \| `""` |
| `possession_time` | Property timeline | e.g. "Ready to move", "1 year" |
| `description` | Additional info | Campaign names, misc. |
