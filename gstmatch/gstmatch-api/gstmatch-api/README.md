# GSTMatch API — FastAPI Reconciliation Backend

Python FastAPI backend for GSTMatch. Accepts Purchase Register + GSTR-2B files,
runs the reconciliation engine, and returns structured results with Excel/PDF reports.

---

## Tech Stack

- **Framework:** FastAPI + Uvicorn
- **File parsing:** pandas + openpyxl
- **Matching:** rapidfuzz (fuzzy invoice number matching)
- **Excel reports:** openpyxl (3 sheets, colour-coded)
- **PDF reports:** reportlab (4 pages, clean layout)
- **Storage:** In-memory dict (swap for Redis/Supabase when scaling)

---

## Project Structure

```
main.py                      FastAPI entry point + CORS
api/
  routes/
    reconcile.py             POST /api/reconcile
    results.py               GET  /api/results/{id}
                             GET  /api/results/{id}/excel
                             GET  /api/results/{id}/pdf
core/
  normalizer.py              GSTIN, invoice no, amount normalisation
  parser.py                  Purchase Register + GSTR-2B parsers
  reconciler.py              3-level matching engine
reports/
  excel_report.py            3-sheet Excel generator
  pdf_report.py              4-page PDF generator
models/
  schemas.py                 Pydantic data models
storage/
  job_store.py               In-memory result store
```

---

## Getting Started

### 1. Create virtual environment
```bash
python -m venv venv
source venv/bin/activate        # Mac/Linux
venv\Scripts\activate           # Windows
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your values
```

### 4. Run the server
```bash
uvicorn main:app --reload --port 8000
```

### 5. Test it
Open: http://localhost:8000/docs
Full Swagger UI — test all endpoints directly in the browser.

---

## API Endpoints

| Method | Endpoint                       | Description                        |
|--------|--------------------------------|------------------------------------|
| POST   | `/api/reconcile`               | Upload files, run reconciliation   |
| GET    | `/api/results/{jobId}`         | Get full JSON result               |
| GET    | `/api/results/{jobId}/excel`   | Download Excel report (.xlsx)      |
| GET    | `/api/results/{jobId}/pdf`     | Download PDF summary (.pdf)        |
| GET    | `/health`                      | Health check                       |

### POST /api/reconcile

Form data (multipart):

| Field              | Type   | Required | Description                          |
|--------------------|--------|----------|--------------------------------------|
| purchase_register  | File   | ✅       | .xlsx, .xls, or .csv                 |
| gstr2b             | File   | ✅       | .xlsx, .xls, or .json                |
| period             | string | ✅       | e.g. "June 2025"                     |
| gstin              | string | ✅       | 15-character GSTIN                   |
| business_name      | string | ❌       | Your business name                   |

Returns:
```json
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Reconciliation complete. 342 invoices processed."
}
```

---

## Purchase Register Column Names

The parser auto-detects column names. Your Excel can use any of these headers:

| Standard      | Accepted variants                                              |
|---------------|----------------------------------------------------------------|
| GSTIN         | gstin, supplier gstin, vendor gstin, gst no                   |
| Invoice No    | invoice no, bill no, voucher no, ref no                       |
| Invoice Date  | invoice date, bill date, date                                  |
| IGST          | igst, igst amount, integrated tax                             |
| CGST          | cgst, cgst amount, central tax                                |
| SGST          | sgst, sgst amount, state tax, utgst                           |
| Total         | total, total amount, invoice amount, invoice value            |

---

## GSTR-2B Formats Supported

- **Excel (.xlsx)** — downloaded directly from GST portal
- **JSON (.json)** — official GSTR-2B JSON from GST portal

To download from GST portal:
`Returns → GSTR-2B → Select period → Download JSON or Excel`

---

## Reconciliation Logic

**Level 1 — Exact match**
Match on: normalised GSTIN + normalised invoice number + amount within ₹2

**Level 2 — Fuzzy match**
Same GSTIN, invoice number similarity ≥ 85% (handles `INV/001` vs `INV-001`)

**Level 3 — Classify remaining**
- In PR but not in GSTR-2B → `missing_in_gstr2b` (ITC at risk)
- In GSTR-2B but not in PR → `missing_in_pr` (possible missed entry)

---

## Deploy to Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway init
railway up

# Set environment variables in Railway dashboard
# ALLOWED_ORIGINS = https://your-frontend.vercel.app
```

Your API will be live at: `https://your-project.railway.app`
Update `NEXT_PUBLIC_API_URL` in your Vercel frontend to this URL.

---

## Upgrading In-Memory Storage

The `storage/job_store.py` uses a simple dict. To upgrade to Supabase:

```python
# storage/job_store.py — Supabase version
from supabase import create_client
import os, json

client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_ROLE_KEY"))

def save(job_id: str, result) -> None:
    client.table("reconciliation_results").insert({
        "id": job_id,
        "data": result.model_dump_json()
    }).execute()

def get(job_id: str):
    res = client.table("reconciliation_results").select("data").eq("id", job_id).execute()
    if res.data:
        from models.schemas import ReconciliationResult
        return ReconciliationResult.model_validate_json(res.data[0]["data"])
    return None
```
