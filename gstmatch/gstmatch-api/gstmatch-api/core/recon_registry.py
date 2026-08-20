"""
NEW FILE — place at: gstmatch-api/gstmatch-api/core/recon_registry.py

Central registry of every reconciliation type GSTMatch supports.
Single source of truth read by the reconcile route, the results route,
and (via /api/reconciliation-types) the frontend type-selector.

To add a future reconciliation type: write a parser, add one entry here.
Nothing else needs to change.
"""
from dataclasses import dataclass
from typing import Callable, Optional
import pandas as pd

from core.parser import parse_purchase_register, parse_gstr2b
from core.parsers.generic_invoice import (
    parse_gstr2a, parse_gstr1_invoice, parse_sales_register, parse_ims,
)
from core.parsers.summary_parser import (
    parse_gstr3b_summary, parse_gstr1_summary,
    parse_gstr9_summary, parse_gstr9c_summary, parse_books_summary,
)

ParserFn = Callable[[bytes, str], "tuple[pd.DataFrame, str]"]


@dataclass
class ReconTypeConfig:
    id:            str
    name:          str
    short_name:    str
    description:   str
    icon:          str
    engine:        str            # "invoice" | "summary"
    file1_label:   str
    file2_label:   str
    file1_hint:    str
    file2_hint:    str
    file1_parser:  ParserFn
    file2_parser:  ParserFn
    badge:         Optional[str] = None


RECON_TYPES: dict[str, ReconTypeConfig] = {

    "gstr2b_vs_pr": ReconTypeConfig(
        id="gstr2b_vs_pr",
        name="GSTR-2B vs Purchase Register",
        short_name="GSTR-2B vs PR",
        description="Match ITC-eligible invoices, find missing invoices, value mismatches and more.",
        icon="📄",
        engine="invoice",
        file1_label="Purchase Register",
        file2_label="GSTR-2B File",
        file1_hint="Your Excel or CSV purchase register",
        file2_hint="GST Portal → Returns → GSTR-2B → Download JSON or Excel",
        file1_parser=parse_purchase_register,
        file2_parser=parse_gstr2b,
    ),

    "gstr2a_vs_gstr2b": ReconTypeConfig(
        id="gstr2a_vs_gstr2b",
        name="GSTR-2A vs GSTR-2B",
        short_name="GSTR-2A vs GSTR-2B",
        description="Compare 2A and 2B to identify why invoices are missing in 2B.",
        icon="🔄",
        engine="invoice",
        file1_label="GSTR-2A File",
        file2_label="GSTR-2B File",
        file1_hint="GST Portal → Returns → GSTR-2A → Download JSON or Excel",
        file2_hint="GST Portal → Returns → GSTR-2B → Download JSON or Excel",
        file1_parser=parse_gstr2a,
        file2_parser=parse_gstr2b,
        badge="POPULAR",
    ),

    "gstr1_vs_sales_register": ReconTypeConfig(
        id="gstr1_vs_sales_register",
        name="GSTR-1 vs Sales Register",
        short_name="GSTR-1 vs Sales",
        description="Ensure all your sales are reported in GSTR-1. Find missing or mismatched invoices.",
        icon="🧾",
        engine="invoice",
        file1_label="Sales Register",
        file2_label="GSTR-1 File",
        file1_hint="Your Excel or CSV sales register",
        file2_hint="GST Portal → Returns → GSTR-1 → Download JSON or Excel",
        file1_parser=parse_sales_register,
        file2_parser=parse_gstr1_invoice,
    ),

    "ims_vs_gstr2b": ReconTypeConfig(
        id="ims_vs_gstr2b",
        name="IMS vs GSTR-2B",
        short_name="IMS vs GSTR-2B",
        description="Check invoice acceptance / rejection status in IMS and its impact on 2B.",
        icon="📋",
        engine="invoice",
        file1_label="IMS Action File",
        file2_label="GSTR-2B File",
        file1_hint="GST Portal → IMS → Download action report (Excel)",
        file2_hint="GST Portal → Returns → GSTR-2B → Download JSON or Excel",
        file1_parser=parse_ims,
        file2_parser=parse_gstr2b,
    ),

    "gstr3b_vs_gstr1": ReconTypeConfig(
        id="gstr3b_vs_gstr1",
        name="GSTR-3B vs GSTR-1",
        short_name="GSTR-3B vs GSTR-1",
        description="Verify tax liability declared in GSTR-3B against your GSTR-1 data.",
        icon="🧮",
        engine="summary",
        file1_label="GSTR-3B File",
        file2_label="GSTR-1 File",
        file1_hint="GST Portal → Returns → GSTR-3B → Download Summary (Excel/JSON)",
        file2_hint="GST Portal → Returns → GSTR-1 → Download Summary (Excel/JSON)",
        file1_parser=parse_gstr3b_summary,
        file2_parser=parse_gstr1_summary,
    ),

    "gstr9_vs_books": ReconTypeConfig(
        id="gstr9_vs_books",
        name="GSTR-9 vs Books",
        short_name="GSTR-9 vs Books",
        description="Annual reconciliation of sales, purchases, ITC and tax liability with your books.",
        icon="📚",
        engine="summary",
        file1_label="GSTR-9 File",
        file2_label="Financial Books Summary",
        file1_hint="GST Portal → Annual Return → GSTR-9 → Download (Excel/JSON)",
        file2_hint="Your Tally/Zoho/Excel — annual summary by tax category",
        file1_parser=parse_gstr9_summary,
        file2_parser=parse_books_summary,
    ),

    "gstr9c_vs_books": ReconTypeConfig(
        id="gstr9c_vs_books",
        name="GSTR-9C vs Books",
        short_name="GSTR-9C vs Books",
        description="Reconcile data for GSTR-9C with your audited financial statements.",
        icon="📊",
        engine="summary",
        file1_label="GSTR-9C File",
        file2_label="Financial Books Summary",
        file1_hint="GST Portal → Annual Return → GSTR-9C → Download (Excel/JSON)",
        file2_hint="Your audited financial statement — turnover & tax summary",
        file1_parser=parse_gstr9c_summary,
        file2_parser=parse_books_summary,
    ),
}


def get_recon_type(recon_type_id: str) -> ReconTypeConfig:
    if recon_type_id not in RECON_TYPES:
        raise ValueError(f"Unknown reconciliation type: {recon_type_id}")
    return RECON_TYPES[recon_type_id]


def list_recon_types() -> list[ReconTypeConfig]:
    return list(RECON_TYPES.values())
