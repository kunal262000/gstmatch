#!/usr/bin/env python3
import re

with open('C:\\Users\\chaitali\\OneDrive\\Desktop\\k\\gstmatch-frontend\\gstmatch\\app\\reports\\page.tsx', 'r') as f:
    content = f.read()

# Replace the KPI cards hardcoded values with dynamic data
old_kpi = """/* 5 Top KPI Cards */
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '14px',
                marginBottom: '28px',
              }}
            >
              <div style={{ borderRadius: '14px', background: 'var(--neu-bg)', boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Total Reconciliations</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', margin: '4px 0' }}>24</div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>+5 vs last month</div>
              </div>

              <div style={{ borderRadius: '14px', background: 'var(--neu-bg)', boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Invoices Processed</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', margin: '4px 0' }}>5,842</div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>+18% vs last month</div>
              </div>

              <div style={{ borderRadius: '14px', background: 'var(--neu-bg)', boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>ITC Recovered</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', margin: '4px 0' }}>₹4,28,560</div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>+₹86,420 vs last month</div>
              </div>

              <div style={{ borderRadius: '14px', background: 'var(--neu-bg)', boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>ITC at Risk</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444', margin: '4px 0' }}>₹81,289</div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444' }}>18.1% of total ITC</div>
              </div>

              <div style={{ borderRadius: '14px', background: 'var(--neu-bg)', boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Match Accuracy</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', margin: '4px 0' }}>94.6%</div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>+3.2% vs last month</div>
              </div>"""

new_kpi = """/* 5 Top KPI Cards */
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                gap: '14px',
                marginBottom: '28px',
              }}
            >
              <div style={{ borderRadius: '14px', background: 'var(--neu-bg)', boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Total Reconciliations</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', margin: '4px 0' }}>
                  {recentReports.length}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>+5 vs last month</div>
              </div>

              <div style={{ borderRadius: '14px', background: 'var(--neu-bg)', boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Invoices Processed</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', margin: '4px 0' }}>
                  {rows.length > 0 ? rows.reduce((sum, r) => sum + (r.data.summary.totalInvoices || 0), 0) : 0}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>+18% vs last month</div>
              </div>

              <div style={{ borderRadius: '14px', background: 'var(--neu-bg)', boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>ITC Recovered</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#1e293b', margin: '4px 0' }}>
                  {rows.length > 0 ? rows.reduce((sum, r) => sum + (r.data.summary.totalRecoveredOrValid || 0), 0) : 0}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>+₹86,420 vs last month</div>
              </div>

              <div style={{ borderRadius: '14px', background: 'var(--neu-bg)', boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>ITC at Risk</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#ef4444', margin: '4px 0' }}>
                  {rows.length > 0 ? rows.reduce((sum, r) => sum + (r.data.summary.totalItcAtRisk || 0), 0) : 0}
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444' }}>18.1% of total ITC</div>
              </div>

              <div style={{ borderRadius: '14px', background: 'var(--neu-bg)', boxShadow: '4px 4px 10px var(--neu-dark), -4px -4px 10px var(--neu-light)', padding: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Match Accuracy</div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: '#10b981', margin: '4px 0' }}>
                  {rows.length > 0 ? Math.round(rows.reduce((sum, r) => sum + (r.data.summary.complianceScore || 0), 0) / rows.length) : 0}%
                </div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}>+3.2% vs last month</div>
              </div>"""

if old_kpi in content:
    content = content.replace(old_kpi, new_kpi)
    with open('C:\\Users\\chaitali\\OneDrive\\Desktop\\k\\gstmatch-frontend\\gstmatch\\app\\reports\\page.tsx', 'w') as f:
        f.write(content)
    print('KPI cards replaced successfully')
else:
    print('OLD KPI not found - checking what\'s there')
    # Print the KPI section for debugging
    idx = content.find('/* 5 Top KPI Cards */')
    if idx >= 0:
        print(content[idx:idx+800])
    else:
        print('KPI section marker not found either')