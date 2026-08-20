import pandas as pd
from core.reconciler import reconcile

inv1 = {'gstin': '27AABCU9603R1ZM', 'supplier_name': 'X', 'invoice_no': 'INV-001',
        'invoice_date': '01/06/2026', 'taxable_amt': 100000, 'igst': 0, 'cgst': 9000, 'sgst': 9000, 'total': 118000}
inv2 = {'gstin': '27AABCU9603R1ZM', 'supplier_name': 'X', 'invoice_no': 'INV-999',
        'invoice_date': '02/06/2026', 'taxable_amt': 50000, 'igst': 0, 'cgst': 4500, 'sgst': 4500, 'total': 59000}

df1 = pd.DataFrame([inv1, inv2])   # your books (PR): both invoices
df2 = pd.DataFrame([inv1])         # GSTR-2B: only INV-001 reported

r = reconcile(pr_df=df1, gstr2b_df=df2, period='June 2026',
              gstin='27AABCU9603R1ZM', business_name='B', job_id='t2', recon_type='gstr2b_pr')

print('totalInvoices:', r.summary.totalInvoices)
print('matched:', r.summary.matched)
print('missingInGstr2b:', r.summary.missingInGstr2b)
print('totalItcAtRisk (expect 9000):', r.summary.totalItcAtRisk)
print('totalRecoveredOrValid:', r.summary.totalRecoveredOrValid)
print('supplier itcAtRisk:', [(s.name, s.itcAtRisk) for s in r.suppliers])

# Mismatched test: INV-999 total differs but tax matches
inv2b = dict(inv2); inv2b['total'] = 60000  # GSTR-2B total differs by 1000
df2m = pd.DataFrame([inv1, inv2b])
rm = reconcile(pr_df=df1, gstr2b_df=df2m, period='June 2026',
               gstin='27AABCU9603R1ZM', business_name='B', job_id='t3', recon_type='gstr2b_pr')
print('--- mismatch (tax identical, total off by 1000) ---')
print('mismatched:', rm.summary.mismatched)
print('totalItcAtRisk (expect 0):', rm.summary.totalItcAtRisk)
