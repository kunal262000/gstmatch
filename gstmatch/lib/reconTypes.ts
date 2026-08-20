// NEW FILE — place at: gstmatch/lib/reconTypes.ts
//
// Mirrors the backend registry in core/recon_registry.py. Static so the
// upload page renders instantly without a network round-trip; optionally
// fetch getReconciliationTypes() from lib/api.ts for the live source of
// truth if the two ever need to diverge.

export type ReconEngine = 'invoice' | 'summary'

export interface ReconTypeInfo {
  id:          string
  name:        string
  shortName:   string
  description: string
  icon:        string
  engine:      ReconEngine
  file1Label:  string
  file2Label:  string
  file1Hint:   string
  file2Hint:   string
  badge?:      'POPULAR' | 'NEW'
}

export const RECON_TYPES: ReconTypeInfo[] = [
  {
    id: 'gstr2b_vs_pr',
    name: 'GSTR-2B vs Purchase Register',
    shortName: 'GSTR-2B vs PR',
    description: 'Match ITC-eligible invoices, find missing invoices, value mismatches and more.',
    icon: '📄',
    engine: 'invoice',
    file1Label: 'Purchase Register',
    file2Label: 'GSTR-2B File',
    file1Hint: 'Your Excel or CSV purchase register',
    file2Hint: 'GST Portal → Returns → GSTR-2B → Download JSON or Excel',
  },
  {
    id: 'gstr2a_vs_gstr2b',
    name: 'GSTR-2A vs GSTR-2B',
    shortName: 'GSTR-2A vs GSTR-2B',
    description: 'Compare 2A and 2B to identify why invoices are missing in 2B.',
    icon: '🔄',
    engine: 'invoice',
    file1Label: 'GSTR-2A File',
    file2Label: 'GSTR-2B File',
    file1Hint: 'GST Portal → Returns → GSTR-2A → Download JSON or Excel',
    file2Hint: 'GST Portal → Returns → GSTR-2B → Download JSON or Excel',
    badge: 'POPULAR',
  },
  {
    id: 'gstr1_vs_sales_register',
    name: 'GSTR-1 vs Sales Register',
    shortName: 'GSTR-1 vs Sales',
    description: 'Ensure all your sales are reported in GSTR-1. Find missing or mismatched invoices.',
    icon: '🧾',
    engine: 'invoice',
    file1Label: 'Sales Register',
    file2Label: 'GSTR-1 File',
    file1Hint: 'Your Excel or CSV sales register',
    file2Hint: 'GST Portal → Returns → GSTR-1 → Download JSON or Excel',
  },
  {
    id: 'ims_vs_gstr2b',
    name: 'IMS vs GSTR-2B',
    shortName: 'IMS vs GSTR-2B',
    description: 'Check invoice acceptance / rejection status in IMS and its impact on 2B.',
    icon: '📋',
    engine: 'invoice',
    file1Label: 'IMS Action File',
    file2Label: 'GSTR-2B File',
    file1Hint: 'GST Portal → IMS → Download action report (Excel)',
    file2Hint: 'GST Portal → Returns → GSTR-2B → Download JSON or Excel',
  },
  {
    id: 'gstr3b_vs_gstr1',
    name: 'GSTR-3B vs GSTR-1',
    shortName: 'GSTR-3B vs GSTR-1',
    description: 'Verify tax liability declared in GSTR-3B against your GSTR-1 data.',
    icon: '🧮',
    engine: 'summary',
    file1Label: 'GSTR-3B File',
    file2Label: 'GSTR-1 File',
    file1Hint: 'GST Portal → Returns → GSTR-3B → Download Summary (Excel/JSON)',
    file2Hint: 'GST Portal → Returns → GSTR-1 → Download Summary (Excel/JSON)',
  },
  {
    id: 'gstr9_vs_books',
    name: 'GSTR-9 vs Books',
    shortName: 'GSTR-9 vs Books',
    description: 'Annual reconciliation of sales, purchases, ITC and tax liability with your books.',
    icon: '📚',
    engine: 'summary',
    file1Label: 'GSTR-9 File',
    file2Label: 'Financial Books Summary',
    file1Hint: 'GST Portal → Annual Return → GSTR-9 → Download (Excel/JSON)',
    file2Hint: 'Your Tally/Zoho/Excel — annual summary by tax category',
  },
  {
    id: 'gstr9c_vs_books',
    name: 'GSTR-9C vs Books',
    shortName: 'GSTR-9C vs Books',
    description: 'Reconcile data for GSTR-9C with your audited financial statements.',
    icon: '📊',
    engine: 'summary',
    file1Label: 'GSTR-9C File',
    file2Label: 'Financial Books Summary',
    file1Hint: 'GST Portal → Annual Return → GSTR-9C → Download (Excel/JSON)',
    file2Hint: 'Your audited financial statement — turnover & tax summary',
  },
]

export function getReconType(id: string): ReconTypeInfo {
  const found = RECON_TYPES.find(t => t.id === id)
  if (!found) throw new Error(`Unknown reconciliation type: ${id}`)
  return found
}
