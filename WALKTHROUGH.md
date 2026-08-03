# GSTMatch — User Walkthrough

This guide walks you through the complete user flow of the GSTMatch application, from sign-up to downloading your reconciliation report.

---

## 1. Prerequisites (Already Running)

| Service | URL |
|---------|-----|
| **Frontend (Next.js)** | http://localhost:3001 |
| **Backend API (FastAPI)** | http://localhost:8000 |
| **Sample Data Files** | `sample-data/purchase_register.csv` and `sample-data/gstr2b.json` |

> **Note:** Since Supabase env vars are placeholders, the app runs in **local demo mode** — no login required to access `/upload`, and results are stored in-memory.

---

## 2. User Flow Overview

```
Home → Pricing → Sign Up / Log In → Upload Files → View Results → Download Report
```

---

## 3. Step-by-Step Walkthrough

### Step 1 — Home Page
Open **http://localhost:3001** in your browser.

You'll see the Neumorphic-style landing page with:
- **GSTMatch** logo and tagline "Reconciliation made simple"
- Navigation tabs: **Home**, **Upload**, **Pricing**
- A "Log In →" button (top right)

### Step 2 — Pricing Page
Click the **Pricing** tab to see two plan cards:

| Plan | Price | Features |
|------|-------|----------|
| **Starter** | ₹299/month | 1 GSTIN profile, 500 invoices, reports, fuzzy matching |
| **Growth** | ₹699/month | 3 GSTIN profiles, 2000 invoices, reports, WhatsApp support |

> **Tip:** In demo mode (no Cashfree keys), clicking "Get Starter" will:
> 1. Redirect to login if not authenticated
> 2. Use the **mock payment flow** — simulate a successful payment and upgrade your plan instantly

### Step 3 — Sign Up / Log In
Click **"Log In →"** in the top right, which takes you to `/auth`.

- **New users:** Switch to the **"Sign Up"** tab, enter your email + password, and click **Create Account**
- **Returning users:** Stay on the **"Log In"** tab, enter credentials, and click **Sign In**

> **Note:** Since Supabase is using placeholder credentials, `signUp`/`signIn` may not actually create a persistent session. The app is designed to work in a fully local/demo mode out of the box.

### Step 4 — Upload Your Files
Navigate to the **Upload** tab. You'll see:

1. **Period** dropdown → select the month (e.g., "June")
2. **Year** dropdown → select the year (e.g., 2025)
3. **Business name** → enter e.g. "Test Business"
4. **Your GSTIN** → enter a valid 15-character GSTIN, e.g. `27AAAAA0000A1Z5`
5. **Upload zones:**
   - 🏷️ **Purchase Register** — drop `sample-data/purchase_register.csv`
   - 🏛️ **GSTR-2B File** — drop `sample-data/gstr2b.json`

The "Run reconciliation" button will become enabled once both files are uploaded and the GSTIN is valid.

### Step 5 — Run Reconciliation
Click **"🔍 Run reconciliation →"**.

The app:
- Sends both files + metadata to the FastAPI backend (`POST /api/reconcile`)
- The backend parses both files, normalizes invoices, and runs the fuzzy matching engine
- Returns a `jobId` and redirects to `/results/{jobId}`

**Expected result with the sample data:**
- **7 matched** invoices (Reliance, Tata Steel, Infosys, Bharat Petroleum, Wipro, Maruti Suzuki, Godrej)
- **3 missing in GSTR-2B** (ITC, Tata Motors, Asian Paints) — these are invoices your suppliers haven't filed yet
- **2 missing in PR** (HDFC Bank, ICICI Bank) — these are in GSTR-2B but not in your books
- **Total ITC at risk:** ₹75,420
- **Compliance score:** 58/100

### Step 6 — View Results
The results page displays:
1. **Summary stat cards** — matched, mismatched, missing in GSTR-2B, missing in PR, ITC at risk, compliance score
2. **Supplier table** — supplier name, GSTIN, invoice count, status (filed/not_filed/mismatch), ITC at risk
3. **Invoice detail table** — every invoice with amount comparison and match category
4. **ITC alert banner** — highlights the total ITC at risk amount

### Step 7 — Download Reports
From the results page you can:
- 📊 **Download Excel Report** → `GET /api/results/{jobId}/excel` — full line-item worksheet + supplier summary sheet
- 📄 **Download PDF Summary** → `GET /api/results/{jobId}/pdf` — executive summary with key stats

---

## 4. What's Happening Under the Hood

```
Browser (Next.js:3001)
    │  POST /api/reconcile (FormData: files + period + gstin + business_name + user_id)
    ▼
FastAPI Backend (localhost:8000)
    ├── parse_purchase_register()  → reads CSV/Excel, maps column aliases
    ├── parse_gstr2b()             → auto-detects Excel or JSON (GST portal format)
    ├── reconcile()                → rapidfuzz fuzzy matching engine
    ├── store.save(job_id, result, user_id)
    │       ├── If Supabase configured → REST API POST to `reconciliation_results` (JSONB)
    │       └── Else → in-memory dict fallback
    └── 200 OK { jobId }
    │
    ▼
Results page fetches GET /api/results/{jobId} → full JSON → renders UI
```

## 5. Demo Mode vs Production

| Feature | Demo (current) | Production (after env setup) |
|---------|---------------|------------------------------|
| Supabase Auth | Bypassed by middleware | Real email/password sign-up & login |
| Result Storage | In-memory (lost on restart) | Persisted in `reconciliation_results` table |
| Payments | Mock success simulation | Real Cashfree Checkout |
| Route protection | Bypassed | `/upload` & `/results/*` redirect to `/auth` |

## 6. Files You Can Play With

| File | Purpose |
|------|---------|
| `sample-data/purchase_register.csv` | 10 invoices from your purchase book |
| `sample-data/gstr2b.json` | 9 supplier returns from GST portal (7 match + 2 extra) |

Try modifying these to experiment:
- **Change an invoice amount** to see a "mismatched" result
- **Add/remove an invoice** to change the matched/missing counts
- **Swap the JSON structure** to test other GSTR-2B export formats