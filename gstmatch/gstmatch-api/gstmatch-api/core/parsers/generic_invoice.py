"""
NEW FILE — place at: gstmatch-api/gstmatch-api/core/parsers/generic_invoice.py

Parsers for the 4 new invoice-level document types: GSTR-2A, GSTR-1 (as an
invoice list), Sales Register, and IMS.

Deliberately reuses the exact column-matching engine already proven in
core/parser.py (_normalize_header, _match_column with substring fallback,
COLUMN_ALIASES) rather than a separate weaker copy — that logic already
handles Tally/SAP/Zoho/QuickBooks/Busy export variations and false-positive
guarding, and every new parser should inherit that resilience for free.
"""
import json
import pandas as pd
from io import BytesIO
from typing import Tuple

from core.parser import (
    _rename_columns, _fill_missing_tax_cols, _compute_total, _clean_numeric,
)

# ── IMS-only extra alias: the "action" column doesn't exist in core/parser.py
# because the original PR/GSTR-2B flow never needed it ──
_ACTION_ALIASES = [
    "action", "ims action", "status", "invoice status",
    "acceptance status", "ims status", "recipient action",
]


def _match_action_column(raw_col: str) -> str:
    from core.parser import _normalize_header
    clean = _normalize_header(raw_col)
    normalized_aliases = {_normalize_header(a) for a in _ACTION_ALIASES}
    return "action" if clean in normalized_aliases else ""


def _rename_with_action(df: pd.DataFrame) -> pd.DataFrame:
    df = _rename_columns(df)
    if "action" not in df.columns:
        for col in df.columns:
            if _match_action_column(str(col)) == "action":
                df = df.rename(columns={col: "action"})
                break
    return df


# ─── Generic Excel/CSV path — used by GSTR-2A, Sales Register, IMS ────────────

def _parse_excel_or_csv(file_bytes: bytes, filename: str, doc_label: str,
                        with_action: bool = False) -> Tuple[pd.DataFrame, str]:
    try:
        if filename.lower().endswith(".csv"):
            df = pd.read_csv(BytesIO(file_bytes), dtype=str)
        else:
            df = pd.read_excel(BytesIO(file_bytes), dtype=str)

        df.columns = df.columns.astype(str)
        df = _rename_with_action(df) if with_action else _rename_columns(df)

        missing = [c for c in ["gstin", "invoice_no"] if c not in df.columns]
        if missing:
            return pd.DataFrame(), (
                f"Could not find required columns {missing} in {doc_label}. "
                f"Found columns: {list(df.columns)}"
            )

        if "supplier_name" not in df.columns:
            df["supplier_name"] = "Unknown"
        if "invoice_date" not in df.columns:
            df["invoice_date"] = ""

        df = _fill_missing_tax_cols(df)
        df = _compute_total(df)
        df = _clean_numeric(df)

        if "action" not in df.columns:
            df["action"] = ""

        return df, ""

    except Exception as e:
        return pd.DataFrame(), f"Failed to parse {doc_label}: {str(e)}"


# ─── GST portal JSON path — shared b2b structure across 2A/2B/GSTR-1 ──────────

def _parse_gst_json(file_bytes: bytes, doc_label: str) -> Tuple[pd.DataFrame, str]:
    """
    Same nested 'b2b' structure as GSTR-2B's official JSON export
    (see core/parser.py's parse_gstr2b_json). GSTR-2A and GSTR-1 JSON
    exports from the GST portal follow the same shape.
    """
    try:
        raw = json.loads(file_bytes.decode("utf-8"))

        b2b_list = []
        for extractor in (
            lambda r: r["data"]["docdata"]["b2b"],
            lambda r: r["docdata"]["b2b"],
            lambda r: r["b2b"],
        ):
            try:
                b2b_list = extractor(raw)
                if b2b_list:
                    break
            except (KeyError, TypeError):
                continue

        if not b2b_list:
            return pd.DataFrame(), f"No B2B invoice data found in {doc_label} JSON."

        rows = []
        for party in b2b_list:
            gstin = party.get("ctin", "")
            name  = party.get("tradeName", party.get("trdnm", "Unknown"))

            for inv in party.get("inv", []):
                invoice_no   = inv.get("inum", "")
                invoice_date = inv.get("idt", "")
                total_val    = float(inv.get("val", 0))
                action       = inv.get("ims_action", inv.get("action", ""))

                igst_total = cgst_total = sgst_total = txval_total = 0.0
                for item in inv.get("itms", []):
                    det = item.get("itm_det", {})
                    igst_total  += float(det.get("igst",  det.get("iamt",  0)))
                    cgst_total  += float(det.get("cgst",  det.get("camt",  0)))
                    sgst_total  += float(det.get("sgst",  det.get("samt",  0)))
                    txval_total += float(det.get("txval", 0))

                rows.append({
                    "gstin":        gstin,
                    "supplier_name": name,
                    "invoice_no":   invoice_no,
                    "invoice_date": invoice_date,
                    "taxable_amt":  txval_total,
                    "igst":         igst_total,
                    "cgst":         cgst_total,
                    "sgst":         sgst_total,
                    "total":        total_val,
                    "action":       action,
                })

        df = pd.DataFrame(rows)
        df = _clean_numeric(df)
        return df, ""

    except json.JSONDecodeError:
        return pd.DataFrame(), f"Invalid JSON file for {doc_label}. Please re-download from GST portal."
    except Exception as e:
        return pd.DataFrame(), f"Failed to parse {doc_label} JSON: {str(e)}"


def _parse_any(file_bytes: bytes, filename: str, doc_label: str,
               with_action: bool = False) -> Tuple[pd.DataFrame, str]:
    if filename.lower().endswith(".json"):
        return _parse_gst_json(file_bytes, doc_label)
    return _parse_excel_or_csv(file_bytes, filename, doc_label, with_action=with_action)


# ─── Public entry points ───────────────────────────────────────────────────────

def parse_gstr2a(file_bytes: bytes, filename: str) -> Tuple[pd.DataFrame, str]:
    return _parse_any(file_bytes, filename, "GSTR-2A")


def parse_gstr1_invoice(file_bytes: bytes, filename: str) -> Tuple[pd.DataFrame, str]:
    return _parse_any(file_bytes, filename, "GSTR-1")


def parse_sales_register(file_bytes: bytes, filename: str) -> Tuple[pd.DataFrame, str]:
    return _parse_excel_or_csv(file_bytes, filename, "Sales Register")


def parse_ims(file_bytes: bytes, filename: str) -> Tuple[pd.DataFrame, str]:
    """IMS export — same shape as other invoice files, plus an 'action'
    column (Accepted / Rejected / Pending / No Action Taken)."""
    return _parse_any(file_bytes, filename, "IMS", with_action=True)
