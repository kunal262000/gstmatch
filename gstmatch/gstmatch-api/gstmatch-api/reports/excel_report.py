"""
Generates a 3-sheet Excel report from a ReconciliationResult.

Sheet 1 — Summary
Sheet 2 — Mismatch details  (orange highlight)
Sheet 3 — Missing invoices  (red highlight, grouped by supplier)
"""
import io
from openpyxl import Workbook
from openpyxl.styles import (
    PatternFill, Font, Alignment, Border, Side, numbers
)
from openpyxl.utils import get_column_letter

from models.schemas import ReconciliationResult, InvoiceCategory


# ─── Colour palette ────────────────────────────────────────────────────────────
GREEN_FILL   = PatternFill("solid", fgColor="D1FAE5")
ORANGE_FILL  = PatternFill("solid", fgColor="FEF3C7")
RED_FILL     = PatternFill("solid", fgColor="FEE2E2")
HEADER_FILL  = PatternFill("solid", fgColor="1E293B")
ALT_FILL     = PatternFill("solid", fgColor="F8FAFC")

WHITE_FONT   = Font(color="FFFFFF", bold=True, size=11)
BOLD_FONT    = Font(bold=True)
TITLE_FONT   = Font(bold=True, size=14, color="1E293B")
DANGER_FONT  = Font(color="EF4444", bold=True)

THIN_BORDER  = Border(
    left=Side(style="thin", color="E2E8F0"),
    right=Side(style="thin", color="E2E8F0"),
    top=Side(style="thin", color="E2E8F0"),
    bottom=Side(style="thin", color="E2E8F0"),
)

CENTER = Alignment(horizontal="center", vertical="center")
LEFT   = Alignment(horizontal="left",   vertical="center")


def _set_col_widths(ws, widths: list[int]) -> None:
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w


def _header_row(ws, headers: list[str], row: int = 1) -> None:
    for col, h in enumerate(headers, 1):
        cell = ws.cell(row=row, column=col, value=h)
        cell.fill      = HEADER_FILL
        cell.font      = WHITE_FONT
        cell.alignment = CENTER
        cell.border    = THIN_BORDER


def _data_cell(ws, row: int, col: int, value, fill=None, font=None, align=None) -> None:
    cell = ws.cell(row=row, column=col, value=value)
    if fill:  cell.fill      = fill
    if font:  cell.font      = font
    cell.alignment = align or LEFT
    cell.border    = THIN_BORDER


def _fmt_inr(amount: float) -> str:
    return f"₹{amount:,.0f}"


# ─── Sheet 1 — Summary ─────────────────────────────────────────────────────────

def _build_summary_sheet(ws, result: ReconciliationResult) -> None:
    ws.title = "Summary"
    ws.sheet_view.showGridLines = False

    # Title
    ws.merge_cells("A1:D1")
    title_cell = ws["A1"]
    title_cell.value     = f"GST Reconciliation — {result.period}"
    title_cell.font      = TITLE_FONT
    title_cell.alignment = CENTER
    title_cell.fill      = PatternFill("solid", fgColor="F0FDF4")

    ws.merge_cells("A2:D2")
    sub_cell = ws["A2"]
    sub_cell.value     = f"{result.businessName}  |  GSTIN: {result.gstin}"
    sub_cell.alignment = CENTER
    sub_cell.font      = Font(color="475569", size=10)

    # Stats table
    stats = [
        ("",                   "Category",             "Count",  ""),
        (GREEN_FILL,   "✅ Matched invoices",          result.summary.matched,          ""),
        (ORANGE_FILL,  "⚠ Amount mismatch",            result.summary.mismatched,        ""),
        (RED_FILL,     "❌ Supplier not filed (ITC risk)", result.summary.missingInGstr2b, ""),
        (ALT_FILL,     "🔍 Not in your books",         result.summary.missingInPr,       ""),
        ("",           "Total invoices processed",      result.summary.totalInvoices,    ""),
        ("",           "Compliance score",              f"{result.summary.complianceScore}%", ""),
    ]

    for i, (fill, label, value, _) in enumerate(stats):
        row = i + 4
        if fill == "":
            ws.cell(row=row, column=2, value=label).font = BOLD_FONT
            ws.cell(row=row, column=3, value=value)
        elif label == "Category":
            _header_row(ws, ["", "Category", "Count", ""], row)
        else:
            ws.cell(row=row, column=2, value=label).fill = fill
            ws.cell(row=row, column=3, value=value).fill = fill
            ws.cell(row=row, column=2).font = BOLD_FONT

    # ITC at risk highlight
    itc_row = len(stats) + 6
    ws.merge_cells(f"A{itc_row}:D{itc_row}")
    itc_cell = ws[f"A{itc_row}"]
    itc_cell.value     = f"ITC AT RISK THIS MONTH:  {_fmt_inr(result.summary.totalItcAtRisk)}"
    itc_cell.fill      = RED_FILL
    itc_cell.font      = Font(bold=True, size=13, color="EF4444")
    itc_cell.alignment = CENTER

    _set_col_widths(ws, [4, 36, 16, 4])
    ws.row_dimensions[1].height = 28
    ws.row_dimensions[2].height = 18


