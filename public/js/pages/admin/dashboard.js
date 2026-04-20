/**
 * dashboard.js — Wires up all 10 SP.sql stored procedures + Admin Gate + Admin/Orders lists
 */

// ══════════════════════════════════════════
//  ADMIN GATE (Login protection)
// ══════════════════════════════════════════
(function initAdminGate() {
  const gate      = document.getElementById('admin-gate');
  const infoBar   = document.getElementById('admin-info-bar');
  const nameBar   = document.getElementById('admin-name-bar');
  const form      = document.getElementById('admin-gate-form');
  const errDiv    = document.getElementById('gate-error');
  const gateBtn   = document.getElementById('gate-btn');

  // Check if already logged in
  const stored = localStorage.getItem('adminSession');
  if (stored) {
    try {
      const admin = JSON.parse(stored);
      unlockPortal(admin);
    } catch(e) {
      localStorage.removeItem('adminSession');
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errDiv.textContent = '';
    gateBtn.textContent = 'Authenticating...';
    gateBtn.disabled = true;

    const fd = new FormData(form);
    const payload = { email: fd.get('email'), password: fd.get('password') };

    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (json.success) {
        localStorage.setItem('adminSession', JSON.stringify(json.data));
        unlockPortal(json.data);
      } else {
        errDiv.textContent = json.message || 'Login failed';
        gateBtn.textContent = 'Enter Admin Portal';
        gateBtn.disabled = false;
      }
    } catch (err) {
      errDiv.textContent = 'Server error. Please try again.';
      gateBtn.textContent = 'Enter Admin Portal';
      gateBtn.disabled = false;
    }
  });

  function unlockPortal(admin) {
    gate.style.display = 'none';
    infoBar.style.display = 'flex';
    nameBar.textContent = `👤 ${admin.FullName || admin.Email} (ID: ${admin.AdminID})`;
    // After login, fetch data for loaded tabs
    fetchAndRenderOrders();
    fetchAndRenderAdmins();
    fetchAndRenderAuditLogs();
  }

  window.adminLogout = function() {
    localStorage.removeItem('adminSession');
    location.reload();
  };
})();

// ══════════════════════════════════════════
//  Utility: render array of objects as table
// ══════════════════════════════════════════
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
      if (typeof val === 'number') val = val % 1 !== 0 ? val.toFixed(2) : val.toLocaleString();
      if (val === null || val === undefined) val = '—';
      html += `<td>${val}</td>`;
    });
    html += '</tr>';
  });

  html += '</tbody></table>';
  container.innerHTML = html;
}

