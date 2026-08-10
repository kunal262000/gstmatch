export interface FAQItem {
  q: string
  a: string
}

export const FAQS: FAQItem[] = [
  {
    q: 'How do the 2 free reconciliations work?',
    a: 'Every new user gets 2 completely free, full-feature GST reconciliations upon signing up. No credit card or payment details are required. You can upload up to 500 invoices per run and download the full Excel mismatch report.',
  },
  {
    q: 'How does fuzzy matching handle invoice number typos?',
    a: 'Suppliers often file invoices with slight variations like "INV-2025/001" vs "INV001" or "INV-1". Our RapidFuzz AI engine normalizes symbols, zeros, and patterns to match invoices accurately, preventing false mismatches.',
  },
  {
    q: 'Is my business and financial GST data safe and private?',
    a: 'Yes, absolutely. Your uploaded files and reconciliation data are encrypted in transit and at rest. We never share or sell your financial data to third parties, and file records are strictly bound to your private account.',
  },
  {
    q: 'What file formats are supported for Purchase Register and GSTR-2B?',
    a: 'GSTMatch supports Excel (.xlsx, .xls) and CSV exports from Tally, Busy, Marg, Zoho Books, QuickBooks, or custom accounting systems, as well as official JSON / Excel downloads directly from the GST Portal (GSTR-2B).',
  },
  {
    q: 'Can I export reports directly for my CA or Tax Consultant?',
    a: 'Yes! After reconciliation finishes in under 2 minutes, you can download a formatted Excel report with distinct color-coded tabs for exact matches, tax mismatches, missing in 2B, and missing in register.',
  },
  {
    q: 'What happens after my 2 free reconciliations are used?',
    a: 'You can upgrade to our Starter Plan for just ₹399/month (1 GSTIN, 500 invoices/month) or Growth Plan for ₹699/month (3 GSTINs, 2000 invoices/month). Payments are securely processed in INR via Cashfree Payments.',
  },
]
