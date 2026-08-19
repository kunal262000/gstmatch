"""
Universal GST Parser — parses uploaded files into standardised DataFrames and summary structures.

Supports:
- Purchase Register (Excel / CSV)
- Sales Register (Excel / CSV)
- GSTR-2B (Excel multi-sheet B2B/B2BA/CDNR or JSON)
- GSTR-2A (Excel multi-sheet B2B/CDNR or JSON)
- GSTR-1 (Excel multi-table B2B/B2CL/B2CS/CDNR or JSON)
- GSTR-3B (Excel Table 3.1/4/5 or JSON summary)
- IMS Export (Excel / CSV / JSON with invoice action: Accepted/Rejected/Pending)
- Audited Books / Trial Balance (Excel / CSV summary)
- GSTR-9 / GSTR-9C (Excel / JSON)
"""
import json
import re
from io import BytesIO
from typing import Tuple, Dict, Any, List, Optional
import pandas as pd

# ─── Column aliases ────────────────────────────────────────────────────────────
COLUMN_ALIASES = {
    "gstin": [
        "gstin", "supplier gstin", "vendor gstin", "party gstin",
        "customer gstin", "recipient gstin", "supplier gst", "buyer gstin",
        "vendor gst", "gst no", "gst number", "gstin uin", "customer gst",
        "gstin of recipient", "gst identification no", "recipient gst",
        "gst identification number", "gstin no", "gstin number",
        "gst no of supplier", "gst no of vendor", "party gst",
        "gst number of supplier", "gst number of vendor", "counterparty gstin",
        "gstin of supplier", "gstin of vendor", "gstin of party",
        "suppliers gstin", "suppliers gst", "supplier gstin of",
        "tin", "gstin / uin", "ctin",
    ],
    "supplier_name": [
        "supplier name", "vendor name", "party name", "name",
        "supplier", "vendor", "party", "trade name", "tradename",
        "customer name", "buyer name", "client name", "customer", "buyer",
        "suppliers name", "suppliers", "vendors name", "party trade name",
        "creditor name", "creditor", "debtor name", "debtor", "account name", "ledger name",
        "bill from", "bill to", "counterparty name", "receiver name", "legal name",
    ],
    "invoice_no": [
        "invoice no", "invoice number", "bill no", "bill number",
        "voucher no", "voucher number", "inv no", "invoice", "bill",
        "ref no", "reference number", "invoice doc", "document no",
        "document number", "doc no", "doc number", "vch no",
        "invoice id", "bill id", "no", "inv number", "inv num",
        "invoice num", "bill num", "purchase invoice no",
        "supplier invoice no", "vendor invoice no", "sales invoice no",
        "document num", "invoice no of supplier", "inum", "doc_num",
    ],
    "invoice_date": [
        "invoice date", "bill date", "date", "voucher date",
        "inv date", "invoice dt", "document date", "doc date",
        "transaction date", "posting date", "entry date", "vch date",
        "inv dt", "tax invoice date", "purchase date", "sales date",
        "supplier invoice date", "bill date dt", "idt", "doc_dt",
    ],
    "taxable_amt": [
        "taxable amount", "taxable value", "taxable amt",
        "basic amount", "value", "taxable", "base amount",
        "assessable value", "taxable value inr", "taxable amount inr",
        "taxable value rs", "taxable amount rs", "assessable amount",
        "tax base amount", "tax base", "base value", "subtotal",
        "sub total", "net value", "net amount", "taxable turnover",
        "txn value", "taxable value of", "taxable amount of", "txval",
    ],
    "igst": [
        "igst", "igst amount", "integrated tax", "igst inr",
        "integrated gst", "igst amt", "integrated tax amount",
        "integrated gst amount", "input service tax", "igst amount inr",
        "integrated tax inr", "igst tax", "igst value", "igst rs", "iamt",
    ],
    "cgst": [
        "cgst", "cgst amount", "central tax", "cgst inr",
        "central gst", "cgst amt", "central tax amount",
        "central gst amount", "cen tax", "central tax amt",
        "cgst amount inr", "central tax inr", "cgst tax",
        "cgst value", "cgst rs", "camt",
    ],
    "sgst": [
        "sgst", "sgst amount", "state tax", "sgst inr",
        "state gst", "sgst amt", "state tax amount",
        "state gst amount", "state tax amt", "utgst",
        "utgst amount", "sgst amount inr", "state tax inr",
        "sgst tax", "sgst value", "sgst rs", "samt",
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
        "total bill amount inr", "total amt", "net total", "val", "inv_val",
    ],
    "action_status": [
        "action", "action status", "ims status", "acceptance status",
        "status", "action taken", "ims action", "inv status",
    ],
}

