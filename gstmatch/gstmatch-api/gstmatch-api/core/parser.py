"""
Parses uploaded files into standardised DataFrames.

Purchase Register:  Excel (.xlsx/.xls) or CSV
GSTR-2B:            Excel (.xlsx/.xls) OR official JSON from GST portal

Output DataFrame columns (both files):
    gstin | supplier_name | invoice_no | invoice_date
    taxable_amt | igst | cgst | sgst | total

Real-world format support:
    Handles export variations from Tally ERP 9/Prime, SAP Business One,
    Zoho Books, QuickBooks, Busy Accounting, CA Excel templates,
    and the official GST portal GSTR-2B JSON/Excel.
"""
import json
import re
import pandas as pd
from io import BytesIO
from typing import Tuple


# ─── Column aliases ────────────────────────────────────────────────────────────
# Maps every common column name variant → our standard column name.
# All aliases are matched against *normalized* headers (lowercase, punctuation
# stripped, extra whitespace collapsed), so trailing periods, #, apostrophes,
# currency symbols, and slashes in source headers are handled automatically.
COLUMN_ALIASES = {
    "gstin": [
        "gstin", "supplier gstin", "vendor gstin", "party gstin",
        "customer gstin", "recipient gstin", "supplier gst",
        "vendor gst", "gst no", "gst number", "gstin uin",
        "gstin of recipient", "gst identification no",
        "gst identification number", "gstin no", "gstin number",
        "gst no of supplier", "gst no of vendor",
        "gst number of supplier", "gst number of vendor",
        "gstin of supplier", "gstin of vendor", "gstin of party",
        "suppliers gstin", "suppliers gst", "supplier gstin of",
        "gstin of supplier", "gst no", "tin", "gstin of supplier",
    ],
    "supplier_name": [
        "supplier name", "vendor name", "party name", "name",
        "supplier", "vendor", "party", "trade name", "tradename",
        "suppliers name", "suppliers", "vendors name",
        "creditor name", "creditor", "account name", "ledger name",
        "bill from", "counterparty name",
    ],
    "invoice_no": [
        "invoice no", "invoice number", "bill no", "bill number",
        "voucher no", "voucher number", "inv no", "invoice", "bill",
        "ref no", "reference number", "invoice doc", "document no",
        "document number", "doc no", "doc number", "vch no",
        "invoice id", "bill id", "no", "inv number", "inv num",
        "invoice num", "bill num", "purchase invoice no",
        "supplier invoice no", "vendor invoice no", "sales invoice no",
        "document num", "invoice number", "invoice no of supplier",
    ],
    "invoice_date": [
        "invoice date", "bill date", "date", "voucher date",
        "inv date", "invoice dt", "document date", "doc date",
        "transaction date", "posting date", "entry date", "vch date",
        "inv dt", "tax invoice date", "purchase date",
        "supplier invoice date", "bill date dt",
    ],
    "taxable_amt": [
        "taxable amount", "taxable value", "taxable amt",
        "basic amount", "value", "taxable", "base amount",
        "assessable value", "taxable value inr", "taxable amount inr",
        "taxable value rs", "taxable amount rs", "assessable amount",
        "tax base amount", "tax base", "base value", "subtotal",
        "sub total", "net value", "net amount", "taxable turnover",
        "txn value", "taxable value of", "taxable amount of",
    ],
    "igst": [
        "igst", "igst amount", "integrated tax", "igst inr",
        "integrated gst", "igst amt", "integrated tax amount",
        "integrated gst amount", "input service tax", "igst amount inr",
        "integrated tax inr", "igst tax", "igst value", "igst rs",
    ],
    "cgst": [
        "cgst", "cgst amount", "central tax", "cgst inr",
        "central gst", "cgst amt", "central tax amount",
        "central gst amount", "cen tax", "central tax amt",
        "cgst amount inr", "central tax inr", "cgst tax",
        "cgst value", "cgst rs",
    ],
    "sgst": [
        "sgst", "sgst amount", "state tax", "sgst inr",
        "state gst", "sgst amt", "state tax amount",
        "state gst amount", "state tax amt", "utgst",
        "utgst amount", "sgst amount inr", "state tax inr",
        "sgst tax", "sgst value", "sgst rs",
    ],
    "total": [
        "total", "total amount", "invoice amount", "invoice value",
        "total value", "gross amount", "net amount", "amount",
        "total invoice amount", "total invoice value", "bill amount",
        "bill value", "invoice total", "total bill amount",
        "total bill value", "grand total", "invoice amount inr",
        "total amount inr", "amount inr", "total rs",
        "total amount rs", "net payable", "gross total",
        "total payable", "invoice value inr", "bill amount inr",
        "total bill amount inr", "total amt", "net total",
    ],
}

