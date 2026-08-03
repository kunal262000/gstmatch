"""
Generates a clean 4-page PDF summary using reportlab.

Page 1 — Executive summary   (big ITC number, compliance score, top actions)
Page 2 — Mismatch table
Page 3 — Supplier status
Page 4 — Recommended actions
"""
import io
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak,
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT

from models.schemas import ReconciliationResult, InvoiceCategory, SupplierStatus


# ─── Palette ───────────────────────────────────────────────────────────────────
C_PRIMARY  = colors.HexColor("#10B981")
C_DANGER   = colors.HexColor("#EF4444")
C_WARNING  = colors.HexColor("#F59E0B")
C_INFO     = colors.HexColor("#3B82F6")
C_DARK     = colors.HexColor("#1E293B")
C_MID      = colors.HexColor("#475569")
C_LIGHT    = colors.HexColor("#94A3B8")
C_BG_GREEN = colors.HexColor("#D1FAE5")
C_BG_RED   = colors.HexColor("#FEE2E2")
C_BG_ORG   = colors.HexColor("#FEF3C7")
C_BG_GREY  = colors.HexColor("#F8FAFC")


def _styles():
    base = getSampleStyleSheet()
    return {
        "title":   ParagraphStyle("title",   fontSize=20, textColor=C_DARK,    fontName="Helvetica-Bold", spaceAfter=4),
        "h2":      ParagraphStyle("h2",       fontSize=13, textColor=C_DARK,    fontName="Helvetica-Bold", spaceAfter=4),
        "h3":      ParagraphStyle("h3",       fontSize=11, textColor=C_MID,     fontName="Helvetica-Bold", spaceAfter=3),
        "body":    ParagraphStyle("body",     fontSize=9,  textColor=C_MID,     fontName="Helvetica",      spaceAfter=4),
        "small":   ParagraphStyle("small",    fontSize=8,  textColor=C_LIGHT,   fontName="Helvetica"),
        "danger":  ParagraphStyle("danger",   fontSize=28, textColor=C_DANGER,  fontName="Helvetica-Bold", alignment=TA_CENTER),
        "center":  ParagraphStyle("center",   fontSize=9,  textColor=C_MID,     fontName="Helvetica",      alignment=TA_CENTER),
    }


def _fmt(amount: float) -> str:
    return f"₹{amount:,.0f}"


def _section_header(title: str, S: dict) -> list:
    return [
        Spacer(1, 0.3 * cm),
        Paragraph(title, S["h2"]),
        HRFlowable(width="100%", thickness=1, color=C_PRIMARY, spaceAfter=6),
    ]


# ─── Page 1 — Executive Summary ────────────────────────────────────────────────