# ─── Sheet 2 — Mismatches ──────────────────────────────────────────────────────

def _build_mismatch_sheet(ws, result: ReconciliationResult) -> None:
    ws.title = "Mismatches"
    ws.sheet_view.showGridLines = False

    headers = ["Supplier", "GSTIN", "Invoice No", "Date",
               "Your Amount (₹)", "GSTR-2B Amount (₹)", "Difference (₹)", "Action"]
    _header_row(ws, headers)

    mismatched = [inv for inv in result.invoices if inv.category == InvoiceCategory.mismatched]

    for i, inv in enumerate(mismatched):
        row  = i + 2
        fill = ORANGE_FILL if i % 2 == 0 else PatternFill("solid", fgColor="FFFBEB")
        diff = inv.difference or 0

        _data_cell(ws, row, 1, inv.supplierName,    fill)
        _data_cell(ws, row, 2, inv.gstin,            fill)
        _data_cell(ws, row, 3, inv.invoiceNo,        fill)
        _data_cell(ws, row, 4, inv.invoiceDate,      fill)
        _data_cell(ws, row, 5, inv.yourAmount,       fill)
        _data_cell(ws, row, 6, inv.gstr2bAmount,     fill)
        _data_cell(ws, row, 7, diff,
                   fill=RED_FILL if diff < 0 else GREEN_FILL,
                   font=DANGER_FONT if diff < 0 else None)
        _data_cell(ws, row, 8,
                   "Verify with supplier" if diff != 0 else "OK",
                   fill)

    _set_col_widths(ws, [28, 18, 16, 12, 18, 20, 16, 22])


# ─── Sheet 3 — Missing invoices ────────────────────────────────────────────────

def _build_missing_sheet(ws, result: ReconciliationResult) -> None:
    ws.title = "Missing Invoices"
    ws.sheet_view.showGridLines = False

    headers = ["Supplier", "GSTIN", "Invoice No", "Date",
               "Your Amount (₹)", "IGST (₹)", "CGST (₹)", "SGST (₹)", "ITC at Risk (₹)"]
    _header_row(ws, headers)

    missing = [inv for inv in result.invoices
               if inv.category == InvoiceCategory.missing_in_gstr2b]
    missing.sort(key=lambda x: (x.gstin, x.invoiceDate))

    for i, inv in enumerate(missing):
        row  = i + 2
        fill = RED_FILL if i % 2 == 0 else PatternFill("solid", fgColor="FFF1F2")
        itc  = inv.igst + inv.cgst + inv.sgst

        _data_cell(ws, row, 1, inv.supplierName, fill)
        _data_cell(ws, row, 2, inv.gstin,         fill)
        _data_cell(ws, row, 3, inv.invoiceNo,     fill)
        _data_cell(ws, row, 4, inv.invoiceDate,   fill)
        _data_cell(ws, row, 5, inv.yourAmount,    fill)
        _data_cell(ws, row, 6, inv.igst,          fill)
        _data_cell(ws, row, 7, inv.cgst,          fill)
        _data_cell(ws, row, 8, inv.sgst,          fill)
        _data_cell(ws, row, 9, itc, fill, DANGER_FONT)

    # Total row
    total_row = len(missing) + 2
    ws.cell(row=total_row, column=8, value="TOTAL ITC AT RISK:").font = BOLD_FONT
    total_cell = ws.cell(row=total_row, column=9,
                         value=result.summary.totalItcAtRisk)
    total_cell.font = Font(bold=True, color="EF4444", size=11)
    total_cell.fill = RED_FILL

    _set_col_widths(ws, [28, 18, 16, 12, 18, 14, 14, 14, 18])


# ─── Public API ────────────────────────────────────────────────────────────────

def generate_excel(result: ReconciliationResult) -> bytes:
    wb = Workbook()

    # Remove default sheet
    wb.remove(wb.active)

    ws1 = wb.create_sheet("Summary")
    ws2 = wb.create_sheet("Mismatches")
    ws3 = wb.create_sheet("Missing Invoices")

    _build_summary_sheet(ws1, result)
    _build_mismatch_sheet(ws2, result)
    _build_missing_sheet(ws3, result)

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf.read()
