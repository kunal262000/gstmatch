# GSTMatch — Multi-Reconciliation Addon v2 (Precise Merge)

This is a rebuild of the earlier addon, this time based on reading your
**actual live repo** (`kunal262000/gstmatch`), not assumptions. Every
"modified" file below is a precise merge of your real original — diff them
against your repo to confirm before applying.

---

## Folder structure of this addon

```
backend-new-files/          ← copy these in as-is, zero risk, nothing existing is touched
backend-modified-files/     ← REPLACE your existing files with these — see diff notes in each file's header comment
frontend-new-files/         ← copy these in as-is
frontend-modified-files/    ← REPLACE your existing files with these
```

Every single file in the `-modified-files/` folders has a comment block at
the top explaining exactly what changed and what was preserved unchanged.
Read that comment before applying each one.

---

## What makes this different from the first addon

The first addon (already discarded) didn't know your repo had:
- Supabase auth + JWT ownership checks
- Free-tier enforcement (2 free reconciliations, server + client side)
- Cashfree billing with plan expiry
- `Supplier.stateCode`/`stateName` GSTIN enrichment
- The nested `gstmatch-api/gstmatch-api/` folder structure

This version:
- **Never touches `core/reconciler.py`** — the original GSTR-2B vs PR flow
  routes through your exact, unmodified engine. Zero risk to your live
  product for the one type that's already working.
- **Preserves the free-tier check exactly**, and fixes a real bug it would
  have had otherwise: `count_for_user()` now sums across both the invoice
  and summary result tables, so a free user gets 2 total reconciliations
  across all 8 types, not 2 *per type*.
- **Preserves ownership/auth checks exactly** — `Depends(current_user_or_401)`
  and the 403-on-mismatch logic in `results.py` are untouched, just extended
  to check both result stores.
- **Preserves `stateCode`/`stateName`** on every new invoice-engine result.
- **Preserves every existing UI behaviour** on the upload page — the retry
  loop on results, the demo data path, the free-trial banner, GSTIN
  validation, TrustBadges, the format-guide table, the admin activity
  logging insert.

---

## Backend integration steps

### 1. Copy new files (zero risk)
```
backend-new-files/core/recon_registry.py
    → gstmatch-api/gstmatch-api/core/recon_registry.py

backend-new-files/core/invoice_reconciler.py
    → gstmatch-api/gstmatch-api/core/invoice_reconciler.py

backend-new-files/core/summary_reconciler.py
    → gstmatch-api/gstmatch-api/core/summary_reconciler.py

backend-new-files/core/parsers/__init__.py
backend-new-files/core/parsers/generic_invoice.py
backend-new-files/core/parsers/summary_parser.py
    → gstmatch-api/gstmatch-api/core/parsers/  (new folder)

backend-new-files/reports/summary_excel_report.py
backend-new-files/reports/summary_pdf_report.py
    → gstmatch-api/gstmatch-api/reports/

backend-new-files/api/routes/recon_types.py
    → gstmatch-api/gstmatch-api/api/routes/
```

### 2. Run the new Supabase migration
```
backend-new-files/supabase-migration/0009_summary_reconciliation_results.sql
    → supabase/migrations/0009_summary_reconciliation_results.sql
```
Apply it via the Supabase SQL Editor (or your normal migration process)
**before** deploying the modified backend — the 4 summary-engine types
will fail to persist without this table.

### 3. Replace modified files
```
backend-modified-files/main.py            → gstmatch-api/gstmatch-api/main.py
backend-modified-files/models/schemas.py  → gstmatch-api/gstmatch-api/models/schemas.py
backend-modified-files/storage/job_store.py → gstmatch-api/gstmatch-api/storage/job_store.py
backend-modified-files/api/routes/reconcile.py → gstmatch-api/gstmatch-api/api/routes/reconcile.py
backend-modified-files/api/routes/results.py   → gstmatch-api/gstmatch-api/api/routes/results.py
```

Diff each against your current file first — every change is called out in
that file's header comment.

### 4. Test locally before deploying
```bash
cd gstmatch-api/gstmatch-api
uvicorn main:app --reload --port 8000
```
Open `http://localhost:8000/docs`:
1. Try `GET /api/reconciliation-types` — should return all 8 types
2. Try `POST /api/reconcile` with `recon_type=gstr2b_vs_pr` and your usual
   test files — confirm it behaves **identically** to before (it's routed
   through your original, untouched `core/reconciler.py`)
3. Try `recon_type=gstr2a_vs_gstr2b` with two sample files — confirm the
   new invoice engine works, and that `imsStatus` is `null` (only IMS sets it)
4. Try `recon_type=gstr3b_vs_gstr1` with two summary-format files — confirm
   the new summary engine produces sensible line items

