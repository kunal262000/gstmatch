with open(r'C:\Users\chaitali\OneDrive\Desktop\k\gstmatch-frontend\gstmatch\gstmatch-api\gstmatch-api\models\schemas.py', 'rb') as f:
    content = f.read()

# Find the exact bytes
idx = content.find(b'lineItems:          List[SummaryLineItem]')
if idx >= 0:
    # Print context
    print('Context bytes:', content[idx:idx+120])
    
    # Find the exact pattern to replace
    # The pattern is: newline newline newline # em-dash em-dash em-dash SPACE NEW em-dash SPACE reconciliation...
    idx2 = content.find(b'# \xe2\x80\x94\xe2\x80\x94\xe2\x80\x94 NEW \xe2\x80\x94 reconciliation', idx)
    if idx2 >= 0:
        print('Found at byte:', idx2)
        print('Context bytes:', content[idx2:idx2+100])
        
        # Now replace
        old_bytes = content[idx2:idx2+80]  # approximate
        print('Old bytes:', old_bytes)
    else:
        print('Pattern not found')
        # Search for "NEW" after idx
        idx3 = content.find(b'NEW', idx)
        if idx3 >= 0:
            print('Found NEW at:', idx3)
            print('Context:', content[idx3:idx3+100])