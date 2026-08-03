"""Validate that the Excel sample files parse correctly through the backend parser."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path.cwd() / "gstmatch/gstmatch-api/gstmatch-api"))

from core.parser import parse_purchase_register, parse_gstr2b

BASE = Path.cwd() / "sample-data"

# 1. Purchase register Excel
pr_bytes = (BASE / "purchase_register.xlsx").read_bytes()
pr_df, pr_err = parse_purchase_register(pr_bytes, "purchase_register.xlsx")
print(f"Purchase Register Excel: err={pr_err!r}, rows={len(pr_df)}")
if pr_err:
    print("  Columns found:", list(pr_df.columns))
else:
    print("  First row:", pr_df.iloc[0].to_dict())

# 2. GSTR-2B Excel (multi-header)
g2b_bytes = (BASE / "gstr2b.xlsx").read_bytes()
g2b_df, g2b_err = parse_gstr2b(g2b_bytes, "gstr2b.xlsx")
print(f"\nGSTR-2B Excel: err={g2b_err!r}, rows={len(g2b_df)}")
if g2b_err:
    print("  Columns found:", list(g2b_df.columns))
else:
    print("  First row:", g2b_df.iloc[0].to_dict())