_SUBSTRING_OK = {
    "gstin": True,
    "invoice_no": True,
    "invoice_date": True,
    "supplier_name": True,
    "action_status": True,
}

_FALSE_SUBSTRINGS = {
    "gstin": ["nout", "outing", "stain"],
    "invoice_no": [],
    "invoice_date": ["update"],
    "supplier_name": ["surname"],
    "action_status": [],
}


def _normalize_header(raw_col: str) -> str:
    clean = str(raw_col).strip().lower()
    clean = re.sub(r"[^a-z0-9]+", " ", clean)
    return " ".join(clean.split())


def _match_column(raw_col: str) -> str:
    clean = _normalize_header(raw_col)
    for std_name, aliases in COLUMN_ALIASES.items():
        norm_aliases = {_normalize_header(a) for a in aliases}
        if clean in norm_aliases:
            return std_name

    for std_name in _SUBSTRING_OK:
        if not _SUBSTRING_OK.get(std_name, False):
            continue
        norm_aliases = [_normalize_header(a) for a in COLUMN_ALIASES.get(std_name, [])]
        for alias in norm_aliases:
            if len(alias) >= 3 and alias in clean:
                if any(fp in clean for fp in _FALSE_SUBSTRINGS.get(std_name, [])):
                    continue
                return std_name

    return ""


def _rename_columns(df: pd.DataFrame) -> pd.DataFrame:
    rename_map = {}
    for col in df.columns:
        mapped = _match_column(str(col))
        if mapped and mapped not in rename_map.values():
            rename_map[col] = mapped
    return df.rename(columns=rename_map)


def _fill_missing_tax_cols(df: pd.DataFrame) -> pd.DataFrame:
    for col in ["igst", "cgst", "sgst", "taxable_amt"]:
        if col not in df.columns:
            df[col] = 0.0
    if "supplier_name" not in df.columns:
        df["supplier_name"] = ""
    if "action_status" not in df.columns:
        df["action_status"] = "Accepted"
    return df


def _compute_total(df: pd.DataFrame) -> pd.DataFrame:
    if "total" not in df.columns or df["total"].isna().all():
        df["total"] = df["taxable_amt"] + df["igst"] + df["cgst"] + df["sgst"]
    return df


def _clean_numeric(df: pd.DataFrame, cols: List[str]) -> pd.DataFrame:
    for col in cols:
        if col in df.columns:
            df[col] = (
                df[col]
                .astype(str)
                .str.replace(r"[₹,\s]", "", regex=True)
                .str.replace(r"[()]", "", regex=True)
            )
            df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
    return df


def _find_header_row(df: pd.DataFrame) -> int:
    """Finds the row index that contains the actual column headers."""
    for idx, row in df.head(15).iterrows():
        matches = sum(1 for cell in row.dropna() if _match_column(str(cell)) != "")
        if matches >= 2:
            return idx
    return 0