# Fields where substring matching is SAFE (avoid false positives)
_SUBSTRING_OK = {
    "gstin": True,
    "invoice_no": True,
    "invoice_date": True,
    "supplier_name": True,
}

# Common false-positive substrings to reject
_FALSE_SUBSTRINGS = {
    "gstin": ["nout", "outing", "stain"],
    "invoice_no": [],
    "invoice_date": ["update"],
    "supplier_name": ["surname"],
}


def _normalize_header(raw_col: str) -> str:
    """Normalize a header for matching: lowercase, strip punctuation & symbols."""
    clean = str(raw_col).strip().lower()
    # Replace non-alphanumeric sequences with a single space
    clean = re.sub(r"[^a-z0-9]+", " ", clean)
    return " ".join(clean.split())


def _match_column(raw_col: str) -> str:
    """Map a raw column header to our standard name. Returns '' if unrecognised."""
    clean = _normalize_header(raw_col)

    # 1. Exact match first
    for std_name, aliases in COLUMN_ALIASES.items():
        norm_aliases = {_normalize_header(a) for a in aliases}
        if clean in norm_aliases:
            return std_name

    # 2. Substring match for safe fields
    for std_name in _SUBSTRING_OK:
        if not _SUBSTRING_OK[std_name]:
            continue
        norm_aliases = [_normalize_header(a) for a in COLUMN_ALIASES[std_name]]
        for alias in norm_aliases:
            if len(alias) >= 3 and alias in clean:
                # Check no false-positive substrings are in the header
                if any(fp in clean for fp in _FALSE_SUBSTRINGS.get(std_name, [])):
                    continue
                return std_name

    return ""


def _rename_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Rename raw headers to standard names."""
    rename_map = {}
    for col in df.columns:
        mapped = _match_column(str(col))
        if mapped:
            # Only map each standard name once; keep the first match
            if mapped not in rename_map.values():
                rename_map[col] = mapped
    return df.rename(columns=rename_map)


def _fill_missing_tax_cols(df: pd.DataFrame) -> pd.DataFrame:
    """Fill missing tax columns with 0."""
    for col in ["igst", "cgst", "sgst", "taxable_amt"]:
        if col not in df.columns:
            df[col] = 0.0
    return df


def _compute_total(df: pd.DataFrame) -> pd.DataFrame:
    """If 'total' column missing, compute from taxable + tax."""
    if "total" not in df.columns:
        df["total"] = df["taxable_amt"] + df["igst"] + df["cgst"] + df["sgst"]
    return df


def _clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Drop rows with empty GSTIN or invoice_no, strip whitespace."""
    df = df.dropna(subset=["gstin", "invoice_no"], how="any")
    df = df[df["gstin"].astype(str).str.strip() != ""]
    df = df[df["invoice_no"].astype(str).str.strip() != ""]

    # Convert numeric columns
    for col in ["taxable_amt", "igst", "cgst", "sgst", "total"]:
        df[col] = (
            df[col].astype(str)
            .str.replace(",", "", regex=False)
            .str.replace("₹", "", regex=False)
            .str.replace("rs", "", regex=False)
            .str.strip()
            .pipe(pd.to_numeric, errors="coerce")
            .fillna(0.0)
        )

    return df.reset_index(drop=True)


# ─── Purchase Register parser ──────────────────────────────────────────────────

def parse_purchase_register(file_bytes: bytes, filename: str) -> Tuple[pd.DataFrame, str]:
    """
    Returns (DataFrame, error_message).
    error_message is empty string on success.
    """
    try:
        if filename.endswith(".csv"):
            df = pd.read_csv(BytesIO(file_bytes), dtype=str)
        else:
            df = pd.read_excel(BytesIO(file_bytes), dtype=str)

        df.columns = df.columns.astype(str)
        df = _rename_columns(df)

        missing = [c for c in ["gstin", "invoice_no"] if c not in df.columns]
        if missing:
            return pd.DataFrame(), (
                f"Could not find columns: {missing}. "
                f"Found columns: {list(df.columns)}"
            )

        if "supplier_name" not in df.columns:
            df["supplier_name"] = "Unknown Supplier"

        if "invoice_date" not in df.columns:
            df["invoice_date"] = ""

        df = _fill_missing_tax_cols(df)
        df = _compute_total(df)
        df = _clean_dataframe(df)

        return df, ""

    except Exception as e:
        return pd.DataFrame(), f"Failed to parse purchase register: {str(e)}"


