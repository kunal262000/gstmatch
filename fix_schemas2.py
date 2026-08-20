with open(r'C:\Users\chaitali\OneDrive\Desktop\k\gstmatch-frontend\gstmatch\gstmatch-api\gstmatch-api\models\schemas.py', 'r') as f:
    content = f.read()

# Find the exact location
idx = content.find('lineItems:          List[SummaryLineItem]')
if idx >= 0:
    # Get the exact content after it
    print('Content after:', repr(content[idx:idx+120]))
    
    # The exact pattern to find
    # Find "# \u2014\u2014\u2014 NEW \u2014 reconciliation"
    idx2 = content.find('# ', idx)
    print('Found # at:', idx2)
    print('Context:', repr(content[idx2:idx2+80]))