# ─── 1. Purchase Register Parser ──────────────────────────────────────────────
def parse_purchase_register(content: bytes, filename: str) -> Tuple[pd.DataFrame, str]:
    try:
        if filename.lower().endswith(".csv"):
            try:
                df = pd.read_csv(BytesIO(content), dtype=str, encoding="utf-8")
            except UnicodeDecodeError:
                df = pd.read_csv(BytesIO(content), dtype=str, encoding="latin-1")
        else:
            raw_excel = pd.read_excel(BytesIO(content), header=None, dtype=str)
            header_idx = _find_header_row(raw_excel)
            df = pd.read_excel(BytesIO(content), skiprows=header_idx, dtype=str)

        df = _rename_columns(df)
        df = _fill_missing_tax_cols(df)
        df = _clean_numeric(df, ["taxable_amt", "igst", "cgst", "sgst", "total"])
        df = _compute_total(df)

        if "invoice_no" not in df.columns:
            return pd.DataFrame(), "Missing required column: invoice_no in Purchase Register."

        if "gstin" not in df.columns:
            df["gstin"] = "URP"  # Graceful fallback for simplified QuickBooks exports

        df = df[df["invoice_no"].notna() & (df["invoice_no"].str.strip() != "")]
        df["supplier_name"] = df["supplier_name"].fillna("Supplier / Vendor")
        df["invoice_date"] = df["invoice_date"].fillna("")

        return df, ""
    except Exception as e:
        return pd.DataFrame(), f"Error reading Purchase Register: {str(e)}"


# ─── 2. Sales Register Parser ─────────────────────────────────────────────────
def parse_sales_register(content: bytes, filename: str) -> Tuple[pd.DataFrame, str]:
    try:
        if filename.lower().endswith(".csv"):
            try:
                df = pd.read_csv(BytesIO(content), dtype=str, encoding="utf-8")
            except UnicodeDecodeError:
                df = pd.read_csv(BytesIO(content), dtype=str, encoding="latin-1")
        else:
            raw_excel = pd.read_excel(BytesIO(content), header=None, dtype=str)
            header_idx = _find_header_row(raw_excel)
            df = pd.read_excel(BytesIO(content), skiprows=header_idx, dtype=str)

        df = _rename_columns(df)
        df = _fill_missing_tax_cols(df)
        df = _clean_numeric(df, ["taxable_amt", "igst", "cgst", "sgst", "total"])
        df = _compute_total(df)

        for req in ["invoice_no"]:
            if req not in df.columns:
                return pd.DataFrame(), f"Missing required column: {req} in Sales Register."

        if "gstin" not in df.columns:
            df["gstin"] = "URP"  # Unregistered person fallback for B2C

        df = df[df["invoice_no"].notna() & (df["invoice_no"].str.strip() != "")]
        df["supplier_name"] = df["supplier_name"].fillna("Buyer / Customer")
        df["invoice_date"] = df["invoice_date"].fillna("")

        return df, ""
    except Exception as e:
        return pd.DataFrame(), f"Error reading Sales Register: {str(e)}"


# ─── 3. GSTR-2B / GSTR-2A Parser ──────────────────────────────────────────────
def parse_gstr2b(content: bytes, filename: str) -> Tuple[pd.DataFrame, str]:
    return _parse_gstr_invoices_statement(content, filename, statement_type="2B")


def parse_gstr2a(content: bytes, filename: str) -> Tuple[pd.DataFrame, str]:
    return _parse_gstr_invoices_statement(content, filename, statement_type="2A")


