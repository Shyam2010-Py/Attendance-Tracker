/* ============================================
   Attendance Tracker — Student Detail
   Day 9 — Single-student deep view
   ============================================ */

(function () {
  'use strict';

  // Overall thresholds (must match Day 5/6/7)
  const TH_EXCELLENT = 90;
  const TH_SAFE      = 75;

  function getQueryId() {
    const params = new URLSearchParams(location.search);
    return params.get('id');
  }

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function fmtPct(p) {
    return (Math.round((p || 0) * 100) / 100).toFixed(2) + '%';
  }

  function pctStatusClass(p) {
    if (!Number.isFinite(p) || p <= 0) return 'none';
    if (p >= TH_EXCELLENT) return 'good';
    if (p >= TH_SAFE)      return 'warn';
    return 'bad';
  }

  function statusLabel(cls) {
    if (cls === 'good') return 'Excellent';
    if (cls === 'warn') return 'Safe';
    if (cls === 'bad')  return 'Warning';
    return 'No Data';
  }

  /**
   * Build full per-student profile from LocalStorage.
   * Returns null if student not found.
   */
  function buildProfile(stuId) {
    const state = AT.storage.get();
    const stu = state.students.find(s => s.id === stuId);
    if (!stu) return null;

    const wd = state.meta.workingDays || {};
    const ad = state.meta.attendedDays || {};
    const months = [];

    let totalW = 0, totalA = 0;

    Object.keys(wd).sort().forEach(ym => {
      const w = wd[ym];
      const a = ad[ym]?.[stu.id];
      if (!w || !a) return;

      const wSum = (Number(w.phase1) || 0) + (Number(w.phase2) || 0);
      const aSum = (Number(a.phase1) || 0) + (Number(a.phase2) || 0);
      if (wSum <= 0) return;

      totalW += wSum;
      totalA += aSum;

      const monthPct = Math.round(((aSum / wSum) * 100) * 100) / 100;
      months.push({
        ym,
        label: monthLabel(ym),
        ratio: `${aSum} / ${wSum}`,
        attended: aSum,
        working: wSum,
        pct: monthPct
      });
    });

    // Sort newest first
    months.sort((a, b) => b.ym.localeCompare(a.ym));

    const overall = totalW > 0
      ? Math.round(((totalA / totalW) * 100) * 100) / 100
      : 0;

    return { stu, months, totalW, totalA, overall, hasData: totalW > 0 };
  }

  /* ---------- Renderers ---------- */
  function renderNotFound() {
    document.getElementById('notFoundCard').style.display = 'block';
    document.getElementById('detailContent').style.display = 'none';
    document.getElementById('historyCard').style.display = 'none';
    document.querySelector('h1').textContent = 'Student Not Found';
  }

  function renderProfile(p) {
    const { stu, months, totalW, totalA, overall, hasData } = p;

    document.getElementById('notFoundCard').style.display = 'none';
    document.getElementById('detailContent').style.display = '';
    document.getElementById('historyCard').style.display = '';

    document.querySelector('h1').textContent = `👤 ${stu.name}`;
    document.querySelector('.subtitle').textContent =
      `Complete attendance profile for ${stu.name} (${stu.pin}).`;

    // Profile card
    document.getElementById('profileName').textContent = stu.name;
    document.getElementById('profilePin').textContent  = stu.pin;
    document.getElementById('profileAvatar').textContent = '👤';

    const cls = pctStatusClass(overall);
    const hl = document.getElementById('profileHighlight');
    hl.classList.remove('good', 'warn', 'bad', 'none');
    hl.classList.add(hasData ? cls : 'none');

    const pill = document.getElementById('profilePill');
    pill.classList.remove('good', 'warn', 'bad', 'none');
    pill.classList.add(hasData ? cls : 'none');
    pill.textContent = hasData ? statusLabel(cls) : 'No Data';

    document.getElementById('profilePct').textContent = hasData ? fmtPct(overall) : '0.00%';
    document.getElementById('profileSub').textContent = hasData
      ? `Based on ${totalA} attended of ${totalW} working days · ${months.length} month(s)`
      : 'No attendance data recorded yet';

    // Summary card
    document.getElementById('sumWorking').textContent  = totalW;
    document.getElementById('sumAttended').textContent = totalA;
    document.getElementById('sumMonths').textContent   = months.length;
    document.getElementById('sumOverall').textContent  = hasData ? fmtPct(overall) : '0.00%';

    // Monthly history
    const list   = document.getElementById('monthlyHistory');
    const empty  = document.getElementById('historyEmpty');
    if (months.length === 0) {
      list.innerHTML = '';
      empty.style.display = 'block';
    } else {
      empty.style.display = 'none';
      list.innerHTML = months.map(m => {
        const mCls = pctStatusClass(m.pct);
        const mLabel = statusLabel(mCls);
        return `
          <div class="breakdown-row ${mCls}">
            <div class="bd-left">
              <span class="bd-month">${escapeHTML(m.label)}</span>
              <span class="bd-ratio">${m.ratio} attended</span>
            </div>
            <div class="bd-right">
              <span class="bd-pct">${fmtPct(m.pct)}</span>
              <span class="status-pill ${mCls}">${mLabel}</span>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  function render() {
    const id = getQueryId();
    if (!id) { renderNotFound(); return; }
    const profile = buildProfile(id);
    if (!profile) { renderNotFound(); return; }
    renderProfile(profile);
  }

  /* ---------- Live updates ---------- */
  // If the viewed student is edited/deleted in another tab, re-render
  window.addEventListener('storage', e => {
    if (e.key === 'attendanceTracker.v1') render();
  });
  window.addEventListener('at:data-changed', () => render());
  window.addEventListener('pageshow', e => { if (e.persisted) render(); });

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', render);
})();
