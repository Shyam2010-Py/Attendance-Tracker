/* ============================================
   Attendance Tracker — Dashboard Intelligence
   Day 6 — Class stats + recent activity
   ============================================ */

(function () {
  'use strict';

  // Overall thresholds (same as Day 5)
  const TH_EXCELLENT = 90;
  const TH_WARNING   = 75;

  /* ---------- Pure helpers (no DOM) ---------- */
  function getPerStudentOverall(state) {
    const wd = state.meta.workingDays || {};
    const ad = state.meta.attendedDays || {};
    const result = [];

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
      result.push({
        id: stu.id,
        name: stu.name,
        pin: stu.pin,
        overall,
        totalW,
        totalA,
        hasData: totalW > 0
      });
    });

    return result;
  }

  function classAverage(perStudent) {
    const withData = perStudent.filter(s => s.hasData);
    if (withData.length === 0) return 0;
    const sum = withData.reduce((s, x) => s + x.overall, 0);
    return Math.round((sum / withData.length) * 100) / 100;
  }

  function countBy(perStudent, predicate) {
    return perStudent.filter(predicate).length;
  }

  function findLatestActivity(state) {
    // Walk state.meta.percentages (already saved per save action)
    // Each entry has savedAt (ISO string)
    const pct = state.meta.percentages || {};
    let latest = null;
    Object.keys(pct).forEach(ym => {
      Object.keys(pct[ym]).forEach(stuId => {
        const entry = pct[ym][stuId];
        if (!entry?.savedAt) return;
        if (!latest || entry.savedAt > latest.savedAt) {
          const stu = state.students.find(s => s.id === stuId);
          if (!stu) return;
          latest = {
            stuId,
            ym,
            studentName: stu.name,
            pin: stu.pin,
            month: monthLabel(ym),
            monthly: entry.monthly,
            phase1: entry.phase1,
            phase2: entry.phase2,
            savedAt: entry.savedAt
          };
        }
      });
    });
    return latest;
  }

  function fmtPct(p) {
    return (Math.round((p || 0) * 100) / 100).toFixed(2) + '%';
  }

  function fmtDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleString('default', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch {
      return '—';
    }
  }

  function pctStatusClass(p) {
    if (!Number.isFinite(p) || p <= 0) return 'none';
    if (p >= TH_EXCELLENT) return 'good';
    if (p >= TH_WARNING)   return 'warn';
    return 'bad';
  }

  function statusLabel(cls) {
    if (cls === 'good') return 'Excellent';
    if (cls === 'warn') return 'Safe';
    if (cls === 'bad')  return 'Warning';
    return 'No Data';
  }

  /* ---------- DOM render ---------- */
  function render() {
    const state = AT.storage.get();
    const perStudent = getPerStudentOverall(state);

    /* ---------- Hero: today + overall pill ---------- */
    const todayEl = document.getElementById('todayDate');
    if (todayEl) {
      todayEl.textContent = new Date().toLocaleDateString('default', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      });
    }

    const totalStudents = perStudent.length;
    const withDataCount = perStudent.filter(s => s.hasData).length;
    const avg = classAverage(perStudent);

    const excellentCount = countBy(perStudent,
      s => s.hasData && s.overall >= TH_EXCELLENT);
    const warningCount = countBy(perStudent,
      s => s.hasData && s.overall < TH_WARNING);

    const valid = perStudent.filter(s => s.hasData);
    const highest = valid.length
      ? valid.reduce((a, b) => (a.overall > b.overall ? a : b))
      : null;
    const lowest = valid.length
      ? valid.reduce((a, b) => (a.overall < b.overall ? a : b))
      : null;

    const latest = findLatestActivity(state);

    /* ---------- Card 1: Total Students ---------- */
    document.getElementById('totalStudents').textContent = totalStudents;
    document.getElementById('totalStudentsSub').textContent =
      withDataCount > 0
        ? `${withDataCount} with attendance data`
        : 'No attendance data yet';

    /* ---------- Card 2: Class Average Attendance (avg of overall %) ---------- */
    const classAvgEl = document.getElementById('classAvg');
    classAvgEl.textContent = withDataCount > 0 ? fmtPct(avg) : '0.00%';
    document.getElementById('classAvgSub').textContent =
      withDataCount > 0
        ? `Across ${withDataCount} student${withDataCount === 1 ? '' : 's'}`
        : 'No data available';
    const avgCls = pctStatusClass(avg);
    document.getElementById('cardClassAvg').classList.remove('good','warn','bad','none');
    document.getElementById('cardClassAvg').classList.add(
      withDataCount > 0 ? avgCls : 'none'
    );
    document.getElementById('classAvgPill').classList.remove('good','warn','bad','none');
    document.getElementById('classAvgPill').classList.add(
      withDataCount > 0 ? avgCls : 'none'
    );
    document.getElementById('classAvgPill').textContent =
      withDataCount > 0 ? statusLabel(avgCls) : 'No Data';

    /* ---------- Card 3: Excellent Students (≥ 90) ---------- */
    document.getElementById('excellentCount').textContent = excellentCount;
    document.getElementById('excellentSub').textContent =
      `Overall ≥ ${TH_EXCELLENT}%`;
    document.getElementById('cardExcellent').classList.remove('good','warn','bad','none');
    document.getElementById('cardExcellent').classList.add(
      excellentCount > 0 ? 'good' : 'none'
    );

    /* ---------- Card 4: Warning Students (< 75) ---------- */
    document.getElementById('warningCount').textContent = warningCount;
    document.getElementById('warningSub').textContent =
      `Overall < ${TH_WARNING}%`;
    document.getElementById('cardWarning').classList.remove('good','warn','bad','none');
    document.getElementById('cardWarning').classList.add(
      warningCount > 0 ? 'bad' : 'none'
    );

    /* ---------- Class Statistics section ---------- */
    document.getElementById('statHighest').textContent =
      highest ? `${fmtPct(highest.overall)}  ·  ${highest.name}` : '—';
    document.getElementById('statLowest').textContent =
      lowest ? `${fmtPct(lowest.overall)}  ·  ${lowest.name}` : '—';
    document.getElementById('statAvg').textContent =
      withDataCount > 0 ? fmtPct(avg) : '—';

    const statsCard = document.getElementById('classStatsCard');
    const statsEmpty = document.getElementById('classStatsEmpty');
    if (withDataCount > 0) {
      statsCard.style.display = '';
      statsEmpty.style.display = 'none';
    } else {
      statsCard.style.display = 'none';
      statsEmpty.style.display = 'block';
    }

    /* ---------- Recent Activity section ---------- */
    const recentCard = document.getElementById('recentCard');
    const recentEmpty = document.getElementById('recentEmpty');
    if (latest) {
      recentCard.style.display = '';
      recentEmpty.style.display = 'none';
      document.getElementById('recentStudent').textContent = `${latest.studentName} (${latest.pin})`;
      document.getElementById('recentMonth').textContent = latest.month;
      document.getElementById('recentDate').textContent = fmtDate(latest.savedAt);

      const rcls = pctStatusClass(latest.monthly);
      document.getElementById('recentPct').textContent = fmtPct(latest.monthly);
      document.getElementById('recentPct').classList.remove('good','warn','bad','none');
      document.getElementById('recentPct').classList.add(rcls);
      document.getElementById('recentPill').classList.remove('good','warn','bad','none');
      document.getElementById('recentPill').classList.add(rcls);
      document.getElementById('recentPill').textContent = statusLabel(rcls);

      document.getElementById('recentP1').textContent = fmtPct(latest.phase1);
      document.getElementById('recentP2').textContent = fmtPct(latest.phase2);
    } else {
      recentCard.style.display = 'none';
      recentEmpty.style.display = 'block';
    }

    /* ---------- No-data state placeholders (when 0 students) ---------- */
    if (totalStudents === 0) {
      // Override students card subtitle
      document.getElementById('totalStudentsSub').textContent = '0 Students · No Attendance Data';
    }

    /* ---------- Hero overall pill ---------- */
    const heroPill = document.getElementById('dashOverallPill');
    if (heroPill) {
      const heroCls = (totalStudents === 0 || withDataCount === 0)
        ? 'none' : pctStatusClass(avg);
      heroPill.classList.remove('good','warn','bad','none');
      heroPill.classList.add(heroCls);
      heroPill.textContent = (totalStudents === 0 || withDataCount === 0)
        ? 'No Data' : statusLabel(heroCls);
    }
  }

  /* ---------- Live updates ---------- */

  // 1) Cross-tab updates: native `storage` event fires for other tabs
  window.addEventListener('storage', e => {
    if (e.key === 'attendanceTracker.v1') render();
  });

  // 2) Same-tab updates: dispatched by students.js / attendance.js
  //    via notifyDataChange() (see app.js)
  window.addEventListener('at:data-changed', () => render());

  // 3) Back/forward navigation (bfcache): re-render restored page
  window.addEventListener('pageshow', e => {
    if (e.persisted) render();
  });

  // 4) Initial render
  document.addEventListener('DOMContentLoaded', render);
})();