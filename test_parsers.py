from core.parser import parse_gstr2b, parse_gstr1, parse_ims, parse_return_summary
import json

# Test GSTR-2B parser section coverage
print('=== GSTR-2B Parser Section Coverage ===')
g2b_json = json.dumps({
    'data': {
        'docdata': {
            'b2b': [
                {'ctin': '27ABC', 'tradeName': 'Test', 'inv': [{'inum': 'INV-1', 'idt': '01/06/2026', 'val': 100000, 'itms': [{'itm_det': {'txval': 100000, 'iamt': 0, 'camt': 9000, 'samt': 9000}}]}]}
            ],
            'b2ba': [],  # empty section
            'cdnr': [],    # empty section
            'cdnra': []    # empty section
        }
    }
})
df, err = parse_gstr2b(g2b_json.encode(), 'gstr2b.json')
print('Rows parsed:', len(df))
print('Error:', err)
if len(df) > 0:
    print('Columns:', list(df.columns))
    print('Sample row:', df.iloc[0].to_dict())
print()

# Test GSTR-1 parser section coverage  
print('=== GSTR-1 Parser Section Coverage ===')
g1_json = json.dumps({
    'data': {
        'b2b': [{'ctin': '27ABC', 'cname': 'Test Cust', 'inv': [{'inum': 'INV-1', 'idt': '01/06/2026', 'val': 100000, 'items': [{'item_det': {'txval': 100000, 'iamt': 0, 'camt': 9000, 'samt': 9000}}]}]}],
        'b2ba': [],
        'b2cl': [],
        'b2cs': [],
        'cdnr': []
    }
})
df, err = parse_gstr1(g1_json.encode(), 'gstr1.json')
print('Rows parsed:', len(df))
print('Error:', err)
if len(df) > 0:
    print('Columns:', list(df.columns))
print()

# Test IMS parser
print('=== IMS Parser Coverage ===')
ims_csv = 'Supplier GSTIN,Supplier Name,Invoice No,Date,Taxable Value,IGST,CGST,SGST,Total,Action Status\n27ABC,Test,INV-1,01/06/2026,100000,0,9000,9000,118000,Accepted'
df, err = parse_ims(ims_csv.encode(), 'ims.csv')
print('Rows parsed:', len(df))
print('Error:', err)
if len(df) > 0:
    print('Columns:', list(df.columns))
    print('Action Status:', df['action_status'].iloc[0])
print()

# Test return summary parser
print('=== Return Summary Parser Coverage ===')
s, err = parse_return_summary(b'{"taxable_val": 100000, "igst": 10000, "cgst": 9000, "sgst": 9000, "cess": 0}', 'test.json', return_type='gstr3b_gstr1')
print('Summary:', s)
print('Error:', err)