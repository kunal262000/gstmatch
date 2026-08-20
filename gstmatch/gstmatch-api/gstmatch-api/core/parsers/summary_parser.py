"""
NEW FILE — place at: gstmatch-api/gstmatch-api/core/parsers/summary_parser.py

Parser for reconciliation types that compare TOTALS by category rather
than individual invoices — GSTR-3B vs GSTR-1, GSTR-1 vs GSTR-3B,
GSTR-9 vs Books, GSTR-9C vs Books.

Every summary file is reduced to the same shape: rows of
(section, taxable_value, igst, cgst, sgst, total).

⚠️ Real GSTR-3B / GSTR-9 / GSTR-9C JSON exports from the GST portal have
several structural variants depending on filing period and portal version.
The Excel/CSV path here (matching on column headers like "Particulars" /
"Taxable Value") is the reliable one — it's also how most CAs actually
export these for manual comparison. The JSON path
(_extract_json_sections) is a best-effort attempt; verify against a real
downloaded file before relying on it in production, per the risk note in
agent-instructions-v2.md section 7.
"""
import json
import pandas as pd
from io import BytesIO
from typing import Tuple

from core.parser import _normalize_header

SECTION_ALIASES = {
    "section": ["particulars", "description", "section", "head", "category",
               "label", "nature of supply", "details"],
    "taxable_value": ["taxable value", "taxable amount", "value", "turnover"],
    "igst":  ["igst", "igst amount", "integrated tax"],
    "cgst":  ["cgst", "cgst amount", "central tax"],
    "sgst":  ["sgst", "sgst amount", "state tax", "utgst"],
    "cess":  ["cess", "cess amount"],
    "total": ["total", "total tax", "total amount", "tax amount"],
}


def _match_summary_column(raw_col: str) -> str:
    clean = _normalize_header(raw_col)
    for std_name, aliases in SECTION_ALIASES.items():
        if clean in {_normalize_header(a) for a in aliases}:
            return std_name
    return ""


def _rename_summary_columns(df: pd.DataFrame) -> pd.DataFrame:
    rename_map = {}
    for col in df.columns:
        mapped = _match_summary_column(str(col))
        if mapped and mapped not in rename_map.values():
            rename_map[col] = mapped
    return df.rename(columns=rename_map)


def _clean_summary_df(df: pd.DataFrame, doc_label: str) -> Tuple[pd.DataFrame, str]:
    if "section" not in df.columns:
        return pd.DataFrame(), (
            f"Could not find a 'Particulars' / 'Section' column in {doc_label}. "
            f"Found columns: {list(df.columns)}"
        )

    for col in ["taxable_value", "igst", "cgst", "sgst", "cess", "total"]:
        if col not in df.columns:
            df[col] = 0.0
        df[col] = (
            df[col].astype(str)
            .str.replace(",", "", regex=False)
            .str.replace("₹", "", regex=False)
            .str.strip()
            .pipe(pd.to_numeric, errors="coerce")
            .fillna(0.0)
        )

    if (df["total"] == 0).all():
        df["total"] = df["taxable_value"] + df["igst"] + df["cgst"] + df["sgst"]

    df = df.dropna(subset=["section"])
    df["section"] = df["section"].astype(str).str.strip()
    df = df[df["section"] != ""]

    return df.reset_index(drop=True), ""


def _parse_excel_or_csv(file_bytes: bytes, filename: str, doc_label: str) -> Tuple[pd.DataFrame, str]:
    try:
        if filename.lower().endswith(".csv"):
            df = pd.read_csv(BytesIO(file_bytes), dtype=str)
        else:
            df = pd.read_excel(BytesIO(file_bytes), dtype=str)

        df.columns = df.columns.astype(str)
        df = _rename_summary_columns(df)
        return _clean_summary_df(df, doc_label)

    except Exception as e:
        return pd.DataFrame(), f"Failed to parse {doc_label}: {str(e)}"


def _extract_json_sections(raw: dict) -> list[dict]:
    """Best-effort flattening of common GST portal summary JSON shapes.
    Adjust here if your real downloaded JSON differs — see module docstring."""
    rows = []

    if "summary" in raw and isinstance(raw["summary"], list):
        for item in raw["summary"]:
            rows.append({
                "section":       item.get("label", item.get("section", "Unknown")),
                "taxable_value": float(item.get("taxable_value", item.get("txval", 0)) or 0),
                "igst":          float(item.get("igst", 0) or 0),
                "cgst":          float(item.get("cgst", 0) or 0),
                "sgst":          float(item.get("sgst", 0) or 0),
            })
        return rows

    # GSTR-3B-style: {"sup_details": {...}, "itc_elg": {...}, ...}
    for section_key, section_data in raw.items():
        if isinstance(section_data, dict):
            rows.append({
                "section":       section_key,
                "taxable_value": float(section_data.get("txval", 0) or 0),
                "igst":          float(section_data.get("iamt", 0) or 0),
                "cgst":          float(section_data.get("camt", 0) or 0),
                "sgst":          float(section_data.get("samt", 0) or 0),
            })

    return rows


def _parse_json(file_bytes: bytes, doc_label: str) -> Tuple[pd.DataFrame, str]:
    try:
        raw = json.loads(file_bytes.decode("utf-8"))
        rows = _extract_json_sections(raw)
        if not rows:
            return pd.DataFrame(), (
                f"Could not find recognisable summary sections in {doc_label} JSON. "
                f"Try downloading the Excel version instead."
            )
        df = pd.DataFrame(rows)
        df["cess"]  = 0.0
        df["total"] = df["taxable_value"] + df["igst"] + df["cgst"] + df["sgst"]
        return _clean_summary_df(df, doc_label)

    except json.JSONDecodeError:
        return pd.DataFrame(), f"Invalid JSON file for {doc_label}."
    except Exception as e:
        return pd.DataFrame(), f"Failed to parse {doc_label} JSON: {str(e)}"


def _parse_any(file_bytes: bytes, filename: str, doc_label: str) -> Tuple[pd.DataFrame, str]:
    if filename.lower().endswith(".json"):
        return _parse_json(file_bytes, doc_label)
    return _parse_excel_or_csv(file_bytes, filename, doc_label)


# ─── Public entry points ───────────────────────────────────────────────────────

def parse_gstr3b_summary(file_bytes: bytes, filename: str) -> Tuple[pd.DataFrame, str]:
    return _parse_any(file_bytes, filename, "GSTR-3B")

def parse_gstr1_summary(file_bytes: bytes, filename: str) -> Tuple[pd.DataFrame, str]:
    return _parse_any(file_bytes, filename, "GSTR-1 Summary")

def parse_gstr9_summary(file_bytes: bytes, filename: str) -> Tuple[pd.DataFrame, str]:
    return _parse_any(file_bytes, filename, "GSTR-9")

def parse_gstr9c_summary(file_bytes: bytes, filename: str) -> Tuple[pd.DataFrame, str]:
    return _parse_any(file_bytes, filename, "GSTR-9C")

def parse_books_summary(file_bytes: bytes, filename: str) -> Tuple[pd.DataFrame, str]:
    """User's own Tally/Zoho/Excel export — same shape, generic label."""
    return _parse_any(file_bytes, filename, "Books Summary")
