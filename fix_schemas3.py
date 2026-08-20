with open(r'C:\Users\chaitali\OneDrive\Desktop\k\gstmatch-frontend\gstmatch\gstmatch-api\gstmatch-api\models\schemas.py', 'r') as f:
    content = f.read()

old = """lineItems:          List[SummaryLineItem]


# \u2014\u2014\u2014 NEW \u2014 reconciliation type metadata, served by GET /api/reconciliation-types \u2014"""

new = """lineItems:          List[SummaryLineItem]


# \u2014\u2014\u2014 Original summary section row (for GSTR-3B vs GSTR-1 legacy compatibility) \u2014\u2014\u2014
class SummarySectionRow(BaseModel):
    sectionId:         str
    sectionName:       str
    description:       str
    file1Value:        float = 0.0
    file2Value:        float = 0.0
    taxableDifference: float = 0.0
    igstDiff:          float = 0.0
    cgstDiff:          float = 0.0
    sgstDiff:          float = 0.0
    totalDifference:   float = 0.0
    status:            str = "matched"   # "matched", "mismatch", "missing_in_file1", "missing_in_file2"


# \u2014\u2014\u2014 NEW \u2014 reconciliation type metadata, served by GET /api/reconciliation-types \u2014"""

if old in content:
    content = content.replace(old, new)
    with open(r'C:\Users\chaitali\OneDrive\Desktop\k\gstmatch-frontend\gstmatch\gstmatch-api\gstmatch-api\models\schemas.py', 'w') as f:
        f.write(content)
    print('Done')
else:
    print('Old string not found')
    idx = content.find('lineItems:          List[SummaryLineItem]')
    if idx >= 0:
        print('Context:', repr(content[idx:idx+120]))