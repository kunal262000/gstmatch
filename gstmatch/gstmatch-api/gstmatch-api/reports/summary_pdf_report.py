"""
NEW FILE — place at: gstmatch-api/gstmatch-api/reports/summary_pdf_report.py

PDF report for SUMMARY-level reconciliations. 2 pages: executive summary
+ full section-by-section comparison table.
"""
import io
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, PageBreak,
)
from reportlab.lib.enums import TA_CENTER

from models.schemas import SummaryReconciliationResult

C_PRIMARY  = colors.HexColor("#10B981")
C_DANGER   = colors.HexColor("#EF4444")
C_DARK     = colors.HexColor("#1E293B")
C_MID      = colors.HexColor("#475569")
C_BG_RED   = colors.HexColor("#FEE2E2")
C_BG_GREEN = colors.HexColor("#D1FAE5")
C_BG_GREY  = colors.HexColor("#F8FAFC")


def _styles():
    return {
        "title":  ParagraphStyle("title", fontSize=18, textColor=C_DARK, fontName="Helvetica-Bold", spaceAfter=4),
        "h2":     ParagraphStyle("h2", fontSize=13, textColor=C_DARK, fontName="Helvetica-Bold", spaceAfter=4),
        "body":   ParagraphStyle("body", fontSize=9, textColor=C_MID, fontName="Helvetica", spaceAfter=4),
        "danger": ParagraphStyle("danger", fontSize=26, textColor=C_DANGER, fontName="Helvetica-Bold", alignment=TA_CENTER),
        "diffsub": ParagraphStyle("diffsub", fontSize=11, textColor=C_DANGER, fontName="Helvetica", alignment=TA_CENTER),
    }


def _fmt(a: float) -> str:
    return f"₹{a:,.0f}"


def generate_summary_pdf(result: SummaryReconciliationResult) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, leftMargin=2*cm, rightMargin=2*cm,
                            topMargin=2*cm, bottomMargin=2*cm)
    S = _styles()
    story = []

    story.append(Paragraph(f"{result.file1Label} vs {result.file2Label}", S["title"]))
    story.append(Paragraph(
        f"{result.businessName}  •  GSTIN: {result.gstin}  •  Period: {result.period}", S["body"]
    ))
    story.append(HRFlowable(width="100%", thickness=2, color=C_PRIMARY, spaceAfter=12))

    story.append(Paragraph(_fmt(result.totalDifference), S["danger"]))
    story.append(Paragraph("Net difference between the two returns", S["diffsub"]))
    story.append(Spacer(1, 0.4*cm))

    stats_data = [
        ["Metric", "Value"],
        [f"Total in {result.file1Label}", _fmt(result.totalFile1Value)],
        [f"Total in {result.file2Label}", _fmt(result.totalFile2Value)],
        ["Matched sections", str(result.matchedSections)],
        ["Mismatched sections", str(result.mismatchedSections)],
        ["Compliance score", f"{result.complianceScore}%"],
    ]
    tbl = Table(stats_data, colWidths=[10*cm, 6*cm])
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), C_DARK), ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"), ("FONTSIZE", (0,0), (-1,-1), 9),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [C_BG_GREY, colors.white]),
        ("GRID", (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ("LEFTPADDING", (0,0), (-1,-1), 8), ("TOPPADDING", (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ]))
    story.append(tbl)
    story.append(PageBreak())

    story.append(Paragraph("Section-by-Section Comparison", S["h2"]))
    story.append(HRFlowable(width="100%", thickness=1, color=C_PRIMARY, spaceAfter=8))

    rows = [["Section", result.file1Label, result.file2Label, "Difference", "Status"]]
    for li in result.lineItems:
        rows.append([
            li.section[:32], _fmt(li.file1Value), _fmt(li.file2Value),
            _fmt(li.difference), "⚠ Mismatch" if li.status == "mismatch" else "✓ Matched",
        ])

    tbl2 = Table(rows, colWidths=[6*cm, 3*cm, 3*cm, 3*cm, 2.5*cm])
    style_cmds = [
        ("BACKGROUND", (0,0), (-1,0), C_DARK), ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"), ("FONTSIZE", (0,0), (-1,-1), 8),
        ("GRID", (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ("LEFTPADDING", (0,0), (-1,-1), 6), ("TOPPADDING", (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
    ]
    for i, li in enumerate(result.lineItems, 1):
        style_cmds.append(("BACKGROUND", (0,i), (-1,i),
                           C_BG_RED if li.status == "mismatch" else
                           (C_BG_GREEN if i % 2 == 0 else colors.white)))
    tbl2.setStyle(TableStyle(style_cmds))
    story.append(tbl2)

    doc.build(story)
    buf.seek(0)
    return buf.read()
