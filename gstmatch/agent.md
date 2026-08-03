# GSTMatch — Agent Instructions & Architecture Guide

## What We Are Building

GSTMatch is an AI-powered GST reconciliation SaaS for Indian small business owners and MSMEs.

**The core problem it solves:**
Every month, Indian businesses must match their Purchase Register (what they bought) against GSTR-2B (what suppliers reported to the GST portal). Mismatches mean lost Input Tax Credit (ITC) — real rupees the business cannot claim back. This process currently takes 3–5 hours manually in Excel. GSTMatch does it in under 2 minutes.

**Target customer:**
Small business owners (textile traders, distributors, retailers, MSMEs) who file GST themselves or have a junior accountant. NOT CA firms — those are served by competitors like Vyapar TaxOne.

**Core value proposition:**
Upload two files → see exactly how much tax credit you are losing and why → download a report → know which suppliers to follow up with.

---

## The Four Core Features (MVP)

### Feature 1 — GSTR-2B Reconciliation
Match every invoice in the Purchase Register against GSTR-2B and classify into four buckets:
- ✅ **Matched** — invoice in both files, amounts agree
- ⚠️ **Mismatch** — invoice in both files but amounts differ
- ❌ **Missing in GSTR-2B** — supplier has not filed, ITC at risk
- 🔍 **Missing in PR** — in GSTR-2B but not in your books

### Feature 2 — ITC at Risk Calculator
Show the total rupee value of tax credit the user may lose this month due to unfiled suppliers. Displayed as a single large number in plain language ("Tax credit you may lose").

### Feature 3 — Supplier Filing Tracker + Invoice Breakdown
- Supplier-level table: which suppliers filed, which didn't, ITC at risk per supplier
- Follow-up message generator: click a button to copy a ready-made WhatsApp/email message to send to an unfiled supplier
- Invoice-level table: filterable by all four categories, searchable, paginated, showing Your Amount vs GSTR-2B Amount vs Difference

### Feature 4 — One-Click Report Download
- Excel report: 3 sheets (Summary, Mismatches, Missing Invoices) — colour coded
- PDF report: 4 pages (Executive Summary, Mismatch Table, Supplier Status, Recommended Actions)

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 14 (App Router) + TypeScript | Hosted on Vercel |
| Styling | Custom Neumorphism CSS (`styles/neu.css`) | Soft gray shadows, no external component library |
| Backend | FastAPI (Python) | Hosted on Railway |
| File parsing | pandas + openpyxl | Handles Excel, CSV, JSON |
| Fuzzy matching | rapidfuzz | Invoice number similarity matching |
| Excel reports | openpyxl | 3-sheet colour-coded report |
| PDF reports | reportlab | 4-page clean summary |
| Database | Supabase (PostgreSQL) | Auth + storage — not yet integrated |
| Payments | Cashfree | Not yet integrated |
| Storage | In-memory dict (job_store.py) | Needs upgrade to Supabase |

---

## Full Project Structure

### Frontend — `gstmatch-frontend/`

```
gstmatch-frontend/
├── app/
│   ├── layout.tsx                  Root layout, imports neu.css globally
│   ├── page.tsx                    Landing page (hero, stats, features, pricing)
│   ├── upload/
│   │   └── page.tsx                Upload page (file zones + GSTIN form)
│   └── results/
│       └── [id]/
│           └── page.tsx            Results dashboard (all 4 features rendered here)
│                                   /results/demo works with hardcoded sample data — no backend needed
│
├── components/
│   ├── NavBar.tsx                  Sticky top nav with logo + tab pills + CTA
│   ├── UploadZone.tsx              Drag-and-drop file upload component
│   ├── MetricCard.tsx              Single stat card (icon + big number + label)
│   ├── ITCAlert.tsx                Banner showing ITC at risk in rupees
│   ├── SupplierTable.tsx           Supplier list with status filter + follow-up message generator
│   ├── InvoiceTable.tsx            Invoice-level table with 5-tab filter + search + pagination
│   ├── ReportDownload.tsx          Download panel with Excel and PDF buttons + preview of contents
│   └── ui/
│       ├── NeuCard.tsx             Reusable raised/inset card wrapper
│       ├── NeuButton.tsx           Primary (green gradient) and ghost buttons
│       └── StatusBadge.tsx         Filed / Not Filed / Mismatch pill badges
│
├── lib/
│   ├── types.ts                    All TypeScript interfaces (InvoiceRow, Supplier, ReconciliationResult, etc.)
│   └── api.ts                      API calls: startReconciliation(), getResult(), downloadExcel(), downloadPDF()
│
├── styles/
│   └── neu.css                     Complete Neumorphism design system (CSS variables + utility classes)
│
├── package.json
├── next.config.js
├── tsconfig.json
├── tailwind.config.ts
└── .env.local.example
```

**Key design system classes (from neu.css):**
- `.neu-raised` — card floating above surface (box-shadow outward)
- `.neu-inset` — pressed into surface (box-shadow inward, used for inputs and filled upload zones)
- `.neu-btn` — base button with neumorphic shadow
- `.neu-btn-primary` — green gradient primary button
- `.neu-input` — inset text input
- `.page-container` — centered 780px page wrapper with padding