# ─── GSTR-2B parsers ───────────────────────────────────────────────────────────

def parse_gstr2b_excel(file_bytes: bytes) -> Tuple[pd.DataFrame, str]:
    """Parse GSTR-2B downloaded as Excel from GST portal."""
    try:
        # GST portal Excel has multiple sheets; try to find the B2B sheet
        xl = pd.ExcelFile(BytesIO(file_bytes))
        sheet_name = None
        for sh in xl.sheet_names:
            if "b2b" in sh.lower() or "invoice" in sh.lower():
                sheet_name = sh
                break
        if not sheet_name:
            sheet_name = xl.sheet_names[0]

        df = pd.read_excel(BytesIO(file_bytes), sheet_name=sheet_name,
                           header=None, dtype=str)

        # Find the actual header row (first row with 'gstin' or 'invoice' text)
        header_row = 0
        for i, row in df.iterrows():
            row_str = " ".join(str(v).lower() for v in row.values)
            if "gstin" in row_str or "invoice" in row_str:
                header_row = i
                break

        df.columns = df.iloc[header_row]
        df = df.iloc[header_row + 1:].reset_index(drop=True)
        df.columns = df.columns.astype(str)
        df = _rename_columns(df)

        if "supplier_name" not in df.columns:
            df["supplier_name"] = "Unknown Supplier"
        if "invoice_date" not in df.columns:
            df["invoice_date"] = ""

        df = _fill_missing_tax_cols(df)
        df = _compute_total(df)
        df = _clean_dataframe(df)

        return df, ""

    except Exception as e:
        return pd.DataFrame(), f"Failed to parse GSTR-2B Excel: {str(e)}"


def parse_gstr2b_json(file_bytes: bytes) -> Tuple[pd.DataFrame, str]:
    """
    Parse official GSTR-2B JSON downloaded from GST portal.
    Handles both the 'data.docdata.b2b' structure and variations.
    """
    try:
        raw = json.loads(file_bytes.decode("utf-8"))

        # Navigate to B2B invoices — handle nested structure
        b2b_list = []
        try:
            b2b_list = raw["data"]["docdata"]["b2b"]
        except (KeyError, TypeError):
            try:
                b2b_list = raw["docdata"]["b2b"]
            except (KeyError, TypeError):
                try:
                    b2b_list = raw["b2b"]
                except (KeyError, TypeError):
                    pass

        if not b2b_list:
            return pd.DataFrame(), "No B2B invoice data found in GSTR-2B JSON."

        rows = []
        for supplier in b2b_list:
            gstin    = supplier.get("ctin", "")
            sup_name = supplier.get("tradeName", supplier.get("trdnm", "Unknown"))

            for inv in supplier.get("inv", []):
                invoice_no   = inv.get("inum", "")
                invoice_date = inv.get("idt", "")
                total_val    = float(inv.get("val", 0))

                igst_total = cgst_total = sgst_total = txval_total = 0.0
                for item in inv.get("itms", []):
                    det = item.get("itm_det", {})
                    igst_total  += float(det.get("igst",  det.get("iamt",  0)))
                    cgst_total  += float(det.get("cgst",  det.get("camt",  0)))
                    sgst_total  += float(det.get("sgst",  det.get("samt",  0)))
                    txval_total += float(det.get("txval", 0))

                rows.append({
                    "gstin":        gstin,
                    "supplier_name": sup_name,
                    "invoice_no":   invoice_no,
                    "invoice_date": invoice_date,
                    "taxable_amt":  txval_total,
                    "igst":         igst_total,
                    "cgst":         cgst_total,
                    "sgst":         sgst_total,
                    "total":        total_val,
                })

        df = pd.DataFrame(rows)
        df = _clean_dataframe(df)
        return df, ""

    except json.JSONDecodeError:
        return pd.DataFrame(), "Invalid JSON file. Please download GSTR-2B again from GST portal."
    except Exception as e:
        return pd.DataFrame(), f"Failed to parse GSTR-2B JSON: {str(e)}"


def parse_gstr2b(file_bytes: bytes, filename: str) -> Tuple[pd.DataFrame, str]:
    """Auto-detect format and parse GSTR-2B."""
    if filename.endswith(".json"):
        return parse_gstr2b_json(file_bytes)
    else:
        return parse_gstr2b_excel(file_bytes)