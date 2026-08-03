"""
Generate a larger test dataset for performance testing.

Creates:
  - sample-data/bulk_purchase_register.csv  (150 invoices)
  - sample-data/bulk_gstr2b.json            (150 invoices: 140 matching + 10 extra)

Run with:
    python scripts/generate_bulk_data.py
"""
import json
import random
from pathlib import Path

random.seed(42)  # deterministic output

OUT_DIR = Path("sample-data")
OUT_DIR.mkdir(exist_ok=True)

# ── Synthetic supplier pool ────────────────────────────────────────────────────
COMPANIES = [
    ("Reliance Industries",      "27AAACG1234F1Z5"),
    ("Tata Steel Limited",       "27AAACH5678B1Z2"),
    ("Infosys Limited",          "07AAACI2345D1Z6"),
    ("Bharat Petroleum",         "27AAACJ8765E1Z3"),
    ("ITC Limited",              "27AAACK4321F1Z4"),
    ("Wipro Limited",            "07AAACL9876G1Z1"),
    ("Maruti Suzuki India",      "27AAACM2468H1Z7"),
    ("Tata Motors",              "27AAACN1357I1Z8"),
    ("Asian Paints",             "07AAACO8642J1Z9"),
    ("Godrej Industries",        "27AAACP7531K1Z1"),
    ("HDFC Bank",                "07AAACX9999H1Z3"),
    ("ICICI Bank",               "07AAACY7777A1Z5"),
    ("Larsen & Toubro",          "27AAACL1234Q1Z2"),
    ("Mahindra & Mahindra",      "27AAACM5678R1Z4"),
    ("Adani Enterprises",        "27AAACA2468S1Z6"),
    ("Bajaj Auto",               "27AAACB1357T1Z8"),
    ("Hindustan Unilever",       "07AAACH8642U1Z1"),
    ("Sun Pharma",               "07AAACS7531V1Z3"),
    ("Coal India",               "27AAACC6420W1Z5"),
    ("NTPC Limited",             "27AAACN5319X1Z7"),
]

N_INVOICES = 150
N_G2B_EXTRA = 10  # invoices in GSTR-2B but NOT in purchase register

# ── Build purchase register (150 rows) ────────────────────────────────────────
header = "gstin,supplier name,invoice no,invoice date,taxable amount,igst,cgst,sgst,total\n"
csv_rows = [header]

pr_invoices = []  # list of dicts for the PR side

for i in range(1, N_INVOICES + 1):
    name, gstin = COMPANIES[(i - 1) % len(COMPANIES)]
    inv_no = f"INV-{i:04d}"

    # Inter-state (IGST) vs intra-state (CGST+SGST)
    is_interstate = (i % 3 == 0)
    taxable = round(random.uniform(5000, 250000), 2)
    rate = random.choice([0.05, 0.12, 0.18, 0.28])

    if is_interstate:
        igst = round(taxable * rate, 2)
        cgst = 0.0
        sgst = 0.0
    else:
        igst = 0.0
        cgst = round(taxable * rate / 2, 2)
        sgst = round(taxable * rate / 2, 2)

    total = round(taxable + igst + cgst + sgst, 2)
    date = f"2025-06-{(i % 28) + 1:02d}"

    csv_rows.append(
        f"{gstin},{name},{inv_no},{date},{taxable:.2f},{igst:.2f},{cgst:.2f},{sgst:.2f},{total:.2f}"
    )

    pr_invoices.append({
        "name": name, "gstin": gstin, "inv_no": inv_no,
        "taxable": taxable, "igst": igst, "cgst": cgst, "sgst": sgst,
        "total": total, "date": date,
    })

# ── Build GSTR-2B: 140 of the 150 PR invoices + 10 extra ──────────────────────
# Randomly drop 10 PR invoices to create "missing_in_gstr2b" category
drop_idx = set(random.sample(range(N_INVOICES), 10))  # 10 invoices missing from GSTR-2B

g2b_suppliers = {}

def add_invoice_to_g2b(supplier_gstin, supplier_name, inv):
    if supplier_gstin not in g2b_suppliers:
        g2b_suppliers[supplier_gstin] = {
            "ctin": supplier_gstin,
            "tradeName": supplier_name,
            "inv": [],
        }
    g2b_suppliers[supplier_gstin]["inv"].append({
        "inum": inv["inv_no"],
        "idt": inv["date"],
        "val": inv["total"],
        "itms": [
            {
                "itm_det": {
                    "txval": round(inv["taxable"], 2),
                    "igst": inv["igst"],
                    "cgst": inv["cgst"],
                    "sgst": inv["sgst"],
                }
            }
        ],
    })

# 140 matching invoices
matching_indices = [i for i in range(N_INVOICES) if i not in drop_idx]
for idx in matching_indices:
    inv = pr_invoices[idx]
    add_invoice_to_g2b(inv["gstin"], inv["name"], inv)

# 10 extra invoices (in GSTR-2B but not in PR) -> "missing_in_pr"
for i in range(N_G2B_EXTRA):
    name, gstin = COMPANIES[(i + 7) % len(COMPANIES)]  # shift to vary suppliers
    inv_no = f"EXT-{i+1:04d}"
    taxable = round(random.uniform(10000, 200000), 2)
    rate = random.choice([0.05, 0.12, 0.18, 0.28])
    is_interstate = (i % 2 == 0)
    if is_interstate:
        igst, cgst, sgst = round(taxable * rate, 2), 0.0, 0.0
    else:
        igst, cgst, sgst = 0.0, round(taxable * rate / 2, 2), round(taxable * rate / 2, 2)
    total = round(taxable + igst + cgst + sgst, 2)
    date = f"2025-06-{(i % 28) + 1:02d}"

    add_invoice_to_g2b(gstin, name, {
        "inv_no": inv_no, "date": date, "total": total,
        "taxable": taxable, "igst": igst, "cgst": cgst, "sgst": sgst,
    })

# ── Sort GSTR-2B suppliers for stable output ──────────────────────────────────
g2b_payload = {
    "data": {
        "docdata": {
            "b2b": list(g2b_suppliers.values()),
        }
    }
}

# ── Write files ───────────────────────────────────────────────────────────────
csv_path = OUT_DIR / "bulk_purchase_register.csv"
json_path = OUT_DIR / "bulk_gstr2b.json"

csv_path.write_text("\n".join(csv_rows), encoding="utf-8")
json_path.write_text(json.dumps(g2b_payload, indent=2), encoding="utf-8")

# ── Report ────────────────────────────────────────────────────────────────────
matched = len(matching_indices)
missing_in_g2b = len(drop_idx)
print(f"[OK] Generated {csv_path}")
print(f"[OK] Generated {json_path}")
print(f"     PR invoices          : {N_INVOICES}")
print(f"     GSTR-2B invoices     : {matched + N_G2B_EXTRA}")
print(f"     Expected matches     : {matched}")
print(f"     Expected missing_in_gstr2b : {missing_in_g2b}")
print(f"     Expected missing_in_pr     : {N_G2B_EXTRA}")
print(f"     Suppliers in GSTR-2B : {len(g2b_suppliers)}")