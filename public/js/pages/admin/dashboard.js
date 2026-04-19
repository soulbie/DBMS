/**
 * dashboard.js — Wires up all 10 SP.sql stored procedures
 * Each form submits to the corresponding analytics API endpoint,
 * then dynamically renders the result as a table.
 */

// ── Utility: render an array of objects as a HTML table ──
function renderTable(containerId, rows) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!rows || rows.length === 0) {
    container.innerHTML = '<p class="result-empty">No data returned for the given parameters.</p>';
    return;
  }

  const columns = Object.keys(rows[0]);
  let html = '<table class="table-glass"><thead><tr>';
  columns.forEach(col => html += `<th>${col}</th>`);
  html += '</tr></thead><tbody>';

  rows.forEach((row, i) => {
    html += `<tr class="animate-fade-in" style="animation-delay:${i * 0.03}s">`;
    columns.forEach(col => {
      let val = row[col];
      // Format numbers nicely
      if (typeof val === 'number') {
        val = val % 1 !== 0 ? val.toFixed(2) : val.toLocaleString();
      }
      if (val === null || val === undefined) val = '—';
      html += `<td>${val}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

// ── Utility: render a single-row object as key-value cards ──
function renderCards(containerId, row) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!row || Object.keys(row).length === 0) {
    container.innerHTML = '<p class="result-empty">No data returned.</p>';
    return;
  }

  let html = '<div style="display:flex;gap:1rem;flex-wrap:wrap;margin-top:0.5rem">';
  Object.entries(row).forEach(([key, val]) => {
    if (typeof val === 'number') {
      val = val % 1 !== 0 ? val.toFixed(2) : val.toLocaleString();
    }
    if (val === null || val === undefined) val = '—';
    html += `
      <div class="glass-card" style="flex:1;min-width:180px;padding:1rem;text-align:center;">
        <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.4rem;">${key}</div>
        <div style="font-size:1.5rem;font-weight:700;color:var(--primary-color);font-family:'Outfit',sans-serif;">${val}</div>
      </div>`;
  });
  html += '</div>';
  container.innerHTML = html;
}

// ── Utility: generic SP form handler ──
function handleSP(formId, endpoint, resultId, renderFn) {
  const form = document.getElementById(formId);
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    const original = btn.innerText;
    btn.innerText = 'Running...';
    btn.disabled = true;

    const container = document.getElementById(resultId);
    container.innerHTML = '<p style="color:var(--text-muted);padding:1rem;">Executing stored procedure...</p>';

    try {
      const fd = new FormData(form);
      const params = new URLSearchParams();
      for (const [k, v] of fd.entries()) {
        if (v !== '') params.append(k, v);
      }

      const data = await window.apiFetch(`${endpoint}?${params.toString()}`);
      renderFn(resultId, data);
      window.toast.show('Procedure executed successfully', 'success');
    } catch (err) {
      container.innerHTML = `<p class="result-error">Error: ${err.message}</p>`;
      window.toast.show(err.message, 'error');
    } finally {
      btn.innerText = original;
      btn.disabled = false;
    }
  });
}

// ── Custom Function: Fetch & Render Audit Logs ──
window.fetchAndRenderAuditLogs = async function() {
  const tbody = document.getElementById('auditLogsBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted);">Loading logs...</td></tr>';
  
  try {
    const data = await window.apiFetch('/admin/audit-logs');
    
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No audit logs found.</td></tr>';
      return;
    }
    
    tbody.innerHTML = '';
    data.forEach((log, index) => {
      const tr = document.createElement('tr');
      tr.className = 'animate-fade-in';
      tr.style.animationDelay = `${index * 0.03}s`;
      
      const dateObj = new Date(log.ActionTimestamp);
      const timeStr = dateObj.toLocaleString();
      
      let actionColor = 'var(--text-main)';
      let actionBg = 'transparent';
      if (log.Action === 'INSERT') { actionColor = '#10B981'; actionBg = 'rgba(16, 185, 129, 0.1)'; }
      else if (log.Action === 'DELETE') { actionColor = '#EF4444'; actionBg = 'rgba(239, 68, 68, 0.1)'; }
      else if (log.Action === 'UPDATE') { actionColor = '#F59E0B'; actionBg = 'rgba(245, 158, 11, 0.1)'; }
      else if (log.Action && log.Action.startsWith('SYSTEM')) { actionColor = '#8B5CF6'; actionBg = 'rgba(139, 92, 246, 0.1)'; }

      const badgeStyle = `color: ${actionColor}; background: ${actionBg}; padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 600; font-size: 0.8rem;`;

      tr.innerHTML = `
        <td style="font-size: 0.85rem; color: var(--text-muted);">${timeStr}</td>
        <td>${log.AdminID || 'SYS'}</td>
        <td><span style="${badgeStyle}">${log.Action}</span></td>
        <td style="font-weight: 500;">${log.TargetTable || '-'}</td>
        <td>${log.TargetID || '-'}</td>
        <td style="font-size: 0.85rem; max-width: 300px; white-space: normal;">${log.Details || ''}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="result-error">Error loading logs: ${err.message}</td></tr>`;
  }
};

// ── Boot ──
document.addEventListener('DOMContentLoaded', () => {

  // Fetch logs on initial load
  fetchAndRenderAuditLogs();

  // SP 1: Revenue by Date Range → returns multiple rows
  handleSP('spRevenueDate', '/analytics/revenue', 'resultRevenueDate', renderTable);

  // SP 2: Revenue by Category → returns multiple rows
  handleSP('spRevenueCategory', '/analytics/revenue/category', 'resultRevenueCategory', renderTable);

  // SP 3: Revenue Actual vs Expected → returns single row
  handleSP('spRevenueActual', '/analytics/revenue/actual-vs-expected', 'resultRevenueActual', (id, data) => {
    // data is an array with 1 row, render as cards
    if (Array.isArray(data) && data.length > 0) {
      renderCards(id, data[0]);
    } else if (typeof data === 'object' && !Array.isArray(data)) {
      renderCards(id, data);
    } else {
      renderCards(id, null);
    }
  });

  // SP 4: Best Selling Tours → returns multiple rows
  handleSP('spBestSelling', '/analytics/tours/best-selling', 'resultBestSelling', renderTable);

  // SP 5: Tour Occupancy by Name → returns multiple rows
  handleSP('spOccupancy', '/analytics/tours/occupancy', 'resultOccupancy', renderTable);

  // SP 6: Top Cancelled Tours → returns multiple rows
  handleSP('spCancelled', '/analytics/tours/cancelled', 'resultCancelled', renderTable);

  // SP 7: High Inventory Tours → returns multiple rows
  handleSP('spHighInventory', '/analytics/tours/high-inventory', 'resultHighInventory', renderTable);

  // SP 8: VIP Customers → returns multiple rows
  handleSP('spVIP', '/analytics/customers/vip', 'resultVIP', renderTable);

  // SP 9: Customer Demographics → returns multiple rows
  handleSP('spDemographics', '/analytics/customers/demographics', 'resultDemographics', renderTable);

  // SP 10: Customer Retention → returns single row
  handleSP('spRetention', '/analytics/customers/retention', 'resultRetention', (id, data) => {
    if (Array.isArray(data) && data.length > 0) {
      renderCards(id, data[0]);
    } else if (typeof data === 'object' && !Array.isArray(data)) {
      renderCards(id, data);
    } else {
      renderCards(id, null);
    }
  });

});