def _parse_gstr_invoices_statement(content: bytes, filename: str, statement_type: str = "2B") -> Tuple[pd.DataFrame, str]:
    try:
        # Check JSON format
        if filename.lower().endswith(".json"):
            try:
                data = json.loads(content.decode("utf-8"))
            except UnicodeDecodeError:
                data = json.loads(content.decode("latin-1"))

            rows = []
            # Traverse nested structures (data -> docdata -> b2b, or data -> b2b, or docdata -> b2b, or root)
            container = data
            if isinstance(container, dict) and "data" in container and isinstance(container["data"], dict):
                container = container["data"]
            if isinstance(container, dict) and "docdata" in container and isinstance(container["docdata"], dict):
                container = container["docdata"]

            b2b_list = []
            if isinstance(container, dict):
                for section in ["b2b", "b2ba", "cdnr", "cdnra", "b2b_inv"]:
                    if section in container and isinstance(container[section], list):
                        b2b_list.extend(container[section])

            for item in b2b_list:
                ctin = item.get("ctin", item.get("gstin", ""))
                trdnm = item.get("tradeName", item.get("trdnm", item.get("cname", item.get("trade_name", "Supplier"))))
                for inv in item.get("inv", item.get("invoices", [item])):
                    inum = inv.get("inum", inv.get("invoice_no", inv.get("inv_no", "")))
                    idt = inv.get("idt", inv.get("invoice_date", inv.get("inv_dt", "")))
                    val = float(inv.get("val", inv.get("total", 0.0)))
                    txval, igst, cgst, sgst = 0.0, 0.0, 0.0, 0.0
                    
                    items_list = inv.get("itms", inv.get("items", []))
                    if not items_list and "txval" in inv:
                        items_list = [inv]

                    for itm in items_list:
                        itmdet = itm.get("itm_det", itm.get("item_det", itm))
                        txval += float(itmdet.get("txval", itmdet.get("taxable_amt", itmdet.get("taxable", 0.0))))
                        igst += float(itmdet.get("iamt", itmdet.get("igst", 0.0)))
                        cgst += float(itmdet.get("camt", itmdet.get("cgst", 0.0)))
                        sgst += float(itmdet.get("samt", itmdet.get("sgst", 0.0)))

                    if inum:
                        rows.append({
                            "gstin": ctin,
                            "supplier_name": trdnm,
                            "invoice_no": inum,
                            "invoice_date": idt,
                            "taxable_amt": txval,
                            "igst": igst,
                            "cgst": cgst,
                            "sgst": sgst,
                            "total": val if val > 0 else (txval + igst + cgst + sgst),
                        })
            if not rows:
                return pd.DataFrame(), f"No B2B invoice items found in GSTR-{statement_type} JSON."
            return pd.DataFrame(rows), ""

        # Check CSV format
        if filename.lower().endswith(".csv"):
            try:
                df = pd.read_csv(BytesIO(content), dtype=str, encoding="utf-8")
            except UnicodeDecodeError:
                df = pd.read_csv(BytesIO(content), dtype=str, encoding="latin-1")
            df = _rename_columns(df)
            if "gstin" in df.columns and "invoice_no" in df.columns:
                df = _fill_missing_tax_cols(df)
                df = _clean_numeric(df, ["taxable_amt", "igst", "cgst", "sgst", "total"])
                df = _compute_total(df)
                df = df[df["gstin"].notna() & (df["gstin"].str.strip() != "")]
                df = df[df["invoice_no"].notna() & (df["invoice_no"].str.strip() != "")]
                df["supplier_name"] = df["supplier_name"].fillna(f"GSTR-{statement_type} Supplier")
                df["invoice_date"] = df["invoice_date"].fillna("")
                return df, ""
            return pd.DataFrame(), f"Missing required GSTIN or Invoice No columns in GSTR-{statement_type} CSV."

        # Excel format (Multi-sheet or single sheet)
        xl = pd.ExcelFile(BytesIO(content))
        target_sheets = [s for s in xl.sheet_names if any(k in s.lower() for k in ["b2b", "b2ba", "cdnr", "sheet", "2b", "2a"])]
        if not target_sheets:
            target_sheets = [xl.sheet_names[0]]

        frames = []
        for sheet in target_sheets:
            try:
                raw_df = pd.read_excel(xl, sheet_name=sheet, header=None, dtype=str)
                hdr_idx = _find_header_row(raw_df)
                s_df = pd.read_excel(xl, sheet_name=sheet, skiprows=hdr_idx, dtype=str)
                s_df = _rename_columns(s_df)
                if "gstin" in s_df.columns and "invoice_no" in s_df.columns:
                    s_df = _fill_missing_tax_cols(s_df)
                    s_df = _clean_numeric(s_df, ["taxable_amt", "igst", "cgst", "sgst", "total"])
                    s_df = _compute_total(s_df)
                    frames.append(s_df)
            except Exception:
                continue

        if not frames:
            return pd.DataFrame(), f"Could not find valid invoice sheets in GSTR-{statement_type} Excel."

        combined = pd.concat(frames, ignore_index=True)
        combined = combined[combined["gstin"].notna() & (combined["gstin"].str.strip() != "")]
        combined = combined[combined["invoice_no"].notna() & (combined["invoice_no"].str.strip() != "")]
        combined["supplier_name"] = combined["supplier_name"].fillna(f"GSTR-{statement_type} Supplier")
        combined["invoice_date"] = combined["invoice_date"].fillna("")
        return combined, ""
    except Exception as e:
        return pd.DataFrame(), f"Error reading GSTR-{statement_type}: {str(e)}"


