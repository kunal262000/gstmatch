"""
Test GSTMatch parser against real-world export formats.

Simulates the exact column headers used by popular Indian accounting software:
  1. Tally ERP 9 / Prime       (GSTIN/UIN of Recipient, Supplier Name, ...)
  2. SAP Business One          (Vendor GSTIN, Invoice Number, ...)
  3. Zoho Books                (GST Identification No., Vendor Name, ...)
  4. QuickBooks                (Vendor, No., Transaction Date, ...)
  5. Busy Accounting           (Voucher No., Party Name, ...)
  6. GST Portal GSTR-2B Excel  (multi-sheet, multi-header-row)
  7. CA Excel Template         (Supplier's GSTIN, Bill No., ...)

This proves the parser won't break with real-world file formats.
"""
import io
import json
import sys
from pathlib import Path

import httpx
import pandas as pd

sys.path.insert(0, str(Path("gstmatch/gstmatch-api/gstmatch-api")))

from core.parser import parse_purchase_register, parse_gstr2b  # noqa: E402

BACKEND = "http://localhost:8000"

# ══════════════════════════════════════════════════════════════════════════════
# Real-world format samples (using REAL headers these tools export)
# ══════════════════════════════════════════════════════════════════════════════

TALLY_CSV = """GSTIN/UIN of Recipient,Supplier Name,Invoice Number,Invoice Date,Taxable Value,IGST,CGST,SGST,Invoice Value
27AAACG1234F1Z5,Reliance Industries,INV-1001,02-Jun-2025,100000,0,9000,9000,118000
27AAACH5678B1Z2,Tata Steel Limited,INV-1002,03-Jun-2025,50000,0,4500,4500,59000
"""

SAP_CSV = """Vendor GSTIN,Vendor Name,Invoice Doc.,Doc. Date,Tax Base Amount,Input Service Tax,Cen. Tax,State Tax,Total Amount
27AAACG1234F1Z5,Reliance Industries,INV-1001,2025-06-02,100000,0,9000,9000,118000
27AAACH5678B1Z2,Tata Steel Limited,INV-1002,2025-06-03,50000,0,4500,4500,59000
"""

ZOHO_CSV = """GST Identification No.,Vendor Name,Bill #,Bill Date,Subtotal,IGST,CGST,SGST,Total
27AAACG1234F1Z5,Reliance Industries,INV-1001,2025-06-02,100000,0,9000,9000,118000
27AAACH5678B1Z2,Tata Steel Limited,INV-1002,2025-06-03,50000,0,4500,4500,59000
"""

QUICKBOOKS_CSV = """Vendor,No.,Transaction Date,Amount
Reliance Industries,INV-1001,06/02/2025,118000
Tata Steel Limited,INV-1002,06/03/2025,59000
"""

BUSY_CSV = """Voucher No.,Party Name,Party GSTIN,Date,Taxable Amount,Integrated Tax,Central Tax,State Tax,Bill Amount
INV-1001,Reliance Industries,27AAACG1234F1Z5,02-06-2025,100000,0,9000,9000,118000
INV-1002,Tata Steel Limited,27AAACH5678B1Z2,03-06-2025,50000,0,4500,4500,59000
"""

CA_TEMPLATE_CSV = """Supplier's GSTIN,Supplier's Name,Bill No.,Bill Date,Assessable Value,IGST Amt.,CGST Amt.,SGST Amt.,Total Bill Value
27AAACG1234F1Z5,Reliance Industries,INV-1001,02-06-2025,100000,0,9000,9000,118000
27AAACH5678B1Z2,Tata Steel Limited,INV-1002,03-06-2025,50000,0,4500,4500,59000
"""


def test_purchase_register_format(name: str, csv_content: str) -> bool:
    """Parse a CSV with realistic headers and check it extracted the right data."""
    result_df, err = parse_purchase_register(csv_content.encode("utf-8"), "test.csv")
    if err:
        print(f"  [FAIL] {name}: {err}")
        return False

    if len(result_df) < 2:
        print(f"  [FAIL] {name}: only {len(result_df)} row(s) parsed")
        return False

    # Verify key fields got mapped
    row0 = result_df.iloc[0]
    checks = {
        "gstin": str(row0.get("gstin", "")).strip() == "27AAACG1234F1Z5",
        "supplier_name": "Reliance" in str(row0.get("supplier_name", "")),
        "invoice_no": str(row0.get("invoice_no", "")).strip() == "INV-1001",
        "total": float(row0.get("total", 0)) == 118000.0,
    }

    failed = [k for k, v in checks.items() if not v]
    if failed:
        print(f"  [FAIL] {name}: missing/wrong fields: {failed}")
        print(f"         row0 = {dict(row0)}")
        return False

    print(f"  [PASS] {name}: parsed {len(result_df)} rows correctly")
    return True