### 5. Verify the free-tier fix
Create a test user, run one `gstr2b_vs_pr` reconciliation and one
`gstr3b_vs_gstr1` reconciliation. Confirm `count_for_user()` returns 2 (not
1 in each table separately) and that a third reconciliation attempt of
*either* type gets blocked with the 403 free-tier message.

---

## Frontend integration steps

### 1. Copy new files
```
frontend-new-files/lib/reconTypes.ts           → gstmatch/lib/reconTypes.ts
frontend-new-files/components/ReconTypeSelector.tsx → gstmatch/components/ReconTypeSelector.tsx
frontend-new-files/components/SummaryResults.tsx    → gstmatch/components/SummaryResults.tsx
```

### 2. Replace modified files
```
frontend-modified-files/lib/types.ts             → gstmatch/lib/types.ts
frontend-modified-files/lib/api.ts               → gstmatch/lib/api.ts
frontend-modified-files/app/upload/page.tsx      → gstmatch/app/upload/page.tsx
frontend-modified-files/app/results/[id]/page.tsx → gstmatch/app/results/[id]/page.tsx
```

Diff each against your current file first.

### 3. Test locally
```bash
cd gstmatch
npm run dev
```
1. Visit `/upload` — confirm the type selector grid appears above the
   period/GSTIN row, and that selecting `gstr2b_vs_pr` still shows the
   exact same "Purchase Register" / "GSTR-2B File" labels and format-guide
   table as before
2. Select `GSTR-2A vs GSTR-2B` — confirm the upload zone labels update to
   "GSTR-2A File" / "GSTR-2B File" and the format-guide table disappears
   is NOT the case (it's still an invoice-engine type, guide should still show)
3. Select `GSTR-3B vs GSTR-1` — confirm the format-guide table is hidden
   (summary-engine types don't have invoice-level columns)
4. Run a full `gstr2b_vs_pr` reconciliation end to end — confirm the
   results page looks **pixel-identical** to before (it's the unchanged
   invoice-engine branch)
5. Run a `gstr3b_vs_gstr1` reconciliation — confirm the new
   `SummaryResults` view renders correctly
6. Visit `/results/demo` — confirm the existing demo flow is completely
   unaffected

---

## Rollout order (do not enable all 8 at once)

1. **Deploy backend + frontend with only `gstr2b_vs_pr` type visible.**
   Comment out or conditionally hide the other 7 cards in
   `ReconTypeSelector` initially if you want an extra safety margin — this
   confirms the merge didn't regress the one live type before anything new
   is exposed to real users.
2. **Enable `gstr2a_vs_gstr2b`** — lowest risk, reuses the exact matching
   algorithm, both files are similar formats from the same portal source.
3. **Enable `gstr1_vs_sales_register` and `ims_vs_gstr2b`.**
4. **Test the summary engine thoroughly with real downloaded GSTR-3B/GSTR-1
   files** before enabling `gstr3b_vs_gstr1` / `gstr1_vs_gstr3b` — see the
   risk note below.
5. **Enable `gstr9_vs_books` and `gstr9c_vs_books` last** — lowest usage
   frequency, least real-world file testing so far.

---

## Known risk — summary-engine JSON parsing

`core/parsers/summary_parser.py`'s Excel/CSV path (matching on headers
like "Particulars", "Taxable Value") is reliable — it's also how most CAs
actually export GSTR-3B/9/9C summaries for manual comparison. The JSON
path (`_extract_json_sections`) is a best-effort guess at the GST portal's
JSON structure. **Test with a real downloaded GSTR-3B/GSTR-1/GSTR-9/GSTR-9C
JSON file before trusting JSON uploads for these 4 types in production** —
follow the same verification approach your
`scripts/test_realworld_formats.py` already establishes for the PR/GSTR-2B
parser, and add equivalent test fixtures under `sample-data/` for the new
types.

---

## What's still not covered by this addon

- **Admin dashboard** (`app/admin/page.tsx`, `app/api/admin/overview/route.ts`)
  currently assumes invoice-engine result shape only. Decide explicitly
  whether it needs updating to show summary-engine activity, or whether
  it's acceptable to only report on invoice-engine reconciliations for now.
- **Landing page** — no changes made to `app/page.tsx`. If you want the
  8-card "GST Reconciliation Suite" grid on the homepage (matching your
  earlier screenshots), that's a separate addition — the components here
  (`ReconTypeSelector`) can be reused for it directly.
- **Sample test fixtures** for the 6 new document types — `sample-data/`
  currently only has GSTR-2B/Purchase-Register fixtures. Add equivalent
  files for GSTR-2A, GSTR-1, Sales Register, IMS, GSTR-3B, GSTR-9, GSTR-9C
  before considering each new type production-tested.