**CSS Variables:**
```css
--neu-bg: #e8ecf1      /* base background — everything sits on this */
--neu-light: #ffffff   /* light shadow direction */
--neu-dark: #c8d0e7    /* dark shadow direction */
--primary: #10b981     /* green — success, matched, CTA */
--danger: #ef4444      /* red — missing, ITC at risk */
--warning: #f59e0b     /* orange — mismatch */
--info: #3b82f6        /* blue — neutral info */
```

---

### Backend — `gstmatch-api/`

```
gstmatch-api/
├── main.py                         FastAPI entry point, CORS setup, route registration
│
├── api/
│   ├── __init__.py
│   └── routes/
│       ├── __init__.py
│       ├── reconcile.py            POST /api/reconcile — accepts multipart form with two files
│       └── results.py              GET /api/results/{jobId}
│                                   GET /api/results/{jobId}/excel
│                                   GET /api/results/{jobId}/pdf
│
├── core/
│   ├── __init__.py
│   ├── normalizer.py               Cleans raw data before matching:
│   │                                 normalize_gstin() — uppercase, remove spaces
│   │                                 normalize_invoice_no() — strip all special chars
│   │                                 normalize_amount() — round to nearest rupee
│   │                                 normalize_date() — convert to DD/MM/YYYY
│   │                                 make_match_key() — GSTIN|InvoiceNo composite key
│   │
│   ├── parser.py                   Parses uploaded files into standardised DataFrames
│   │                               Purchase Register: auto-detects column names (50+ variants)
│   │                               GSTR-2B Excel: detects header row, handles multiple sheets
│   │                               GSTR-2B JSON: parses official GST portal nested structure
│   │
│   └── reconciler.py               Main matching engine:
│                                   Level 1 — Exact: GSTIN + invoice no dict lookup
│                                   Level 2 — Fuzzy: same GSTIN, rapidfuzz similarity ≥ 85%
│                                   Level 3 — Remaining classified as missing
│                                   Builds InvoiceRow list, Supplier list, Summary
│
├── reports/
│   ├── __init__.py
│   ├── excel_report.py             Generates 3-sheet .xlsx with openpyxl
│   │                               Sheet 1: Summary table + ITC at risk
│   │                               Sheet 2: Mismatched invoices (orange highlight)
│   │                               Sheet 3: Missing invoices (red highlight, grouped by supplier)
│   │
│   └── pdf_report.py               Generates 4-page PDF with reportlab
│                                   Page 1: Executive summary + big ITC number
│                                   Page 2: Mismatch table
│                                   Page 3: Supplier status table
│                                   Page 4: Recommended actions
│
├── models/
│   ├── __init__.py
│   └── schemas.py                  Pydantic models:
│                                   InvoiceRow, InvoiceCategory, Supplier, SupplierStatus
│                                   ReconciliationResult, ReconciliationSummary
│                                   UploadResponse, ErrorResponse
│
├── storage/
│   ├── __init__.py
│   └── job_store.py                In-memory dict store — save()/get()/exists()
│                                   Upgrade path to Supabase documented in README
│
├── requirements.txt
├── .env.example
└── README.md
```

**API Endpoints:**
```
POST /api/reconcile              Upload PR + GSTR-2B, returns { jobId, message }
GET  /api/results/{jobId}        Full ReconciliationResult as JSON
GET  /api/results/{jobId}/excel  Download .xlsx report
GET  /api/results/{jobId}/pdf    Download .pdf summary
GET  /health                     Health check
GET  /docs                       Swagger UI (auto-generated by FastAPI)
```

**Data flow:**
```
User uploads PR + GSTR-2B
        ↓
parser.py → two clean DataFrames
        ↓
reconciler.py → 3-level matching
        ↓
ReconciliationResult (invoices + suppliers + summary)
        ↓
job_store.py → saved by jobId
        ↓
Frontend fetches by jobId → renders dashboard
        ↓
User clicks download → excel_report.py or pdf_report.py → file stream
```

---

## What Has Been Built (Complete)

### Frontend
- [x] Full Neumorphism design system (`neu.css`) with CSS variables
- [x] Landing page with hero, stats, features, pricing CTA
- [x] Upload page with drag-and-drop, GSTIN validation, period selector
- [x] Results page wiring all 4 features
- [x] `MetricCard` — 4 summary stats
- [x] `ITCAlert` — ITC at risk banner in rupees
- [x] `InvoiceTable` — filterable by category, searchable, paginated, shows Your Amount vs GSTR-2B Amount vs Difference
- [x] `SupplierTable` — filter tabs, expandable follow-up message generator with copy button
- [x] `ReportDownload` — Excel + PDF download with sheet/page preview panels
- [x] `/results/demo` route with 17 hardcoded sample invoices — works without backend
- [x] TypeScript types for all data models
- [x] API utility functions in `lib/api.ts`

