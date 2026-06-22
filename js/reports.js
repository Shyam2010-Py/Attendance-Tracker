/* ============================================
   Attendance Tracker — Reports
   Day 7 — Student Attendance Overview
   ============================================ */

(function () {
  'use strict';

  // Overall thresholds (must match Day 5/Day 6)
  const TH_EXCELLENT = 90;
  const TH_SAFE      = 75;

  // State
  let allRows = [];   // [{ id, pin, name, overall, totalW, hasData, status }]
  let currentFilter = 'all';
  let currentSort   = 'name-asc';
  let currentSearch = '';

  /* ---------- Pure helpers (no DOM) ---------- */
  function statusFor(pct, hasData) {
    if (!hasData) return 'nodata';
    if (pct >= TH_EXCELLENT) return 'excellent';
    if (pct >= TH_SAFE)      return 'safe';
    return 'warning';
  }

  function statusLabel(s) {
    switch (s) {
      case 'excellent': return 'Excellent';
      case 'safe':      return 'Safe';
      case 'warning':   return 'Warning';
      default:          return 'No Data';
    }
  }

  function statusPillClass(s) {
    switch (s) {
      case 'excellent': return 'good';
      case 'safe':      return 'warn';
      case 'warning':   return 'bad';
      default:          return 'none';
    }
  }

  function fmtPct(p) {
    return (Math.round((p || 0) * 100) / 100).toFixed(2) + '%';
  }

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function getPerStudentOverall(state) {
    const wd = state.meta.workingDays || {};
    const ad = state.meta.attendedDays || {};
    const out = [];

    state.students.forEach(stu => {
      let totalW = 0, totalA = 0;
      Object.keys(wd).forEach(ym => {
        const w = wd[ym];
        const a = ad[ym]?.[stu.id];
        if (!w || !a) return;
        const wSum = (Number(w.phase1) || 0) + (Number(w.phase2) || 0);
        const aSum = (Number(a.phase1) || 0) + (Number(a.phase2) || 0);
        if (wSum <= 0) return;
        totalW += wSum;
        totalA += aSum;
      });
      const overall = totalW > 0
        ? Math.round(((totalA / totalW) * 100) * 100) / 100
        : 0;
      out.push({
        id: stu.id,
        pin: stu.pin || '',
        name: stu.name || '',
        overall,
        totalW,
        hasData: totalW > 0,
        status: statusFor(overall, totalW > 0)
      });
    });

    return out;
  }

  function compareRows(a, b) {
    switch (currentSort) {
      case 'name-desc': return b.name.localeCompare(a.name);
      case 'pin-asc':   return a.pin.localeCompare(b.pin);
      case 'pin-desc':  return b.pin.localeCompare(a.pin);
      case 'pct-desc':  return (b.overall || -1) - (a.overall || -1);
      case 'pct-asc':   return (a.overall || -1) - (b.overall || -1);
      case 'name-asc':
      default:          return a.name.localeCompare(b.name);
    }
  }

  function applyFilters(rows) {
    const q = currentSearch.trim().toLowerCase();
    return rows.filter(r => {
      if (currentFilter !== 'all' && r.status !== currentFilter) return false;
      if (q && !r.name.toLowerCase().includes(q) && !r.pin.toLowerCase().includes(q)) return false;
      return true;
    });
  }

  /* ---------- Summary ---------- */
  function renderSummary() {
    const total     = allRows.length;
    const excellent = allRows.filter(r => r.status === 'excellent').length;
    const safe      = allRows.filter(r => r.status === 'safe').length;
    const warning   = allRows.filter(r => r.status === 'warning').length;

    document.getElementById('sumTotal').textContent     = total;
    document.getElementById('sumExcellent').textContent = excellent;
    document.getElementById('sumSafe').textContent      = safe;
    document.getElementById('sumWarning').textContent   = warning;

    // Top border accents (consistent with theme)
    const set = (id, cls) => {
      const el = document.getElementById(id);
      el.classList.remove('good', 'warn', 'bad', 'none');
      el.classList.add(cls);
    };
    set('sumExcellentCard', excellent > 0 ? 'good' : 'none');
    set('sumSafeCard',      safe      > 0 ? 'warn' : 'none');
    set('sumWarningCard',   warning   > 0 ? 'bad'  : 'none');
  }

  /* ---------- Table + Mobile list ---------- */
  function renderTable(rows) {
    const tbody     = document.getElementById('reportTableBody');
    const mobileEl  = document.getElementById('reportMobileList');
    const emptyEl   = document.getElementById('reportEmpty');
    const visibleEl = document.getElementById('visibleCount');

    visibleEl.textContent = `${rows.length} shown`;

    if (allRows.length === 0) {
      tbody.innerHTML = '';
      mobileEl.innerHTML = '';
      emptyEl.style.display = 'block';
      return;
    }
    if (rows.length === 0) {
      tbody.innerHTML = '';
      mobileEl.innerHTML = '';
      emptyEl.textContent = 'No students match your search or filter.';
      emptyEl.style.display = 'block';
      return;
    }
    emptyEl.style.display = 'none';

    // Desktop table rows (clickable → student detail)
    tbody.innerHTML = rows.map(r => {
      const pillCls = statusPillClass(r.status);
      return `
        <tr class="clickable-row" data-href="student-detail.html?id=${encodeURIComponent(r.id)}">
          <td><span class="pin-badge">${escapeHTML(r.pin)}</span></td>
          <td>${escapeHTML(r.name)}</td>
          <td><strong>${fmtPct(r.overall)}</strong></td>
          <td><span class="status-pill ${pillCls}">${statusLabel(r.status)}</span></td>
        </tr>
      `;
    }).join('');

    // Mobile card list (clickable → student detail)
    mobileEl.innerHTML = rows.map(r => {
      const pillCls = statusPillClass(r.status);
      return `
        <div class="stu-card report-card clickable-card" data-href="student-detail.html?id=${encodeURIComponent(r.id)}">
          <div class="top">
            <span class="name">${escapeHTML(r.name)}</span>
            <span class="pin-badge">${escapeHTML(r.pin)}</span>
          </div>
          <div class="rcp-row">
            <span class="rcp-key">Overall</span>
            <strong>${fmtPct(r.overall)}</strong>
            <span class="status-pill ${pillCls}">${statusLabel(r.status)}</span>
          </div>
          <div class="rcp-link">View details →</div>
        </div>
      `;
    }).join('');

    // Bind click navigation
    tbody.querySelectorAll('.clickable-row').forEach(el => {
      el.addEventListener('click', () => { location.href = el.dataset.href; });
    });
    mobileEl.querySelectorAll('.clickable-card').forEach(el => {
      el.addEventListener('click', () => { location.href = el.dataset.href; });
    });
  }

  function render() {
    const state = AT.storage.get();
    allRows = getPerStudentOverall(state);
    renderSummary();
    const filtered = applyFilters(allRows).sort(compareRows);
    renderTable(filtered);
  }

  /* ---------- Events ---------- */
  document.getElementById('reportSearch').addEventListener('input', e => {
    currentSearch = e.target.value;
    const filtered = applyFilters(allRows).sort(compareRows);
    renderTable(filtered);
  });

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      const filtered = applyFilters(allRows).sort(compareRows);
      renderTable(filtered);
    });
  });

  document.getElementById('reportSort').addEventListener('change', e => {
    currentSort = e.target.value;
    const filtered = applyFilters(allRows).sort(compareRows);
    renderTable(filtered);
  });

  // Live updates from other pages
  window.addEventListener('storage', e => {
    if (e.key === 'attendanceTracker.v1') render();
  });
  window.addEventListener('at:data-changed', () => render());
  window.addEventListener('pageshow', e => { if (e.persisted) render(); });

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', render);
})();
