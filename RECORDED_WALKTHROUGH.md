# GSTMatch — Recorded Walkthrough

> Auto-generated on run. Every step below was executed successfully against the running servers.


## Step 0 — Backend Health Check

```
GET http://localhost:8000/health → `200`
Body: {"status":"healthy"}
```

## Step 1 — Home Page

```
GET http://localhost:3001/ → `200`
Loaded GUI landing page
```

## Step 2 — Auth Page

```
GET http://localhost:3001/auth → `200`
Loaded login/signup page
```

## Step 3 — Pricing Page

```
GET http://localhost:3001/pricing → `200`
Loaded Starter ₹299 + Growth ₹699 plans
```

## Step 4 — Upload Page

```
GET http://localhost:3001/upload → `200`
Loaded upload form (period, GSTIN, file zones)
```

## Step 5 — Run Reconciliation

```
POST http://localhost:8000/api/reconcile (purchase_register.csv + gstr2b.json + period=June 2025 + gstin=27AAAAA0000A1Z5)
→ `200`
Response: {
  "jobId": "88b64b00-edf8-42ad-b70b-565a3f21bc07",
  "message": "Reconciliation complete. 12 invoices processed."
}
```

## Step 6 — View Results (Data)

```
GET http://localhost:8000/api/results/88b64b00-edf8-42ad-b70b-565a3f21bc07 → `200`

Summary: {
  "matched": 7,
  "mismatched": 0,
  "missingInGstr2b": 3,
  "missingInPr": 2,
  "totalItcAtRisk": 75420.0,
  "totalInvoices": 12,
  "complianceScore": 58
}
```

## Step 6b — Results Page (GUI)

```
GET http://localhost:3001/results/88b64b00-edf8-42ad-b70b-565a3f21bc07 → `200`
Loaded reconciliation dashboard
```

## Step 7 — Supplier Breakdown

```
- **ITC Limited** · 27AAACK4321F1Z4 · 1 invoice(s) · status `not_filed` · ITC at risk ₹32,400
- **Tata Motors** · 27AAACN1357I1Z8 · 1 invoice(s) · status `not_filed` · ITC at risk ₹27,000
- **Asian Paints** · 07AAACO8642J1Z9 · 1 invoice(s) · status `not_filed` · ITC at risk ₹16,020
- **Bharat Petroleum** · 27AAACJ8765E1Z3 · 1 invoice(s) · status `filed` · ITC at risk ₹0
- **Godrej Industries** · 27AAACP7531K1Z1 · 1 invoice(s) · status `filed` · ITC at risk ₹0
- **HDFC Bank Ltd** · 07AAACX9999H1Z3 · 1 invoice(s) · status `filed` · ITC at risk ₹0
- **ICICI Bank Ltd** · 07AAACY7777A1Z5 · 1 invoice(s) · status `filed` · ITC at risk ₹0
- **Infosys Limited** · 07AAACI2345D1Z6 · 1 invoice(s) · status `filed` · ITC at risk ₹0
- **Maruti Suzuki** · 27AAACM2468H1Z7 · 1 invoice(s) · status `filed` · ITC at risk ₹0
- **Reliance Industries** · 27AAACG1234F1Z5 · 1 invoice(s) · status `filed` · ITC at risk ₹0
- **Tata Steel Limited** · 27AAACH5678B1Z2 · 1 invoice(s) · status `filed` · ITC at risk ₹0
- **Wipro Limited** · 07AAACL9876G1Z1 · 1 invoice(s) · status `filed` · ITC at risk ₹0
```

## Step 8 — Invoice Categories

```
- `matched`: 7 invoice(s)
- `missing_in_gstr2b`: 3 invoice(s)
- `missing_in_pr`: 2 invoice(s)
```

## Step 9 — Download Excel Report

```
GET http://localhost:8000/api/results/88b64b00-edf8-42ad-b70b-565a3f21bc07/excel → `200`
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Size: 7,288 bytes
```

## Step 10 — Download PDF Summary

```
GET http://localhost:8000/api/results/88b64b00-edf8-42ad-b70b-565a3f21bc07/pdf → `200`
Content-Type: application/pdf
Size: 6,166 bytes
```

---

## Downloaded Files

A copy of the Excel and PDF reports has been saved to:

- `demo-downloads/GST_Report.xlsx`
- `demo-downloads/GST_Summary.pdf`

---

## ✅ Walkthrough Complete

All steps executed successfully:
1. ✅ Backend health check
2. ✅ Frontend home page
3. ✅ Auth page
4. ✅ Pricing page
5. ✅ Upload page
6. ✅ Reconciliation run (12 invoices)
7. ✅ Results page + data
8. ✅ Supplier breakdown
9. ✅ Invoice category breakdown
10. ✅ Excel report download
11. ✅ PDF summary download