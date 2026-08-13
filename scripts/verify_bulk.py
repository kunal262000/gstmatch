"""
Verify the reconciliation numbers by running the backend engine directly on the
bulk sample data (deterministic seed 42), reproducing the summary that the
deployed backend returned.

Run:
    python scripts/verify_bulk.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "gstmatch" / "gstmatch-api" / "gstmatch-api"))

from core.parser import parse_purchase_register, parse_gstr2b  # noqa: E402
from core.reconciler import reconcile  # noqa: E402

BASE = Path(__file__).resolve().parents[1] / "sample-data"

pr = (BASE / "bulk_purchase_register.csv").read_bytes()
g2 = (BASE / "bulk_gstr2b.json").read_bytes()

pr_df, pr_err = parse_purchase_register(pr, "bulk_purchase_register.csv")
g2_df, g2_err = parse_gstr2b(g2, "bulk_gstr2b.json")
print("parse_err:", pr_err, g2_err)

res = reconcile(pr_df, g2_df, "August 2026", "27AAAAA0000A1Z5", "asd", "verify-job")
s = res.summary

print("=" * 70)
print("SUMMARY")
print("  matched             :", s.matched)
print("  mismatched          :", s.mismatched)
print("  missingInGstr2b     :", s.missingInGstr2b)
print("  missingInPr (extra) :", s.missingInPr)
print("  totalInvoices       :", s.totalInvoices)
print("  complianceScore     :", f"{s.complianceScore}%", "(= round(matched/total*100))")
print("  totalItcAtRisk      :", f"Rs {s.totalItcAtRisk:,.2f}")
print("=" * 70)
print("PER-SUPPLIER (only those with ITC at risk):")
grand = 0.0
for su in res.suppliers:
    grand += su.itcAtRisk
    flag = "  <-- at risk" if su.itcAtRisk > 0 else ""
    print(f"  {su.name:<28} | {su.gstin} | inv={su.invoiceCount:<4} | {su.status.value:<10} | itc={su.itcAtRisk:>12,.2f}{flag}")

print("-" * 70)
print("  SUM of supplier itcAtRisk :", f"Rs {grand:,.2f}")
print("  at-risk suppliers         :", sum(1 for su in res.suppliers if su.itcAtRisk > 0))
print("  invoices affected (at-risk suppliers total) :",
      sum(su.invoiceCount for su in res.suppliers if su.itcAtRisk > 0))
