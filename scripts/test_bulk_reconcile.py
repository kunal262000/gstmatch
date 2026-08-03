"""
Test GSTMatch reconciliation with a bulk dataset (150 invoices).

Runs the reconciliation and measures:
  - Request time
  - Match accuracy vs expected
  - Response size

Run with:
    python scripts/test_bulk_reconcile.py
"""
import json
import time
from pathlib import Path

import httpx

BACKEND = "http://localhost:8000"
FRONTEND = "http://localhost:3001"

SAMPLE_PR   = Path("sample-data/bulk_purchase_register.csv")
SAMPLE_G2B  = Path("sample-data/bulk_gstr2b.json")

EXPECTED = {
    "matched":           140,
    "missing_in_gstr2b":  10,
    "missing_in_pr":      10,
    "total_invoices":    160,  # 150 PR + 10 extra from GSTR-2B (unique invoice rows)
}

def main():
    print("=" * 60)
    print("GSTMatch Bulk Dataset Test (150 invoices)")
    print("=" * 60)

    # ── 1. Run reconciliation ──────────────────────────────────────────────
    print("\n[1] POST /api/reconcile ...")

    start_time = time.perf_counter()
    with SAMPLE_PR.open("rb") as pr_f, SAMPLE_G2B.open("rb") as g2b_f:
        files = {
            "purchase_register": ("bulk_purchase_register.csv", pr_f, "text/csv"),
            "gstr2b":            ("bulk_gstr2b.json",           g2b_f, "application/json"),
        }
        data = {
            "period":        "June 2025",
            "gstin":         "27ABCDE1234F1Z5",
            "business_name": "Bulk Test Business Ltd",
            "user_id":       "bulk-test-user-001",
        }
        resp = httpx.post(f"{BACKEND}/api/reconcile", files=files, data=data, timeout=120)

    elapsed = time.perf_counter() - start_time
    print(f"    Response: {resp.status_code} in {elapsed:.2f}s")

    if resp.status_code != 200:
        print(f"    FAILED: {resp.text}")
        return

    job_id = resp.json()["jobId"]
    print(f"    Job ID: {job_id}")

    # ── 2. Fetch result ────────────────────────────────────────────────────
    print("\n[2] GET /api/results/{job_id} ...")
    start_time = time.perf_counter()
    r = httpx.get(f"{BACKEND}/api/results/{job_id}", timeout=60)
    fetch_elapsed = time.perf_counter() - start_time
    print(f"    Response: {r.status_code} in {fetch_elapsed:.2f}s")

    result = r.json()
    summary = result["summary"]

    # ── 3. Compare with expected ───────────────────────────────────────────
    print("\n[3] Accuracy Check")
    print("-" * 60)
    checks = [
        ("matched",            summary["matched"],          EXPECTED["matched"]),
        ("missing_in_gstr2b",  summary["missingInGstr2b"],  EXPECTED["missing_in_gstr2b"]),
        ("missing_in_pr",      summary["missingInPr"],      EXPECTED["missing_in_pr"]),
        ("totalInvoices",      summary["totalInvoices"],    EXPECTED["total_invoices"]),
    ]

    all_pass = True
    for label, actual, expected in checks:
        status = "PASS" if actual == expected else "FAIL"
        if actual != expected:
            all_pass = False
        print(f"    {label:20s}  actual={actual:4d}  expected={expected:4d}  [{status}]")

    print("-" * 60)
    if all_pass:
        print("    All accuracy checks PASSED")
    else:
        print("    Some accuracy checks FAILED")

    # ── 4. Other metrics ───────────────────────────────────────────────────
    print("\n[4] Performance & Size Metrics")
    print(f"    Reconcile request time : {elapsed:.2f}s")
    print(f"    Result fetch time      : {fetch_elapsed:.2f}s")
    print(f"    Compliance score       : {summary['complianceScore']}/100")
    print(f"    ITC at risk            : Rs {summary['totalItcAtRisk']:,.2f}")
    print(f"    Suppliers in result    : {len(result['suppliers'])}")
    print(f"    Invoice rows in result : {len(result['invoices'])}")
    print(f"    Response size          : {len(r.content):,.0f} bytes")

    # ── 5. Verify frontend can load the results page ──────────────────────
    print("\n[5] GET /results/{job_id} (GUI) ...")
    r_page = httpx.get(f"{FRONTEND}/results/{job_id}", timeout=30)
    print(f"    Response: {r_page.status_code}")
    if r_page.status_code == 200:
        print("    GUI results page loads OK")
    else:
        print(f"    GUI page FAILED: {r_page.status_code}")

    # ── 6. Download Excel & PDF ────────────────────────────────────────────
    print("\n[6] Download reports ...")
    r_excel = httpx.get(f"{BACKEND}/api/results/{job_id}/excel", timeout=60)
    r_pdf = httpx.get(f"{BACKEND}/api/results/{job_id}/pdf", timeout=60)
    print(f"    Excel: {r_excel.status_code} ({len(r_excel.content):,} bytes)")
    print(f"    PDF:   {r_pdf.status_code} ({len(r_pdf.content):,} bytes)")

    # Save downloads
    demo_dir = Path("demo-downloads")
    demo_dir.mkdir(exist_ok=True)
    (demo_dir / "Bulk_Report.xlsx").write_bytes(r_excel.content)
    (demo_dir / "Bulk_Summary.pdf").write_bytes(r_pdf.content)
    print(f"    Saved to demo-downloads/Bulk_Report.xlsx and Bulk_Summary.pdf")

    # ── 7. Save summary JSON ──────────────────────────────────────────────
    summary_data = {
        "test": "bulk-150",
        "job_id": job_id,
        "reconcile_seconds": round(elapsed, 2),
        "fetch_seconds": round(fetch_elapsed, 2),
        "summary": summary,
        "suppliers": len(result["suppliers"]),
        "invoice_rows": len(result["invoices"]),
        "response_size_bytes": len(r.content),
        "accuracy_passed": all_pass,
        "files": {
            "excel_bytes": len(r_excel.content),
            "pdf_bytes": len(r_pdf.content),
        },
    }
    (demo_dir / "bulk-test-summary.json").write_text(
        json.dumps(summary_data, indent=2), encoding="utf-8"
    )

    print("\n" + "=" * 60)
    if all_pass:
        print("BULK TEST COMPLETE: ALL CHECKS PASSED")
    else:
        print("BULK TEST COMPLETE: SOME CHECKS FAILED")
    print("=" * 60)


if __name__ == "__main__":
    main()