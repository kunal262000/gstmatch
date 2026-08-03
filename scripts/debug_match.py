"""Debug: why do real-world format e2e tests get 0 matches?"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path("gstmatch/gstmatch-api/gstmatch-api")))

import pandas as pd
from core.parser import parse_purchase_register, parse_gstr2b
from core.reconciler import reconcile
from core.normalizer import normalize_gstin, normalize_invoice_no, make_match_key

TALLY_CSV = """GSTIN/UIN of Recipient,Supplier Name,Invoice Number,Invoice Date,Taxable Value,IGST,CGST,SGST,Invoice Value
27AAACG1234F1Z5,Reliance Industries,INV-1001,02-Jun-2025,100000,0,9000,9000,118000
27AAACH5678B1Z2,Tata Steel Limited,INV-1002,03-Jun-2025,50000,0,4500,4500,59000
"""

G2B_JSON = {
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

# Parse PR
pr_df, pr_err = parse_purchase_register(TALLY_CSV.encode("utf-8"), "test.csv")
print(f"PR parse: err={pr_err!r}, rows={len(pr_df)}")
print(pr_df.to_string())

# Parse GSTR-2B
g2b_df, g2b_err = parse_gstr2b(json.dumps(G2B_JSON).encode("utf-8"), "g2b.json")
print(f"\nG2B parse: err={g2b_err!r}, rows={len(g2b_df)}")
print(g2b_df.to_string())

# Build keys
print("\n--- Match keys ---")
for _, row in pr_df.iterrows():
    g = normalize_gstin(row.get("gstin", ""))
    inv = normalize_invoice_no(row.get("invoice_no", ""))
    print(f"PR  key: {make_match_key(g, inv)}  total={row.get('total')}")

for _, row in g2b_df.iterrows():
    g = normalize_gstin(row.get("gstin", ""))
    inv = normalize_invoice_no(row.get("invoice_no", ""))
    print(f"G2B key: {make_match_key(g, inv)}  total={row.get('total')}")

# Run reconcile
result = reconcile(pr_df, g2b_df, "June 2025", "27AAAAA0000A1Z5", "Test", "debug-1")
print(f"\nSummary: matched={result.summary.matched}, missing_g2b={result.summary.missingInGstr2b}, missing_pr={result.summary.missingInPr}, total={result.summary.totalInvoices}")