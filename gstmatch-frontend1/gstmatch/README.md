# GSTMatch — GST Reconciliation Frontend

Next.js 14 frontend for GSTMatch, an AI-powered GST reconciliation tool for Indian MSMEs.

---

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Custom Neumorphism CSS (`styles/neu.css`) + Tailwind
- **Backend:** FastAPI (separate repo — `gstmatch-api`)
- **Database:** Supabase
- **Payments:** Cashfree

---

## Project Structure

```
app/
  page.tsx                  Landing page
  upload/page.tsx           Upload files page
  results/[id]/page.tsx     Results dashboard

components/
  NavBar.tsx                Top navigation
  UploadZone.tsx            Drag-and-drop file upload
  MetricCard.tsx            Summary stat card
  ITCAlert.tsx              ITC at risk banner
  SupplierTable.tsx         Supplier filing status table
  ui/
    NeuCard.tsx             Base raised/inset card
    NeuButton.tsx           Primary & ghost buttons
    StatusBadge.tsx         Filed / Not Filed / Mismatch badge

lib/
  types.ts                  All TypeScript interfaces
  api.ts                    Backend API calls (upload, results, download)

styles/
  neu.css                   Complete Neumorphism design system
```

---

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
```bash
cp .env.local.example .env.local
# Fill in your values in .env.local
```

### 3. Start the dev server
```bash
npm run dev
# Open http://localhost:3000
```

### 4. Demo mode
Visit `/results/demo` to see a fully working results dashboard with sample data — no backend needed.

---

## Pages

| Route             | Description                          |
|-------------------|--------------------------------------|
| `/`               | Landing page with features + pricing |
| `/upload`         | Upload Purchase Register + GSTR-2B   |
| `/results/[id]`   | Results dashboard after processing   |
| `/results/demo`   | Demo results with sample data        |

---

## Design System

All Neumorphism styles are in `styles/neu.css`. Key CSS classes:

| Class            | Effect                                |
|------------------|---------------------------------------|
| `.neu-raised`    | Card floating above surface           |
| `.neu-inset`     | Pressed into surface (inputs/filled)  |
| `.neu-flat`      | Subtle flat elevation                 |
| `.neu-btn`       | Base button with shadow               |
| `.neu-btn-primary` | Green gradient primary button       |
| `.neu-input`     | Inset text input                      |
| `.page-container`| Centered 780px page wrapper           |

---

## Connecting to Backend

All API calls are in `lib/api.ts`. The backend (FastAPI) must be running at `NEXT_PUBLIC_API_URL`.

Expected endpoints:
- `POST /api/reconcile` — upload files, start job
- `GET /api/results/:jobId` — get reconciliation result
- `GET /api/results/:jobId/excel` — download Excel report
- `GET /api/results/:jobId/pdf` — download PDF report

---

## Deploy

```bash
# Frontend → Vercel
vercel --prod

# Set environment variables in Vercel dashboard
# NEXT_PUBLIC_API_URL = your Railway backend URL
```