### Backend
- [x] FastAPI project with CORS, health check, Swagger docs
- [x] Purchase Register parser — auto-detects 50+ column name variants, handles Excel + CSV
- [x] GSTR-2B parser — handles both Excel and official GST portal JSON
- [x] Normalizer — GSTIN, invoice numbers, amounts, dates
- [x] 3-level reconciliation engine (exact → fuzzy → missing)
- [x] Supplier list builder with ITC at risk calculation
- [x] Excel report generator — 3 sheets, colour-coded with openpyxl
- [x] PDF report generator — 4 pages with reportlab
- [x] In-memory job store (save/get by UUID)
- [x] All endpoints wired and returning correct Pydantic models

---

## What Is Remaining to Build

### Priority 1 — Required Before First Paying Customer

**1. Supabase Auth (Frontend)**
- Add Supabase client to frontend
- Login/signup page (`/app/auth/page.tsx`)
- Auth middleware — protect `/upload` and `/results` routes
- Store user session, pass user ID to API calls
- Files: create `lib/supabase.ts`, `app/auth/page.tsx`, `middleware.ts`

**2. Supabase Storage for Job Results (Backend)**
- Replace `storage/job_store.py` in-memory dict with Supabase table
- Table schema: `reconciliation_results (id, user_id, period, gstin, data jsonb, created_at)`
- So results persist across server restarts and between users
- File: update `storage/job_store.py`

**3. Cashfree Payment Integration (Frontend)**
- Pricing page or modal showing Starter (₹299/mo) and Growth (₹699/mo)
- Cashfree Checkout SDK integration
- Webhook endpoint on backend to confirm payment and update user plan
- Usage limit middleware — check invoice count against plan limit before running reconciliation
- Files: create `app/pricing/page.tsx`, `app/api/cashfree/webhook/route.ts`

**4. Usage Limits (Backend)**
- Check user plan before processing
- Starter: 500 invoices/month max
- Growth: 2000 invoices/month max
- Return clear error if limit exceeded

**5. Free Trial Logic**
- New users get 1 free reconciliation (up to 50 invoices)
- After that, show pricing page
- Track usage in Supabase `users` table

---

### Priority 2 — Quality and Retention

**6. Dashboard — Past Reconciliations**
- `/dashboard` page showing all past reconciliation runs for the logged-in user
- Table with: period, date run, invoices processed, ITC at risk, compliance score, download link
- File: create `app/dashboard/page.tsx`

**7. Error Handling on Upload Page**
- Better error messages when column detection fails
- Show which columns were detected and which were missing
- Allow user to manually map columns if auto-detect fails

**8. GSTIN Validator**
- Validate GSTIN format (regex: `^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$`)
- Call public GSTN verification API to confirm GSTIN exists
- Show business name pulled from GSTN API next to GSTIN input

**9. Mobile Responsive Design**
- Current design works on desktop
- Supplier table and invoice table need horizontal scroll on mobile
- Upload zones need to stack vertically on small screens

---

### Priority 3 — Growth Features

**10. WhatsApp Integration (Supplier Follow-up)**
- Currently: copy-paste follow-up message manually
- Upgrade: direct WhatsApp link (`wa.me/?text=...`) so clicking opens WhatsApp with message pre-filled
- One-line change in `SupplierTable.tsx`

**11. Compliance Score History Chart**
- Show compliance score trend across last 6 months
- Simple line chart using recharts (already available in frontend)
- Needs data from past reconciliation runs stored in Supabase

**12. Multi-GSTIN Support**
- Growth plan users can add up to 3 GSTINs
- GSTIN selector on upload page
- Separate reconciliation history per GSTIN

---

## Environment Variables Reference

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CASHFREE_APP_ID=
CASHFREE_SECRET_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

### Backend (`.env`)
```
PORT=8000
ALLOWED_ORIGINS=http://localhost:3000
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## How to Run Locally

### Backend
```bash
cd gstmatch-api
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
# Swagger UI at http://localhost:8000/docs
```

### Frontend
```bash
cd gstmatch-frontend
npm install
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
# App at http://localhost:3000
# Demo (no backend needed) at http://localhost:3000/results/demo
```

---

## Deployment

| Service | Platform | Notes |
|---|---|---|
| Frontend | Vercel | `vercel --prod`, set env vars in dashboard |
| Backend | Railway | `railway up`, set `ALLOWED_ORIGINS` to Vercel URL |
| Database | Supabase | Create project, get URL + service role key |

---

## Agent Rules

- Never modify `styles/neu.css` CSS variables — the entire design system depends on them
- Never replace Neumorphism styling with Tailwind component classes or any UI library
- All new pages must use `<NavBar />` and wrap content in `<main className="page-container">`
- All new buttons must use `.neu-btn` or `NeuButton` component — never plain HTML buttons with inline styles
- All API calls go through `lib/api.ts` — never fetch the backend directly from page components
- TypeScript types for any new data must be added to `lib/types.ts` first
- Backend endpoints must return Pydantic models defined in `models/schemas.py`
- Never change the reconciliation logic in `core/reconciler.py` without testing against real GSTR-2B files
- The `/results/demo` route must always work without a backend — keep `DEMO_DATA` updated when adding new fields