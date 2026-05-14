async function apiFetch(path, options = {}) {
  const t0 = performance.now();
  
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  
  const t1 = performance.now();
  const timeMs = (t1 - t0).toFixed(2);
  
  const json = await res.json();
  
  // Show performance toast
  showPerformanceToast(path, timeMs);

  if (!json.success) throw new Error(json.message);
  return json.data;
}

function showPerformanceToast(path, timeMs) {
  let container = document.getElementById('perf-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'perf-toast-container';
    Object.assign(container.style, {
      position: 'fixed', bottom: '20px', right: '20px', zIndex: '9999',
      display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'none'
    });
    document.body.appendChild(container);
  }

  const isHit = timeMs < 20; // Dưới 20ms chắc chắn là lấy từ Buffer
  
  const toast = document.createElement('div');
  Object.assign(toast.style, {
    background: '#161b22', border: `1px solid ${isHit ? 'rgba(63,185,80,0.5)' : 'rgba(248,81,73,0.5)'}`,
    color: '#e6edf3', padding: '10px 14px', borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)', fontFamily: 'system-ui, sans-serif',
    fontSize: '12px', display: 'flex', alignItems: 'center', gap: '10px',
    opacity: '0', transform: 'translateX(20px)', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  });

  toast.innerHTML = `
    <div style="font-weight:600; color:${isHit ? '#3fb950' : '#f85149'}">${isHit ? '⚡ HIT' : '🐌 MISS'}</div>
    <div style="flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px; color:#8b949e">${path}</div>
    <div style="font-family:monospace; font-weight:700; font-size:14px; color:${isHit ? '#3fb950' : '#f85149'}">${timeMs}ms</div>
  `;

  container.appendChild(toast);
  
  // Animate in
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0)';
  });

  // Remove after 3.5s
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

window.apiFetch = apiFetch;
