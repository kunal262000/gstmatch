"""
Normalizes raw data before matching.
All normalization is deterministic so the same invoice always produces
the same key regardless of which file it came from.
"""
import re
from typing import Optional


def normalize_gstin(raw: Optional[str]) -> str:
    """27 ABCDE 1234 F1Z5  →  27ABCDE1234F1Z5"""
    if not raw:
        return ""
    return re.sub(r"\s+", "", str(raw)).upper().strip()


def normalize_invoice_no(raw: Optional[str]) -> str:
    """INV/2024-25/001  →  INV202425001"""
    if not raw:
        return ""
    # Remove all non-alphanumeric characters and uppercase
    return re.sub(r"[^A-Z0-9]", "", str(raw).upper())


def normalize_amount(raw) -> float:
    """'1,23,456.78'  →  123457.0  (rounded to nearest rupee)"""
    if raw is None:
        return 0.0
    try:
        cleaned = str(raw).replace(",", "").strip()
        return round(float(cleaned))
    except (ValueError, TypeError):
        return 0.0


def normalize_date(raw) -> str:
    """Various date formats  →  DD/MM/YYYY"""
    if not raw:
        return ""
    import pandas as pd
    try:
        dt = pd.to_datetime(raw, dayfirst=True, errors="coerce")
        if pd.isna(dt):
            return str(raw)
        return dt.strftime("%d/%m/%Y")
    except Exception:
        return str(raw)


def make_match_key(gstin: str, invoice_no: str) -> str:
    """Composite key used for exact matching."""
    return f"{normalize_gstin(gstin)}|{normalize_invoice_no(invoice_no)}"