def _page1(result: ReconciliationResult, S: dict) -> list:
    story = []
    s = result.summary

    # Header block
    story.append(Paragraph(f"GST Reconciliation Report", S["title"]))
    story.append(Paragraph(
        f"{result.businessName}  •  GSTIN: {result.gstin}  •  Period: {result.period}",
        S["body"]
    ))
    story.append(HRFlowable(width="100%", thickness=2, color=C_PRIMARY, spaceAfter=12))

    # ITC at risk — big number
    story.append(Paragraph(_fmt(s.totalItcAtRisk), S["danger"]))
    story.append(Paragraph("Tax credit you may lose this month", ParagraphStyle(
        "sub", fontSize=11, textColor=C_DANGER, fontName="Helvetica", alignment=TA_CENTER,
    )))
    story.append(Spacer(1, 0.4 * cm))

    # Stats table
    stats_data = [
        ["Metric",                    "Count",              ""],
        ["✅ Matched invoices",        str(s.matched),       ""],
        ["⚠  Amount mismatch",         str(s.mismatched),    ""],
        ["❌  Supplier not filed",      str(s.missingInGstr2b), ""],
        ["🔍  Not in your books",       str(s.missingInPr),   ""],
        ["Total invoices processed",   str(s.totalInvoices), ""],
        ["Compliance score",           f"{s.complianceScore}%", ""],
    ]

    tbl = Table(stats_data, colWidths=[10 * cm, 4 * cm, 3 * cm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, 0), C_DARK),
        ("TEXTCOLOR",   (0, 0), (-1, 0), colors.white),
        ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, -1), 9),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [C_BG_GREY, colors.white]),
        ("BACKGROUND",  (0, 2), (-1, 2), C_BG_ORG),
        ("BACKGROUND",  (0, 3), (-1, 3), C_BG_RED),
        ("GRID",        (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING",  (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(tbl)

    story.append(PageBreak())
    return story


# ─── Page 2 — Mismatch Table ───────────────────────────────────────────────────

def _page2(result: ReconciliationResult, S: dict) -> list:
    story = _section_header("Page 2 — Amount Mismatches", S)

    mismatched = [inv for inv in result.invoices if inv.category == InvoiceCategory.mismatched]

    if not mismatched:
        story.append(Paragraph("No amount mismatches found. ✅", S["body"]))
        story.append(PageBreak())
        return story

    headers = ["Supplier", "Invoice No", "Date", "Your Amt", "GSTR-2B Amt", "Diff"]
    rows = [headers]
    for inv in mismatched:
        diff = inv.difference or 0
        rows.append([
            inv.supplierName[:22],
            inv.invoiceNo,
            inv.invoiceDate,
            _fmt(inv.yourAmount),
            _fmt(inv.gstr2bAmount or 0),
            _fmt(diff),
        ])

    tbl = Table(rows, colWidths=[5.5*cm, 3.5*cm, 2.5*cm, 3*cm, 3*cm, 2.5*cm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 0), C_DARK),
        ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [C_BG_ORG, colors.white]),
        ("GRID",          (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(tbl)
    story.append(PageBreak())
    return story


# ─── Page 3 — Supplier Status ──────────────────────────────────────────────────

def _page3(result: ReconciliationResult, S: dict) -> list:
    story = _section_header("Page 3 — Supplier Filing Status", S)

    headers = ["Supplier Name", "GSTIN", "Invoices", "Status", "ITC at Risk"]
    rows = [headers]

    for sup in result.suppliers:
        status_label = {
            SupplierStatus.filed:     "✅ Filed",
            SupplierStatus.not_filed: "❌ Not Filed",
            SupplierStatus.mismatch:  "⚠ Mismatch",
        }[sup.status]

        rows.append([
            sup.name[:24],
            sup.gstin,
            str(sup.invoiceCount),
            status_label,
            _fmt(sup.itcAtRisk) if sup.itcAtRisk > 0 else "—",
        ])

    tbl = Table(rows, colWidths=[5.5*cm, 4*cm, 2*cm, 3.5*cm, 3*cm])
    row_styles = [
        ("BACKGROUND",    (0, 0), (-1, 0), C_DARK),
        ("TEXTCOLOR",     (0, 0), (-1, 0), colors.white),
        ("FONTNAME",      (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, -1), 8),
        ("GRID",          (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    # Colour-code unfiled rows
    for i, sup in enumerate(result.suppliers, 1):
        if sup.status == SupplierStatus.not_filed:
            row_styles.append(("BACKGROUND", (0, i), (-1, i), C_BG_RED))
        elif sup.status == SupplierStatus.mismatch:
            row_styles.append(("BACKGROUND", (0, i), (-1, i), C_BG_ORG))
        else:
            row_styles.append(("BACKGROUND", (0, i), (-1, i),
                               C_BG_GREEN if i % 2 == 0 else colors.white))

    tbl.setStyle(TableStyle(row_styles))
    story.append(tbl)
    story.append(PageBreak())
    return story


# ─── Page 4 — Recommended Actions ─────────────────────────────────────────────

def _page4(result: ReconciliationResult, S: dict) -> list:
    story = _section_header("Page 4 — Recommended Actions", S)
    s = result.summary

    actions = []

    if s.missingInGstr2b > 0:
        unfiled = [sup for sup in result.suppliers if sup.status == SupplierStatus.not_filed]
        names   = ", ".join(sup.name for sup in unfiled[:3])
        if len(unfiled) > 3:
            names += f" and {len(unfiled) - 3} more"
        actions.append((
            "🔴 URGENT — Follow up with suppliers who haven't filed",
            f"Contact: {names}. ITC worth {_fmt(s.totalItcAtRisk)} is at risk. "
            f"Ask them to file GSTR-1 before the deadline.",
        ))

    if s.mismatched > 0:
        actions.append((
            "🟡 REVIEW — Verify mismatched invoice amounts",
            f"{s.mismatched} invoices show different amounts in your books vs GSTR-2B. "
            "Check Sheet 2 of the Excel report for details. Contact suppliers to issue "
            "credit/debit notes where necessary.",
        ))

    if s.missingInPr > 0:
        actions.append((
            "🔵 CHECK — Invoices in GSTR-2B not in your books",
            f"{s.missingInPr} invoices appear in GSTR-2B but are missing from your "
            "purchase register. Check if these are legitimate purchases you forgot to record.",
        ))

    if s.complianceScore >= 90:
        actions.append((
            "✅ GOOD — High compliance score",
            f"Your compliance score is {s.complianceScore}%. Most invoices are matched. "
            "Keep following up with the remaining suppliers regularly.",
        ))

    actions.append((
        "📋 GENERAL — File your GSTR-3B on time",
        "Claim only the ITC that is reflected in GSTR-2B. ITC for missing invoices "
        "can be claimed in a subsequent month once suppliers file their returns.",
    ))

    for title, desc in actions:
        story.append(Paragraph(title, S["h3"]))
        story.append(Paragraph(desc,  S["body"]))
        story.append(Spacer(1, 0.2 * cm))

    story.append(Spacer(1, 0.4 * cm))
    story.append(HRFlowable(width="100%", thickness=1, color=C_LIGHT))
    story.append(Paragraph(
        f"Report generated by GSTMatch  •  {result.period}  •  {result.businessName}",
        S["small"],
    ))

    return story


# ─── Public API ────────────────────────────────────────────────────────────────

def generate_pdf(result: ReconciliationResult) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    S = _styles()
    story = []
    story += _page1(result, S)
    story += _page2(result, S)
    story += _page3(result, S)
    story += _page4(result, S)

    doc.build(story)
    buf.seek(0)
    return buf.read()
