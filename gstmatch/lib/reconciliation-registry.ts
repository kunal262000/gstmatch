export type ReconciliationCategory = 'itc' | 'sales' | 'returns' | 'annual'

export type ReconciliationTypeId =
  | 'gstr2b_pr'
  | 'gstr2a_gstr2b'
  | 'gstr1_sales_register'
  | 'ims_gstr2b'
  | 'gstr3b_gstr1'
  | 'gstr9_books'
  | 'gstr9c_books'

export interface FileConfig {
  id: string
  label: string
  shortName: string
  description: string
  allowedExtensions: string[]
  acceptMimeTypes: string
  sampleHint: string
  requiredKeywords: string[]
}

export interface ReconciliationConfig {
  id: ReconciliationTypeId
  name: string
  shortTitle: string
  category: ReconciliationCategory
  categoryLabel: string
  badgeText?: string
  level: 'invoice' | 'summary'
  description: string
  longDescription: string
  file1: FileConfig
  file2: FileConfig
  financialMetricLabel: string
  financialMetricDescription: string
  differenceLabel: string
  partyLabel: 'Supplier' | 'Customer' | 'Section' | 'Ledger'
  partiesLabel: 'Suppliers' | 'Customers' | 'Return Sections' | 'Audit Heads'
  sampleReportName: string
  comingSoon?: boolean
  popular?: boolean
}

export const RECONCILIATION_CATEGORIES: { id: ReconciliationCategory; name: string; description: string }[] = [
  { id: 'itc', name: 'ITC Reconciliation', description: 'Match input tax credit eligible invoices, identify delayed or unfiled credits' },
  { id: 'sales', name: 'Sales Reconciliation', description: 'Reconcile outward supplies in books with reported GST returns' },
  { id: 'returns', name: 'Return Reconciliation', description: 'Cross-verify turnover, tax liabilities and monthly summary returns' },
  { id: 'annual', name: 'Annual & Audit Reconciliation', description: 'Annual aggregate matching of GST returns with audited financial statements' },
]