def test_gstr2b_official_json() -> bool:
    """Parse the official GST portal GSTR-2B JSON format."""
    payload = {
        "data": {
            "docdata": {
                "b2b": [
                    {
                        "ctin": "27AAACG1234F1Z5",
                        "trdnm": "Reliance Industries",
                        "inv": [
                            {
                                "inum": "INV-1001",
                                "idt": "2025-06-02",
                                "val": 118000,
                                "itms": [
                                    {
                                        "itm_det": {
                                            "txval": 100000,
                                            "iamt": 0,
                                            "camt": 9000,
                                            "samt": 9000,
                                        }
                                    }
                                ],
                            }
                        ],
                    },
                    {
                        "ctin": "27AAACH5678B1Z2",
                        "trdnm": "Tata Steel Ltd",
                        "inv": [
                            {
                                "inum": "INV-1002",
                                "idt": "2025-06-03",
                                "val": 59000,
                                "itms": [
                                    {
                                        "itm_det": {
                                            "txval": 50000,
                                            "iamt": 0,
                                            "camt": 4500,
                                            "samt": 4500,
                                        }
                                    }
                                ],
                            }
                        ],
                    },
                ]
            }
        }
    }
    json_bytes = json.dumps(payload).encode("utf-8")
    result_df, err = parse_gstr2b(json_bytes, "gstr2b.json")
    if err:
        print(f"  [FAIL] GSTR-2B official JSON: {err}")
        return False
    if len(result_df) != 2:
        print(f"  [FAIL] GSTR-2B official JSON: expected 2 rows, got {len(result_df)}")
        return False
    print(f"  [PASS] GSTR-2B official JSON: parsed {len(result_df)} rows correctly")
    return True


def test_gstr2b_excel_multi_header() -> bool:
    """Simulate the GST portal's multi-sheet, multi-header-row Excel."""
    import tempfile

    # Build an Excel with a title row, a blank row, then header row
    df_raw = pd.DataFrame(
        [
            ["GST RETURN - 2B (Summary)"],
            [""],
            ["GSTIN", "Supplier Name", "Invoice No", "Invoice Date",
             "Taxable Value", "IGST", "CGST", "SGST", "Invoice Value"],
            ["27AAACG1234F1Z5", "Reliance Industries", "INV-1001",
             "2025-06-02", 100000, 0, 9000, 9000, 118000],
            ["27AAACH5678B1Z2", "Tata Steel Limited", "INV-1002",
             "2025-06-03", 50000, 0, 4500, 4500, 59000],
        ]
    )
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine="openpyxl") as writer:
        df_raw.to_excel(writer, sheet_name="B2B", index=False, header=False)
    buf.seek(0)

    result_df, err = parse_gstr2b(buf.getvalue(), "gstr2b.xlsx")
    if err:
        print(f"  [FAIL] GSTR-2B multi-header Excel: {err}")
        return False
    if len(result_df) != 2:
        print(f"  [FAIL] GSTR-2B multi-header Excel: expected 2 rows, got {len(result_df)}")
        return False
    print(f"  [PASS] GSTR-2B multi-header Excel: parsed {len(result_df)} rows correctly")
    return True


