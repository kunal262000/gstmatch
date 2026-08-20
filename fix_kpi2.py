#!/usr/bin/env python3
import sys

filepath = r'C:\Users\chaitali\OneDrive\Desktop\k\gstmatch-frontend\gstmatch\app\reports\page.tsx'

with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Find the KPI section and replace it
kpi_start = content.find('/* 5 Top KPI Cards */')
if kpi_start == -1:
    print('KPI section not found')
    sys.exit(1)

# Print what we found for debugging
print('KPI section found at index:', kpi_start)
print('First 200 chars:', repr(content[kpi_start:kpi_start+200]))

# Since the exact string doesn't match, let's do targeted replacements
# Replace the hardcoded values one by one

# 1. Replace "24" with dynamic value for Total Reconciliations
content = content.replace(
    "<div style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', margin: '4px 0' }}>24</div>",
    "<div style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', margin: '4px 0' }}>{recentReports.length}</div>"
)

# 2. Replace "5,842" with dynamic Invoices Processed
content = content.replace(
    "<div style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', margin: '4px 0' }}>5,842</div>",
    "<div style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', margin: '4px 0' }}>{rows.length > 0 ? rows.reduce((sum, r) => sum + (r.data.summary.totalInvoices || 0), 0) : 0}</div>"
)

# 3. Replace "₹4,28,560" with dynamic ITC Recovered
content = content.replace(
    "<div style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', margin: '4px 0' }}>₹4,28,560</div>",
    "<div style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', margin: '4px 0' }}>{rows.length > 0 ? rows.reduce((sum, r) => sum + (r.data.summary.totalRecoveredOrValid || 0), 0) : 0}</div>"
)

# 4. Replace "₹81,289" with dynamic ITC at Risk
content = content.replace(
    "<div style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444', margin: '4px 0' }}>₹81,289</div>",
    "<div style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444', margin: '4px 0' }}>{rows.length > 0 ? rows.reduce((sum, r) => sum + (r.data.summary.totalItcAtRisk || 0), 0) : 0}</div>"
)

# 5. Replace "94.6%" with dynamic Match Accuracy
content = content.replace(
    "<div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', margin: '4px 0' }}>94.6%</div>",
    "<div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', margin: '4px 0' }}>{rows.length > 0 ? Math.round(rows.reduce((sum, r) => sum + (r.data.summary.complianceScore || 0), 0) / rows.length) : 0}%</div>"
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Targeted KPI replacements completed')