# ─── 4. GSTR-1 Parser ─────────────────────────────────────────────────────────
def parse_gstr1(content: bytes, filename: str) -> Tuple[pd.DataFrame, str]:
    try:
        if filename.lower().endswith(".json"):
            try:
                data = json.loads(content.decode("utf-8"))
            except UnicodeDecodeError:
                data = json.loads(content.decode("latin-1"))

            rows = []
            doc_data = data.get("data", data)
            for section in ["b2b", "b2ba", "b2cl", "b2cs", "cdnr"]:
                for item in doc_data.get(section, []):
                    ctin = item.get("ctin", item.get("gstin", "URP"))
                    cname = item.get("cname", "Customer / Buyer")
                    for inv in item.get("inv", []):
                        inum = inv.get("inum", inv.get("nt_num", "INV-1"))
                        idt = inv.get("idt", inv.get("nt_dt", ""))
                        val = float(inv.get("val", 0.0))
                        txval, igst, cgst, sgst = 0.0, 0.0, 0.0, 0.0
                        for itm in inv.get("items", inv.get("itms", [])):
                            itmdet = itm.get("item_det", itm)
                            txval += float(itmdet.get("txval", 0.0))
                            igst += float(itmdet.get("iamt", 0.0))
                            cgst += float(itmdet.get("camt", 0.0))
                            sgst += float(itmdet.get("samt", 0.0))
                        rows.append({
                            "gstin": ctin,
                            "supplier_name": cname,
                            "invoice_no": inum,
                            "invoice_date": idt,
                            "taxable_amt": txval,
                            "igst": igst,
                            "cgst": cgst,
                            "sgst": sgst,
                            "total": val if val > 0 else (txval + igst + cgst + sgst),
                        })
            if rows:
                return pd.DataFrame(rows), ""

        # Check CSV format
        if filename.lower().endswith(".csv"):
            try:
                df = pd.read_csv(BytesIO(content), dtype=str, encoding="utf-8")
            except UnicodeDecodeError:
                df = pd.read_csv(BytesIO(content), dtype=str, encoding="latin-1")
            df = _rename_columns(df)
            if "invoice_no" in df.columns:
                if "gstin" not in df.columns:
                    df["gstin"] = "URP"
                df = _fill_missing_tax_cols(df)
                df = _clean_numeric(df, ["taxable_amt", "igst", "cgst", "sgst", "total"])
                df = _compute_total(df)
                df = df[df["invoice_no"].notna() & (df["invoice_no"].str.strip() != "")]
                df["supplier_name"] = df["supplier_name"].fillna("Customer / Buyer")
                df["invoice_date"] = df["invoice_date"].fillna("")
                return df, ""
            return pd.DataFrame(), "Missing required invoice number column in GSTR-1 CSV."

        # Excel GSTR-1
        xl = pd.ExcelFile(BytesIO(content))
        target_sheets = [s for s in xl.sheet_names if any(k in s.lower() for k in ["b2b", "b2ba", "b2cl", "b2cs", "cdnr", "gstr1", "sheet"])]
        if not target_sheets:
            target_sheets = [xl.sheet_names[0]]

        frames = []
        for sheet in target_sheets:
            try:
                raw_df = pd.read_excel(xl, sheet_name=sheet, header=None, dtype=str)
                hdr_idx = _find_header_row(raw_df)
                s_df = pd.read_excel(xl, sheet_name=sheet, skiprows=hdr_idx, dtype=str)
                s_df = _rename_columns(s_df)
                if "invoice_no" in s_df.columns:
                    if "gstin" not in s_df.columns:
                        s_df["gstin"] = "URP"
                    s_df = _fill_missing_tax_cols(s_df)
                    s_df = _clean_numeric(s_df, ["taxable_amt", "igst", "cgst", "sgst", "total"])
                    s_df = _compute_total(s_df)
                    frames.append(s_df)
            except Exception:
                continue

        if frames:
            combined = pd.concat(frames, ignore_index=True)
            combined = combined[combined["invoice_no"].notna() & (combined["invoice_no"].str.strip() != "")]
            combined["supplier_name"] = combined["supplier_name"].fillna("Customer / Buyer")
            combined["invoice_date"] = combined["invoice_date"].fillna("")
            return combined, ""

        return pd.DataFrame(), "Could not parse invoices from GSTR-1 file."
    except Exception as e:
        return pd.DataFrame(), f"Error reading GSTR-1: {str(e)}"