export const RECONCILIATION_TYPES: Record<ReconciliationTypeId, ReconciliationConfig> = {
  gstr2b_pr: {
    id: 'gstr2b_pr',
    name: 'GSTR-2B ↔ Purchase Register',
    shortTitle: 'GSTR-2B vs PR',
    category: 'itc',
    categoryLabel: 'ITC Reconciliation',
    popular: true,
    level: 'invoice',
    description: 'Match ITC-eligible invoices, find missing invoices, value mismatches and unfiled tax credit.',
    longDescription: 'Compare your Purchase Register with GSTR-2B (auto-drafted monthly ITC statement) to claim 100% eligible ITC and prevent tax credit leakages.',
    file1: {
      id: 'file1',
      label: 'Upload Purchase Register',
      shortName: 'Purchase Register',
      description: 'Upload your Purchase Register (Excel or CSV from Tally, Zoho, Busy, etc.)',
      allowedExtensions: ['.xlsx', '.xls', '.csv'],
      acceptMimeTypes: '.xlsx,.xls,.csv',
      sampleHint: 'Columns needed: GSTIN, Invoice No, Date, Taxable Value, IGST, CGST, SGST, Total',
      requiredKeywords: ['invoice', 'gstin', 'taxable', 'total', 'cgst', 'sgst', 'igst', 'voucher', 'bill'],
    },
    file2: {
      id: 'file2',
      label: 'Upload GSTR-2B',
      shortName: 'GSTR-2B',
      description: 'Upload GSTR-2B file downloaded from GST Portal (Excel or JSON)',
      allowedExtensions: ['.xlsx', '.xls', '.json'],
      acceptMimeTypes: '.xlsx,.xls,.json',
      sampleHint: 'Downloaded from GST Portal > Services > Returns > GSTR-2B (Excel/JSON)',
      requiredKeywords: ['gstr2b', 'b2b', 'b2ba', 'inv', 'gstin', 'supplier', 'rate'],
    },
    financialMetricLabel: 'Potential ITC at Risk',
    financialMetricDescription: 'Input Tax Credit in your books that suppliers have not reported in GSTR-2B.',
    differenceLabel: 'Tax Credit Difference',
    partyLabel: 'Supplier',
    partiesLabel: 'Suppliers',
    sampleReportName: 'GSTR2B_PR_Reconciliation_Report.xlsx',
  },

  gstr2a_gstr2b: {
    id: 'gstr2a_gstr2b',
    name: 'GSTR-2A ↔ GSTR-2B',
    shortTitle: 'GSTR-2A vs GSTR-2B',
    category: 'itc',
    categoryLabel: 'ITC Reconciliation',
    popular: true,
    level: 'invoice',
    description: 'Compare dynamic GSTR-2A and static GSTR-2B to identify invoices delayed past filing cutoff.',
    longDescription: 'Identify suppliers who filed GSTR-1 after the monthly cutoff (11th/13th) causing eligible credit to roll over to subsequent periods.',
    file1: {
      id: 'file1',
      label: 'Upload GSTR-2A',
      shortName: 'GSTR-2A',
      description: 'Upload GSTR-2A downloaded from GST portal (Excel or JSON)',
      allowedExtensions: ['.xlsx', '.xls', '.json'],
      acceptMimeTypes: '.xlsx,.xls,.json',
      sampleHint: 'Downloaded from GST Portal > Services > Returns > GSTR-2A',
      requiredKeywords: ['gstr2a', 'b2b', 'gstin', 'invoice', 'taxable', 'supplier'],
    },
    file2: {
      id: 'file2',
      label: 'Upload GSTR-2B',
      shortName: 'GSTR-2B',
      description: 'Upload static GSTR-2B return for the same period (Excel or JSON)',
      allowedExtensions: ['.xlsx', '.xls', '.json'],
      acceptMimeTypes: '.xlsx,.xls,.json',
      sampleHint: 'Downloaded from GST Portal > Services > Returns > GSTR-2B',
      requiredKeywords: ['gstr2b', 'b2b', 'gstin', 'invoice', 'taxable', 'itc'],
    },
    financialMetricLabel: 'ITC Timing & Cutoff Difference',
    financialMetricDescription: 'ITC present in dynamic 2A but blocked or deferred in static 2B due to late supplier filing.',
    differenceLabel: '2A vs 2B Variance',
    partyLabel: 'Supplier',
    partiesLabel: 'Suppliers',
    sampleReportName: 'GSTR2A_GSTR2B_Comparison_Report.xlsx',
  },

  ims_gstr2b: {
    id: 'ims_gstr2b',
    name: 'IMS ↔ GSTR-2B',
    shortTitle: 'IMS vs GSTR-2B',
    category: 'itc',
    categoryLabel: 'ITC Reconciliation',
    level: 'invoice',
    description: 'Check invoice acceptance, rejection, and pending status in Invoice Management System and its impact on 2B.',
    longDescription: 'Ensure every invoice action in the GST IMS portal (Accepted, Rejected, or Pending) correctly reflects in your auto-drafted GSTR-2B ITC statement.',
    file1: {
      id: 'file1',
      label: 'Upload IMS Export',
      shortName: 'IMS Action File',
      description: 'Upload Invoice Management System (IMS) action report (Excel/CSV/JSON)',
      allowedExtensions: ['.xlsx', '.xls', '.csv', '.json'],
      acceptMimeTypes: '.xlsx,.xls,.csv,.json',
      sampleHint: 'Exported from GST Portal > Invoice Management System (IMS) dashboard',
      requiredKeywords: ['ims', 'action', 'status', 'accept', 'reject', 'pending', 'invoice', 'gstin'],
    },
    file2: {
      id: 'file2',
      label: 'Upload GSTR-2B',
      shortName: 'GSTR-2B',
      description: 'Upload corresponding GSTR-2B return (Excel or JSON)',
      allowedExtensions: ['.xlsx', '.xls', '.json'],
      acceptMimeTypes: '.xlsx,.xls,.json',
      sampleHint: 'Official GSTR-2B downloaded from GST portal',
      requiredKeywords: ['gstr2b', 'b2b', 'gstin', 'invoice', 'taxable', 'itc'],
    },
    financialMetricLabel: 'Pending / Rejected ITC Impact',
    financialMetricDescription: 'Total tax value of invoices marked as Rejected or Pending in IMS requiring action before GSTR-3B filing.',
    differenceLabel: 'IMS Action Discrepancy',
    partyLabel: 'Supplier',
    partiesLabel: 'Suppliers',
    sampleReportName: 'IMS_GSTR2B_Action_Report.xlsx',
  },

  gstr1_sales_register: {
    id: 'gstr1_sales_register',
    name: 'GSTR-1 ↔ Sales Register',
    shortTitle: 'GSTR-1 vs Sales Register',
    category: 'sales',
    categoryLabel: 'Sales Reconciliation',
    popular: true,
    level: 'invoice',
    description: 'Ensure all outward sales in your books are reported in GSTR-1. Find missing invoices and tax differences.',
    longDescription: 'Reconcile outward sales invoices, credit notes, and debit notes between accounting books and GSTR-1 to prevent penalties and audit scrutiny.',
    file1: {
      id: 'file1',
      label: 'Upload Sales Register',
      shortName: 'Sales Register',
      description: 'Upload your Sales Register (Excel or CSV from Tally, Busy, SAP, etc.)',
      allowedExtensions: ['.xlsx', '.xls', '.csv'],
      acceptMimeTypes: '.xlsx,.xls,.csv',
      sampleHint: 'Columns needed: Customer GSTIN, Invoice No, Date, Taxable Value, IGST, CGST, SGST, Total',
      requiredKeywords: ['sales', 'customer', 'buyer', 'gstin', 'invoice', 'taxable', 'cgst', 'sgst', 'igst', 'total'],
    },
    file2: {
      id: 'file2',
      label: 'Upload GSTR-1',
      shortName: 'GSTR-1',
      description: 'Upload GSTR-1 return file downloaded from GST Portal (Excel or JSON)',
      allowedExtensions: ['.xlsx', '.xls', '.json'],
      acceptMimeTypes: '.xlsx,.xls,.json',
      sampleHint: 'Downloaded from GST Portal > Services > Returns > GSTR-1',
      requiredKeywords: ['gstr1', 'b2b', 'b2cl', 'b2cs', 'cdnr', 'gstin', 'invoice', 'taxable'],
    },
    financialMetricLabel: 'Sales Reporting Difference',
    financialMetricDescription: 'Total turnover or tax variance between your accounting books and reported GSTR-1 returns.',
    differenceLabel: 'Sales Turnover Difference',
    partyLabel: 'Customer',
    partiesLabel: 'Customers',
    sampleReportName: 'GSTR1_Sales_Reconciliation_Report.xlsx',
  },

  gstr3b_gstr1: {
    id: 'gstr3b_gstr1',
    name: 'GSTR-3B ↔ GSTR-1',
    shortTitle: 'GSTR-3B vs GSTR-1',
    category: 'returns',
    categoryLabel: 'Return Reconciliation',
    popular: true,
    level: 'summary',
    description: 'Verify outward tax liability declared in monthly summary GSTR-3B against outward invoice details in GSTR-1.',
    longDescription: 'Compare Table 3.1 outward tax liability in GSTR-3B with GSTR-1 to prevent notice under Rule 88C (Tax liability difference).',
    file1: {
      id: 'file1',
      label: 'Upload GSTR-1',
      shortName: 'GSTR-1 Summary/Return',
      description: 'Upload GSTR-1 return or table summary (Excel or JSON)',
      allowedExtensions: ['.xlsx', '.xls', '.json'],
      acceptMimeTypes: '.xlsx,.xls,.json',
      sampleHint: 'Downloaded from GST Portal > Returns > GSTR-1 (Excel or JSON)',
      requiredKeywords: ['gstr1', 'b2b', 'b2cs', 'b2cl', 'taxable', 'igst', 'cgst', 'sgst', 'cess', 'outward'],
    },
    file2: {
      id: 'file2',
      label: 'Upload GSTR-3B',
      shortName: 'GSTR-3B Summary/Return',
      description: 'Upload GSTR-3B return summary (Excel or JSON)',
      allowedExtensions: ['.xlsx', '.xls', '.json'],
      acceptMimeTypes: '.xlsx,.xls,.json',
      sampleHint: 'Downloaded from GST Portal > Returns > GSTR-3B (Excel or JSON)',
      requiredKeywords: ['gstr3b', 'table 3.1', 'table3.1', 'tax liability', 'taxable', 'igst', 'cgst', 'sgst', 'cess'],
    },
    financialMetricLabel: 'Tax Liability Difference (Rule 88C)',
    financialMetricDescription: 'Variance between outward tax declared in GSTR-1 and paid in GSTR-3B liable for tax notices.',
    differenceLabel: 'Tax Liability Variance',
    partyLabel: 'Section',
    partiesLabel: 'Return Sections',
    sampleReportName: 'GSTR3B_GSTR1_Liability_Reconciliation.xlsx',
  },

  gstr9_books: {
    id: 'gstr9_books',
    name: 'GSTR-9 ↔ Books',
    shortTitle: 'GSTR-9 vs Books',
    category: 'annual',
    categoryLabel: 'Annual & Audit Reconciliation',
    level: 'summary',
    description: 'Annual aggregate reconciliation of sales, purchases, ITC and tax liability with audited books of accounts.',
    longDescription: 'Reconcile full-year turnover, taxes paid, and ITC availed in annual return GSTR-9 against audited Trial Balance and P&L accounts.',
    file1: {
      id: 'file1',
      label: 'Upload Audited Books / Trial Balance',
      shortName: 'Audited Financials',
      description: 'Upload annual audited Trial Balance or P&L summary (Excel or CSV)',
      allowedExtensions: ['.xlsx', '.xls', '.csv'],
      acceptMimeTypes: '.xlsx,.xls,.csv',
      sampleHint: 'Summary of annual turnover, taxes, and ITC from audited books',
      requiredKeywords: ['turnover', 'sales', 'itc', 'tax', 'trial balance', 'financial', 'p&l', 'books'],
    },
    file2: {
      id: 'file2',
      label: 'Upload GSTR-9 Annual Return',
      shortName: 'GSTR-9 Return',
      description: 'Upload filed or auto-calculated GSTR-9 annual return (Excel or JSON)',
      allowedExtensions: ['.xlsx', '.xls', '.json'],
      acceptMimeTypes: '.xlsx,.xls,.json',
      sampleHint: 'Downloaded from GST Portal > Annual Return > GSTR-9',
      requiredKeywords: ['gstr9', 'annual return', 'table 4', 'table 5', 'table 6', 'table 8', 'turnover'],
    },
    financialMetricLabel: 'Annual Turnover & Tax Variance',
    financialMetricDescription: 'Discrepancy between annual accounts and GSTR-9 requiring disclosure or additional tax payment in DRC-03.',
    differenceLabel: 'Annual Audit Difference',
    partyLabel: 'Ledger',
    partiesLabel: 'Audit Heads',
    sampleReportName: 'GSTR9_Books_Annual_Reconciliation.xlsx',
  },

  gstr9c_books: {
    id: 'gstr9c_books',
    name: 'GSTR-9C ↔ Books',
    shortTitle: 'GSTR-9C vs Books',
    category: 'annual',
    categoryLabel: 'Annual & Audit Reconciliation',
    level: 'summary',
    description: 'Reconcile turnover and tax reconciliation statement GSTR-9C with audited balance sheet and profit & loss.',
    longDescription: 'Verify Table 5 (gross turnover reconciliation) and Table 9 (tax rate-wise reconciliation) in GSTR-9C with statutory audit reports.',
    file1: {
      id: 'file1',
      label: 'Upload Audited Financial Statements',
      shortName: 'Audited Balance Sheet & P&L',
      description: 'Upload audited annual financial statements (Excel/CSV)',
      allowedExtensions: ['.xlsx', '.xls', '.csv'],
      acceptMimeTypes: '.xlsx,.xls,.csv',
      sampleHint: 'Financial statement turnover, non-GST supplies, and adjustments',
      requiredKeywords: ['balance sheet', 'profit', 'loss', 'turnover', 'financials', 'audit', 'revenue'],
    },
    file2: {
      id: 'file2',
      label: 'Upload GSTR-9C Statement',
      shortName: 'GSTR-9C Statement',
      description: 'Upload GSTR-9C reconciliation statement (Excel or JSON)',
      allowedExtensions: ['.xlsx', '.xls', '.json'],
      acceptMimeTypes: '.xlsx,.xls,.json',
      sampleHint: 'Downloaded from GST Portal > Annual Return > GSTR-9C',
      requiredKeywords: ['gstr9c', 'reconciliation statement', 'table 5', 'table 9', 'table 11', 'table 14'],
    },
    financialMetricLabel: 'GSTR-9C Reconciliation Variance',
    financialMetricDescription: 'Unreconciled difference between audited balance sheet revenue and GST returns.',
    differenceLabel: 'Reconciliation Statement Variance',
    partyLabel: 'Ledger',
    partiesLabel: 'Audit Heads',
    sampleReportName: 'GSTR9C_Books_Reconciliation.xlsx',
  },
}

export function getReconciliationConfig(typeId: string | null | undefined): ReconciliationConfig {
  if (typeId && typeId in RECONCILIATION_TYPES) {
    return RECONCILIATION_TYPES[typeId as ReconciliationTypeId]
  }
  return RECONCILIATION_TYPES.gstr2b_pr
}