def test_end_to_end_api(csv_name: str, csv_content: str) -> bool:
    """Send a real-world format through the full API pipeline."""
    import tempfile

    # Build a JSON GSTR-2B that matches the CSV rows
    g2b_payload = {
        "data": {
            "docdata": {
                "b2b": [
                    {
                        "ctin": "27AAACG1234F1Z5",
                        "trdnm": "Reliance Industries",
                        "inv": [
                            {
                                "inum": "INV-1001",
                                "idt": "2025-06-02",
                                "val": 118000,
                                "itms": [{"itm_det": {"txval": 100000, "iamt": 0, "camt": 9000, "samt": 9000}}],
                            }
                        ],
                    },
                    {
                        "ctin": "27AAACH5678B1Z2",
                        "trdnm": "Tata Steel Limited",
                        "inv": [
                            {
                                "inum": "INV-1002",
                                "idt": "2025-06-03",
                                "val": 59000,
                                "itms": [{"itm_det": {"txval": 50000, "iamt": 0, "camt": 4500, "samt": 4500}}],
                            }
                        ],
                    },
                ]
            }
        }
    }

    pr_path = Path(tempfile.mktemp(suffix=".csv"))
    g2b_path = Path(tempfile.mktemp(suffix=".json"))
    pr_path.write_text(csv_content, encoding="utf-8")
    g2b_path.write_text(json.dumps(g2b_payload), encoding="utf-8")

    try:
        with pr_path.open("rb") as pr_f, g2b_path.open("rb") as g2b_f:
            files = {
                "purchase_register": (pr_path.name, pr_f, "text/csv"),
                "gstr2b":            (g2b_path.name, g2b_f, "application/json"),
            }
            data = {
                "period":        "June 2025",
                "gstin":         "27AAAAA0000A1Z5",
                "business_name": "Real World Test",
                "user_id":       "rw-test-user",
            }
            resp = httpx.post(f"{BACKEND}/api/reconcile", files=files, data=data, timeout=60)

        if resp.status_code != 200:
            print(f"  [FAIL] API e2e ({csv_name}): {resp.status_code} {resp.text[:200]}")
            return False

        # POST /api/reconcile only returns {jobId, message}; fetch full result
        job_id = resp.json().get("jobId")
        if not job_id:
            print(f"  [FAIL] API e2e ({csv_name}): no jobId in response: {resp.json()}")
            return False

        result_resp = httpx.get(f"{BACKEND}/api/results/{job_id}", timeout=60)
        if result_resp.status_code != 200:
            print(f"  [FAIL] API e2e ({csv_name}): fetch result failed: {result_resp.status_code}")
            return False

        result = result_resp.json()
        summary = result.get("summary", {})
        matched = summary.get("matched", 0)
        if matched != 2:
            print(f"  [FAIL] API e2e ({csv_name}): expected 2 matched, got {matched}")
            print(f"         summary = {summary}")
            for inv in result.get("invoices", [])[:4]:
                print(f"         inv: {inv['gstin']} / {inv['invoiceNo']} cat={inv['category']}")
            return False

        print(f"  [PASS] API e2e ({csv_name}): 2 rows matched via API")
        return True
    finally:
        pr_path.unlink(missing_ok=True)
        g2b_path.unlink(missing_ok=True)


def main():
    print("=" * 70)
    print("GSTMatch Real-World Format Compatibility Test")
    print("=" * 70)
    results = []

    # ── 1. Purchase Register format coverage ──────────────────────────────
    print("\n[1] Purchase Register format parsing (direct parser test)")
    print("-" * 70)
    pr_tests = [
        ("Tally ERP 9 / Prime",    TALLY_CSV),
        ("SAP Business One",        SAP_CSV),
        ("Zoho Books",              ZOHO_CSV),
        ("QuickBooks",              QUICKBOOKS_CSV),
        ("Busy Accounting",         BUSY_CSV),
        ("CA Excel Template",       CA_TEMPLATE_CSV),
    ]
    for name, content in pr_tests:
        results.append(("PR parse: " + name, test_purchase_register_format(name, content)))

    # ── 2. GSTR-2B format coverage ────────────────────────────────────────
    print("\n[2] GSTR-2B format parsing (direct parser test)")
    print("-" * 70)
    results.append(("GSTR-2B official JSON", test_gstr2b_official_json()))
    results.append(("GSTR-2B multi-header Excel", test_gstr2b_excel_multi_header()))

    # ── 3. End-to-end API with real-world formats ─────────────────────────
    print("\n[3] End-to-end API test (real-world format -> reconcile API)")
    print("-" * 70)
    e2e_tests = [
        ("Tally ERP 9",   TALLY_CSV),
        ("SAP",           SAP_CSV),
        ("Zoho Books",    ZOHO_CSV),
        ("CA Template",   CA_TEMPLATE_CSV),
    ]
    for name, content in e2e_tests:
        results.append(("API e2e: " + name, test_end_to_end_api(name, content)))

    # ── Summary ──────────────────────────────────────────────────────────
    print("\n" + "=" * 70)
    print("SUMMARY")
    print("=" * 70)
    passed = sum(1 for _, ok in results if ok)
    for name, ok in results:
        print(f"  [{'PASS' if ok else 'FAIL'}] {name}")
    print(f"\n  {passed}/{len(results)} checks passed")

    if passed == len(results):
        print("\n  ALL REAL-WORLD FORMAT CHECKS PASSED")
    else:
        print("\n  SOME FORMAT CHECKS FAILED")
    print("=" * 70)


if __name__ == "__main__":
    main()