# ─── 5. IMS Export Parser ─────────────────────────────────────────────────────
def parse_ims(content: bytes, filename: str) -> Tuple[pd.DataFrame, str]:
    try:
        if filename.lower().endswith(".csv"):
            df = pd.read_csv(BytesIO(content), dtype=str)
        else:
            raw_excel = pd.read_excel(BytesIO(content), header=None, dtype=str)
            header_idx = _find_header_row(raw_excel)
            df = pd.read_excel(BytesIO(content), skiprows=header_idx, dtype=str)

        df = _rename_columns(df)
        df = _fill_missing_tax_cols(df)
        df = _clean_numeric(df, ["taxable_amt", "igst", "cgst", "sgst", "total"])
        df = _compute_total(df)

        if "gstin" not in df.columns or "invoice_no" not in df.columns:
            return pd.DataFrame(), "Missing GSTIN or Invoice No in IMS file."

        if "action_status" not in df.columns:
            df["action_status"] = "Accepted"

        df = df[df["gstin"].notna() & (df["gstin"].str.strip() != "")]
        df = df[df["invoice_no"].notna() & (df["invoice_no"].str.strip() != "")]
        df["supplier_name"] = df["supplier_name"].fillna("IMS Supplier")
        df["invoice_date"] = df["invoice_date"].fillna("")

        return df, ""
    except Exception as e:
        return pd.DataFrame(), f"Error reading IMS export: {str(e)}"


# ─── 6. Summary / Return Parser (GSTR-3B, GSTR-9, Books) ─────────────────────
def parse_return_summary(content: bytes, filename: str, return_type: str = "3B") -> Tuple[Dict[str, Any], str]:
    """Parses return summary tables (e.g. Table 3.1 in 3B, Table 4/5/6 in 9)."""
    try:
        # Default baseline summary structure
        summary = {
            "taxable_turnover": 0.0,
            "igst": 0.0,
            "cgst": 0.0,
            "sgst": 0.0,
            "cess": 0.0,
            "total_tax": 0.0,
            "sections": [],
        }

        if filename.lower().endswith(".json"):
            data = json.loads(content.decode("utf-8", errors="ignore"))
            # Aggregate JSON figures
            taxable = float(data.get("taxable_val", data.get("txval", 0.0)))
            igst = float(data.get("igst", data.get("iamt", 0.0)))
            cgst = float(data.get("cgst", data.get("camt", 0.0)))
            sgst = float(data.get("sgst", data.get("samt", 0.0)))
            summary["taxable_turnover"] = taxable
            summary["igst"] = igst
            summary["cgst"] = cgst
            summary["sgst"] = sgst
            summary["total_tax"] = igst + cgst + sgst
            return summary, ""

        # Excel Summary Sheet
        xl = pd.ExcelFile(BytesIO(content))
        df = pd.read_excel(xl, sheet_name=xl.sheet_names[0], dtype=str).fillna("")
        # Attempt to find turnover and tax totals
        numeric_clean = df.apply(lambda col: pd.to_numeric(col.astype(str).str.replace(r"[₹,\s]", "", regex=True), errors="coerce"))
        taxable_sum = numeric_clean.select_dtypes(include="number").sum().max()
        summary["taxable_turnover"] = float(taxable_sum if pd.notna(taxable_sum) else 0.0)
        summary["total_tax"] = float(summary["taxable_turnover"] * 0.18) # standard GST estimate fallback
        return summary, ""
    except Exception as e:
        return {}, f"Error parsing return summary: {str(e)}"