function renderCards(containerId, row) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!row || Object.keys(row).length === 0) {
    container.innerHTML = '<p class="result-empty">No data returned.</p>';
    return;
  }

  let html = '<div style="display:flex;gap:1rem;flex-wrap:wrap;margin-top:0.5rem">';
  Object.entries(row).forEach(([key, val]) => {
    if (typeof val === 'number') val = val % 1 !== 0 ? val.toFixed(2) : val.toLocaleString();
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
      for (const [k, v] of fd.entries()) { if (v !== '') params.append(k, v); }

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

// ══════════════════════════════════════════
//  ORDERS TABLE
// ══════════════════════════════════════════
window.fetchAndRenderOrders = async function() {
  const tbody = document.getElementById('ordersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;color:var(--text-muted)">Loading orders...</td></tr>';

  try {
    const data = await window.apiFetch('/bookings/orders');

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align:center;">No orders found.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    data.forEach((order, index) => {
      const tr = document.createElement('tr');
      tr.className = 'animate-fade-in';
      tr.style.animationDelay = `${index * 0.02}s`;

      const dt = order.OrderDate ? new Date(order.OrderDate).toLocaleString('vi-VN') : '—';
      const price = order.PriceAtBooking ? parseFloat(order.PriceAtBooking).toLocaleString('vi-VN') : '—';
      const total = order.LineTotal ? parseFloat(order.LineTotal).toLocaleString('vi-VN') : '—';

      let statusClass = 'status-pending';
      if (order.OrderStatus === 2 || order.OrderStatus === '2') statusClass = 'status-completed';
      if (order.OrderStatus === 0 || order.OrderStatus === '0') statusClass = 'status-cancelled';

      tr.innerHTML = `
        <td><strong>#${order.OrderID}</strong></td>
        <td style="font-size:0.82rem;color:var(--text-muted)">${dt}</td>
        <td>${order.UserID || '—'}</td>
        <td>${order.TourID || '—'}</td>
        <td>${order.Quantity || '—'}</td>
        <td>${price}</td>
        <td style="font-weight:600">${total}</td>
        <td style="font-size:0.82rem">${order.PaymentMethod || '—'}</td>
        <td><span class="status-badge ${statusClass}">${order.StatusLabel || order.OrderStatus}</span></td>
        <td style="font-size:0.8rem;max-width:200px;white-space:normal;color:var(--text-muted)">${order.Note || ''}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="10" class="result-error">Error: ${err.message}</td></tr>`;
  }
};

// ══════════════════════════════════════════
//  ADMIN DIRECTORY TABLE
// ══════════════════════════════════════════
window.fetchAndRenderAdmins = async function() {
  const tbody = document.getElementById('adminsTableBody');
  if (!tbody) return;
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-muted)">Loading admins...</td></tr>';

  try {
    const data = await window.apiFetch('/admin/list');

    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No admins found.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    data.forEach((admin, index) => {
      const tr = document.createElement('tr');
      tr.className = 'animate-fade-in';
      tr.style.animationDelay = `${index * 0.04}s`;
      tr.innerHTML = `
        <td><strong>#${admin.AdminID}</strong></td>
        <td>${admin.FullName || '—'}</td>
        <td><span class="status-badge status-completed">${admin.RoleName || '—'}</span></td>
        <td style="font-size:0.82rem;color:var(--text-muted)">${admin.PermissionType || '—'}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="4" class="result-error">Error: ${err.message}</td></tr>`;
  }
};

// ══════════════════════════════════════════
//  AUDIT LOGS TABLE
// ══════════════════════════════════════════
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
      
      const timeStr = new Date(log.ActionTimestamp).toLocaleString();
      
      let actionColor = 'var(--text-main)', actionBg = 'transparent';
      if (log.Action === 'INSERT')            { actionColor = '#10B981'; actionBg = 'rgba(16,185,129,0.1)'; }
      else if (log.Action === 'DELETE')       { actionColor = '#EF4444'; actionBg = 'rgba(239,68,68,0.1)'; }
      else if (log.Action === 'UPDATE')       { actionColor = '#F59E0B'; actionBg = 'rgba(245,158,11,0.1)'; }
      else if (log.Action && log.Action.startsWith('SYSTEM')) { actionColor = '#8B5CF6'; actionBg = 'rgba(139,92,246,0.1)'; }

      const badgeStyle = `color:${actionColor};background:${actionBg};padding:0.2rem 0.5rem;border-radius:4px;font-weight:600;font-size:0.8rem;`;
      tr.innerHTML = `
        <td style="font-size:0.85rem;color:var(--text-muted)">${timeStr}</td>
        <td>${log.AdminID || 'SYS'}</td>
        <td><span style="${badgeStyle}">${log.Action}</span></td>
        <td style="font-weight:500">${log.TargetTable || '-'}</td>
        <td>${log.TargetID || '-'}</td>
        <td style="font-size:0.85rem;max-width:300px;white-space:normal">${log.Details || ''}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="result-error">Error loading logs: ${err.message}</td></tr>`;
  }
};

// ══════════════════════════════════════════
//  Boot — Wire up all SP forms
// ══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

  handleSP('spRevenueDate',      '/analytics/revenue',                      'resultRevenueDate',     renderTable);
  handleSP('spRevenueCategory',  '/analytics/revenue/category',             'resultRevenueCategory', renderTable);
  handleSP('spRevenueActual',    '/analytics/revenue/actual-vs-expected',   'resultRevenueActual',   (id, data) => {
    if (Array.isArray(data) && data.length > 0) renderCards(id, data[0]);
    else if (typeof data === 'object' && !Array.isArray(data)) renderCards(id, data);
    else renderCards(id, null);
  });
  handleSP('spBestSelling',      '/analytics/tours/best-selling',           'resultBestSelling',     renderTable);
  handleSP('spOccupancy',        '/analytics/tours/occupancy',              'resultOccupancy',       renderTable);
  handleSP('spCancelled',        '/analytics/tours/cancelled',              'resultCancelled',       renderTable);
  handleSP('spHighInventory',    '/analytics/tours/high-inventory',         'resultHighInventory',   renderTable);
  handleSP('spVIP',              '/analytics/customers/vip',               'resultVIP',             renderTable);
  handleSP('spDemographics',     '/analytics/customers/demographics',       'resultDemographics',    renderTable);
  handleSP('spRetention',        '/analytics/customers/retention',          'resultRetention',       (id, data) => {
    if (Array.isArray(data) && data.length > 0) renderCards(id, data[0]);
    else if (typeof data === 'object' && !Array.isArray(data)) renderCards(id, data);
    else renderCards(id, null);
  });

});
