"""
Generate Excel (.xlsx) versions of the sample reconciliation files.

Creates:
  sample-data/purchase_register.xlsx  - Purchase Register (standard sheet)
  sample-data/gstr2b.xlsx             - GSTR-2B (multi-header row, like GST portal export)

These let you test the Excel parsing path (what real accounting software exports).
"""
import pandas as pd
from pathlib import Path

OUT_DIR = Path(__file__).resolve().parent.parent / "sample-data"

# ── Purchase Register data (10 invoices) ──────────────────────────────────────
pr_data = [
    ["27AAACG1234F1Z5", "Reliance Industries", "INV-1001", "2025-06-02", 100000, 0, 9000, 9000, 118000],
    ["27AAACH5678B1Z2", "Tata Steel Limited", "INV-1002", "2025-06-03", 50000, 0, 4500, 4500, 59000],
    ["07AAACI2345D1Z6", "Infosys Limited", "INV-1003", "2025-06-05", 250000, 45000, 0, 0, 295000],
    ["27AAACJ8765E1Z3", "Bharat Petroleum", "INV-1004", "2025-06-08", 75000, 0, 6750, 6750, 88500],
    ["27AAACK4321F1Z4", "ITC Limited", "INV-1005", "2025-06-10", 180000, 0, 16200, 16200, 212400],
    ["07AAACL9876G1Z1", "Wipro Limited", "INV-1006", "2025-06-12", 320000, 57600, 0, 0, 377600],
    ["27AAACM2468H1Z7", "Maruti Suzuki India", "INV-1007", "2025-06-15", 450000, 0, 40500, 40500, 531000],
    ["27AAACN1357I1Z8", "Tata Motors", "INV-1008", "2025-06-18", 150000, 0, 13500, 13500, 177000],
    ["07AAACO8642J1Z9", "Asian Paints", "INV-1009", "2025-06-20", 89000, 0, 8010, 8010, 105020],
    ["27AAACP7531K1Z1", "Godrej Industries", "INV-1010", "2025-06-22", 64000, 0, 5760, 5760, 75520],
]

pr_df = pd.DataFrame(
    pr_data,
    columns=["Supplier GSTIN", "Supplier Name", "Invoice No", "Invoice Date",
             "Taxable Value", "IGST", "CGST", "SGST", "Invoice Value"],
)
pr_path = OUT_DIR / "purchase_register.xlsx"
with pd.ExcelWriter(pr_path, engine="openpyxl") as writer:
    pr_df.to_excel(writer, sheet_name="Purchase Register", index=False)

# ── GSTR-2B data (9 invoices - 2 extra suppliers not in PR) ──────────────────
# Note: 8 of the PR invoices appear here; INV-1005 & INV-1008 are "missing in GSTR-2B",
# and HDFC/ICICI are "missing in PR". This mirrors the JSON sample's match results.
g2b_rows = [
    ["27AAACG1234F1Z5", "Reliance Industries", "INV-1001", "2025-06-02", 100000, 0, 9000, 9000, 118000],
    ["27AAACH5678B1Z2", "Tata Steel Limited", "INV-1002", "2025-06-03", 50000, 0, 4500, 4500, 59000],
    ["07AAACI2345D1Z6", "Infosys Limited", "INV-1003", "2025-06-05", 250000, 45000, 0, 0, 295000],
    ["27AAACJ8765E1Z3", "Bharat Petroleum", "INV-1004", "2025-06-08", 75000, 0, 6750, 6750, 88500],
    ["07AAACL9876G1Z1", "Wipro Limited", "INV-1006", "2025-06-12", 320000, 57600, 0, 0, 377600],
    ["27AAACM2468H1Z7", "Maruti Suzuki India", "INV-1007", "2025-06-15", 450000, 0, 40500, 40500, 531000],
    ["27AAACP7531K1Z1", "Godrej Industries", "INV-1010", "2025-06-22", 64000, 0, 5760, 5760, 75520],
    ["07AAACX9999H1Z3", "HDFC Bank Ltd", "INV-2001", "2025-06-14", 38000, 0, 3600, 3600, 45000],
    ["07AAACY7777A1Z5", "ICICI Bank Ltd", "INV-2002", "2025-06-17", 57000, 0, 5400, 5400, 67000],
]

# GST portal GSTR-2B Excel typically has a title row, blank row, then header row.
# Build a raw dataframe that mimics that layout.
raw_rows = [["GSTR-2B - B2B (June 2025)"], [""]]
raw_rows.append(["GSTIN", "Supplier Name", "Invoice No", "Invoice Date",
                 "Taxable Value", "IGST", "CGST", "SGST", "Invoice Value"])
for r in g2b_rows:
    raw_rows.append(r)

g2b_df = pd.DataFrame(raw_rows)
g2b_path = OUT_DIR / "gstr2b.xlsx"
with pd.ExcelWriter(g2b_path, engine="openpyxl") as writer:
    g2b_df.to_excel(writer, sheet_name="B2B", index=False, header=False)

print(f"[OK] Created {pr_path}")
print(f"[OK] Created {g2b_path}")
