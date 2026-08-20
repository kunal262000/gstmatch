with open(r'C:\Users\chaitali\OneDrive\Desktop\k\gstmatch-frontend\gstmatch\gstmatch-api\gstmatch-api\models\schemas.py', 'rb') as f:
    content = f.read()

# The exact old bytes to replace
old_bytes = b'lineItems:          List[SummaryLineItem]\n\n\n# \xe2\x94\x80\xe2\x94\x80 NEW \xe2\x80\x94 reconciliation type metadata, served by GET /api/reconciliation-types \xe2\x94\x80\xe2\x94\x80\nclass ReconType'

new_bytes = b'lineItems:          List[SummaryLineItem]\n\n\n# \xe2\x94\x80\xe2\x94\x80 Original summary section row (for GSTR-3B vs GSTR-1 legacy compatibility) \xe2\x94\x80\xe2\x94\x80\nclass SummarySectionRow(BaseModel):\n    sectionId:         str\n    sectionName:       str\n    description:       str\n    file1Value:        float = 0.0\n    file2Value:        float = 0.0\n    taxableDifference: float = 0.0\n    igstDiff:          float = 0.0\n    cgstDiff:          float = 0.0\n    sgstDiff:          float = 0.0\n    totalDifference:   float = 0.0\n    status:            str = "matched"   # "matched", "mismatch", "missing_in_file1", "missing_in_file2"\n\n# \xe2\x94\x80\xe2\x94\x80 NEW \xe2\x80\x94 reconciliation type metadata, served by GET /api/reconciliation-types \xe2\x94\x80\xe2\x94\x80\nclass ReconType'

if old_bytes in content:
    content = content.replace(old_bytes, new_bytes)
    with open(r'C:\Users\chaitali\OneDrive\Desktop\k\gstmatch-frontend\gstmatch\gstmatch-api\gstmatch-api\models\schemas.py', 'wb') as f:
        f.write(content)
    print('Done!')
else:
    print('Old bytes not found')
    idx = content.find(b'lineItems:          List[SummaryLineItem]')
    if idx >= 0:
        print('Found at:', idx)
        print(content[idx:idx+200])