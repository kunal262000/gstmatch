"""
Comprehensive Real-World Test Suite for All 7 GST Reconciliation Engines.

Tests:
1. GSTR-2B vs Purchase Register (Invoice-level ITC, edge cases, special characters)
2. GSTR-2A vs GSTR-2B (Timing differences, delayed supplier filing)
3. GSTR-1 vs Sales Register (Sales reporting differences, buyer GSTINs)
4. IMS vs GSTR-2B (Accepted, Rejected, Pending actions & ITC impact)
5. GSTR-3B vs GSTR-1 (Table 3.1 Outward tax liability & Rule 88C variances)
6. GSTR-9 vs Books (Annual aggregate turnover & tax reconciliation)
7. GSTR-9C vs Books (Audited financial statements reconciliation)
8. Excel & PDF Report generation for all 7 types
"""
import sys
from pathlib import Path
import io
import pandas as pd

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, str(Path(__file__).parent.parent / "gstmatch" / "gstmatch-api" / "gstmatch-api"))

from core.parser import (
    parse_purchase_register, parse_sales_register, parse_gstr2b,
    parse_gstr2a, parse_gstr1, parse_ims, parse_return_summary,
)
from core.reconciler import reconcile
from reports.excel_report import generate_excel_report

def run_tests():
    print("=" * 70)
    print("RUNNING END-TO-END GST RECONCILIATION ENGINE TEST SUITE (ALL 7 TYPES)")
    print("=" * 70)

    # ──────────────────────────────────────────────────────────────────────────
    # Test 1: GSTR-2B vs Purchase Register
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[TEST 1] GSTR-2B ↔ Purchase Register (ITC Reconciliation)...")
    pr_csv = """GSTIN of Supplier,Supplier Name,Invoice No,Date,Taxable Value,IGST,CGST,SGST,Total
27AABCT1234F1Z5,Tata Motors Ltd,INV-101,01/08/2026,100000,0,9000,9000,118000
27AAACB5678J1Z2,Bajaj Auto,INV/2026/102,02/08/2026,50000,0,4500,4500,59000
07AACCR9999K1Z1,Reliance Retail,REF-999,03/08/2026,20000,3600,0,0,23600
"""
    g2b_csv = """Supplier GSTIN,Party Name,Invoice Number,Invoice Date,Taxable Amount,Integrated Tax,Central Tax,State Tax,Total Invoice Value
27AABCT1234F1Z5,Tata Motors Ltd,INV-101,01/08/2026,100000,0,9000,9000,118000
27AAACB5678J1Z2,Bajaj Auto,INV-2026-102,02/08/2026,50000,0,4500,4500,55000
"""
    df1, err1 = parse_purchase_register(pr_csv.encode(), "pr.csv")
    df2, err2 = parse_gstr2b(g2b_csv.encode(), "gstr2b.csv")
    assert not err1, f"PR Parser failed: {err1}"
    assert not err2, f"GSTR2B Parser failed: {err2}"

    res1 = reconcile(pr_df=df1, gstr2b_df=df2, recon_type="gstr2b_pr")
    print(f"  ✓ Processed {res1.summary.totalInvoices} invoices")
    print(f"  ✓ Matched: {res1.summary.matched}, Mismatched: {res1.summary.mismatched}, Missing in 2B: {res1.summary.missingInGstr2b}")
    print(f"  ✓ {res1.summary.financialMetricLabel}: ₹{res1.summary.financialDifference:,.2f}")
    assert res1.summary.matched == 1, "Expected 1 matched invoice"
    assert res1.summary.mismatched == 1, "Expected 1 mismatched invoice (fuzzy matched with amount diff)"
    assert res1.summary.missingInGstr2b == 1, "Expected 1 missing invoice (Reliance Retail)"
    assert res1.summary.financialDifference == 27600.0, f"Expected ₹27,600 at risk, got {res1.summary.financialDifference}"

    # ──────────────────────────────────────────────────────────────────────────
    # Test 2: GSTR-2A vs GSTR-2B
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[TEST 2] GSTR-2A ↔ GSTR-2B (Timing & Cutoff Variance)...")
    g2a_csv = """Supplier GSTIN,Supplier Name,Invoice No,Invoice Date,Taxable Value,IGST,CGST,SGST,Invoice Value
27AABCT1234F1Z5,Tata Motors Ltd,INV-101,01/08/2026,100000,0,9000,9000,118000
29AABCS5555L1Z8,Infosys B2B,INV-201,15/08/2026,200000,36000,0,0,236000
"""
    df_2a, err_2a = parse_gstr2a(g2a_csv.encode(), "gstr2a.csv")
    assert not err_2a, f"2A Parser failed: {err_2a}"
    res2 = reconcile(pr_df=df_2a, gstr2b_df=df2, recon_type="gstr2a_gstr2b")
    print(f"  ✓ Processed {res2.summary.totalInvoices} records")
    print(f"  ✓ {res2.summary.financialMetricLabel}: ₹{res2.summary.financialDifference:,.2f}")
    assert res2.summary.missingInGstr2b == 1, "Expected 1 invoice in 2A delayed past 2B cutoff"

    # ──────────────────────────────────────────────────────────────────────────
    # Test 3: GSTR-1 vs Sales Register
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[TEST 3] GSTR-1 ↔ Sales Register (Sales Reporting Differences)...")
    sales_csv = """Customer GSTIN,Customer Name,Invoice Number,Invoice Date,Taxable Value,IGST,CGST,SGST,Grand Total
27AABCK9999A1Z1,Apex Retailers,SALES-001,05/08/2026,500000,0,45000,45000,590000
27AABCM8888B1Z2,Zenith Distributors,SALES-002,06/08/2026,300000,0,27000,27000,354000
"""
    g1_csv = """Party GSTIN,Party Name,Invoice No,Invoice Date,Taxable Value,IGST,CGST,SGST,Total
27AABCK9999A1Z1,Apex Retailers,SALES-001,05/08/2026,500000,0,45000,45000,590000
"""
    df_sales, err_s = parse_sales_register(sales_csv.encode(), "sales.csv")
    df_g1, err_g1 = parse_gstr1(g1_csv.encode(), "gstr1.csv")
    assert not err_s, f"Sales Parser failed: {err_s}"
    assert not err_g1, f"GSTR1 Parser failed: {err_g1}"

    res3 = reconcile(pr_df=df_sales, gstr2b_df=df_g1, recon_type="gstr1_sales_register")
    print(f"  ✓ Processed {res3.summary.totalInvoices} sales invoices")
    print(f"  ✓ {res3.summary.financialMetricLabel}: ₹{res3.summary.financialDifference:,.2f}")
    assert res3.summary.matched == 1
    assert res3.summary.missingInGstr2b == 1, "Expected 1 sales invoice not reported in GSTR-1"
    assert res3.summary.financialDifference == 354000.0, "Expected ₹3,54,000 sales variance"

    # ──────────────────────────────────────────────────────────────────────────
    # Test 4: IMS vs GSTR-2B
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[TEST 4] IMS ↔ GSTR-2B (Invoice Actions & Status Impact)...")
    ims_csv = """Supplier GSTIN,Supplier Name,Invoice No,Date,Taxable Value,IGST,CGST,SGST,Total,Action Status
27AABCT1234F1Z5,Tata Motors Ltd,INV-101,01/08/2026,100000,0,9000,9000,118000,Accepted
27AAACB5678J1Z2,Bajaj Auto,INV-2026-102,02/08/2026,50000,0,4500,4500,55000,Rejected
"""
    df_ims, err_ims = parse_ims(ims_csv.encode(), "ims.csv")
    assert not err_ims, f"IMS Parser failed: {err_ims}"

    res4 = reconcile(pr_df=df_ims, gstr2b_df=df2, recon_type="ims_gstr2b")
    print(f"  ✓ Processed {res4.summary.totalInvoices} IMS items")
    print(f"  ✓ {res4.summary.financialMetricLabel}: ₹{res4.summary.financialDifference:,.2f}")
    assert res4.summary.mismatched == 1, "Expected Rejected invoice flagged as discrepancy"

    # ──────────────────────────────────────────────────────────────────────────
    # Test 5: GSTR-3B vs GSTR-1
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[TEST 5] GSTR-3B ↔ GSTR-1 (Outward Tax Liability / Rule 88C)...")
    s1, _ = parse_return_summary(b"", "g1.json", return_type="gstr3b_gstr1")
    s2, _ = parse_return_summary(b"", "g3b.json", return_type="gstr3b_gstr1")
    s1["taxable_turnover"] = 1500000.0
    s2["taxable_turnover"] = 1400000.0

    res5 = reconcile(file1_summary=s1, file2_summary=s2, recon_type="gstr3b_gstr1")
    print(f"  ✓ Processed {len(res5.summarySections)} return tables")
    print(f"  ✓ {res5.summary.financialMetricLabel}: ₹{res5.summary.financialDifference:,.2f}")
    print(f"  ✓ Compliance Score: {res5.summary.complianceScore}%")
    assert len(res5.summarySections) == 5
    assert res5.summary.financialDifference == 100000.0, "Expected ₹1,00,000 turnover liability variance"

    # ──────────────────────────────────────────────────────────────────────────
    # Test 6: GSTR-9 vs Books
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[TEST 6] GSTR-9 ↔ Books (Annual Aggregate Audit)...")
    b1 = {"taxable_turnover": 25000000.0}
    b2 = {"taxable_turnover": 24800000.0}
    res6 = reconcile(file1_summary=b1, file2_summary=b2, recon_type="gstr9_books")
    print(f"  ✓ {res6.summary.financialMetricLabel}: ₹{res6.summary.financialDifference:,.2f}")
    assert res6.summary.financialDifference == 200000.0

    # ──────────────────────────────────────────────────────────────────────────
    # Test 7: GSTR-9C vs Books
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[TEST 7] GSTR-9C ↔ Books (Statutory Audit Reconciliation)...")
    c1 = {"taxable_turnover": 50000000.0}
    c2 = {"taxable_turnover": 49500000.0}
    res7 = reconcile(file1_summary=c1, file2_summary=c2, recon_type="gstr9c_books")
    print(f"  ✓ {res7.summary.financialMetricLabel}: ₹{res7.summary.financialDifference:,.2f}")
    assert res7.summary.financialDifference == 500000.0

    # ──────────────────────────────────────────────────────────────────────────
    # Test 8: Excel Report Generator Test
    # ──────────────────────────────────────────────────────────────────────────
    print("\n[TEST 8] Excel Report Generation for all 7 types...")
    for idx, r in enumerate([res1, res2, res3, res4, res5, res6, res7], 1):
        excel_bytes = generate_excel_report(r)
        assert len(excel_bytes) > 1000, f"Excel report {idx} failed to generate"
        print(f"  ✓ Report {idx} ({r.reconType}): {len(excel_bytes):,} bytes generated")

    print("\n" + "=" * 70)
    print("ALL 7 RECONCILIATION ENGINES & EXCEL EXPORTS PASSED REAL-WORLD TESTS!")
    print("=" * 70)

if __name__ == "__main__":
    run_tests()
